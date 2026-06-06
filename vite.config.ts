import { sveltekit } from '@sveltejs/kit/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		// genanki-js + sql.js expect Node globals (Buffer, crypto, stream, process).
		// These are pure-JS browser shims (buffer / crypto-browserify / stream-browserify
		// / path-browserify / process) — the same set the old webpack config aliased.
		nodePolyfills({
			globals: { Buffer: true, global: true, process: true },
			include: ['buffer', 'crypto', 'stream', 'path', 'process']
		})
	],
	optimizeDeps: {
		exclude: ['jieba-wasm']
	},
	assetsInclude: ['**/*.wasm']
});
