import { readFile, writeFile, readdir } from 'fs/promises';
import { createHash } from 'crypto';
import { rollup } from 'rollup';

import { typescriptPaths as paths } from 'rollup-plugin-typescript-paths';
import { nodeResolve as node } from '@rollup/plugin-node-resolve';
import { swc } from 'rollup-plugin-swc3';
import { existsSync, statSync } from 'fs';
import json from '@rollup/plugin-json';
import iife from 'rollup-plugin-iife';
import { minify } from 'rollup-plugin-swc3';

const map = {
	'react': 'window.React',
	'react-native': 'window.ReactNative',
	'react-native-reanimated': 'window.unbound.metro.common.Reanimated'
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
		const bundle = await rollup({
			input: `./plugins/${plug}/${manifest.main ?? 'index.ts'}`,
			plugins,
			output: {
				dir: `./dist/${plug}`
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

			// name: 'addon',
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

		console.log(`Successfully built ${manifest.name}!`);
	} catch (e) {
		console.error('Failed to build plugin...', e);
		process.exit(1);
	}
}