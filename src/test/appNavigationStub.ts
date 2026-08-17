// Test stub for SvelteKit's $app/navigation. The dictionary page keeps its
// query in the URL; outside the router there is nowhere to go, so `goto` is a
// no-op that still resolves.
export async function goto(_url: string, _opts?: unknown): Promise<void> {}
export function invalidateAll(): Promise<void> {
	return Promise.resolve();
}
