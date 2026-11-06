import { describe, expect, it } from 'vitest';
import {
	authorizeUrl,
	campaignMembersUrl,
	findMemberOnPage,
	memberUrl,
	parseMemberDoc,
	identityUrl,
	membershipLabel,
	parseIdentity,
	parseOrigins,
	readAuthFragment,
	readSession,
	safeReturnUrl,
	signSession,
	unlocks,
	verifySession,
	type Session
} from './patreon';

const CAMPAIGN = '111';

/** A trimmed real-shaped `/identity` response: a member of ours and of someone else's. */
function identityDoc(over: { creatorOf?: string; status?: string | null; tiers?: string[] } = {}) {
	const tiers = over.tiers ?? ['t-pro'];
	return {
		data: {
			id: 'u1',
			type: 'user',
			attributes: { full_name: 'Lin Wei', thumb_url: 'https://c10.patreonusercontent.com/thumb.png', is_creator: !!over.creatorOf },
			relationships: {
				campaign: { data: over.creatorOf ? { id: over.creatorOf, type: 'campaign' } : null },
				memberships: {
					data: [
						{ id: 'm-other', type: 'member' },
						{ id: 'm-ours', type: 'member' }
					]
				}
			}
		},
		included: [
			{
				id: 'm-other',
				type: 'member',
				attributes: { patron_status: 'active_patron', currently_entitled_amount_cents: 900 },
				relationships: {
					campaign: { data: { id: '999', type: 'campaign' } },
					currently_entitled_tiers: { data: [{ id: 't-elsewhere', type: 'tier' }] }
				}
			},
			{
				id: 'm-ours',
				type: 'member',
				attributes: {
					patron_status: over.status === undefined ? 'active_patron' : over.status,
					currently_entitled_amount_cents: 500,
					campaign_lifetime_support_cents: 2500,
					pledge_relationship_start: '2026-01-02T00:00:00.000+00:00',
					next_charge_date: '2026-12-01',
					is_free_trial: false,
					is_gifted: true
				},
				relationships: {
					campaign: { data: { id: CAMPAIGN, type: 'campaign' } },
					currently_entitled_tiers: { data: tiers.map((id) => ({ id, type: 'tier' })) }
				}
			},
			{ id: 't-pro', type: 'tier', attributes: { title: 'Pro', amount_cents: 500 } },
			{ id: 't-free', type: 'tier', attributes: { title: 'Free', amount_cents: 0 } },
			{ id: 't-elsewhere', type: 'tier', attributes: { title: 'Not ours', amount_cents: 900 } }
		]
	};
}

function session(over: Partial<Session> = {}): Session {
	return { v: 1, ...parseIdentity(identityDoc(), CAMPAIGN), iat: 1000, exp: 2000, ...over };
}

describe('URLs', () => {
	it('asks only for identity and memberships', () => {
		const u = new URL(authorizeUrl({ clientId: 'cid', redirectUri: 'https://w.example/callback', state: 's1' }));
		expect(u.origin + u.pathname).toBe('https://www.patreon.com/oauth2/authorize');
		expect(u.searchParams.get('scope')).toBe('identity identity.memberships');
		expect(u.searchParams.get('state')).toBe('s1');
		expect(u.searchParams.get('redirect_uri')).toBe('https://w.example/callback');
	});

	it('includes each membership campaign, or memberships cannot be told apart', () => {
		const u = new URL(identityUrl());
		expect(u.searchParams.get('include')).toContain('memberships.campaign');
		expect(u.searchParams.get('include')).toContain('memberships.currently_entitled_tiers');
		expect(u.searchParams.get('fields[member]')).toContain('patron_status');
	});
});

