import { describe, expect, it } from 'vitest';
import { isConfident, matchSpend, parseCampaignPricing, pricedProducts, tierPaid, tierPaidCents, type PledgeEventLite } from './patreonSpend';

const SHOP = [
	{ id: 'hsk', cents: 1500 },
	{ id: 'cloze', cents: 800 },
	{ id: 'radicals', cents: 500 }
];

const match = (dollars: number, events: PledgeEventLite[] = []) => matchSpend(Math.round(dollars * 100), events, SHOP);

describe('tierPaidCents', () => {
	it('counts only subscription charges that were paid', () => {
		expect(
			tierPaidCents([
				{ type: 'pledge_start', paymentStatus: null, amountCents: 850 },
				{ type: 'subscription', paymentStatus: 'Paid', amountCents: 850 },
				{ type: 'subscription', paymentStatus: 'Declined', amountCents: 850 },
				{ type: 'subscription', paymentStatus: 'paid', amountCents: 500 },
				{ type: 'pledge_delete', paymentStatus: null, amountCents: 850 }
			])
		).toBe(1350);
	});
});

describe('foreign-currency tier charges', () => {
	const pricing = { currency: 'USD', tierCents: { t5: 500 } };
	const aud: PledgeEventLite = { type: 'subscription', paymentStatus: 'Paid', amountCents: 850, currency: 'AUD', tierId: 't5' };

	it('counts an A$8.50 charge at the US$5 tier price, not as 850 US cents', () => {
		expect(tierPaid([aud], pricing)).toEqual({ cents: 500, unconverted: false });
		expect(matchSpend(2000, [aud], SHOP, pricing)).toMatchObject({ tierCents: 500, shopCents: 1500, products: ['hsk'], confidence: 'exact' });
	});

	it('keeps same-currency charges at face value', () => {
		expect(tierPaidCents([{ ...aud, currency: 'USD', amountCents: 500 }], pricing)).toBe(500);
	});

	it('flags a foreign charge it cannot convert', () => {
		expect(tierPaid([{ ...aud, tierId: 'gone' }], pricing)).toEqual({ cents: 850, unconverted: true });
		expect(matchSpend(2000, [{ ...aud, tierId: null }], SHOP, pricing).unconverted).toBe(true);
	});

	it('reads campaign pricing from an include=tiers response', () => {
		expect(
			parseCampaignPricing({
				data: { attributes: { currency: 'USD' } },
				included: [
					{ type: 'tier', id: 't5', attributes: { amount_cents: 500 } },
					{ type: 'benefit', id: 'b1', attributes: {} }
				]
			})
		).toEqual({ currency: 'USD', tierCents: { t5: 500 } });
	});
});

describe('matchSpend', () => {
	it('reads every price combination the real data showed', () => {
		expect(match(15)).toMatchObject({ products: ['hsk'], confidence: 'exact' });
		expect(match(20)).toMatchObject({ products: ['hsk', 'radicals'], confidence: 'exact' });
		expect(match(23)).toMatchObject({ products: ['hsk', 'cloze'], confidence: 'exact' });
		expect(match(28)).toMatchObject({ products: ['hsk', 'cloze', 'radicals'], confidence: 'exact' });
		expect(match(5)).toMatchObject({ products: ['radicals'], confidence: 'exact' });
		expect(match(8)).toMatchObject({ products: ['cloze'], confidence: 'exact' });
	});

	it('accepts a converted total a little above the price', () => {
		for (const d of [15.32, 15.51, 15.75, 15.92, 16.28, 16.35]) {
			expect(match(d)).toMatchObject({ products: ['hsk'], confidence: 'close' });
		}
		expect(match(28.42)).toMatchObject({ products: ['hsk', 'cloze', 'radicals'], confidence: 'close' });
		expect(match(29.39)).toMatchObject({ products: ['hsk', 'cloze', 'radicals'], confidence: 'close' });
		expect(match(5.1)).toMatchObject({ products: ['radicals'], confidence: 'close' });
	});

	it('says unknown when nothing adds up', () => {
		expect(match(34.5)).toMatchObject({ products: [], confidence: 'unknown' });
		expect(match(3)).toMatchObject({ confidence: 'unknown' });
	});

	it('says none with no shop spend, and subtracts tier payments first', () => {
		expect(match(0)).toMatchObject({ confidence: 'none', shopCents: 0 });
		const paid: PledgeEventLite[] = [{ type: 'subscription', paymentStatus: 'Paid', amountCents: 500 }];
		expect(match(5, paid)).toMatchObject({ confidence: 'none', tierCents: 500, shopCents: 0 });
		expect(match(20, paid)).toMatchObject({ products: ['hsk'], confidence: 'exact', shopCents: 1500 });
	});

	it('flags ambiguity when two sets fit equally well', () => {
		const clash = [
			{ id: 'a', cents: 1300 },
			{ id: 'b', cents: 800 },
			{ id: 'c', cents: 500 }
		];
		const m = matchSpend(1300, [], clash);
		expect(m.confidence).toBe('ambiguous');
		expect([m.products, ...m.alternatives].map((s) => s.join('+')).sort()).toEqual(['a', 'b+c']);
	});

	it('only owned when confident', () => {
		expect(isConfident('exact')).toBe(true);
		expect(isConfident('close')).toBe(true);
		expect(isConfident('ambiguous')).toBe(false);
		expect(isConfident('unknown')).toBe(false);
	});
});

describe('pricedProducts', () => {
	it('takes visible priced products in cents', () => {
		expect(
			pricedProducts({
				products: [
					{ id: 'hsk', price: { amount: 15 } },
					{ id: 'pdf', price: { amount: 0 } },
					{ id: 'wip', price: { amount: 9 }, hidden: true },
					{ id: 'half', price: { amount: 4.5 } }
				]
			})
		).toEqual([
			{ id: 'hsk', cents: 1500 },
			{ id: 'half', cents: 450 }
		]);
	});
});
