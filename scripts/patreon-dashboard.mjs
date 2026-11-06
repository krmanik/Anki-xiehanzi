#!/usr/bin/env node
/**
 * Purchase-matching dashboard (`npm run patreon:dashboard`).
 *
 * Fetches every member with their pledge history, works out which Shop products
 * each one bought from what they spent (`src/lib/patreonSpend.ts` — the same
 * code the login Worker runs), and writes a self-contained page to check it by
 * eye against Patreon's own Sales page:
 *
 *   .cache/patreon/dashboard.html   (gitignored: it holds patrons' names)
 *
 *   PATREON_CREATOR_TOKEN=… npm run patreon:dashboard
 *   npm run patreon:dashboard -- --cached     # reuse the last fetch, no token
 *
 * Mark each row right / wrong on the page; "Copy verdicts" copies them
 * **without names** (amounts, match, verdict), safe to paste into a chat.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { matchSpend, parseCampaignPricing, pricedProducts } from '../src/lib/patreonSpend.ts';

const API = 'https://www.patreon.com/api/oauth2/v2';
const UA = 'Anki-xiehanzi dashboard (+https://github.com/krmanik/Anki-xiehanzi)';
const OUT_DIR = path.resolve('.cache/patreon');
const RAW = path.join(OUT_DIR, 'members-history.json');
const HTML = path.join(OUT_DIR, 'dashboard.html');
const cached = process.argv.includes('--cached');
const token = process.env.PATREON_CREATOR_TOKEN;

async function get(url) {
	const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA } });
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(`${res.status} ${url.split('?')[0]}: ${body?.errors?.[0]?.detail ?? res.statusText}`);
	return body;
}

async function fetchAll() {
	if (!token) throw new Error('Set PATREON_CREATOR_TOKEN, or pass --cached to reuse the last fetch.');
	const me = await get(`${API}/identity?include=campaign&fields%5Bcampaign%5D=name,vanity,currency`);
	const campaignId = me.data.relationships?.campaign?.data?.id;
	if (!campaignId) throw new Error('This token has no campaign.');
	const pages = [];
	let cursor = null;
	do {
		const q = new URLSearchParams({
			include: 'pledge_history,user,currently_entitled_tiers',
			'fields[member]': 'full_name,patron_status,campaign_lifetime_support_cents,currently_entitled_amount_cents,pledge_relationship_start,last_charge_date,last_charge_status,is_free_trial,is_gifted,note',
			'fields[pledge-event]': 'type,date,amount_cents,currency_code,payment_status,pledge_payment_status,tier_title,tier_id',
			'fields[user]': 'full_name,url,thumb_url',
			'fields[tier]': 'title,amount_cents',
			'page[count]': '500' // the cap when pledge_history is included
		});
		if (cursor) q.set('page[cursor]', cursor);
		const page = await get(`${API}/campaigns/${campaignId}/members?${q}`);
		pages.push(page);
		cursor = page.meta?.pagination?.cursors?.next ?? null;
	} while (cursor);
	const pricing = parseCampaignPricing(
		await get(`${API}/campaigns/${campaignId}?include=tiers&fields%5Bcampaign%5D=currency&fields%5Btier%5D=amount_cents`)
	);
	const doc = {
		fetched: new Date().toISOString(),
		pricing,
		campaign: me.included?.find((r) => r.type === 'campaign')?.attributes ?? {},
		data: pages.flatMap((p) => p.data ?? []),
		included: pages.flatMap((p) => p.included ?? [])
	};
	await mkdir(OUT_DIR, { recursive: true });
	await writeFile(RAW, JSON.stringify(doc, null, 2));
	return doc;
}

/** The last dashboard fetch, else the explorer's member dump (no pledge history). */
async function readCached() {
	try {
		return JSON.parse(await readFile(RAW, 'utf8'));
	} catch {
		const m = JSON.parse(await readFile(path.join(OUT_DIR, 'members.json'), 'utf8'));
		console.warn('No dashboard fetch yet — using the explorer dump, without pledge history (tier payments count as shop spend).\n');
		return { fetched: new Date().toISOString(), campaign: {}, data: m.data, included: m.included };
	}
}

