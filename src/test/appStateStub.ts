// Test stub for SvelteKit's $app/state — only `page.url` is read (the `?q=`
// and `?w=` the dictionary restores on load).
export const page = {
	url: new URL('http://localhost/dictionary'),
	params: {} as Record<string, string>,
	route: { id: null as string | null }
};
