import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';

// Aliases: $lib → src/lib, and a tiny stub for SvelteKit's $app/paths so the
// pure modules (which import `base`) resolve outside the SvelteKit dev server.
const alias = {
	$lib: path.resolve('./src/lib'),
	'$app/paths': path.resolve('./src/test/appPathsStub.ts')
};

export default defineConfig({
	resolve: { alias },
	test: {
		projects: [
			// Pure logic — fast, no DOM, no Svelte compilation.
			{
				resolve: { alias },
				test: {
					name: 'node',
					environment: 'node',
					include: ['src/**/*.test.ts'],
					exclude: ['src/**/*.svelte.test.ts']
				}
			},
			// Component / interaction tests — jsdom + compiled Svelte.
			{
				plugins: [svelte({ configFile: false })],
				resolve: { alias, conditions: ['browser'] },
				test: {
					name: 'dom',
					environment: 'jsdom',
					globals: true,
					include: ['src/**/*.svelte.test.ts'],
					setupFiles: ['./src/test/setup.ts']
				}
			}
		]
	}
});