function rows(doc, products) {
	const byKey = new Map(doc.included.map((r) => [`${r.type}:${r.id}`, r]));
	const rel = (r, n) => r.relationships?.[n]?.data;
	return doc.data.map((m) => {
		const a = m.attributes ?? {};
		const user = byKey.get(`user:${rel(m, 'user')?.id}`)?.attributes ?? {};
		const events = (rel(m, 'pledge_history') ?? [])
			.map((ref) => byKey.get(`pledge-event:${ref.id}`)?.attributes)
			.filter(Boolean)
			.map((e) => ({
				date: (e.date ?? '').slice(0, 10),
				type: e.type ?? null,
				paymentStatus: e.payment_status ?? null,
				amountCents: e.amount_cents ?? 0,
				currency: e.currency_code ?? '',
				tierId: e.tier_id ?? null,
				tier: e.tier_title ?? ''
			}));
		const match = matchSpend(a.campaign_lifetime_support_cents ?? 0, events, products, doc.pricing);
		const currencies = [...new Set(events.map((e) => e.currency).filter(Boolean))];
		return {
			id: m.id,
			name: a.full_name || user.full_name || '(no name)',
			url: user.url ?? '',
			status: a.patron_status ?? 'free',
			tiers: (rel(m, 'currently_entitled_tiers') ?? []).map((t) => byKey.get(`tier:${t.id}`)?.attributes?.title ?? t.id),
			since: (a.pledge_relationship_start ?? '').slice(0, 10),
			lastCharge: [a.last_charge_date?.slice(0, 10), a.last_charge_status].filter(Boolean).join(' '),
			note: a.note ?? '',
			events,
			currencies,
			...match
		};
	});
}

