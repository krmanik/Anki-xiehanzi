/**
 * A "Premium" button outside `/shop` (the HSK and radical deck modals): it goes
 * straight to the product's Patreon checkout, like Buy on the shop.
 *
 * Until `shop.json` has loaded (or if it cannot be read) the link opens the
 * product on `/shop` instead, so it never points nowhere.
 */
import { base } from '$app/paths';
import { checkoutHref, loadShop } from '$lib/shop';

export class PremiumLink {
	href = $state('');
	/** True once `href` is the Patreon checkout (opens in a new tab). */
	external = $state(false);

	constructor(id: string) {
		this.href = `${base}/shop?p=${id}`;
		void loadShop().then((manifest) => {
			const product = manifest?.products.find((p) => p.id === id);
			if (!manifest || !product) return;
			this.href = checkoutHref(manifest, product);
			this.external = /^https?:/.test(this.href);
		});
	}

	/** Spread onto the link: href, and a new tab for the checkout. */
	get attrs() {
		return {
			href: this.href,
			target: this.external ? '_blank' : undefined,
			rel: this.external ? 'noopener noreferrer' : undefined
		};
	}
}
