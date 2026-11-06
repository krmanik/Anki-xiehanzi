#!/usr/bin/env node
/**
 * Bring `static/data/shop.json` in line with the Patreon shop (`npm run shop:sync`).
 *
 * Reads the shop's public product list — the same unauthenticated endpoint the
 * Patreon shop page uses, so no token is needed — and, for each product in
 * shop.json whose `checkoutUrl` names a product variant (`?pvid=…`), writes
 * back the checkout URL, the product's post (`buyUrl`) and the price.
 * Products Patreon lists that shop.json has no entry for are printed, so a new
 * one can be added by hand (names, taglines and pictures stay hand-written).
 *
 *   npm run shop:sync            write the changes
 *   npm run shop:sync -- --check print them, change nothing (exit 1 if any)
 *
 * After a price change, check `src/lib/patreonSpend.ts`'s rule: every subset of
 * product prices must still add up to a distinct total.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CAMPAIGN_ID = '9325901';
const SHOP_FILE = path.resolve('static/data/shop.json');
const ORIGIN = 'https://www.patreon.com';
const FIELDS = 'name,url,price_cents,currency_code,checkout_url';
const check = process.argv.includes('--check');

const res = await fetch(
	`${ORIGIN}/api/campaigns/${CAMPAIGN_ID}/products?fields%5Bproduct-variant%5D=${FIELDS}`,
	{ headers: { 'User-Agent': 'Anki-xiehanzi shop sync (+https://github.com/krmanik/Anki-xiehanzi)' } }
);
if (!res.ok) {
	console.error(`Patreon answered ${res.status}; shop.json left as it is.`);
	process.exit(2);
}
const variants = new Map(((await res.json()).data ?? []).map((v) => [v.id, v.attributes]));

const shop = JSON.parse(await readFile(SHOP_FILE, 'utf8'));
const pvidOf = (url) => (url ? new URL(url, ORIGIN).searchParams.get('pvid') : null);
const seen = new Set();
const changes = [];

for (const product of shop.products) {
	const pvid = pvidOf(product.checkoutUrl);
	if (!pvid) {
		if (!product.hidden) console.log(`· ${product.id}: no checkoutUrl — Buy goes to ${product.buyUrl || shop.shop}`);
		continue;
	}
	const v = variants.get(pvid);
	if (!v) {
		console.log(`! ${product.id}: pvid ${pvid} is not in the Patreon shop any more`);
		continue;
	}
	seen.add(pvid);
	if (v.currency_code && v.currency_code !== shop.currency) {
		console.log(`! ${product.id}: Patreon prices it in ${v.currency_code}, shop.json in ${shop.currency}`);
	}
	const next = {
		checkoutUrl: new URL(v.checkout_url, ORIGIN).href,
		buyUrl: v.url,
		amount: v.price_cents / 100
	};
	const set = (label, now, then, apply) => {
		if (then === undefined || then === null || now === then) return;
		changes.push(`${product.id}: ${label} ${now ?? '—'} → ${then}`);
		apply();
	};
	set('checkoutUrl', product.checkoutUrl, next.checkoutUrl, () => (product.checkoutUrl = next.checkoutUrl));
	set('buyUrl', product.buyUrl, next.buyUrl, () => (product.buyUrl = next.buyUrl));
	set('price', product.price?.amount, next.amount, () => (product.price = { ...product.price, amount: next.amount }));
}

for (const [pvid, v] of variants) {
	if (!seen.has(pvid)) console.log(`+ on Patreon, not in shop.json: "${v.name}" · pvid ${pvid} · ${v.url}`);
}

if (!changes.length) {
	console.log('shop.json matches the Patreon shop.');
} else {
	for (const c of changes) console.log(`~ ${c}`);
	if (check) process.exit(1);
	await writeFile(SHOP_FILE, JSON.stringify(shop, null, 2) + '\n');
	console.log(`Wrote ${changes.length} change(s) to ${path.relative(process.cwd(), SHOP_FILE)}.`);
}
