/**
 * Patreon login for Anki-xiehanzi — a stateless Cloudflare Worker.
 *
 *   GET /login?return=<page>  → patreon.com consent screen
 *   GET /callback              → token exchange, /identity, signed session,
 *                                back to <page>#patreon=<session>
 *   GET /refresh               → (Bearer <session>) re-read the membership
 *                                and purchases with the creator token — no
 *                                second trip to Patreon after a purchase
 *   GET /session               → (Bearer <session>) verify it; the seam for
 *                                anything gated later
 *
 * Nothing is stored: the Patreon access token is used once and dropped, and
 * the session is an HMAC-signed blob the browser keeps. All the logic that can
 * be tested lives in `src/lib/patreon.ts`, shared with the site.
 *
 * Shop purchases are not in Patreon's API; they are read from what the member
 * spent (`src/lib/patreonSpend.ts`), which needs the creator token — without
 * it, login still works and `purchases` stays null.
 *
 * Secrets (wrangler secret put …): PATREON_CLIENT_SECRET, SESSION_SECRET,
 * PATREON_CREATOR_TOKEN (optional).
 * Vars (wrangler.toml): PATREON_CLIENT_ID, PATREON_CAMPAIGN_ID, ALLOWED_ORIGINS,
 * SHOP_JSON_URL.
 */
import {
	authorizeUrl,
	campaignMembersUrl,
	campaignPricingUrl,
	findMemberOnPage,
	FRAGMENT_ERROR,
	FRAGMENT_TOKEN,
	identityUrl,
	memberUrl,
	parseIdentity,
	parseMemberDoc,
	parseOrigins,
	PATREON,
	safeReturnUrl,
	signSession,
	USER_AGENT,
	verifySession,
	type Membership,
	type Purchases,
	type Session
} from '../../src/lib/patreon';
import { matchSpend, parseCampaignPricing, pricedProducts, type PricedProduct } from '../../src/lib/patreonSpend';

interface Env {
	PATREON_CLIENT_ID: string;
	PATREON_CLIENT_SECRET: string;
	PATREON_CAMPAIGN_ID: string;
	SESSION_SECRET: string;
	ALLOWED_ORIGINS: string;
	/** How long a login lasts before the site asks again. Default 7. */
	SESSION_DAYS?: string;
	/** Reads pledge history, so Shop purchases can be matched. Optional. */
	PATREON_CREATOR_TOKEN?: string;
	/** The live catalog, for product prices. */
	SHOP_JSON_URL?: string;
}

const STATE_COOKIE = 'xhz_oauth';

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const url = new URL(req.url);
		try {
			switch (url.pathname) {
				case '/login':
					return login(url, env);
				case '/callback':
					return await callback(url, req, env);
				case '/session':
					return await session(req, env);
				case '/refresh':
					return await refresh(req, env);
				case '/':
					return new Response('Anki-xiehanzi login: ok\n');
				default:
					return new Response('Not found\n', { status: 404 });
			}
		} catch (err) {
			console.error(err);
			return new Response('Login failed\n', { status: 500 });
		}
	}
};

