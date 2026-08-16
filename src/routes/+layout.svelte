<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Heart from '@lucide/svelte/icons/heart';
	import Coffee from '@lucide/svelte/icons/coffee';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ShareModal from '$lib/components/ShareModal.svelte';
	import { initSharePrefs, popupHidden } from '$lib/share.svelte';

	let { children } = $props();
	const repo = 'https://github.com/krmanik/Anki-xiehanzi';
	const shop = 'https://www.patreon.com/cw/krmani/shop';

	// Kept in sync with .github/FUNDING.yml
	const sponsorLinks = [
		{ href: 'https://github.com/sponsors/krmanik', label: 'GitHub Sponsors', brand: 'github' },
		{ href: 'https://www.buymeacoffee.com/krmani', label: 'Buy Me a Coffee', brand: 'coffee' }
	];

	let open = $state(false);
	let showShare = $state(false);
	let moreOpen = $state(false);
	let moreMenu = $state<HTMLElement>();
	let moreMenuMobile = $state<HTMLElement>();

	const insideMore = (target: Node) =>
		!!moreMenu?.contains(target) || !!moreMenuMobile?.contains(target);

	// The Share menu entry appears only after the user dismisses the
	// export-success popup with "Do not show again".
	onMount(initSharePrefs);

	// Word lists and prebuilt decks share one page. Source, sharing and sponsoring
	// fold into a single "More" menu, leaving three destinations plus the shop.
	const nav = [
		{ href: `${base}/create`, label: 'Create' },
		{ href: `${base}/hsk`, label: 'HSK' },
		{ href: `${base}/docs`, label: 'Docs' }
	];

	const menuItem =
		'flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900';
	const mobileItem = 'flex items-center gap-2.5 rounded-md px-2 py-2.5 text-sm text-neutral-600';

	const current = $derived(page.url.pathname.replace(base, '') || '/');
	const isActive = (href: string) => {
		const h = href.replace(base, '');
		return h === '/' ? current === '/' : current.startsWith(h);
	};
</script>

