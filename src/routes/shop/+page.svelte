<script lang="ts">
	/**
	 * The shop.
	 *
	 * The nav's "Shop" used to leave the site for Patreon, where the products are
	 * described in the seller's own shape and a reader who did not already know
	 * what "premium" meant had no reason to click. This page is the storefront:
	 * one card per product, a picture, a price and a buy button, with the detail
	 * a click away instead of a domain away.
	 *
	 * Checkout stays on Patreon — nothing here takes money. The catalog is
	 * `static/data/shop.json`; see `$lib/shop`.
	 */
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import ShopProductCard from '$lib/components/ShopProductCard.svelte';
	import ShopProductModal from '$lib/components/ShopProductModal.svelte';
	import { loadShop, visibleProducts, type ShopManifest, type ShopProduct } from '$lib/shop';
	import { buttonClass, Card, chipClass, IconDot, PageHeader, SectionLabel, type Hue } from '$lib/ui';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';

	const PATREON_SHOP = 'https://www.patreon.com/cw/krmani/shop';

	let manifest = $state<ShopManifest | null>(null);
	let loading = $state(true);
	let selected = $state<ShopProduct | null>(null);

	const products = $derived(visibleProducts(manifest));

	onMount(async () => {
		manifest = await loadShop();
		loading = false;
		// `?p=<id>` opens a product straight away, so one product can be linked
		// to and shared even though the detail is a dialog rather than a route.
		const id = page.url.searchParams.get('p');
		if (id) selected = products.find((prod) => prod.id === id) ?? null;
	});

	/** Keep the open product in the URL without adding a history entry. */
	function syncUrl(id: string | null) {
		try {
			const url = new URL(page.url);
			if (id) url.searchParams.set('p', id);
			else url.searchParams.delete('p');
			replaceState(url, {});
		} catch {
			// Navigation is unavailable before hydration; the dialog still opens.
		}
	}

	function open(product: ShopProduct) {
		selected = product;
		syncUrl(product.id);
	}

	function close() {
		selected = null;
		syncUrl(null);
	}

	const steps: { hue: Hue; title: string; body: string }[] = [
		{ hue: 'rose', title: 'Buy on Patreon', body: 'Payment and delivery happen there. This site never sees a card number.' },
		{ hue: 'apricot', title: 'Download the .apkg', body: 'The file is attached to the product post.' },
		{ hue: 'mint', title: 'Import and study', body: 'File → Import in Anki, desktop or phone. Audio and dictionary are inside.' }
	];
</script>

<svelte:head>
	<title>Shop · Anki-xiehanzi</title>
	<meta
		name="description"
		content="Premium Anki decks for Mandarin: HSK word decks with recognition and writing cards, a cloze sentence deck, the 214 Kangxi radicals, and print-ready PDFs."
	/>
</svelte:head>

<section class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
	<PageHeader title="Premium decks" subtitle="Writing cards, a redesigned layout and a dictionary inside the card. Buying one pays for the free decks.">
		{#snippet lead()}
			<IconDot hue="rose" size="lg" shape="tile"><ShoppingBag /></IconDot>
		{/snippet}
	</PageHeader>

	{#if loading}
		<div class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each [0, 1, 2] as n (n)}
				<div class="h-96 animate-pulse rounded-panel bg-sunk"></div>
			{/each}
		</div>
	{:else if manifest}
		<div class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each products as product (product.id)}
				<ShopProductCard {manifest} {product} onDetails={open} />
			{/each}
		</div>

		<p class="mt-5 mb-0 text-sm text-muted">
			Checkout is on Patreon.
			<a
				href={manifest.shop || PATREON_SHOP}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1 font-semibold text-accent"
			>
				See the whole shop <ArrowUpRight class="size-3.5" />
			</a>
		</p>
	{:else}
		<!-- No manifest is a normal state, not an error screen: point at the
		     storefront and get out of the way. -->
		<Card class="mt-6">
			<p class="m-0 text-[15px] text-muted">The catalog could not be loaded.</p>
			<a href={PATREON_SHOP} target="_blank" rel="noopener noreferrer" class="{buttonClass('secondary', 'sm')} mt-3">
				Open the shop on Patreon <ArrowUpRight class="size-4" />
			</a>
		</Card>
	{/if}

	<!-- How a purchase reaches Anki. Buying a deck file is not the checkout most
	     people expect, so say it before they ask. -->
	<SectionLabel as="h2" class="mt-12 mb-3">How it works</SectionLabel>
	<ol class="m-0 grid list-none gap-4 p-0 sm:grid-cols-3">
		{#each steps as step, i (step.title)}
			<li>
				<Card tint={step.hue} class="h-full">
					<h3 class="m-0 flex items-center gap-2.5 text-[16px] font-bold text-ink">
						<IconDot hue={step.hue} size="sm">{i + 1}</IconDot>
						{step.title}
					</h3>
					<p class="mt-2 mb-0 text-[15px] leading-relaxed text-muted">{step.body}</p>
				</Card>
			</li>
		{/each}
	</ol>

	<Card tint="neutral" class="mt-5 flex flex-wrap items-center justify-between gap-3">
		<p class="m-0 text-[15px] text-ink"><span class="font-bold">Not ready to buy?</span> <span class="text-muted">Everything below is free.</span></p>
		<div class="flex flex-wrap gap-2">
			<a href="{base}/hsk" class={chipClass(false, true)}>Free HSK decks</a>
			<a href="{base}/radicals" class={chipClass(false, true)}>Radicals</a>
			<a href="{base}/create" class={chipClass(false, true)}>Deck creator</a>
		</div>
	</Card>
</section>

{#if selected && manifest}
	<ShopProductModal {manifest} product={selected} onClose={close} />
{/if}