function login(url: URL, env: Env): Response {
	const back = safeReturnUrl(url.searchParams.get('return'), parseOrigins(env.ALLOWED_ORIGINS));
	if (!back) return new Response('Unknown return page\n', { status: 400 });

	const state = crypto.randomUUID();
	// The state and the page to come back to ride in one short-lived cookie on
	// the Worker's own host. SameSite=Lax is still sent on the top-level GET
	// back from patreon.com, so this works in Safari without third-party cookies.
	const cookie = `${STATE_COOKIE}=${state}.${encodeURIComponent(back)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;
	return redirect(authorizeUrl({ clientId: env.PATREON_CLIENT_ID, redirectUri: `${url.origin}/callback`, state }), cookie);
}

async function callback(url: URL, req: Request, env: Env): Promise<Response> {
	const [state, rawBack] = splitOnce(readCookie(req, STATE_COOKIE) ?? '', '.');
	const back = safeReturnUrl(rawBack ? safeDecode(rawBack) : null, parseOrigins(env.ALLOWED_ORIGINS));
	const clear = `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

	if (!back || !state || url.searchParams.get('state') !== state) {
		return new Response('Login expired or was started elsewhere. Go back and try again.\n', {
			status: 400,
			headers: { 'Set-Cookie': clear }
		});
	}
	const fail = (code: string) => redirect(`${back}#${FRAGMENT_ERROR}=${code}`, clear);

	// The reader pressed "Deny" on Patreon's screen.
	if (url.searchParams.get('error')) return fail('denied');
	const code = url.searchParams.get('code');
	if (!code) return fail('no_code');

	const tokenRes = await fetch(`${PATREON}/api/oauth2/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			client_id: env.PATREON_CLIENT_ID,
			client_secret: env.PATREON_CLIENT_SECRET,
			redirect_uri: `${url.origin}/callback`
		})
	});
	if (!tokenRes.ok) {
		console.error('token exchange', tokenRes.status, await tokenRes.text());
		return fail('token');
	}
	const { access_token } = (await tokenRes.json()) as { access_token?: string };
	if (!access_token) return fail('token');

	const idRes = await fetch(identityUrl(), {
		headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': USER_AGENT }
	});
	if (!idRes.ok) {
		console.error('identity', idRes.status, await idRes.text());
		return fail('identity');
	}

	const who = parseIdentity(await idRes.json(), env.PATREON_CAMPAIGN_ID);
	// A login token without the `campaigns` scope cannot see which campaign its
	// user owns, so the creator is recognised by user id instead.
	if (!who.creator) who.creator = (await creatorUserId(env).catch(() => null)) === who.sub;
	const extra = await creatorView(env, who.member?.id ?? null, who.sub).catch((err) => {
		console.error('creator view', err);
		return null;
	});
	const s = stamp({ ...who, ...(extra ?? {}) }, env);
	return redirect(`${back}#${FRAGMENT_TOKEN}=${await signSession(s, env.SESSION_SECRET)}`, clear);
}

/**
 * After a purchase: the same person, their membership and purchases read again
 * with the creator token. No Patreon screen, so the page can call it the moment
 * the buyer comes back.
 */
async function refresh(req: Request, env: Env): Promise<Response> {
	const cors = corsFor(req, env);
	if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
	const old = await bearer(req, env);
	if (!old) return Response.json({ error: 'login' }, { status: 401, headers: { ...cors, 'Cache-Control': 'no-store' } });
	if (!env.PATREON_CREATOR_TOKEN) return Response.json({ error: 'unavailable' }, { status: 501, headers: cors });

	const extra = await creatorView(env, old.member?.id ?? null, old.sub);
	const { v: _v, iat: _i, exp: _e, ...who } = old;
	const s = stamp({ ...who, ...(extra ?? { member: null, purchases: null }) }, env);
	return Response.json({ token: await signSession(s, env.SESSION_SECRET), session: s }, { headers: { ...cors, 'Cache-Control': 'no-store' } });
}

async function session(req: Request, env: Env): Promise<Response> {
	const cors = corsFor(req, env);
	if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
	const s = await bearer(req, env);
	return Response.json(s ? { valid: true, session: s } : { valid: false }, {
		status: s ? 200 : 401,
		headers: { ...cors, 'Cache-Control': 'no-store' }
	});
}

/**
 * The membership as the creator sees it, plus Shop purchases matched from
 * spend. Null without a creator token. A user who has never joined (no member
 * id yet — a first purchase makes one) is looked up by user id.
 */
async function creatorView(
	env: Env,
	memberId: string | null,
	userId: string
): Promise<{ member: Membership | null; purchases: Purchases | null } | null> {
	if (!env.PATREON_CREATOR_TOKEN) return null;
	const get = async (url: string) => {
		const res = await fetch(url, { headers: { Authorization: `Bearer ${env.PATREON_CREATOR_TOKEN}`, 'User-Agent': USER_AGENT } });
		if (!res.ok) throw new Error(`${res.status} ${url.split('?')[0]}: ${await res.text()}`);
		return (await res.json()) as any;
	};

	let id = memberId;
	for (let cursor: string | null = null, pages = 0; !id && pages < 20; pages++) {
		const found = findMemberOnPage(await get(campaignMembersUrl(env.PATREON_CAMPAIGN_ID, cursor)), userId);
		id = found.memberId;
		cursor = found.next;
		if (!cursor) break;
	}
	if (!id) return { member: null, purchases: null };

	const { member, events } = parseMemberDoc(await get(memberUrl(id)));
	// Tier charges are recorded in the patron's currency; only fetch tier
	// prices when one of them needs converting.
	const foreign = events.some((e) => e.type === 'subscription' && e.currency && e.currency !== 'USD');
	const pricing = foreign ? parseCampaignPricing(await get(campaignPricingUrl(env.PATREON_CAMPAIGN_ID))) : undefined;
	const m = matchSpend(member.lifetimeCents, events, await products(env), pricing);
	return { member, purchases: { products: m.products, confidence: m.confidence, shopCents: m.shopCents } };
}

let ownerId: string | null = null;

/** The campaign owner's user id, read once per isolate with the creator token. */
async function creatorUserId(env: Env): Promise<string | null> {
	if (ownerId || !env.PATREON_CREATOR_TOKEN) return ownerId;
	const res = await fetch(`${PATREON}/api/oauth2/v2/identity?fields%5Buser%5D=full_name`, {
		headers: { Authorization: `Bearer ${env.PATREON_CREATOR_TOKEN}`, 'User-Agent': USER_AGENT }
	});
	if (!res.ok) return null;
	ownerId = ((await res.json()) as { data?: { id?: string } }).data?.id ?? null;
	return ownerId;
}

async function products(env: Env): Promise<PricedProduct[]> {
	if (!env.SHOP_JSON_URL) return [];
	const res = await fetch(env.SHOP_JSON_URL, { cf: { cacheTtl: 300 } } as RequestInit);
	return res.ok ? pricedProducts(await res.json()) : [];
}

function stamp(body: Omit<Session, 'v' | 'iat' | 'exp'>, env: Env): Session {
	const now = Math.floor(Date.now() / 1000);
	const days = Number(env.SESSION_DAYS) > 0 ? Number(env.SESSION_DAYS) : 7;
	return { v: 1, ...body, iat: now, exp: now + days * 86400 };
}

async function bearer(req: Request, env: Env): Promise<Session | null> {
	const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
	return token ? verifySession(token, env.SESSION_SECRET, Math.floor(Date.now() / 1000)) : null;
}

function corsFor(req: Request, env: Env): Record<string, string> {
	const origin = req.headers.get('Origin');
	return origin && parseOrigins(env.ALLOWED_ORIGINS).includes(origin)
		? {
				'Access-Control-Allow-Origin': origin,
				'Access-Control-Allow-Headers': 'Authorization',
				'Access-Control-Allow-Methods': 'GET',
				Vary: 'Origin'
			}
		: {};
}

function redirect(location: string, cookie?: string): Response {
	const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
	if (cookie) headers.append('Set-Cookie', cookie);
	return new Response(null, { status: 302, headers });
}

function readCookie(req: Request, name: string): string | null {
	for (const part of (req.headers.get('Cookie') ?? '').split(';')) {
		const [k, v] = splitOnce(part.trim(), '=');
		if (k === name) return v;
	}
	return null;
}

/** A cookie mangled in transit is an expired login (400), not a crash (500). */
function safeDecode(s: string): string | null {
	try {
		return decodeURIComponent(s);
	} catch {
		return null;
	}
}

function splitOnce(s: string, sep: string): [string, string] {
	const i = s.indexOf(sep);
	return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)];
}
