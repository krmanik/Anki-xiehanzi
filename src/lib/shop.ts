/**
 * The shop.
 *
 * Everything paid lives on Patreon — there is no checkout here and no payment
 * code in this repo. The site's job is the storefront: what each product is,
 * what it costs, and one link that leaves for the seller. So the whole catalog
 * is one committed file, `static/data/shop.json`, edited by hand; nothing
 * derives a price and nothing fetches Patreon at runtime (their shop is
 * JS-rendered and its CDN URLs expire).
 *
 * A product with `price.amount` of 0 has no price set yet and is rendered as
 * "See price on Patreon" rather than "$0" — a free-looking paid product is
 * worse than no number at all.
 */

import { base } from '$app/paths';
import type { Hue } from '$lib/ui/styles';

export interface ShopPrice {
	/** In `currency` units. 0 means "not priced yet" — see `formatPrice`. */
	amount: number;
	/** Overrides the manifest's currency for this one product. */
	currency?: string;
	/** What the price buys, when it is not the whole product: "per level". */
	unit?: string;
}

export interface ShopSpec {
	label: string;
	value: string;
}

export interface ShopProduct {
	id: string;
	/**
	 * Kept in the catalog but off the page — a product still being built. Its
	 * copy is written and its picture slot is reserved; flipping this to false
	 * ships it.
	 */
	hidden?: boolean;
	name: string;
	tagline: string;
	/** Corner ribbon: "New", "Most popular". Empty for none. */
	badge?: string;
	price: ShopPrice;
	/** Filename under `static/img/shop/`. Missing file → generated tile. */
	image?: string;
	imageAlt?: string;
	/** The product's post on Patreon: details, and the download once bought. */
	buyUrl: string;
	/**
	 * Patreon's checkout for this product, when it has a direct one (copy the
	 * address the shop's own Buy button goes to). Buy prefers it: one page fewer
	 * between wanting the deck and paying for it.
	 */
	checkoutUrl?: string;
	description: string;
	highlights: string[];
	specs?: ShopSpec[];
	/** The free thing on this site that covers the same ground. */
	freeAlternative?: { label: string; href: string };
	/**
	 * Patreon tier ids whose members get this product (see `/account`). Tier
	 * ids come from `npm run patreon:explore`. Shop (one-time) purchases cannot
	 * be checked — Patreon's API has no resource for them.
	 */
	unlockTiers?: string[];
}

export interface ShopManifest {
	generated: string;
	currency: string;
	/** The storefront itself, for "see everything on Patreon". */
	shop: string;
	note?: string;
	products: ShopProduct[];
}

let manifestCache: Promise<ShopManifest | null> | null = null;

/**
 * The catalog, or null when it cannot be read. A missing manifest is a normal
 * state — the page then says the shop is on Patreon and links out, rather than
 * erroring.
 */
export function loadShop(): Promise<ShopManifest | null> {
	manifestCache ??= fetch(`${base}/data/shop.json`)
		.then((r) => (r.ok ? (r.json() as Promise<ShopManifest>) : null))
		.then((m) => (m && Array.isArray(m.products) ? m : null))
		.catch(() => null);
	return manifestCache;
}

/** What the shop actually shows: everything not still in development. */
export function visibleProducts(manifest: ShopManifest | null): ShopProduct[] {
	return manifest?.products.filter((p) => !p.hidden) ?? [];
}

/** Test seam — the loader caches for the life of the page. */
export function resetShopCache(): void {
	manifestCache = null;
}

const SYMBOLS: Record<string, string> = {
	USD: '$',
	EUR: '€',
	GBP: '£',
	INR: '₹',
};

/** `$` for the currencies people actually see, the ISO code otherwise. */
export function currencySymbol(currency: string): string {
	return SYMBOLS[currency?.toUpperCase()] ?? `${currency} `;
}

/** A product with no real number on it yet. */
export function isUnpriced(price: ShopPrice | undefined): boolean {
	return !price || !(price.amount > 0);
}

/**
 * "$12", "$12.50", or "See price on Patreon" while a product is unpriced.
 * Whole amounts drop the cents — "$12.00" reads like a form field.
 */
export function formatPrice(
	price: ShopPrice | undefined,
	currency = 'USD',
): string {
	if (isUnpriced(price)) return 'See price on Patreon';
	const amount = price!.amount;
	const code = price!.currency ?? currency;
	const body = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
	return `${currencySymbol(code)}${body}`;
}

/** "per level", shown beside the price. Empty when the price is the product. */
export function priceUnit(price: ShopPrice | undefined): string {
	return isUnpriced(price) ? '' : (price?.unit ?? '');
}

/**
 * Absolute path of a product shot, or null when the manifest names none.
 *
 * Shots come from `npm run shoot:card-previews` (Anki + AnkiConnect, run by
 * hand) and land in `static/img/shop/`. The file is not committed by the build,
 * so the card falls back to a generated tile when it is absent — see
 * `ShopProductCard`'s `onerror`.
 */
export function productImage(product: ShopProduct): string | null {
	return product.image ? `${base}/img/shop/${product.image}` : null;
}

/** Where the buy button goes — the product post, else the storefront. */
export function buyUrl(manifest: ShopManifest, product: ShopProduct): string {
	return product.buyUrl || manifest.shop;
}

/** Where Buy goes: the direct checkout when known, else the product post. */
export function checkoutHref(manifest: ShopManifest, product: ShopProduct): string {
	return product.checkoutUrl || buyUrl(manifest, product);
}

/**
 * The glyph on the fallback tile. One character per product, taken from the id
 * so a new product gets something sensible without a design pass.
 */
const TILE_GLYPHS: Record<string, string> = {
	'hsk-word-decks': '字',
	'cloze-sentences': '句',
	'kangxi-radicals': '部',
	printables: '印',
};

export function tileGlyph(product: ShopProduct): string {
	return TILE_GLYPHS[product.id] ?? '汉';
}

/** One theme hue per product: the fallback tile's ground and the card's badge. */
const TILE_HUES: Record<string, Hue> = {
	'hsk-word-decks': 'sky',
	'cloze-sentences': 'lavender',
	'kangxi-radicals': 'apricot',
	printables: 'mint',
};

export function tileHue(product: ShopProduct): Hue {
	return TILE_HUES[product.id] ?? 'rose';
}

/** Free-alternative links are site-relative in the manifest. */
export function freeHref(product: ShopProduct): string | null {
	const href = product.freeAlternative?.href;
	if (!href) return null;
	return href.startsWith('http') ? href : `${base}${href}`;
}