describe('parseIdentity', () => {
	it('picks the membership of this campaign, not the first one', () => {
		const s = parseIdentity(identityDoc(), CAMPAIGN);
		expect(s.sub).toBe('u1');
		expect(s.name).toBe('Lin Wei');
		expect(s.creator).toBe(false);
		expect(s.member).toEqual({
			id: 'm-ours',
			status: 'active_patron',
			tiers: [{ id: 't-pro', title: 'Pro', amountCents: 500 }],
			entitledCents: 500,
			lifetimeCents: 2500,
			since: '2026-01-02T00:00:00.000+00:00',
			nextCharge: '2026-12-01',
			freeTrial: false,
			gifted: true
		});
	});

	it('gives member null to someone who only backs other creators', () => {
		expect(parseIdentity(identityDoc(), 'nope').member).toBeNull();
	});

	it('recognises the campaign owner', () => {
		expect(parseIdentity(identityDoc({ creatorOf: CAMPAIGN }), CAMPAIGN).creator).toBe(true);
		expect(parseIdentity(identityDoc({ creatorOf: '999' }), CAMPAIGN).creator).toBe(false);
	});

	it('survives a bare response', () => {
		const s = parseIdentity({ data: { id: 'u2', type: 'user' } }, CAMPAIGN);
		expect(s).toEqual({ sub: 'u2', name: 'Patreon user', image: '', creator: false, member: null, purchases: null });
	});
});

describe('unlocks', () => {
	const pro = { id: 'hsk', unlockTiers: ['t-pro'] };
	const other = { id: 'hsk', unlockTiers: ['t-other'] };

	it('opens a product whose tier the member is entitled to', () => {
		expect(unlocks(session(), pro)).toBe(true);
		expect(unlocks(session(), other)).toBe(false);
	});

	it('never opens a product with no tiers named, except for the creator', () => {
		expect(unlocks(session(), { id: 'hsk' })).toBe(false);
		expect(unlocks(session(), { id: 'hsk', unlockTiers: [] })).toBe(false);
		expect(unlocks(session({ creator: true, member: null }), { id: 'hsk' })).toBe(true);
	});

	it('opens nothing for no session or no membership', () => {
		expect(unlocks(null, pro)).toBe(false);
		expect(unlocks(session({ member: null }), pro)).toBe(false);
	});

	it('opens what the spend matched, but only when confident', () => {
		const bought = (confidence: 'exact' | 'close' | 'ambiguous') =>
			session({ member: null, purchases: { products: ['hsk', 'radicals'], confidence, shopCents: 2000 } });
		expect(unlocks(bought('exact'), { id: 'radicals' })).toBe(true);
		expect(unlocks(bought('close'), { id: 'hsk' })).toBe(true);
		expect(unlocks(bought('exact'), { id: 'cloze' })).toBe(false);
		expect(unlocks(bought('ambiguous'), { id: 'hsk' })).toBe(false);
	});
});

describe('member records (creator view)', () => {
	it('parses a /members/{id} response with its pledge events', () => {
		const { member, events } = parseMemberDoc({
			data: {
				id: 'm9',
				type: 'member',
				attributes: { patron_status: null, campaign_lifetime_support_cents: 2000 },
				relationships: {
					currently_entitled_tiers: { data: [{ id: 't-free', type: 'tier' }] },
					pledge_history: { data: [{ id: 'e1', type: 'pledge-event' }] }
				}
			},
			included: [
				{ id: 't-free', type: 'tier', attributes: { title: 'Free', amount_cents: 0 } },
				{ id: 'e1', type: 'pledge-event', attributes: { type: 'subscription', payment_status: 'Paid', amount_cents: 500 } }
			]
		});
		expect(member).toMatchObject({ id: 'm9', status: null, lifetimeCents: 2000, tiers: [{ id: 't-free', title: 'Free', amountCents: 0 }] });
		expect(events).toEqual([{ type: 'subscription', paymentStatus: 'Paid', amountCents: 500, currency: null, tierId: null }]);
	});

	it('finds a member by user id on a members page', () => {
		const page = {
			data: [
				{ id: 'm1', type: 'member', relationships: { user: { data: { id: 'u7', type: 'user' } } } },
				{ id: 'm2', type: 'member', relationships: { user: { data: { id: 'u1', type: 'user' } } } }
			],
			meta: { pagination: { cursors: { next: 'c2' } } }
		};
		expect(findMemberOnPage(page, 'u1')).toEqual({ memberId: 'm2', next: 'c2' });
		expect(findMemberOnPage(page, 'u9')).toEqual({ memberId: null, next: 'c2' });
	});

	it('asks the creator view for pledge history', () => {
		const u = new URL(memberUrl('abc-123'));
		expect(u.pathname).toBe('/api/oauth2/v2/members/abc-123');
		expect(u.searchParams.get('include')).toBe('currently_entitled_tiers,pledge_history');
		expect(u.searchParams.get('fields[pledge-event]')).toContain('payment_status');
		expect(new URL(campaignMembersUrl('111', 'cur')).searchParams.get('page[cursor]')).toBe('cur');
	});
});

