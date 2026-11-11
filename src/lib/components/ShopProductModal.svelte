<script lang="ts">
	/**
	 * The product page, as a dialog.
	 *
	 * A separate `/shop/[id]` route would need explicit `entries()` (the site is
	 * client-rendered, so the prerenderer cannot crawl to a page whose ids live
	 * in a runtime JSON) and would put a navigation between wanting a product and
	 * buying it. One dialog over the grid keeps the buy button one click away
	 * from every product, and the catalog stays a data file.
	 *
	 * Same shell as `HskDeckModal` / `RadicalDeckModal`: backdrop click and Esc
	 * both close.
	 */
	import {
		buyUrl,
		formatPrice,
		freeHref,
		isUnpriced,
		priceUnit,
		productImage,
		tileGlyph,
		type ShopManifest,
		type ShopProduct
	} from '$lib/shop';
	import { Badge, buttonClass, DIALOG, ICON_BUTTON, SCRIM, SectionLabel } from '$lib/ui';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import Check from '@lucide/svelte/icons/check';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import X from '@lucide/svelte/icons/x';

	let {
		manifest,
		product,
		onClose
	}: {
		manifest: ShopManifest;
		product: ShopProduct;
		onClose: () => void;
	} = $props();

	let failed = $state(false);

	const src = $derived(productImage(product));
	const href = $derived(buyUrl(manifest, product));
	const free = $derived(freeHref(product));
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<div
	class="fixed inset-0 z-50 flex items-end justify-center {SCRIM} p-0 sm:items-center sm:p-5"
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && onClose()}
>
	<div
		class="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden {DIALOG} rounded-b-none sm:rounded-b-tile"
		role="dialog"
		aria-modal="true"
		aria-label={product.name}
	>
		<div class="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-7">
			<div class="min-w-0">
				{#if product.badge}
					<Badge class="mb-2">{product.badge}</Badge>
				{/if}
				<h2 class="m-0 text-[26px] leading-[1.05] font-bold tracking-[-0.035em]">{product.name}</h2>
				<p class="mt-1 mb-0 text-[15px] text-muted">{product.tagline}</p>
			</div>
			<button
				type="button"
				onclick={onClose}
				aria-label="Close"
				class={ICON_BUTTON}
			>
				<X class="size-5" />
			</button>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-2 sm:px-7">
			<div class="overflow-hidden rounded-panel bg-sunk">
				{#if src && !failed}
					<img
						{src}
						alt={product.imageAlt || product.name}
						onerror={() => (failed = true)}
						class="block max-h-[38vh] w-full object-cover object-top"
					/>
				{:else}
					<div class="grid h-44 w-full place-items-center">
						<span class="font-zh text-6xl font-bold opacity-80" lang="zh-Hans">{tileGlyph(product)}</span>
					</div>
				{/if}
			</div>

			<p class="mt-5 mb-0 text-[15px] leading-relaxed">{product.description}</p>

			{#if product.highlights?.length}
				<SectionLabel as="h3" class="mt-6 mb-2">What's in it</SectionLabel>
				<ul class="m-0 grid list-none gap-2 p-0">
					{#each product.highlights as line (line)}
						<li class="flex gap-2.5 text-[15px]">
							<Check class="mt-0.5 size-[18px] shrink-0 text-ok-ink" />
							<span>{line}</span>
						</li>
					{/each}
				</ul>
			{/if}

			{#if product.specs?.length}
				<dl class="mt-6 mb-0 grid grid-cols-[minmax(0,10rem)_1fr] overflow-hidden rounded-card bg-sunk text-[15px]">
					{#each product.specs as spec (spec.label)}
						<dt class="border-b border-line px-4 py-2.5 text-muted last-of-type:border-0">{spec.label}</dt>
						<dd class="m-0 border-b border-line px-4 py-2.5 last-of-type:border-0">{spec.value}</dd>
					{/each}
				</dl>
			{/if}

			{#if free}
				<p class="mt-5 mb-0 text-[13.5px] text-muted">
					Free version on this site:
					<a href={free} onclick={onClose} class="font-semibold text-ink underline underline-offset-4">{product.freeAlternative?.label}</a>.
				</p>
			{/if}
		</div>

		<div class="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-7">
			<div class="flex items-baseline gap-1.5">
				<span class={isUnpriced(product.price) ? 'text-sm font-semibold text-muted' : 'text-[28px] leading-none font-bold'}>
					{formatPrice(product.price, manifest.currency)}
				</span>
				{#if priceUnit(product.price)}
					<span class="text-sm text-muted">{priceUnit(product.price)}</span>
				{/if}
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class={buttonClass('secondary')} onclick={onClose}>Close</button>
				<a class={buttonClass('premium')} {href} target="_blank" rel="noopener noreferrer">
					<ShoppingBag class="size-[18px]" /> Buy on Patreon
					<ArrowUpRight class="size-4" />
				</a>
			</div>
		</div>
	</div>
</div>
