/**
 * AnkiConnect client (add-on 2055492159). Pure apart from the injected
 * `fetch`, so it runs in the node test project against a mock.
 *
 * Checked against the installed add-on's source (`web.py`, `__init__.py`),
 * not from memory:
 *
 * - **An origin not on `webCorsOriginList` gets a 403 whose
 *   Access-Control-Allow-Origin is `http://localhost`** — to the page that is
 *   a CORS failure, i.e. the same `TypeError` as "Anki is closed". The one
 *   exception is `requestPermission`, which always answers with the caller's
 *   own origin. So `connect()` asks for permission *first*: if even that
 *   fails, nothing is listening.
 * - `requestPermission` returns `{ permission: 'granted' | 'denied',
 *   requireApikey?, version? }`. Granting pops a dialog in Anki and appends
 *   the origin to the add-on's config, so the user never edits JSON.
 * - Replies are `{ result, error }` from API version 5 up. **Each action
 *   inside `multi` is dispatched with its own `version`, defaulting to 4**,
 *   which returns the bare result and hides errors — so every sub-action is
 *   sent with `version: 6` here.
 * - `http://localhost` on the allow list also admits `http://127.0.0.1:*`,
 *   but not `http://localhost:5173`: the dev server gets the dialog too.
 *
 * Spike, 2026-11-06 (Chrome 157, AnkiConnect 2055492159, headless via CDP):
 * - From `https://krmanik.github.io` Chrome blocks the loopback fetch until the
 *   site holds the **`loopback-network`** permission ("…blocked by CORS policy:
 *   Permission was denied for this request to access the `loopback` address
 *   space"). A real browser asks the reader; headless denies. `local-network-
 *   access` alone is not enough. To the page it is the same `TypeError` again.
 * - With it granted, `requestPermission` reaches Anki, Anki shows its dialog,
 *   and Yes appends the origin to the add-on's config. Works on 127.0.0.1 and
 *   localhost alike. So a first connect is two prompts: browser, then Anki.
 * - Safari: not yet tested (needs "Allow JavaScript from Apple Events").
 *
 * Requests go out without a Content-Type header. A string body is then
 * `text/plain`, a CORS "simple" request with no preflight; the add-on parses
 * the body as JSON whatever the header says.
 */

export const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';
export const API_VERSION = 6;
/** Actions per `multi` call. The add-on runs them on Anki's main thread. */
export const MULTI_CHUNK = 100;

export type AnkiStatus =
	/** Nothing answered: Anki closed, add-on missing, port taken, or the browser blocked it. */
	| 'unreachable'
	/** Anki answered and the user clicked No (or ticked "ignore"). */
	| 'denied'
	/** Permission granted, but the add-on is set up with an API key. */
	| 'needs-key'
	/** AnkiConnect older than API version 6. */
	| 'outdated'
	| 'ready';

export interface ConnectResult {
	status: AnkiStatus;
	/** AnkiConnect's API version, when it said. */
	version?: number;
}

// Plain fields, not constructor parameter properties: Node's type stripping
// (used by scripts/) cannot run those.
export class AnkiConnectError extends Error {
	readonly action: string;
	/** Network-level failure (no reply), as opposed to Anki reporting an error. */
	readonly unreachable: boolean;
	constructor(message: string, action: string, unreachable = false) {
		super(message);
		this.name = 'AnkiConnectError';
		this.action = action;
		this.unreachable = unreachable;
	}
}

export interface ClientOptions {
	url?: string;
	fetch?: typeof fetch;
	/** Only when the user configured `apiKey` in the add-on. */
	key?: string;
	/** Milliseconds before a call counts as unreachable. */
	timeout?: number;
}

export interface Action {
	action: string;
	params?: Record<string, unknown>;
}

export interface AnkiConnect {
	call<T = unknown>(action: string, params?: Record<string, unknown>, timeout?: number): Promise<T>;
	/** Many actions, `MULTI_CHUNK` per request. One result per action, in order; a failed action is an `Error`, not a throw. */
	multi<T = unknown>(actions: Action[]): Promise<(T | Error)[]>;
	connect(): Promise<ConnectResult>;
}

