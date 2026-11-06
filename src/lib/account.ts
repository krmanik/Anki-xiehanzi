/**
 * The browser half of the Patreon login: where the Worker lives and where the
 * session is kept. The logic is in `$lib/patreon` (shared with the Worker).
 *
 * The Worker's URL comes from `VITE_PATREON_AUTH_URL` at build time (a GitHub
 * Actions variable in production, `.env.local` in dev). Unset, `/account` says
 * login is not set up rather than linking nowhere.
 */
import { isExpired, readAuthFragment, readSession, type Session } from '$lib/patreon';

export const AUTH_URL: string = (import.meta.env.VITE_PATREON_AUTH_URL ?? '').replace(/\/+$/, '');

/** localStorage key of the signed session; other tabs watch it (`storage` event). */
export const TOKEN_KEY = 'xhz.patreon.session';
const KEY = TOKEN_KEY;

/** The only place `/auth?next=` may send the browser after a login. */
const CHECKOUT_PREFIX = 'https://www.patreon.com/';

/**
 * Where `/auth` goes after storing the login: a Patreon page (the checkout a
 * Buy started), else null. Anything else is an open redirect.
 */
export function safeNext(raw: string | null | undefined): string | null {
	if (!raw) return null;
	try {
		const url = new URL(raw);
		return url.href.startsWith(CHECKOUT_PREFIX) ? url.href : null;
	} catch {
		return null;
	}
}

/** A path on this site (from `/auth?back=`), else null. */
export function safeBack(raw: string | null | undefined, origin: string): string | null {
	if (!raw) return null;
	try {
		const url = new URL(raw, origin);
		return url.origin === origin ? url.pathname + url.search : null;
	} catch {
		return null;
	}
}

/**
 * The page the Worker hands the login back to: `/auth`, which stores it and
 * then goes on to `next` (a checkout) or closes the tab. `base` is the site's
 * path prefix.
 */
export function authPageUrl(origin: string, base: string, opts: { next?: string; back?: string } = {}): string {
	const url = new URL(`${base}/auth`, origin);
	if (opts.next) url.searchParams.set('next', opts.next);
	if (opts.back) url.searchParams.set('back', opts.back);
	return url.href;
}

/** Where "Log in with Patreon" goes; the Worker sends the browser back to `returnTo`. */
export function loginUrl(returnTo: string): string {
	return `${AUTH_URL}/login?${new URLSearchParams({ return: returnTo })}`;
}

export function loadToken(): string | null {
	try {
		return localStorage.getItem(KEY);
	} catch {
		return null;
	}
}

export function storeToken(token: string): void {
	try {
		localStorage.setItem(KEY, token);
	} catch {
		// Private mode: the login lasts for this page view only.
	}
}

export function clearToken(): void {
	try {
		localStorage.removeItem(KEY);
	} catch {
		// Nothing stored to clear.
	}
}

export type AccountState =
	| { kind: 'out'; error?: string; expired?: boolean }
	| { kind: 'in'; session: Session; token: string };

/**
 * Read the login: a fresh one from the URL fragment (stored, and the caller
 * clears the hash), else the stored one. An expired session reads as logged
 * out, flagged so the page can say why.
 */
export function resolveAccount(hash: string, nowSeconds: number): AccountState & { fromFragment: boolean } {
	const frag = readAuthFragment(hash);
	if (frag && 'error' in frag) return { kind: 'out', error: frag.error, fromFragment: true };

	const token = (frag && 'token' in frag ? frag.token : null) ?? loadToken();
	const session = readSession(token);
	if (!token || !session) {
		if (token) clearToken();
		return { kind: 'out', fromFragment: !!frag };
	}
	if (isExpired(session, nowSeconds)) {
		clearToken();
		return { kind: 'out', expired: true, fromFragment: !!frag };
	}
	if (frag) storeToken(token);
	return { kind: 'in', session, token, fromFragment: !!frag };
}

const ERRORS: Record<string, string> = {
	login: 'Your login expired. Log in again.',
	denied: 'Login was cancelled on Patreon.',
	token: 'Patreon did not accept the login. Try again.',
	identity: 'Patreon did not answer. Try again in a minute.',
	no_code: 'Patreon sent no login code. Try again.'
};

export function errorText(code: string): string {
	return ERRORS[code] ?? 'Login failed. Try again.';
}

/**
 * Re-read the membership and purchases through the Worker (creator token, no
 * Patreon screen). Returns the new token, `null` when the login is no longer
 * valid, or `undefined` when the Worker cannot refresh (no creator token,
 * network) — the caller keeps what it has.
 */
export async function refreshToken(token: string): Promise<string | null | undefined> {
	if (!AUTH_URL) return undefined;
	try {
		const res = await fetch(`${AUTH_URL}/refresh`, { headers: { Authorization: `Bearer ${token}` } });
		if (res.status === 401) return null;
		if (!res.ok) return undefined;
		const body = (await res.json()) as { token?: string };
		return body.token ?? undefined;
	} catch {
		return undefined;
	}
}

// ── A purchase in progress ─────────────────────────────────────────────────
// Buy opens Patreon in a new tab and this page stays put. What was bought is
// remembered so that coming back to the tab (or to the site later that day)
// can check it and say "unlocked" without the buyer doing anything.

const PENDING_KEY = 'xhz.patreon.pending';
/** Long enough for a slow checkout, short enough not to nag tomorrow. */
export const PENDING_TTL_MS = 6 * 60 * 60 * 1000;

export interface PendingPurchase {
	product: string;
	at: number;
}

export function markPending(product: string, now = Date.now()): void {
	try {
		localStorage.setItem(PENDING_KEY, JSON.stringify({ product, at: now } satisfies PendingPurchase));
	} catch {
		// No storage: the buyer can still press "Check my purchases".
	}
}

export function readPending(now = Date.now()): PendingPurchase | null {
	try {
		const p = JSON.parse(localStorage.getItem(PENDING_KEY) ?? 'null') as PendingPurchase | null;
		if (p && typeof p.product === 'string' && now - p.at < PENDING_TTL_MS) return p;
		if (p) localStorage.removeItem(PENDING_KEY);
	} catch {
		// Unreadable entry: treat as none.
	}
	return null;
}

export function clearPending(): void {
	try {
		localStorage.removeItem(PENDING_KEY);
	} catch {
		// Nothing to clear.
	}
}
