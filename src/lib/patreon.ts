/**
 * Patreon login: the pure half.
 *
 * Shared by the site (`/account`) and the Cloudflare Worker in `worker/`, so it
 * imports nothing from SvelteKit and uses only what both runtimes have
 * (`fetch`-free; WebCrypto, `btoa`/`atob`, `TextEncoder`).
 *
 * The flow, with no database anywhere:
 *   site → Worker `/login` → patreon.com consent → Worker `/callback`
 *   → Patreon token exchange + `/identity` → a **signed session** handed back
 *   to the site in the URL fragment (`#patreon=…`), kept in localStorage.
 *
 * The session is `<payload>.<HMAC-SHA256>`, both base64url. The site only
 * *reads* the payload to draw the page; anything that must be trusted (a gated
 * download, later) goes back to the Worker, which verifies the signature.
 * The Patreon access token is used once in `/callback` and thrown away.
 *
 * What Patreon can tell us is memberships only: the API has no resource for
 * Shop (one-time) purchases. So a product is "unlocked" by the tiers listed in
 * its `unlockTiers` in `static/data/shop.json`, or by being the creator.
 */

import { isConfident, type MatchConfidence, type PledgeEventLite } from './patreonSpend';

export const PATREON = 'https://www.patreon.com';
export const PATREON_API = `${PATREON}/api/oauth2/v2`;

/** No email, no address: the login needs who you are and what you back. */
export const LOGIN_SCOPES = 'identity identity.memberships';

/** Patreon drops API calls without one (403). */
export const USER_AGENT = 'Anki-xiehanzi login (+https://github.com/krmanik/Anki-xiehanzi)';

/** The fragment keys the Worker hands back to the site. */
export const FRAGMENT_TOKEN = 'patreon';
export const FRAGMENT_ERROR = 'patreon_error';

export type PatronStatus = 'active_patron' | 'declined_patron' | 'former_patron' | null;

export interface SessionTier {
	id: string;
	title: string;
	amountCents: number;
}

export interface Membership {
	/** The member id (not the user id): what `/members/{id}` takes. */
	id: string;
	status: PatronStatus;
	/** `currently_entitled_tiers`: Patreon's own answer to "what does this person get". */
	tiers: SessionTier[];
	entitledCents: number;
	lifetimeCents: number;
	since: string | null;
	nextCharge: string | null;
	freeTrial: boolean;
	gifted: boolean;
}

export interface Purchases {
	products: string[];
	confidence: MatchConfidence;
	shopCents: number;
}

export interface Session {
	v: 1;
	/** Patreon user id. */
	sub: string;
	name: string;
	image: string;
	/** The person who owns the campaign: everything is unlocked for them. */
	creator: boolean;
	/** Their membership of *this* campaign, or null when they have none. */
	member: Membership | null;
	/**
	 * Shop products read from what they spent (`patreonSpend.ts`). Null when
	 * the Worker has no creator token to read pledge history with.
	 */
	purchases: Purchases | null;
	/** Seconds since the epoch. */
	iat: number;
	exp: number;
}

// ── URLs ────────────────────────────────────────────────────────────────────

export function authorizeUrl(opts: { clientId: string; redirectUri: string; state: string }): string {
	const q = new URLSearchParams({
		response_type: 'code',
		client_id: opts.clientId,
		redirect_uri: opts.redirectUri,
		scope: LOGIN_SCOPES,
		state: opts.state
	});
	return `${PATREON}/oauth2/authorize?${q}`;
}

const MEMBER_FIELDS = [
	'patron_status',
	'currently_entitled_amount_cents',
	'campaign_lifetime_support_cents',
	'pledge_relationship_start',
	'next_charge_date',
	'is_free_trial',
	'is_gifted'
].join(',');

/**
 * `/identity` with every field the session needs. v2 returns only `type` and
 * `id` unless fields are asked for, and relationship data only for what is
 * included — hence `memberships.campaign`, without which a membership cannot be
 * told apart from one to somebody else's campaign.
 */
export function identityUrl(): string {
	const q = new URLSearchParams({
		include: 'campaign,memberships,memberships.campaign,memberships.currently_entitled_tiers',
		'fields[user]': 'full_name,image_url,thumb_url,is_creator',
		'fields[member]': MEMBER_FIELDS,
		'fields[tier]': 'title,amount_cents'
	});
	return `${PATREON_API}/identity?${q}`;
}

// ── JSON:API parsing ────────────────────────────────────────────────────────

export type Ref = { id: string; type: string };

export interface Resource {
	id: string;
	type: string;
	attributes?: Record<string, unknown>;
	relationships?: Record<string, { data?: Ref | Ref[] | null }>;
}

