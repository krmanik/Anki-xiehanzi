/**
 * Runs the browser-only deck code (`src/lib/deck.ts` and everything it pulls in)
 * inside plain Node, so decks can be pre-built offline.
 *
 * Two shims are all it takes:
 *
 *  1. Module resolution — `$app/paths` becomes a stub whose `base` is the
 *     absolute path of `static/`, and `$lib/…` / extensionless relative imports
 *     resolve to the `.ts` sources (Node ≥22 strips the types).
 *  2. `fetch` — every `${base}/data/…` URL is then an absolute filesystem path,
 *     which this reads from disk. Real http(s) URLs (the HSK audio CDN) go to
 *     the real fetch untouched.
 *
 * sql.js needs no shim: its `locateFile` returns the same absolute path and the
 * Node build of emscripten reads it with `fs`.
 */

import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const staticDir = join(root, 'static');
export const srcLib = join(root, 'src', 'lib');

const stubUrl = pathToFileURL(join(root, 'scripts', 'lib', 'app-paths-stub.mjs')).href;
const fileSaverStubUrl = pathToFileURL(join(root, 'scripts', 'lib', 'file-saver-stub.mjs')).href;

// `static/` is where every `${base}/…` fetch below is rooted.
process.env.XIEHANZI_ASSET_BASE = staticDir;

const CANDIDATES = ['', '.ts', '.js', '/index.ts', '/index.js'];

function resolveFile(pathname) {
	for (const suffix of CANDIDATES) {
		const candidate = pathname + suffix;
		if (existsSync(candidate) && extname(candidate)) return candidate;
	}
	return null;
}

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === '$app/paths') return { url: stubUrl, shortCircuit: true };
		// CommonJS with no named ESM export — genanki-js wants `{ saveAs }`.
		if (specifier === 'file-saver') return { url: fileSaverStubUrl, shortCircuit: true };

		if (specifier.startsWith('$lib/')) {
			const hit = resolveFile(join(srcLib, specifier.slice('$lib/'.length)));
			if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
		}

		// Extensionless relative imports (`./deckTemplate`) — Vite resolves them,
		// Node does not.
		if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.startsWith('file:')) {
			const hit = resolveFile(resolvePath(dirname(fileURLToPath(context.parentURL)), specifier));
			if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
		}

		return nextResolve(specifier, context);
	}
});

const MIME = {
	'.json': 'application/json',
	'.js': 'text/javascript',
	'.wasm': 'application/wasm',
	'.zip': 'application/zip',
	'.mp3': 'audio/mpeg',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.gif': 'image/gif',
	'.woff2': 'font/woff2'
};

/** Serve `${staticDir}/…` paths from disk; pass real URLs through. */
export function installFetchShim() {
	const realFetch = globalThis.fetch;

	globalThis.fetch = async (input, init) => {
		const url = typeof input === 'string' ? input : (input?.url ?? String(input));
		if (/^https?:/.test(url)) return realFetch(input, init);

		const path = url.startsWith('file:') ? fileURLToPath(url) : url.split(/[?#]/)[0];
		if (!existsSync(path)) {
			return new Response(null, { status: 404, statusText: `not found: ${path}` });
		}
		const body = readFileSync(path);
		return new Response(body, {
			status: 200,
			headers: {
				'content-type': MIME[extname(path)] ?? 'application/octet-stream',
				'content-length': String(body.byteLength)
			}
		});
	};
}