function page(doc, products, data) {
	// `<` escaped so a name can never close the script tag.
	const json = JSON.stringify({ fetched: doc.fetched, campaign: doc.campaign, products, rows: data }).replace(/</g, '\\u003c');
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Purchase check · Anki-xiehanzi</title>
<style>
:root{--bg:#f6f7f9;--surface:#fff;--ink:#16181d;--muted:#5f6672;--line:#e3e6ea;--mint:#d9f3e6;--mint-ink:#11643c;--sky:#dcecfb;--sky-ink:#14518a;--apricot:#fde7cf;--apricot-ink:#8a4b0c;--rose:#fbdde3;--rose-ink:#9b2440;--sunk:#eef0f3}
@media (prefers-color-scheme:dark){:root{--bg:#111316;--surface:#1a1d22;--ink:#eceef1;--muted:#9aa2ad;--line:#2b3038;--mint:#173a2a;--mint-ink:#8fe0b6;--sky:#162c44;--sky-ink:#9cc8f3;--apricot:#3d2a14;--apricot-ink:#f5c48d;--rose:#3e1b24;--rose-ink:#f3a3b5;--sunk:#22262c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1200px;margin:0 auto;padding:24px 16px 64px}h1{font-size:22px;margin:0 0 4px}p.sub{margin:0 0 20px;color:var(--muted)}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}.stat{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 14px;min-width:110px}.stat b{display:block;font-size:20px}
.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}button,input{font:inherit}
.chip{border:0;border-radius:999px;padding:6px 12px;background:var(--sunk);color:var(--muted);cursor:pointer;font-weight:600;font-size:13px}.chip[aria-pressed=true]{background:var(--sky-ink);color:#fff}
input[type=search]{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:6px 14px;min-width:200px}
.wrap{overflow-x:auto;background:var(--surface);border:1px solid var(--line);border-radius:14px}
table{border-collapse:collapse;width:100%;min-width:980px}th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);cursor:pointer;user-select:none;white-space:nowrap}
td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}tr:last-child td{border-bottom:0}
.pill{display:inline-block;border-radius:999px;padding:2px 9px;font-size:12px;font-weight:700;white-space:nowrap}
.exact{background:var(--mint);color:var(--mint-ink)}.close{background:var(--sky);color:var(--sky-ink)}.ambiguous{background:var(--apricot);color:var(--apricot-ink)}.unknown{background:var(--rose);color:var(--rose-ink)}.none{background:var(--sunk);color:var(--muted)}
.prod{display:inline-block;background:var(--sunk);border-radius:6px;padding:1px 7px;margin:0 4px 3px 0;font-size:13px}.alt{color:var(--muted);font-size:12px}
details summary{cursor:pointer;color:var(--muted);font-size:13px}details ul{margin:6px 0 0;padding-left:16px;font-size:12px;color:var(--muted)}
.v{display:flex;gap:4px}.v button{border:1px solid var(--line);background:var(--surface);color:var(--muted);border-radius:8px;width:32px;height:30px;cursor:pointer}
.v button[aria-pressed=true].ok{background:var(--mint);color:var(--mint-ink);border-color:transparent}.v button[aria-pressed=true].bad{background:var(--rose);color:var(--rose-ink);border-color:transparent}
a{color:var(--sky-ink)}.muted{color:var(--muted)}.right{margin-left:auto}
.btn{border:0;border-radius:999px;padding:7px 14px;background:var(--sky-ink);color:#fff;font-weight:600;cursor:pointer}
</style></head><body><main>
<h1>Purchase check</h1>
<p class="sub" id="sub"></p>
<div class="stats" id="stats"></div>
<div class="bar" id="filters"></div>
<div class="bar"><input type="search" id="q" placeholder="Search name or product"><span class="muted" id="count"></span>
<button class="btn right" id="copy">Copy verdicts (no names)</button></div>
<div class="wrap"><table><thead><tr>
<th data-k="name">Member</th><th data-k="status">Status</th><th data-k="lifetimeCents" class="num">Lifetime</th><th data-k="tierCents" class="num">Tier paid</th><th data-k="shopCents" class="num">Shop spend</th><th data-k="products">Matched products</th><th data-k="confidence">Match</th><th data-k="since">Joined</th><th>Correct?</th>
</tr></thead><tbody id="rows"></tbody></table></div>
<p class="muted" style="margin-top:14px">Shop spend = lifetime − paid tier charges. Exact = within 1% of a price sum; close = 3% under to 12% over (currency conversion). Check against Patreon → Audience → Sales. Verdicts stay in this browser.</p>
</main>
<script>
const D = ${json};
const NAMES = Object.fromEntries(D.products.map(p => [p.id, p.id]));
const ORDER = ['exact','close','ambiguous','unknown','none'];
const KEY = 'xhz.dashboard.verdicts';
let verdicts = {}; try { verdicts = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
let filter = 'shop', sortKey = 'shopCents', sortDir = -1, q = '';
const $ = id => document.getElementById(id);
const usd = c => '$' + (c / 100).toFixed(2).replace(/\\.00$/, '');
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of kids) e.append(k); return e; };

$('sub').textContent = (D.campaign.name || D.campaign.vanity || 'Campaign') + ' · fetched ' + D.fetched.slice(0, 16).replace('T', ' ') + ' · prices: ' + D.products.map(p => p.id + ' ' + usd(p.cents)).join(', ');

function stats() {
  const by = c => D.rows.filter(r => r.confidence === c).length;
  const marked = Object.values(verdicts);
  const items = [['Members', D.rows.length], ['Bought something', D.rows.filter(r => r.confidence !== 'none').length], ...ORDER.slice(0, 4).map(c => [c, by(c)]), ['Marked right', marked.filter(v => v === 'ok').length], ['Marked wrong', marked.filter(v => v === 'bad').length]];
  $('stats').replaceChildren(...items.map(([k, v]) => el('div', { className: 'stat' }, el('b', { textContent: v }), k)));
}

function filters() {
  const opts = [['shop', 'Bought something'], ['all', 'All'], ...ORDER.map(c => [c, c]), ['unmarked', 'Not checked'], ['bad', 'Marked wrong']];
  $('filters').replaceChildren(...opts.map(([k, label]) => {
    const b = el('button', { className: 'chip', textContent: label });
    b.setAttribute('aria-pressed', String(filter === k));
    b.onclick = () => { filter = k; filters(); render(); };
    return b;
  }));
}

function keep(r) {
  if (filter === 'shop' && r.confidence === 'none') return false;
  if (ORDER.includes(filter) && r.confidence !== filter) return false;
  if (filter === 'unmarked' && (verdicts[r.id] || r.confidence === 'none')) return false;
  if (filter === 'bad' && verdicts[r.id] !== 'bad') return false;
  if (q && !(r.name + ' ' + r.products.join(' ')).toLowerCase().includes(q)) return false;
  return true;
}

function cmp(a, b) {
  const x = sortKey === 'confidence' ? ORDER.indexOf(a.confidence) : sortKey === 'products' ? a.products.join() : a[sortKey];
  const y = sortKey === 'confidence' ? ORDER.indexOf(b.confidence) : sortKey === 'products' ? b.products.join() : b[sortKey];
  return (x > y ? 1 : x < y ? -1 : 0) * sortDir;
}

function verdictCell(r) {
  const wrap = el('div', { className: 'v' });
  for (const [v, label, cls] of [['ok', '✓', 'ok'], ['bad', '✗', 'bad']]) {
    const b = el('button', { className: cls, textContent: label, title: v === 'ok' ? 'Match is right' : 'Match is wrong' });
    b.setAttribute('aria-pressed', String(verdicts[r.id] === v));
    b.onclick = () => { verdicts[r.id] = verdicts[r.id] === v ? undefined : v; if (!verdicts[r.id]) delete verdicts[r.id]; try { localStorage.setItem(KEY, JSON.stringify(verdicts)); } catch {} stats(); render(); };
    wrap.append(b);
  }
  return wrap;
}

function render() {
  const list = D.rows.filter(keep).sort(cmp);
  $('count').textContent = list.length + ' shown';
  $('rows').replaceChildren(...list.map(r => {
    const who = r.url ? el('a', { href: r.url, target: '_blank', rel: 'noopener', textContent: r.name }) : el('span', { textContent: r.name });
    const hist = el('details', {}, el('summary', { textContent: r.events.length + ' pledge events' }), el('ul', {}, ...r.events.map(e => el('li', { textContent: [e.date, e.type, e.paymentStatus, e.amountCents ? (e.amountCents / 100).toFixed(2) + ' ' + e.currency : '', e.tier].filter(Boolean).join(' · ') }))));
    const prods = el('td', {}, ...r.products.map(p => el('span', { className: 'prod', textContent: NAMES[p] || p })));
    if (r.alternatives.length) prods.append(el('div', { className: 'alt', textContent: 'or: ' + r.alternatives.map(a => a.join(' + ')).join(' / ') }));
    if (r.note) prods.append(el('div', { className: 'alt', textContent: 'note: ' + r.note }));
    return el('tr', {},
      el('td', {}, who, r.events.length ? hist : ''),
      el('td', {}, el('div', { textContent: r.status.replace('_patron', '') }), el('div', { className: 'alt', textContent: [r.tiers.join(', '), r.currencies.length ? 'pays in ' + r.currencies.join('/') : '', r.unconverted ? '⚠ unconverted charge' : ''].filter(Boolean).join(' · ') })),
      el('td', { className: 'num', textContent: usd(r.lifetimeCents) }),
      el('td', { className: 'num', textContent: r.tierCents ? usd(r.tierCents) : '—' }),
      el('td', { className: 'num', textContent: r.shopCents ? usd(r.shopCents) : '—' }),
      prods,
      el('td', {}, el('span', { className: 'pill ' + r.confidence, textContent: r.confidence })),
      el('td', { className: 'muted', textContent: r.since }),
      el('td', {}, r.confidence === 'none' ? '' : verdictCell(r))
    );
  }));
}

document.querySelectorAll('th[data-k]').forEach(th => th.onclick = () => { const k = th.dataset.k; sortDir = sortKey === k ? -sortDir : -1; sortKey = k; render(); });
$('q').oninput = e => { q = e.target.value.trim().toLowerCase(); render(); };
$('copy').onclick = async () => {
  const lines = D.rows.filter(r => r.confidence !== 'none').map(r => [usd(r.lifetimeCents), usd(r.tierCents), usd(r.shopCents), r.products.join('+') || '-', r.confidence, verdicts[r.id] || 'unchecked'].join('\\t'));
  const text = ['lifetime\\ttier\\tshop\\tmatch\\tconfidence\\tverdict', ...lines].join('\\n');
  try { await navigator.clipboard.writeText(text); $('copy').textContent = 'Copied ✓'; } catch { prompt('Copy:', text); }
  setTimeout(() => $('copy').textContent = 'Copy verdicts (no names)', 1500);
};
stats(); filters(); render();
</script></body></html>
`;
}

async function main() {
	const doc = cached ? await readCached() : await fetchAll();
	const catalog = JSON.parse(await readFile(path.resolve('static/data/shop.json'), 'utf8'));
	const products = pricedProducts(catalog);
	const data = rows(doc, products);
	await mkdir(OUT_DIR, { recursive: true });
	await writeFile(HTML, page(doc, products, data));

	const count = (c) => data.filter((r) => r.confidence === c).length;
	console.log(`${data.length} members · bought something: ${data.filter((r) => r.confidence !== 'none').length}`);
	console.log(`exact ${count('exact')} · close ${count('close')} · ambiguous ${count('ambiguous')} · unknown ${count('unknown')}`);
	console.log(`\nOpen: ${HTML}`);
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