interface IdentityDoc {
	data: Resource;
	included?: Resource[];
}

function one(r: Resource, rel: string): Ref | null {
	const d = r.relationships?.[rel]?.data;
	return d && !Array.isArray(d) ? d : null;
}

function many(r: Resource, rel: string): Ref[] {
	const d = r.relationships?.[rel]?.data;
	return Array.isArray(d) ? d : [];
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/**
 * The session body (no times yet) from a `/identity` response, for one
 * campaign. A user with memberships elsewhere but not here gets `member: null`.
 */
export function parseIdentity(doc: IdentityDoc, campaignId: string): Omit<Session, 'v' | 'iat' | 'exp'> {
	const user = doc.data;
	const included = doc.included ?? [];
	const byKey = new Map(included.map((r) => [`${r.type}:${r.id}`, r]));
	const a = user.attributes ?? {};

	const ownCampaign = one(user, 'campaign');
	const creator = !!campaignId && ownCampaign?.id === campaignId;

	const memberRes = many(user, 'memberships')
		.map((ref) => byKey.get(`member:${ref.id}`))
		.find((m): m is Resource => !!m && one(m, 'campaign')?.id === campaignId);

	return {
		sub: user.id,
		name: str(a.full_name) || 'Patreon user',
		image: str(a.thumb_url) || str(a.image_url),
		creator,
		member: memberRes ? parseMember(memberRes, byKey) : null,
		purchases: null
	};
}

/** One `member` resource, its tiers looked up in the same response's `included`. */
export function parseMember(memberRes: Resource, byKey: Map<string, Resource>): Membership {
	const m = memberRes.attributes ?? {};
	return {
		id: memberRes.id,
		status: (str(m.patron_status) || null) as PatronStatus,
		tiers: many(memberRes, 'currently_entitled_tiers').map((ref) => {
			const t = byKey.get(`tier:${ref.id}`)?.attributes ?? {};
			return { id: ref.id, title: str(t.title), amountCents: num(t.amount_cents) };
		}),
		entitledCents: num(m.currently_entitled_amount_cents),
		lifetimeCents: num(m.campaign_lifetime_support_cents),
		since: strOrNull(m.pledge_relationship_start),
		nextCharge: strOrNull(m.next_charge_date),
		freeTrial: m.is_free_trial === true,
		gifted: m.is_gifted === true
	};
}

/** A `/members/{id}` response → the membership plus its pledge events. */
export function parseMemberDoc(doc: { data: Resource; included?: Resource[] }): {
	member: Membership;
	events: PledgeEventLite[];
} {
	const included = doc.included ?? [];
	const byKey = new Map(included.map((r) => [`${r.type}:${r.id}`, r]));
	const events = many(doc.data, 'pledge_history')
		.map((ref) => byKey.get(`pledge-event:${ref.id}`)?.attributes)
		.filter((e): e is Record<string, unknown> => !!e)
		.map((e) => ({
			type: strOrNull(e.type),
			paymentStatus: strOrNull(e.payment_status),
			amountCents: num(e.amount_cents),
			currency: strOrNull(e.currency_code),
			tierId: strOrNull(e.tier_id)
		}));
	return { member: parseMember(doc.data, byKey), events };
}

/** The member record as the creator sees it, with pledge history. Creator token only. */
export function memberUrl(memberId: string): string {
	const q = new URLSearchParams({
		include: 'currently_entitled_tiers,pledge_history',
		'fields[member]': MEMBER_FIELDS,
		'fields[tier]': 'title,amount_cents',
		'fields[pledge-event]': 'type,payment_status,amount_cents,currency_code,tier_id'
	});
	return `${PATREON_API}/members/${encodeURIComponent(memberId)}?${q}`;
}

/** The campaign currency and every tier's price in it (see `parseCampaignPricing`). */
export function campaignPricingUrl(campaignId: string): string {
	const q = new URLSearchParams({ include: 'tiers', 'fields[campaign]': 'currency', 'fields[tier]': 'amount_cents' });
	return `${PATREON_API}/campaigns/${encodeURIComponent(campaignId)}?${q}`;
}

/** One page of the campaign's members, just enough to find one by user id. */
export function campaignMembersUrl(campaignId: string, cursor?: string | null): string {
	const q = new URLSearchParams({ include: 'user', 'fields[member]': 'patron_status', 'fields[user]': 'full_name', 'page[count]': '1000' });
	if (cursor) q.set('page[cursor]', cursor);
	return `${PATREON_API}/campaigns/${encodeURIComponent(campaignId)}/members?${q}`;
}

/** The member id belonging to a user id on one page of `campaignMembersUrl`, plus the next cursor. */
export function findMemberOnPage(
	page: { data?: Resource[]; meta?: { pagination?: { cursors?: { next?: string | null } } } },
	userId: string
): { memberId: string | null; next: string | null } {
	const hit = (page.data ?? []).find((m) => one(m, 'user')?.id === userId);
	return { memberId: hit?.id ?? null, next: page.meta?.pagination?.cursors?.next ?? null };
}

// ── Access ──────────────────────────────────────────────────────────────────

/**
 * True when the session owns a product: the creator owns everything; a member
 * owns what their tiers unlock (`unlockTiers`) and what their spend matched
 * with confidence.
 */
export function unlocks(session: Session | null, product: { id: string; unlockTiers?: readonly string[] }): boolean {
	if (!session) return false;
	if (session.creator) return true;
	const p = session.purchases;
	if (p && isConfident(p.confidence) && p.products.includes(product.id)) return true;
	if (!product.unlockTiers?.length || !session.member) return false;
	const have = new Set(session.member.tiers.map((t) => t.id));
	return product.unlockTiers.some((id) => have.has(id));
}

/** One short line for the account header; empty when there is nothing to say. */
export function membershipLabel(session: Session): string {
	if (session.creator) return 'Creator';
	const m = session.member;
	if (!m) return session.purchases?.products.length ? 'Customer' : '';
	const paid = m.tiers.filter((t) => t.amountCents > 0);
	const tier = (paid[0] ?? m.tiers[0])?.title;
	switch (m.status) {
		case 'active_patron':
			return tier ? `Member · ${tier}` : 'Member';
		case 'declined_patron':
			return 'Payment declined';
		case 'former_patron':
			return 'Former member';
		default:
			if (session.purchases?.products.length) return 'Customer';
			return tier ? `Free member · ${tier}` : 'Follower';
	}
}

export function isExpired(session: Session, nowSeconds: number): boolean {
	return !(session.exp > nowSeconds);
}

// ── Signed session ──────────────────────────────────────────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64url(bytes: Uint8Array): string {
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
	const p = s.replace(/-/g, '+').replace(/_/g, '/');
	const bin = atob(p + '==='.slice((p.length + 3) % 4));
	const out = new Uint8Array(new ArrayBuffer(bin.length));
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

function hmacKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
	return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export async function signSession(session: Session, secret: string): Promise<string> {
	const body = toB64url(enc.encode(JSON.stringify(session)));
	const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, 'sign'), enc.encode(body));
	return `${body}.${toB64url(new Uint8Array(sig))}`;
}