describe('membershipLabel', () => {
	it('names the paid tier', () => {
		const s = { v: 1 as const, ...parseIdentity(identityDoc({ tiers: ['t-free', 't-pro'] }), CAMPAIGN), iat: 0, exp: 1 };
		expect(membershipLabel(s)).toBe('Member · Pro');
	});

	it('covers every status', () => {
		const at = (status: string | null) => ({ v: 1 as const, ...parseIdentity(identityDoc({ status, tiers: [] }), CAMPAIGN), iat: 0, exp: 1 });
		expect(membershipLabel(at('declined_patron'))).toBe('Payment declined');
		expect(membershipLabel(at('former_patron'))).toBe('Former member');
		expect(membershipLabel(at(null))).toBe('Follower');
		expect(membershipLabel(session({ member: null }))).toBe('');
		expect(membershipLabel(session({ creator: true }))).toBe('Creator');
		const buyer = { products: ['hsk'], confidence: 'exact' as const, shopCents: 1500 };
		expect(membershipLabel({ ...at(null), purchases: buyer })).toBe('Customer');
		expect(membershipLabel(session({ member: null, purchases: buyer }))).toBe('Customer');
	});
});

describe('signed session', () => {
	it('round-trips, unicode names included', async () => {
		const s = session({ name: '林伟 Lin' });
		const token = await signSession(s, 'k1');
		expect(readSession(token)).toEqual(s);
		expect(await verifySession(token, 'k1', 1500)).toEqual(s);
	});

	it('rejects a wrong key, a tampered body and an expired session', async () => {
		const token = await signSession(session(), 'k1');
		expect(await verifySession(token, 'k2', 1500)).toBeNull();

		const [, sig] = token.split('.');
		const forged = btoa(JSON.stringify(session({ creator: true }))).replace(/=+$/, '') + '.' + sig;
		expect(await verifySession(forged, 'k1', 1500)).toBeNull();

		expect(await verifySession(token, 'k1', 2000)).toBeNull();
		expect(await verifySession('garbage', 'k1', 1500)).toBeNull();
	});

	it('reads an older session with no purchases field', async () => {
		const { purchases: _drop, ...old } = session();
		const token = await signSession(old as Session, 'k1');
		expect(readSession(token)?.purchases).toBeNull();
	});

	it('reads nothing from junk', () => {
		expect(readSession(null)).toBeNull();
		expect(readSession('a.b')).toBeNull();
		expect(readSession('')).toBeNull();
	});
});

describe('redirect safety', () => {
	const allowed = parseOrigins(' https://krmanik.github.io/ , http://localhost:5173,');

	it('parses the origin list', () => {
		expect(allowed).toEqual(['https://krmanik.github.io', 'http://localhost:5173']);
	});

	it('allows only listed origins and drops the fragment', () => {
		expect(safeReturnUrl('https://krmanik.github.io/Anki-xiehanzi/account#x', allowed)).toBe(
			'https://krmanik.github.io/Anki-xiehanzi/account'
		);
		expect(safeReturnUrl('http://localhost:5173/account?a=1', allowed)).toBe('http://localhost:5173/account?a=1');
		expect(safeReturnUrl('https://evil.example/account', allowed)).toBeNull();
		expect(safeReturnUrl('https://krmanik.github.io.evil.example/', allowed)).toBeNull();
		expect(safeReturnUrl('javascript:alert(1)', allowed)).toBeNull();
		expect(safeReturnUrl('/account', allowed)).toBeNull();
		expect(safeReturnUrl(null, allowed)).toBeNull();
	});
});

describe('readAuthFragment', () => {
	it('reads a token or an error', () => {
		expect(readAuthFragment('#patreon=abc.def')).toEqual({ token: 'abc.def' });
		expect(readAuthFragment('#patreon_error=denied')).toEqual({ error: 'denied' });
		expect(readAuthFragment('#section')).toBeNull();
		expect(readAuthFragment('')).toBeNull();
	});
});
