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
	import ShareModal from '$lib/components/ShareModal.svelte';
	import { initSharePrefs, popupHidden } from '$lib/share.svelte';

	let { children } = $props();
	const repo = 'https://github.com/krmanik/Anki-xiehanzi';
	const shop = 'https://www.patreon.com/cw/krmanik/shop';

	// Kept in sync with .github/FUNDING.yml
	const sponsorLinks = [
		{ href: 'https://github.com/sponsors/krmanik', label: 'GitHub Sponsors', brand: 'github' },
		{ href: 'https://www.buymeacoffee.com/krmani', label: 'Buy Me a Coffee', brand: 'coffee' }
	];

	let open = $state(false);
	let showShare = $state(false);
	let sponsorOpen = $state(false);
	let sponsorMenu = $state<HTMLElement>();
	let sponsorMenuMobile = $state<HTMLElement>();

	const insideSponsor = (target: Node) =>
		!!sponsorMenu?.contains(target) || !!sponsorMenuMobile?.contains(target);

	// The Share menu entry appears only after the user dismisses the
	// export-success popup with "Do not show again".
	onMount(initSharePrefs);

	const nav = [
		{ href: `${base}/create`, label: 'Create' },
		{ href: `${base}/decks`, label: 'Decks' },
		{ href: `${base}/docs`, label: 'Docs' }
	];

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
		if (sponsorOpen && !insideSponsor(e.target as Node)) sponsorOpen = false;
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') sponsorOpen = false;
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
			<a
				href={repo}
				class="ml-1 rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
				>GitHub</a
			>
			{#if popupHidden()}
				<button
					onclick={() => (showShare = true)}
					class="ml-1 flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-neutral-500 transition hover:text-neutral-900"
				>
					<Share2 size={14} /> Share
				</button>
			{/if}

			<div class="relative ml-1" bind:this={sponsorMenu}>
				<button
					onclick={() => (sponsorOpen = !sponsorOpen)}
					aria-haspopup="menu"
					aria-expanded={sponsorOpen}
					class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-neutral-500 transition hover:text-neutral-900"
				>
					<Heart size={14} /> Sponsor
				</button>
				{#if sponsorOpen}
					<div
						role="menu"
						tabindex="-1"
						class="absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
					>
						{#each sponsorLinks as link}
							<a
								role="menuitem"
								href={link.href}
								target="_blank"
								rel="noopener noreferrer"
								onclick={() => (sponsorOpen = false)}
								class="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
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
				sponsorOpen = false;
			}}
		>
			{#if open}<X size={20} />{:else}<Menu size={20} />{/if}
		</button>
	</nav>

	{#if open}
		<div class="border-t border-neutral-200 bg-white md:hidden">
			<div class="flex flex-col px-5 py-2">
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
				<a
					href={repo}
					class="rounded-md px-2 py-2.5 font-mono text-sm uppercase tracking-wider text-neutral-600"
					>GitHub</a
				>
				{#if popupHidden()}
					<button
						onclick={() => {
							open = false;
							showShare = true;
						}}
						class="flex items-center gap-2 rounded-md px-2 py-2.5 text-left font-mono text-sm uppercase tracking-wider text-neutral-600"
					>
						<Share2 size={16} /> Share
					</button>
				{/if}

				<div class="flex flex-col" bind:this={sponsorMenuMobile}>
					<button
						onclick={() => (sponsorOpen = !sponsorOpen)}
						aria-expanded={sponsorOpen}
						class="flex items-center gap-2 rounded-md px-2 py-2.5 text-left font-mono text-sm uppercase tracking-wider text-neutral-600"
					>
						<Heart size={16} /> Sponsor
					</button>
					{#if sponsorOpen}
						{#each sponsorLinks as link}
							<a
								href={link.href}
								target="_blank"
								rel="noopener noreferrer"
								onclick={() => {
									open = false;
									sponsorOpen = false;
								}}
								class="flex items-center gap-2 rounded-md py-2 pl-6 pr-2 text-sm text-neutral-600"
							>
								{@render brandIcon(link.brand, 16)}
								{link.label}
							</a>
						{/each}
					{/if}
				</div>
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
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href="{base}/decks">Decks</a>
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
