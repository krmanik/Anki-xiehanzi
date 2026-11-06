import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import ShopProductCard from './ShopProductCard.svelte';
import type { ShopManifest, ShopProduct } from '$lib/shop';

const manifest: ShopManifest = {
	generated: '2026-09-08',
	currency: 'USD',
	shop: 'https://www.patreon.com/cw/krmani/shop',
	products: []
};

const product = (over: Partial<ShopProduct> = {}): ShopProduct => ({
	id: 'kangxi-radicals',
	name: 'The 214 Kangxi radicals',
	tagline: 'Every radical.',
	price: { amount: 9 },
	buyUrl: 'https://www.patreon.com/krmani/posts/kangxi-radicals-166891672',
	description: '',
	highlights: [],
	...over
});

const mount = (p: ShopProduct, onDetails: (product: ShopProduct) => void = () => {}, extra: Record<string, unknown> = {}) =>
	render(ShopProductCard, { props: { manifest, product: p, onDetails, ...extra } });

describe('ShopProductCard', () => {
	it('prints the price and links the buy button at the product post', () => {
		mount(product({ price: { amount: 9, unit: 'per level' } }));
		expect(screen.getByText('$9')).toBeInTheDocument();
		expect(screen.getByText('per level')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /buy on patreon/i })).toHaveAttribute(
			'href',
			'https://www.patreon.com/krmani/posts/kangxi-radicals-166891672'
		);
	});

	it('sends Buy to the direct checkout when there is one, and reports the click', async () => {
		let bought: ShopProduct | null = null;
		mount(product({ checkoutUrl: 'https://www.patreon.com/checkout/x' }), () => {}, { onBuy: (p: ShopProduct) => (bought = p) });
		const buy = screen.getByRole('link', { name: /buy on patreon/i });
		expect(buy).toHaveAttribute('href', 'https://www.patreon.com/checkout/x');
		buy.addEventListener('click', (e) => e.preventDefault());
		await fireEvent.click(buy);
		expect(bought?.id).toBe('kangxi-radicals');
	});

	it('swaps Buy for Download when the reader owns it', () => {
		mount(product(), () => {}, { owned: true });
		expect(screen.queryByRole('link', { name: /buy on patreon/i })).toBeNull();
		expect(screen.getByText('Owned')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute(
			'href',
			'https://www.patreon.com/krmani/posts/kangxi-radicals-166891672'
		);
	});

	it('says where the price is instead of "$0" while the product is unpriced', () => {
		mount(product({ price: { amount: 0, unit: 'per level' } }));
		expect(screen.getByText('See price on Patreon')).toBeInTheDocument();
		expect(screen.queryByText('per level')).not.toBeInTheDocument();
	});

	it('hands the product back when details are asked for', async () => {
		let asked: ShopProduct | null = null;
		mount(product(), (p) => (asked = p));
		await fireEvent.click(screen.getByRole('button', { name: /see more details/i }));
		expect(asked?.id).toBe('kangxi-radicals');
	});

	// The shots are taken by hand against a live Anki profile, so most of the
	// time there is no file: the tile has to survive that, not break the grid.
	it('draws the fallback tile when the manifest names no image', () => {
		const { container } = mount(product());
		expect(container.querySelector('img')).toBeNull();
		expect(screen.getByText('部')).toBeInTheDocument();
	});

	it('falls back to the tile when the image 404s', async () => {
		const { container } = mount(product({ image: 'kangxi-radicals.jpg' }));
		const img = container.querySelector('img');
		expect(img).not.toBeNull();
		await fireEvent.error(img!);
		expect(container.querySelector('img')).toBeNull();
		expect(screen.getByText('部')).toBeInTheDocument();
	});
});