/** The request body AnkiConnect expects. Exported for tests. */
export function requestBody(action: string, params: Record<string, unknown> | undefined, key?: string): string {
	return JSON.stringify({ action, version: API_VERSION, ...(params ? { params } : {}), ...(key ? { key } : {}) });
}

/** A version-6 reply → its result, or throw its error. */
export function unwrap<T>(action: string, reply: unknown): T {
	if (!reply || typeof reply !== 'object' || !('result' in reply) || !('error' in reply)) {
		throw new AnkiConnectError('AnkiConnect sent a reply in an unknown shape', action);
	}
	const { result, error } = reply as { result: T; error: string | null };
	if (error) throw new AnkiConnectError(error, action);
	return result;
}

export function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

export function createAnkiConnect(opts: ClientOptions = {}): AnkiConnect {
	const url = opts.url ?? ANKI_CONNECT_URL;
	const doFetch = opts.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
	const timeout = opts.timeout ?? 8000;

	async function post(action: string, body: string, ms: number): Promise<unknown> {
		const ctl = new AbortController();
		const timer = setTimeout(() => ctl.abort(), ms);
		let res: Response;
		try {
			// targetAddressSpace: Local Network Access's opt-in for an http
			// loopback target from an https page; browsers without LNA ignore it.
			res = await doFetch(url, { method: 'POST', body, signal: ctl.signal, targetAddressSpace: 'loopback' } as RequestInit);
		} catch (e) {
			throw new AnkiConnectError(
				(e as Error)?.name === 'AbortError' ? 'Anki did not answer in time' : 'Could not reach Anki',
				action,
				true
			);
		} finally {
			clearTimeout(timer);
		}
		// A 403 reaches script only when the origin is allowed by CORS some other
		// way (e.g. `*`), but say what it means when it does.
		if (res.status === 403) throw new AnkiConnectError('This site is not allowed in AnkiConnect', action);
		if (!res.ok) throw new AnkiConnectError(`AnkiConnect replied ${res.status}`, action);
		try {
			return await res.json();
		} catch {
			throw new AnkiConnectError('AnkiConnect sent a reply that is not JSON', action);
		}
	}

	async function call<T>(action: string, params?: Record<string, unknown>, ms = timeout): Promise<T> {
		return unwrap<T>(action, await post(action, requestBody(action, params, opts.key), ms));
	}

	async function multi<T>(actions: Action[]): Promise<(T | Error)[]> {
		const out: (T | Error)[] = [];
		for (const part of chunk(actions, MULTI_CHUNK)) {
			const replies = await call<unknown[]>('multi', {
				actions: part.map((a) => ({ action: a.action, version: API_VERSION, ...(a.params ? { params: a.params } : {}) }))
			});
			if (!Array.isArray(replies) || replies.length !== part.length) {
				throw new AnkiConnectError('multi returned the wrong number of results', 'multi');
			}
			replies.forEach((r, i) => {
				try {
					out.push(unwrap<T>(part[i].action, r));
				} catch (e) {
					out.push(e as Error);
				}
			});
		}
		return out;
	}

	async function connect(): Promise<ConnectResult> {
		let perm: { permission?: string; requireApikey?: boolean; version?: number };
		try {
			// No timeout worth the name: Anki holds the reply until the user answers its dialog.
			perm = await call('requestPermission', undefined, 5 * 60_000);
		} catch (e) {
			if (e instanceof AnkiConnectError && e.unreachable) return { status: 'unreachable' };
			// requestPermission arrived in AnkiConnect 2020; anything older says this.
			if (e instanceof AnkiConnectError && /unsupported action/i.test(e.message)) return { status: 'outdated' };
			throw e;
		}
		if (perm?.permission !== 'granted') return { status: 'denied' };
		const version = typeof perm.version === 'number' ? perm.version : undefined;
		if (version !== undefined && version < API_VERSION) return { status: 'outdated', version };
		if (perm.requireApikey && !opts.key) return { status: 'needs-key', version };
		return { status: 'ready', version };
	}

	return { call, multi, connect };
}
