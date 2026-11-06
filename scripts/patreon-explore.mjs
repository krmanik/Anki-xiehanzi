#!/usr/bin/env node
/**
 * What does the Patreon API know about this campaign? (`npm run patreon:explore`)
 *
 * A hand-run tool. Reads everything the v2 API exposes with the creator's own
 * token — campaign, tiers, benefits, members, posts, webhooks — prints a
 * summary, and saves the raw JSON:API responses to `.cache/patreon/` (gitignored:
 * the member dump holds patrons' names) so the shapes can be read at leisure.
 *
 *   PATREON_CREATOR_TOKEN=… npm run patreon:explore
 *   PATREON_CREATOR_TOKEN=… npm run patreon:explore -- --emails --list
 *
 * --emails  also request member emails (scope campaigns.members[email])
 * --list    print one line per member (name, status, tier, lifetime $)
 *
 * The token is "Creator's Access Token" on
 * https://www.patreon.com/portal/registration/register-clients — never commit it.
 * The API has no resource for Shop sales, refunds, exit surveys or blocked
 * users; those dashboard pages are CSV exports only.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API = 'https://www.patreon.com/api/oauth2/v2';
const UA = 'Anki-xiehanzi explorer (+https://github.com/krmanik/Anki-xiehanzi)';
const OUT = path.resolve('.cache/patreon');
const args = new Set(process.argv.slice(2));
const token = process.env.PATREON_CREATOR_TOKEN;

if (!token) {
	console.error('Set PATREON_CREATOR_TOKEN (Creator\'s Access Token from patreon.com/portal/registration/register-clients).');
	process.exit(1);
}

const F = {
	user: 'full_name,vanity,url,image_url,thumb_url,is_creator,created,is_email_verified,social_connections',
	campaign: [
		'created_at', 'creation_name', 'currency', 'is_monthly', 'is_charged_immediately', 'is_nsfw',
		'name', 'one_liner', 'patron_count', 'pay_per_name', 'pledge_url', 'published_at', 'summary',
		'url', 'vanity', 'image_url', 'image_small_url', 'thanks_msg', 'discord_server_id', 'has_rss'
	].join(','),
	tier: 'title,amount_cents,description,patron_count,post_count,published,published_at,remaining,user_limit,requires_shipping,url,discord_role_ids,image_url',
	benefit: 'title,description,benefit_type,rule_type,is_published,is_deleted,is_ended,tiers_count,created_at,next_deliverable_due_date,delivered_deliverables_count,not_delivered_deliverables_count',
	member: [
		'full_name', 'patron_status', 'currently_entitled_amount_cents', 'will_pay_amount_cents',
		'campaign_lifetime_support_cents', 'pledge_relationship_start', 'pledge_cadence',
		'last_charge_date', 'last_charge_status', 'next_charge_date', 'is_free_trial', 'is_gifted', 'note',
		...(args.has('--emails') ? ['email'] : [])
	].join(','),
	post: 'title,url,published_at,is_paid,is_public,tiers,embed_url,app_id,app_status',
	webhook: 'triggers,uri,paused,last_attempted_at,num_consecutive_times_failed',
	pledgeEvent: 'type,date,amount_cents,currency_code,payment_status,pledge_payment_status,tier_id,tier_title'
};

async function get(pathAndQuery) {
	const res = await fetch(`${API}${pathAndQuery}`, {
		headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA }
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		const err = body?.errors?.[0];
		throw new Error(`${res.status} ${pathAndQuery.split('?')[0]}: ${err?.detail ?? err?.title ?? JSON.stringify(body).slice(0, 300)}`);
	}
	return body;
}

/** Every page of a collection, following meta.pagination.cursors.next. */
async function getAll(base, params) {
	const pages = [];
	let cursor = null;
	do {
		const q = new URLSearchParams(params);
		q.set('page[count]', '500');
		if (cursor) q.set('page[cursor]', cursor);
		const page = await get(`${base}?${q}`);
		pages.push(page);
		cursor = page.meta?.pagination?.cursors?.next ?? null;
	} while (cursor);
	return {
		data: pages.flatMap((p) => p.data ?? []),
		included: pages.flatMap((p) => p.included ?? []),
		meta: pages.at(-1)?.meta
	};
}

