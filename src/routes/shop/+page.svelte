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
	import { account } from '$lib/accountStore.svelte';
	import { errorText } from '$lib/account';
	import { buyUrl, checkoutHref, loadShop, visibleProducts, type ShopManifest, type ShopProduct } from '$lib/shop';
	import { buttonClass, Card, chipClass, IconDot, PageHeader, SectionLabel, type Hue } from '$lib/ui';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleUser from '@lucide/svelte/icons/circle-user';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import X from '@lucide/svelte/icons/x';

	const PATREON_SHOP = 'https://www.patreon.com/cw/krmani/shop';

	let manifest = $state<ShopManifest | null>(null);
	let loading = $state(true);
	let selected = $state<ShopProduct | null>(null);

	const products = $derived(visibleProducts(manifest));
	const session = $derived(account.session);
	const nameOf = (id: string | null) => products.find((p) => p.id === id)?.name ?? 'Your purchase';
	const loginProblem = $derived(
		account.state?.kind === 'out'
			? account.state.error
				? errorText(account.state.error)
				: account.state.expired
					? 'Your login expired. Log in again to see your decks.'
					: null
			: null
	);
	const unlockedProduct = $derived(products.find((p) => p.id === account.unlocked) ?? null);

	onMount(() => {
		account.init();
		// Back from Patreon's tab: see whether the purchase shows yet.
		const onVisible = () => document.visibilityState === 'visible' && account.checkPending(products);
		document.addEventListener('visibilitychange', onVisible);
		void start();
		return () => document.removeEventListener('visibilitychange', onVisible);
	});

	async function start() {
		manifest = await loadShop();
		loading = false;
		void account.checkPending(products);
		// `?p=<id>` opens a product straight away, so one product can be linked
		// to and shared even though the detail is a dialog rather than a route.
		const id = page.url.searchParams.get('p');
		if (id) selected = products.find((prod) => prod.id === id) ?? null;
	}

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

	// Buying is one new tab: log in there, pay, come back to this one.
	const steps: { hue: Hue; title: string; body: string }[] = [
		{ hue: 'rose', title: 'Log in with Patreon and pay', body: 'Opens in a new tab. This site never sees a card number.' },
		{ hue: 'apricot', title: 'Come back here', body: 'The deck unlocks on this page by itself.' },
		{ hue: 'mint', title: 'Download and import', body: 'File → Import in Anki, desktop or phone.' }
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
		{#snippet actions()}
			{#if account.enabled && account.state}
				{#if session}
					<a href="{base}/account" class={chipClass(false)}>
						{#if session.image}<img src={session.image} alt="" class="size-5 rounded-full" referrerpolicy="no-referrer" />{:else}<CircleUser class="size-4" />{/if}
						{session.name.split(' ')[0]}
					</a>
				{:else}
					<button type="button" class={chipClass(false)} onclick={() => account.logIn()}>
						<CircleUser class="size-4" /> Bought already? Log in
					</button>
				{/if}
			{/if}
		{/snippet}
	</PageHeader>

	<!-- Back from Patreon: one line saying where the purchase stands. -->
	{#if loginProblem && !account.waiting}
		<Card tint="rose" padding="sm" class="mb-5 flex flex-wrap items-center gap-3">
			<span class="min-w-0 flex-1 text-ink">{loginProblem}</span>
			<button type="button" class={buttonClass('primary', 'sm')} onclick={() => account.logIn()}>Log in with Patreon</button>
		</Card>
	{:else if account.unlocked && manifest}
		<Card tint="mint" padding="sm" class="mb-5 flex flex-wrap items-center gap-3">
			<CircleCheck class="size-5 shrink-0 text-mint-ink" />
			<span class="min-w-0 flex-1 font-semibold text-ink">Unlocked: {nameOf(account.unlocked)}</span>
			{#if unlockedProduct}
				<a href={buyUrl(manifest, unlockedProduct)} target="_blank" rel="noopener noreferrer" class={buttonClass('primary', 'sm')}>Download</a>
			{/if}
			<button type="button" class="{buttonClass('text', 'sm')} text-muted" aria-label="Dismiss" onclick={() => account.dismiss()}><X class="size-4" /></button>
		</Card>
	{:else if account.checking}
		<Card tint="sky" padding="sm" class="mb-5 flex items-center gap-3">
			<LoaderCircle class="size-5 shrink-0 animate-spin text-sky-ink" />
			<span class="font-semibold text-ink">Checking your purchase…</span>
		</Card>
	{:else if account.waiting}
		<Card tint="apricot" padding="sm" class="mb-5 flex flex-wrap items-center gap-3">
			<span class="min-w-0 flex-1 text-ink">
				{#if session}
					<span class="font-semibold">{nameOf(account.waiting)}</span> isn't showing yet. Patreon can take a minute.
				{:else}
					Finished buying <span class="font-semibold">{nameOf(account.waiting)}</span>? Log in to see it here.
				{/if}
			</span>
			{#if session}
				<button type="button" class={buttonClass('primary', 'sm')} onclick={() => account.checkPending(products)}>Check again</button>
			{:else}
				<button type="button" class={buttonClass('primary', 'sm')} onclick={() => account.logIn()}>Log in with Patreon</button>
			{/if}
			<button type="button" class="{buttonClass('text', 'sm')} text-muted" aria-label="Dismiss" onclick={() => account.dismiss()}><X class="size-4" /></button>
		</Card>
	{/if}

	{#if loading}
		<div class="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
			{#each [0, 1, 2] as n (n)}
				<div class="h-96 animate-pulse rounded-panel bg-sunk"></div>
			{/each}
		</div>
	{:else if manifest}
		<div class="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
			{#each products as product (product.id)}
				<ShopProductCard {manifest} {product} onDetails={open} owned={account.owns(product)} onBuy={(p) => account.buy(p, checkoutHref(manifest!, p))} />
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
	<ShopProductModal {manifest} product={selected} onClose={close} owned={account.owns(selected)} onBuy={(p) => account.buy(p, checkoutHref(manifest!, p))} />
{/if}
