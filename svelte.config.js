import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import { fileURLToPath } from 'node:url';

const dev = process.env.NODE_ENV !== 'production';

// mdsvex reads the layout from disk and injects it as an import, so it needs a
// real absolute path (it does not resolve the $lib alias).
const mdLayout = fileURLToPath(new URL('./src/lib/components/MarkdownLayout.svelte', import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md'],
			layout: {
				_: mdLayout
			}
		})
	],
	kit: {
		adapter: adapter({
			fallback: '404.html'
		}),
		paths: {
			base: dev ? '' : '/Anki-xiehanzi'
		}
	}
};

export default config;
