/**
 * Which Shop products a member bought, read from what they spent.
 *
 * Patreon's API has no resource for Shop (one-time) purchases, but a member's
 * `campaign_lifetime_support_cents` does include them: on this campaign 31
 * members show lifetime support while only two ever paid for a tier, and the
 * amounts are the shop prices — $15, $20 (15+5), $23 (15+8), $28 (15+8+5).
 *
 * So: shop spend = lifetime − tier payments (the member's `subscription` pledge
 * events that were `Paid`), then the set of products whose prices add up to it.
 * Every subset of $15 / $8 / $5 has a different sum, which is what makes the
 * answer usable; a price change or a new product can break that, and
 * `ambiguous` is how it shows.
 *
 * A buyer charged in another currency is converted, so totals arrive a little
 * off ($15.32, $29.39) — always upwards in the data seen so far, hence the
 * lopsided window. It is an inference for display, never a gate: files stay
 * behind Patreon's own posts.
 *
 * Pure, no imports: run by the dashboard script under Node's type stripping,
 * by the Worker, and by vitest.
 */

export interface PricedProduct {
	id: string;
	cents: number;
}

export interface PledgeEventLite {
	type: string | null;
	paymentStatus: string | null;
	/** In `currency` — the patron's own currency (AUD, EUR…), not the campaign's. */
	amountCents: number;
	currency?: string | null;
	tierId?: string | null;
}

/**
 * What tier charges are worth in the campaign's currency. A pledge event is
 * recorded in the *patron's* currency (A$8.50 for a US$5 tier), while lifetime
 * support is in the campaign's — so a foreign charge is counted at its tier's
 * own price, not at its face value.
 */
export interface CampaignPricing {
	currency: string;
	/** tier id → amount_cents in the campaign currency. */
	tierCents: Record<string, number>;
}

/**
 * - `exact`     one product set, within 1% of the spend
 * - `close`     one product set inside the window (currency conversion)
 * - `ambiguous` more than one product set fits
 * - `unknown`   spent money, but no set of products adds up to it
 * - `none`      no shop spend at all
 */
export type MatchConfidence = 'exact' | 'close' | 'ambiguous' | 'unknown' | 'none';

export interface SpendMatch {
	lifetimeCents: number;
	tierCents: number;
	shopCents: number;
	/** A foreign-currency charge had no tier price to convert with; tierCents is face value. */
	unconverted: boolean;
	/** Best fit, empty for `unknown` / `none`. */
	products: string[];
	confidence: MatchConfidence;
	/** Other product sets that also fit (only for `ambiguous`). */
	alternatives: string[][];
}

/** Below this, a balance is rounding, not a purchase. */
const MIN_SHOP_CENTS = 100;
/** Spend may sit this far below / above the price sum. */
export const WINDOW = { low: 0.97, high: 1.12 };
const EXACT = 0.01;

/** Money paid for tiers, in the campaign's currency: charges that went through. */
export function tierPaid(events: readonly PledgeEventLite[], pricing?: CampaignPricing): { cents: number; unconverted: boolean } {
	let cents = 0;
	let unconverted = false;
	for (const e of events) {
		if (e.type !== 'subscription' || (e.paymentStatus ?? '').toLowerCase() !== 'paid') continue;
		const face = Number.isFinite(e.amountCents) ? e.amountCents : 0;
		const foreign = !!pricing && !!e.currency && e.currency.toUpperCase() !== pricing.currency.toUpperCase();
		if (!foreign) cents += face;
		else if (e.tierId && pricing!.tierCents[e.tierId] !== undefined) cents += pricing!.tierCents[e.tierId];
		else {
			cents += face;
			unconverted = true;
		}
	}
	return { cents, unconverted };
}

/** `tierPaid(...).cents` — kept for callers that only want the number. */
export function tierPaidCents(events: readonly PledgeEventLite[], pricing?: CampaignPricing): number {
	return tierPaid(events, pricing).cents;
}

/** `/campaigns/{id}?include=tiers` → the campaign currency and each tier's price in it. */
export function parseCampaignPricing(doc: {
	data?: { attributes?: Record<string, unknown> };
	included?: { type: string; id: string; attributes?: Record<string, unknown> }[];
}): CampaignPricing {
	const currency = typeof doc.data?.attributes?.currency === 'string' ? (doc.data.attributes.currency as string) : 'USD';
	const tierCents: Record<string, number> = {};
	for (const r of doc.included ?? []) {
		const c = r.attributes?.amount_cents;
		if (r.type === 'tier' && typeof c === 'number') tierCents[r.id] = c;
	}
	return { currency, tierCents };
}

/** Every non-empty subset of the priced products, with its sum. */
function subsets(products: readonly PricedProduct[]): { ids: string[]; cents: number }[] {
	const priced = products.filter((p) => p.cents > 0).slice(0, 12); // 4096 subsets is the ceiling
	const out: { ids: string[]; cents: number }[] = [];
	for (let mask = 1; mask < 1 << priced.length; mask++) {
		const ids: string[] = [];
		let cents = 0;
		priced.forEach((p, i) => {
			if (mask & (1 << i)) {
				ids.push(p.id);
				cents += p.cents;
			}
		});
		out.push({ ids, cents });
	}
	return out;
}

export function matchSpend(
	lifetimeCents: number,
	events: readonly PledgeEventLite[],
	products: readonly PricedProduct[],
	pricing?: CampaignPricing
): SpendMatch {
	const { cents: tierCents, unconverted } = tierPaid(events, pricing);
	const shopCents = Math.max(0, (lifetimeCents || 0) - tierCents);
	const base = { lifetimeCents: lifetimeCents || 0, tierCents, shopCents, unconverted };

	if (shopCents < MIN_SHOP_CENTS) return { ...base, products: [], confidence: 'none', alternatives: [] };

	const fits = subsets(products)
		.filter((s) => shopCents >= s.cents * WINDOW.low && shopCents <= s.cents * WINDOW.high)
		.map((s) => ({ ...s, off: Math.abs(shopCents / s.cents - 1) }))
		.sort((a, b) => a.off - b.off);

	if (!fits.length) return { ...base, products: [], confidence: 'unknown', alternatives: [] };

	const [best, ...rest] = fits;
	const exact = best.off <= EXACT;
	// A second fit only matters when it is as good a reading as the best one.
	const rivals = exact ? rest.filter((r) => r.off <= EXACT) : rest;
	const confidence: MatchConfidence = rivals.length ? 'ambiguous' : exact ? 'exact' : 'close';
	return { ...base, products: best.ids, confidence, alternatives: rivals.map((r) => r.ids) };
}

/** Confident enough to call a product owned on the page. */
export function isConfident(c: MatchConfidence): boolean {
	return c === 'exact' || c === 'close';
}

/** Products from a shop.json-shaped catalog, priced in cents. Unpriced ones are skipped. */
export function pricedProducts(catalog: { products?: { id: string; price?: { amount?: number }; hidden?: boolean }[] }): PricedProduct[] {
	return (catalog.products ?? [])
		.filter((p) => !p.hidden && (p.price?.amount ?? 0) > 0)
		.map((p) => ({ id: p.id, cents: Math.round((p.price!.amount as number) * 100) }));
}
