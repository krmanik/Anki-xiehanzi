// Node stand-in for SvelteKit's `$app/paths`. `base` points at `static/`, so
// every `${base}/data/…` URL in the app code becomes an absolute filesystem
// path that the fetch shim in node-env.mjs can read.
export const base = process.env.XIEHANZI_ASSET_BASE ?? '';
export const assets = base;
export function resolveRoute(id) {
	return id;
}