async function save(name, doc) {
	await mkdir(OUT, { recursive: true });
	await writeFile(path.join(OUT, `${name}.json`), JSON.stringify(doc, null, 2));
}

const money = (cents, cur = 'USD') => `${cur === 'USD' ? '$' : cur + ' '}${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;
const index = (included) => new Map(included.map((r) => [`${r.type}:${r.id}`, r]));
const rel = (r, name) => r.relationships?.[name]?.data;
const h = (s) => console.log(`\n── ${s} ${'─'.repeat(Math.max(0, 60 - s.length))}`);

async function main() {
	// Who the token belongs to, and their campaign.
	const me = await get(`/identity?${new URLSearchParams({ include: 'campaign', 'fields[user]': F.user, 'fields[campaign]': 'name,vanity' })}`);
	await save('identity', me);
	const campaignId = rel(me.data, 'campaign')?.id;
	h('You');
	console.log(`${me.data.attributes.full_name} · user id ${me.data.id} · creator: ${me.data.attributes.is_creator}`);
	if (!campaignId) throw new Error('This token has no campaign — is it a creator token?');

	// Campaign + tiers + benefits.
	const camp = await get(
		`/campaigns/${campaignId}?${new URLSearchParams({
			include: 'tiers,benefits,creator,tiers.benefits',
			'fields[campaign]': F.campaign,
			'fields[tier]': F.tier,
			'fields[benefit]': F.benefit,
			'fields[user]': 'full_name'
		})}`
	);
	await save('campaign', camp);
	const c = camp.data.attributes;
	const cur = c.currency ?? 'USD';
	h('Campaign');
	console.log(`${c.name || c.vanity} · id ${campaignId}  ← PATREON_CAMPAIGN_ID`);
	console.log(`${c.patron_count} patrons · ${c.is_monthly ? 'monthly' : 'per creation'} · ${c.currency} · ${c.url}`);

	const byKey = index(camp.included ?? []);
	const tiers = (camp.included ?? []).filter((r) => r.type === 'tier');
	h(`Tiers (${tiers.length})  — ids go in shop.json "unlockTiers"`);
	for (const t of tiers.sort((a, b) => a.attributes.amount_cents - b.attributes.amount_cents)) {
		const a = t.attributes;
		const perks = (rel(t, 'benefits') ?? []).map((b) => byKey.get(`benefit:${b.id}`)?.attributes?.title).filter(Boolean);
		console.log(
			`${t.id.padEnd(10)} ${money(a.amount_cents, cur).padStart(7)}  ${a.title || '(untitled)'}` +
				`  · ${a.patron_count ?? 0} patrons${a.published ? '' : ' · unpublished'}` +
				(perks.length ? `\n${' '.repeat(20)}benefits: ${perks.join(' · ')}` : '')
		);
	}

	const benefits = (camp.included ?? []).filter((r) => r.type === 'benefit');
	h(`Benefits (${benefits.length})`);
	for (const b of benefits) {
		const a = b.attributes;
		console.log(`${b.id.padEnd(10)} ${a.title} · ${a.benefit_type ?? '?'} · ${a.rule_type ?? '?'} · on ${a.tiers_count ?? 0} tiers`);
	}

	// Members (the "Relationship manager" page).
	const members = await getAll(`/campaigns/${campaignId}/members`, {
		include: 'currently_entitled_tiers,user',
		'fields[member]': F.member,
		'fields[tier]': 'title',
		'fields[user]': 'full_name,url'
	});
	await save('members', members);
	const mi = index(members.included);
	const count = (f) => members.data.reduce((acc, m) => ((acc[f(m)] = (acc[f(m)] ?? 0) + 1), acc), {});
	const sum = (f) => members.data.reduce((s, m) => s + (m.attributes[f] ?? 0), 0);
	h(`Members (${members.data.length}, free members included)`);
	console.log('by status:', count((m) => m.attributes.patron_status ?? 'free / follower'));
	console.log(
		'by tier:  ',
		count((m) => (rel(m, 'currently_entitled_tiers') ?? []).map((t) => mi.get(`tier:${t.id}`)?.attributes?.title ?? t.id).join(' + ') || 'none')
	);
	console.log(`monthly now: ${money(sum('currently_entitled_amount_cents'), cur)} · lifetime: ${money(sum('campaign_lifetime_support_cents'), cur)}`);
	console.log(
		`free trials: ${members.data.filter((m) => m.attributes.is_free_trial).length} · gifted: ${members.data.filter((m) => m.attributes.is_gifted).length}` +
			` · last charge declined: ${members.data.filter((m) => m.attributes.last_charge_status === 'Declined').length}`
	);
	if (args.has('--list')) {
		for (const m of members.data) {
			const a = m.attributes;
			const t = (rel(m, 'currently_entitled_tiers') ?? []).map((x) => mi.get(`tier:${x.id}`)?.attributes?.title).filter(Boolean).join('+');
			console.log(`  ${(a.full_name ?? '').padEnd(28)} ${(a.patron_status ?? 'free').padEnd(16)} ${t.padEnd(14)} ${money(a.campaign_lifetime_support_cents ?? 0, cur)}${a.email ? '  ' + a.email : ''}`);
		}
	}

	// Pledge history of the first few members: what payment events look like.
	const sample = members.data.slice(0, 3);
	const history = [];
	for (const m of sample) {
		history.push(
			await get(`/members/${m.id}?${new URLSearchParams({ include: 'pledge_history', 'fields[member]': 'patron_status', 'fields[pledge-event]': F.pledgeEvent })}`)
		);
	}
	await save('pledge-history-sample', history);
	const events = history.flatMap((d) => (d.included ?? []).filter((r) => r.type === 'pledge-event'));
	h(`Pledge events (first ${sample.length} members)`);
	console.log('by type:   ', events.reduce((a, e) => ((a[e.attributes.type] = (a[e.attributes.type] ?? 0) + 1), a), {}));
	console.log('by payment:', events.reduce((a, e) => ((a[e.attributes.payment_status ?? '—'] = (a[e.attributes.payment_status ?? '—'] ?? 0) + 1), a), {}));

	// Posts.
	const posts = await getAll(`/campaigns/${campaignId}/posts`, { 'fields[post]': F.post });
	await save('posts', posts);
	h(`Posts (${posts.data.length})`);
	console.log(`public: ${posts.data.filter((p) => p.attributes.is_public).length} · paid: ${posts.data.filter((p) => p.attributes.is_paid).length}`);
	for (const p of posts.data.slice(-8).reverse()) {
		const a = p.attributes;
		console.log(`  ${(a.published_at ?? '').slice(0, 10)}  ${a.is_public ? 'public ' : 'members'}  ${a.title}  ${a.url ? 'https://www.patreon.com' + a.url : ''}`);
	}

	// Webhooks this client owns.
	try {
		const hooks = await get(`/webhooks?${new URLSearchParams({ 'fields[webhook]': F.webhook })}`);
		await save('webhooks', hooks);
		h(`Webhooks (${hooks.data.length})`);
		for (const w of hooks.data) console.log(`  ${w.attributes.uri} · ${w.attributes.triggers.join(', ')}${w.attributes.paused ? ' · paused' : ''}`);
	} catch (err) {
		h('Webhooks');
		console.log(`  not readable: ${err.message}`);
	}

	h('Not in the API');
	console.log('Shop sales · refunds · exit surveys · blocked users — dashboard CSV exports only.');
	console.log(`\nRaw responses: ${path.relative(process.cwd(), OUT)}/ (gitignored — holds patron names)`);
}

main().catch((err) => {
	console.error(`\n${err.message}`);
	if (/401/.test(err.message)) console.error('Token rejected — refresh it on the clients page.');
	process.exit(1);
});