{#snippet brandIcon(brand: string, size: number)}
	{#if brand === 'github'}
		<svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
			<path
				d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.75.81 1.2 1.84 1.2 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.2.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z"
			/>
		</svg>
	{:else}
		<Coffee {size} />
	{/if}
{/snippet}

<svelte:window
	onclick={(e) => {
		if (moreOpen && !insideMore(e.target as Node)) moreOpen = false;
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') moreOpen = false;
	}}
/>

<header class="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
	<nav class="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
		<a href="{base}/" class="flex items-center gap-2 font-bold tracking-tight text-neutral-900">
			<img src="{base}/img/logo.gif" alt="" class="h-7 w-7" />
			<span>Anki<span class="text-indigo-600">xiehanzi</span></span>
		</a>

		<!-- desktop -->
		<div class="hidden items-center gap-1 md:flex">
			{#each nav as item}
				<a
					href={item.href}
					class="rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition {isActive(
						item.href
					)
						? 'bg-neutral-900 text-white'
						: 'text-neutral-500 hover:text-neutral-900'}">{item.label}</a
				>
			{/each}
			<a
				href={shop}
				target="_blank"
				rel="noopener noreferrer"
				class="ml-1 flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-neutral-500 transition hover:text-neutral-900"
			>
				<ShoppingBag size={14} /> Shop
			</a>

			<div class="relative ml-1" bind:this={moreMenu}>
				<button
					onclick={() => (moreOpen = !moreOpen)}
					aria-haspopup="menu"
					aria-expanded={moreOpen}
					class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-neutral-500 transition hover:text-neutral-900"
				>
					More <ChevronDown size={13} class={moreOpen ? 'rotate-180 transition' : 'transition'} />
				</button>
				{#if moreOpen}
					<div
						role="menu"
						tabindex="-1"
						class="absolute right-0 z-50 mt-1 w-60 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
					>
						<a
							role="menuitem"
							href={repo}
							target="_blank"
							rel="noopener noreferrer"
							onclick={() => (moreOpen = false)}
							class={menuItem}
						>
							{@render brandIcon('github', 16)} GitHub
						</a>
						{#if popupHidden()}
							<button
								role="menuitem"
								onclick={() => {
									moreOpen = false;
									showShare = true;
								}}
								class="{menuItem} w-full text-left"
							>
								<Share2 size={16} class="text-neutral-400" /> Share this site
							</button>
						{/if}

						<div class="my-1 border-t border-neutral-100"></div>
						<p
							class="flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-neutral-400"
						>
							<Heart size={11} /> Sponsor
						</p>
						{#each sponsorLinks as link}
							<a
								role="menuitem"
								href={link.href}
								target="_blank"
								rel="noopener noreferrer"
								onclick={() => (moreOpen = false)}
								class={menuItem}
							>
								{@render brandIcon(link.brand, 16)}
								{link.label}
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- mobile toggle -->
		<button
			class="rounded-md p-1.5 text-neutral-700 hover:bg-neutral-100 md:hidden"
			aria-label="menu"
			onclick={() => {
				open = !open;
				moreOpen = false;
			}}
		>
			{#if open}<X size={20} />{:else}<Menu size={20} />{/if}
		</button>
	</nav>

	{#if open}
		<div class="border-t border-neutral-200 bg-white md:hidden">
			<div class="flex flex-col px-5 py-2" bind:this={moreMenuMobile}>
				{#each nav as item}
					<a
						href={item.href}
						onclick={() => (open = false)}
						class="rounded-md px-2 py-2.5 font-mono text-sm uppercase tracking-wider {isActive(
							item.href
						)
							? 'text-indigo-600'
							: 'text-neutral-600'}">{item.label}</a
					>
				{/each}

				<a
					href={shop}
					target="_blank"
					rel="noopener noreferrer"
					onclick={() => (open = false)}
					class="flex items-center gap-2 rounded-md px-2 py-2.5 font-mono text-sm uppercase tracking-wider text-neutral-600"
				>
					<ShoppingBag size={16} /> Shop
				</a>

				<div class="my-1 border-t border-neutral-100"></div>

				<a
					href={repo}
					target="_blank"
					rel="noopener noreferrer"
					onclick={() => (open = false)}
					class={mobileItem}
				>
					{@render brandIcon('github', 16)} GitHub
				</a>
				{#if popupHidden()}
					<button
						onclick={() => {
							open = false;
							showShare = true;
						}}
						class="{mobileItem} text-left"
					>
						<Share2 size={16} class="text-neutral-400" /> Share this site
					</button>
				{/if}

				<p
					class="mt-1 flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-neutral-400"
				>
					<Heart size={11} /> Sponsor
				</p>
				{#each sponsorLinks as link}
					<a
						href={link.href}
						target="_blank"
						rel="noopener noreferrer"
						onclick={() => (open = false)}
						class={mobileItem}
					>
						{@render brandIcon(link.brand, 16)}
						{link.label}
					</a>
				{/each}
			</div>
		</div>
	{/if}
</header>

{#if showShare}
	<ShareModal onClose={() => (showShare = false)} />
{/if}

<main class="min-h-[70vh]">
	{@render children()}
</main>

<footer class="mt-16 border-t border-neutral-200 bg-neutral-50">
	<div class="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 md:grid-cols-4">
		<div class="sm:col-span-2 md:col-span-1">
			<div class="flex items-center gap-2 font-bold tracking-tight">
				<img src="{base}/img/logo.gif" alt="" class="h-6 w-6" />
				Anki<span class="text-indigo-600">xiehanzi</span>
			</div>
			<p class="mt-2 max-w-xs text-sm text-neutral-500">
				Learn, read and write Mandarin by drawing strokes in Anki.
			</p>
		</div>
		<div>
			<h3 class="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">Resources</h3>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href="{base}/docs">Docs</a>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href="{base}/hsk">HSK word lists</a>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href="{base}/hsk#decks">Prebuilt decks</a>
		</div>
		<div>
			<h3 class="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">Community</h3>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href="https://forums.ankiweb.net/">Anki Forums</a>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href="https://discord.gg/qjzcRTx">Discord</a>
		</div>
		<div>
			<h3 class="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">More</h3>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href="{base}/create">Create</a>
			<a
				class="block py-1 text-sm text-neutral-600 hover:text-neutral-900"
				href={shop}
				target="_blank"
				rel="noopener noreferrer">Shop</a
			>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href={repo}>GitHub</a>
		</div>
	</div>
	<div class="border-t border-neutral-200 px-5 py-4 text-center font-mono text-xs text-neutral-400">
		© {new Date().getFullYear()} Anki-xiehanzi · GPL-3.0
	</div>
</footer>
