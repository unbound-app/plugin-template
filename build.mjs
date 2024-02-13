import { readFile, writeFile, readdir } from 'fs/promises';
import { createHash } from 'crypto';
import { rollup } from 'rollup';

import { typescriptPaths as paths } from 'rollup-plugin-typescript-paths';
import { nodeResolve as node } from '@rollup/plugin-node-resolve';
import { swc, minify } from 'rollup-plugin-swc3';
import json from '@rollup/plugin-json';


/** @type import('rollup').InputPluginOption */
const plugins = [
	paths(),
	node(),
	json(),
	swc({ tsconfig: false }),
	minify({ compress: true, mangle: true }),
];

const plugs = await readdir('./plugins');

const map = {
	'react': 'window.React',
	'react-native': 'window.ReactNative',
	'react-native-reanimated': 'window.unbound.metro.common.Reanimated'
};

for (let plug of plugs) {
	const manifest = JSON.parse(await readFile(`./plugins/${plug}/manifest.json`));
	const outPath = `./dist/${plug}/index.js`;

	try {
		const bundle = await rollup({
			input: `./plugins/${plug}/${manifest.main}`,
			plugins,
			onwarn: (warning) => {
				if (warning.code === 'UNRESOLVED_IMPORT') {
					const internals = Object.keys(map);
					const isInternal = warning.exporter.startsWith('@unbound') || internals.includes(warning.exporter);

					if (isInternal) return;
				}

				console.warn(warning.message);
			},
		});

		await bundle.write({
			file: outPath,
			// name: 'addon',
			globals(id) {
				if (id.startsWith('@unbound')) {
					return id.substring(1).replace(/\//g, '.');
				}

				return map[id] || null;
			},
			format: 'iife',
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