
// Plugins
import { typescriptPaths as paths } from 'rollup-plugin-typescript-paths';
import { nodeResolve as node } from '@rollup/plugin-node-resolve';
import { swc, minify } from 'rollup-plugin-swc3';
import json from '@rollup/plugin-json';

/** @type {import('rollup').RollupOptions} */
const config = {
	input: 'src/index.tsx',
	output: [
		{
			file: 'dist/bundle.js',
			format: 'esm',
			globals: (id) => {
				console.log(id);
			}
		}
	],

	plugins: [
		paths(),
		node(),
		json(),
		swc({ tsconfig: false }),
		minify({ compress: true, mangle: true }),
	],

	onwarn(warning, warn) {
		if (warning.code === 'EVAL') return;
		warn(warning);
	}
};

export default config;