/** The payload, without checking the signature. For drawing the page only. */
export function readSession(token: string | null | undefined): Session | null {
	if (!token) return null;
	const [body, sig] = token.split('.');
	if (!body || !sig) return null;
	try {
		const s = JSON.parse(dec.decode(fromB64url(body))) as Session;
		if (!(s && s.v === 1 && typeof s.sub === 'string' && typeof s.exp === 'number')) return null;
		return { ...s, purchases: s.purchases ?? null };
	} catch {
		return null;
	}
}

/** The payload when the signature is good and it has not expired; else null. */
export async function verifySession(token: string, secret: string, nowSeconds: number): Promise<Session | null> {
	const [body, sig] = token.split('.');
	if (!body || !sig) return null;
	let ok = false;
	try {
		ok = await crypto.subtle.verify('HMAC', await hmacKey(secret, 'verify'), fromB64url(sig), enc.encode(body));
	} catch {
		return null;
	}
	if (!ok) return null;
	const s = readSession(token);
	return s && !isExpired(s, nowSeconds) ? s : null;
}

// ── Redirect safety and the hand-back ───────────────────────────────────────

/**
 * Where `/callback` may send the browser: only a page on an allowed origin,
 * with any fragment dropped (the Worker writes its own). Anything else is an
 * open redirect and gets null.
 */
export function safeReturnUrl(raw: string | null | undefined, allowedOrigins: readonly string[]): string | null {
	if (!raw) return null;
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	if (!allowedOrigins.includes(url.origin)) return null;
	url.hash = '';
	return url.href;
}

export function parseOrigins(list: string | undefined): string[] {
	return (list ?? '')
		.split(',')
		.map((s) => s.trim().replace(/\/+$/, ''))
		.filter(Boolean);
}

/** What the Worker left in the fragment, if anything. */
export function readAuthFragment(hash: string): { token: string } | { error: string } | null {
	const q = new URLSearchParams(hash.replace(/^#/, ''));
	const token = q.get(FRAGMENT_TOKEN);
	if (token) return { token };
	const error = q.get(FRAGMENT_ERROR);
	if (error) return { error };
	return null;
}
