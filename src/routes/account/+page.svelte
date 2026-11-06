<!--
  Your account: log in with Patreon, see the decks you own — only those; the
  shop lists the rest.

  The login is a Cloudflare Worker (`worker/`) that hands back a signed session
  in the URL fragment; `$lib/accountStore.svelte` keeps it. A product is owned
  through a tier (`unlockTiers` in shop.json) or a Shop purchase read from what
  the member spent (`$lib/patreonSpend`). Nothing here is trusted for access —
  Download goes to the Patreon post, which Patreon gates itself.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { account } from '$lib/accountStore.svelte';
	import { errorText } from '$lib/account';
	import { membershipLabel } from '$lib/patreon';
	import { buyUrl, loadShop, visibleProducts, type ShopManifest } from '$lib/shop';
	import { Badge, buttonClass, Card, IconDot, PageHeader, SectionLabel } from '$lib/ui';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import CircleUser from '@lucide/svelte/icons/circle-user';
	import LogOut from '@lucide/svelte/icons/log-out';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';

	let manifest = $state<ShopManifest | null>(null);
	let refreshing = $state(false);

	const session = $derived(account.session);
	const out = $derived(account.state?.kind === 'out' ? account.state : null);
	const products = $derived(visibleProducts(manifest));
	const owned = $derived(products.filter((p) => account.owns(p)));
	const badge = $derived(session ? membershipLabel(session) : '');

	onMount(async () => {
		account.init();
		manifest = await loadShop();
		void account.checkPending(products);
	});

	async function refresh() {
		refreshing = true;
		await account.refresh();
		refreshing = false;
	}

	const since = (iso: string | null) =>
		iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
	const PATREON_SHOP = 'https://www.patreon.com/cw/krmani/shop';
	const usd = (cents: number) => `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`;
</script>

<svelte:head>
	<title>Account · Anki-xiehanzi</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
	<PageHeader title="Your account" subtitle={session ? undefined : 'Log in with Patreon to see your decks.'}>
		{#snippet lead()}
			<IconDot hue="lavender" size="lg" shape="tile"><CircleUser /></IconDot>
		{/snippet}
	</PageHeader>

	{#if !account.state}
		<div class="h-28 animate-pulse rounded-panel bg-sunk"></div>
	{:else if out}
		<Card>
			{#if out.error}
				<p class="mt-0 mb-3 text-[15px] text-rose-ink">{errorText(out.error)}</p>
			{:else if out.expired}
				<p class="mt-0 mb-3 text-[15px] text-muted">Your login expired. Log in again to refresh it.</p>
			{/if}
			{#if account.enabled}
				<button type="button" class={buttonClass('primary')} onclick={() => account.logIn()}>Log in with Patreon</button>
				<p class="mt-3 mb-0 text-sm text-muted">Shares your name and memberships. Never your email or card.</p>
			{:else}
				<p class="m-0 text-[15px] text-muted">Login is not set up on this build.</p>
			{/if}
		</Card>
	{:else if session}
		<Card class="flex flex-wrap items-center gap-4">
			{#if session.image}
				<img src={session.image} alt="" class="size-14 rounded-full object-cover" referrerpolicy="no-referrer" />
			{:else}
				<IconDot hue="lavender" size="lg"><CircleUser /></IconDot>
			{/if}
			<div class="min-w-0 flex-1">
				<p class="m-0 truncate text-lg font-bold text-ink">{session.name}</p>
				<div class="mt-1 flex flex-wrap items-center gap-2">
					{#if badge}
						<Badge tint={session.member?.status === 'active_patron' || session.creator ? 'mint' : 'neutral'}>{badge}</Badge>
					{/if}
					{#if session.member?.since}<span class="text-sm text-muted">since {since(session.member.since)}</span>{/if}
					{#if session.member?.entitledCents}<span class="text-sm text-muted">· {usd(session.member.entitledCents)}/mo</span>{/if}
				</div>
			</div>
			<div class="flex items-center gap-1">
				<button type="button" class={buttonClass('text', 'sm')} onclick={refresh} disabled={refreshing} title="Check for new purchases">
					<RefreshCw class="size-4 {refreshing ? 'animate-spin' : ''}" /> Refresh
				</button>
				<button type="button" class={buttonClass('text', 'sm')} onclick={() => account.logOut()}>
					<LogOut class="size-4" /> Log out
				</button>
			</div>
		</Card>

		<SectionLabel as="h2" class="mt-8 mb-3">Your decks</SectionLabel>
		{#if !manifest}
			<div class="h-20 animate-pulse rounded-panel bg-sunk"></div>
		{:else if owned.length}
			<ul class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
				{#each owned as product (product.id)}
					<li>
						<Card tint="mint" padding="sm" class="flex h-full items-center justify-between gap-3">
							<span class="font-semibold text-ink">{product.name}</span>
							<a href={buyUrl(manifest, product)} target="_blank" rel="noopener noreferrer" class={buttonClass('secondary', 'sm')}>
								Download <ArrowUpRight class="size-4" />
							</a>
						</Card>
					</li>
				{/each}
			</ul>
		{:else}
			<Card class="flex flex-wrap items-center justify-between gap-3">
				<p class="m-0 text-[15px] font-semibold text-ink">No decks yet</p>
				<a href="{base}/shop" class={buttonClass('primary', 'sm')}>Browse the shop</a>
			</Card>
		{/if}
		<p class="mt-4 mb-0 text-sm text-muted">
			Missing a deck? Press Refresh, or
			<a href={manifest?.shop || PATREON_SHOP} target="_blank" rel="noopener noreferrer" class="font-semibold text-accent">open the shop on Patreon</a>.
		</p>
	{/if}
</section>
