import { readFile, writeFile, readdir } from 'fs/promises';
import { createHash } from 'crypto';
import { rollup } from 'rollup';

import { typescriptPaths as paths } from 'rollup-plugin-typescript-paths';
import { nodeResolve as node } from '@rollup/plugin-node-resolve';
import { swc, minify } from 'rollup-plugin-swc3';
import { existsSync, statSync } from 'fs';
import json from '@rollup/plugin-json';
import iife from 'rollup-plugin-iife';
import { resolve } from 'path';

const map = {
	'react': 'window.React',
	'react-native': 'window.ReactNative',
	'react-native-reanimated': 'window.unbound.metro.common.Reanimated',
	'@react-native-clipboard/clipboard': 'window.unbound.metro.common.Clipboard',
	'moment': 'window.unbound.metro.common.Moment'
};

/** @type import('rollup').InputPluginOption */
const plugins = [
	paths(),
	node(),
	json(),
	swc({ tsconfig: false }),
	iife(),
	minify({ compress: false })
];

const plugs = await readdir('./plugins');

for (let plug of plugs) {
	const isDirectory = statSync(`./plugins/${plug}`).isDirectory();
	if (!isDirectory) continue;

	if (!existsSync(`./plugins/${plug}/manifest.json`)) {
		console.warn(`${plug} is missing a manifest. Skipping it.`);
		continue;
	}

	const manifestContent = await readFile(`./plugins/${plug}/manifest.json`, 'utf-8');
	const manifest = JSON.parse(manifestContent);
	const outPath = `./dist/${plug}/index.js`;

	try {
		validateManifest(plug, manifest);

		const bundle = await rollup({
			input: `./plugins/${plug}/${manifest.main}`,
			plugins,
			external: Object.keys(map),
			output: {
				dir: `./dist/${plug}`,
				globals(id) {
					if (id.startsWith('@unbound')) {
						return id.substring(1).replace(/\//g, '.');
					}

					return map[id] || null;
				},
			},
			onwarn: (warning) => {
				if (warning.code === 'UNRESOLVED_IMPORT' && warning.exporter) {
					const internals = Object.keys(map);
					const isInternal = warning.exporter.startsWith('@unbound') || internals.includes(warning.exporter);

					if (isInternal) return;
				}

				console.warn(warning.message);
			},
		});

		await bundle.write({
			// file: outPath,
			dir: `./dist/${plug}`,
			globals(id) {
				if (id.startsWith('@unbound')) {
					return id.substring(1).replace(/\//g, '.');
				}

				return map[id] || null;
			},
			compact: true,
			exports: 'named',
		});

		await bundle.close();

		const bytes = await readFile(outPath);

		manifest.hash = createHash('sha256').update(bytes).digest('hex');
		manifest.main = 'index.js';

		await writeFile(`./dist/${plug}/manifest.json`, JSON.stringify(manifest));

		console.log(`Successfully built "${plug}" (${manifest.name})!`);
	} catch (e) {
		console.error(`Failed to build plugin "${plug}":`, e);
		process.exit(1);
	}
}

function validateManifest(directory, manifest) {
	if (!manifest.name || typeof manifest.name !== 'string') {
		throw new Error('Manifest property "name" must be of type string.');
	} else if (!manifest.description || typeof manifest.description !== 'string') {
		throw new Error('Manifest property "description" must be of type string.');
	} else if (!manifest.authors || !Array.isArray(manifest.authors) || !manifest.authors.every(author => author.name && author.id)) {
		throw new Error('Manifest property "authors" must be of type array with object children containing the properties "name" and "id".');
	} else if (!manifest.version || typeof manifest.version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/i.test(manifest.version)) {
		throw new Error('Manifest property "version" must be of type string and match the semantic versioning pattern.');
	} else if (!manifest.id || typeof manifest.id !== 'string') {
		throw new Error('Manifest property "id" must be of type string and match a "eternal.unbound" pattern.');
	} else if (!manifest.main || (manifest.main && !existsSync(resolve('.', 'plugins', directory, manifest.main)))) {
		throw new Error(`Manifest property "main" must be of type string be a valid relative path to /plugins/${directory}.`);
	}
}