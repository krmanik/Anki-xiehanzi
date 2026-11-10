<script lang="ts">
	/**
	 * One product tile: picture, price, and the two things a shopper does —
	 * read more, buy, or open the product's own Patreon post.
	 *
	 * The picture is a card screenshot from `npm run shoot:card-previews`, which
	 * is run by hand against a real Anki profile. Those files are not in the repo,
	 * so a missing one must not leave a broken image in the grid: `failed` flips
	 * on the img's `onerror` and the tile below it — the product's own glyph on
	 * its soft hue — takes over. Dropping the JPG into `static/img/shop/` later
	 * is the whole change.
	 *
	 * Hover lifts the card on a soft shadow and eases the picture in; no border
	 * appears, so the grid does not flash a frame as the pointer crosses it.
	 */
	import {
		buyUrl,
		checkoutHref,
		formatPrice,
		isUnpriced,
		priceUnit,
		productImage,
		tileGlyph,
		tileHue,
		type ShopManifest,
		type ShopProduct
	} from '$lib/shop';
	import { Badge, buttonClass, PANEL } from '$lib/ui';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';

	let {
		manifest,
		product,
		onDetails
	}: {
		manifest: ShopManifest;
		product: ShopProduct;
		onDetails: (product: ShopProduct) => void;
	} = $props();

	let failed = $state(false);

	const src = $derived(productImage(product));
	const href = $derived(checkoutHref(manifest, product));
	const post = $derived(buyUrl(manifest, product));
	const hue = $derived(tileHue(product));
	const glyphInk = $derived(
		{
			rose: 'text-rose-ink',
			apricot: 'text-apricot-ink',
			mint: 'text-mint-ink',
			sky: 'text-sky-ink',
			lavender: 'text-lavender-ink'
		}[hue]
	);
</script>

<article
	class="group flex flex-col overflow-hidden rounded-panel bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.06),0_2px_8px_rgb(0_0_0/0.04)] ring-1 ring-line ring-inset transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgb(0_0_0/0.06),0_12px_28px_rgb(0_0_0/0.10)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
>
	<!-- Picture. Fixed aspect so a missing shot and a real one leave the grid
	     the same shape. The button is the picture's click target, so a reader
	     can open the details from the image they are looking at. -->
	<button
		type="button"
		class="relative block aspect-[4/3] w-full cursor-pointer overflow-hidden border-0 p-0 {PANEL[hue]}"
		onclick={() => onDetails(product)}
		aria-label="Details: {product.name}"
		tabindex="-1"
	>
		{#if src && !failed}
			<img
				{src}
				alt={product.imageAlt || product.name}
				loading="lazy"
				onerror={() => (failed = true)}
				class="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
			/>
		{:else}
			<span class="grid h-full w-full place-items-center">
				<span class="font-zh text-7xl font-bold {glyphInk} opacity-80" lang="zh-Hans">{tileGlyph(product)}</span>
			</span>
		{/if}
		{#if product.badge}
			<Badge tint={hue} strong class="absolute top-3 left-3 shadow-md">{product.badge}</Badge>
		{/if}
	</button>

	<div class="flex flex-1 flex-col p-5">
		<h3 class="m-0 text-[17px] leading-snug font-bold text-ink">{product.name}</h3>
		<p class="mt-1.5 mb-0 text-[15px] leading-relaxed text-muted">{product.tagline}</p>

		<!-- Price sits above the buttons and takes the weight: it is the one
		     number a shopper is looking for. -->
		<div class="mt-4 flex items-baseline gap-1.5">
			<span class={isUnpriced(product.price) ? 'text-sm font-semibold text-muted' : 'text-[28px] leading-none font-bold text-ink'}>
				{formatPrice(product.price, manifest.currency)}
			</span>
			{#if priceUnit(product.price)}
				<span class="text-sm text-muted">{priceUnit(product.price)}</span>
			{/if}
		</div>

		<div class="mt-auto flex flex-wrap items-center gap-2 pt-5">
			<a class={buttonClass('primary', 'sm')} {href} target="_blank" rel="noopener noreferrer">
				<ShoppingBag class="size-4" /> Buy on Patreon
			</a>
		</div>
		<div class="mt-2 flex flex-wrap items-center gap-x-3">
			<button type="button" class={buttonClass('text', 'sm')} onclick={() => onDetails(product)}>
				Details <ArrowRight class="size-4" />
			</button>
			<a class={buttonClass('text', 'sm')} href={post} target="_blank" rel="noopener noreferrer">
				View on Patreon <ArrowUpRight class="size-4" />
			</a>
		</div>
	</div>
</article>
