<!--
  The full site navigation for the ☰ drawer (below 1024px, where the top bar
  has no room for its links): search, the Learn / Make groups, Premium, and
  the small links at the foot. The same entries as the top bar, from nav.ts.
-->
<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import Search from '@lucide/svelte/icons/search';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import IconDot from '$lib/ui/IconDot.svelte';
	import Logo from './Logo.svelte';
	import { isActive, SHOP, searchHref, SIDEBAR, withBase, type NavItem } from '$lib/nav';
	import { NAV_ICONS } from './navIcons';
	import { REPO } from '$lib/share.svelte';
	import { currentTheme, toggleTheme } from '$lib/theme.svelte';

	let {
		current,
		onnavigate,
		onshare,
		showThemeToggle = false
	}: {
		/** Current path without the base. */
		current: string;
		/** Called after any link is followed (the drawer closes on it). */
		onnavigate?: () => void;
		/** Present once the visitor has opted out of the share popup. */
		onshare?: () => void;
		showThemeToggle?: boolean;
	} = $props();

	let query = $state('');

	function search(e: SubmitEvent) {
		e.preventDefault();
		const href = searchHref(query, base);
		if (!href) return;
		query = '';
		onnavigate?.();
		goto(href);
	}

	const foot =
		'text-[13px] text-muted no-underline hover:text-ink focus-visible:outline-3 focus-visible:outline-sky rounded';
</script>

{#snippet entry(item: NavItem, shop = false)}
	{@const Icon = NAV_ICONS[item.icon]}
	{@const on = isActive(current, item)}
	<a
		href={withBase(item.path, base)}
		onclick={onnavigate}
		aria-current={on ? 'page' : undefined}
		class="flex min-h-10 items-center gap-3 rounded-full px-2.5 py-1 text-[15px] font-medium no-underline transition-colors focus-visible:outline-3 focus-visible:outline-sky {on
			? 'bg-sky-soft font-semibold text-sky-ink'
			: shop
				? 'bg-apricot-soft font-semibold text-apricot-ink hover:brightness-95'
				: 'text-ink hover:bg-sunk'}"
	>
		<IconDot hue={item.hue} size="sm"><Icon /></IconDot>
		{item.label}
	</a>
{/snippet}

<div class="flex h-full flex-col gap-1 px-3 py-5">
	<div class="px-2 pb-4"><Logo onclick={onnavigate} /></div>

	<form role="search" onsubmit={search} class="mb-2">
		<label
			class="flex min-h-10 items-center gap-2 rounded-full bg-sunk px-3.5 text-muted focus-within:outline-3 focus-within:outline-sky"
		>
			<Search class="size-4 shrink-0" aria-hidden="true" />
			<span class="sr-only">Look up a word</span>
			<input
				type="search"
				bind:value={query}
				placeholder="Look up a word"
				enterkeyhint="search"
				class="w-full border-0 bg-transparent p-0 text-[15px] text-ink placeholder:text-muted focus:ring-0 focus:outline-none"
			/>
		</label>
	</form>

	<nav aria-label="Main" class="flex flex-col gap-1">
		{#each SIDEBAR as group (group.label)}
			<h2 class="m-0 px-2.5 pt-4 pb-1 font-sans text-xs font-semibold tracking-normal text-muted">
				{group.label}
			</h2>
			{#each group.items as item (item.path)}
				{@render entry(item)}
			{/each}
		{/each}
		<div class="pt-4">
			{@render entry(SHOP, true)}
		</div>
	</nav>

	<div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 px-2.5 pt-6">
		<a class={foot} href="{base}/docs" onclick={onnavigate}>Docs</a>
		<a class={foot} href={REPO} target="_blank" rel="noopener noreferrer">GitHub</a>
		<a class={foot} href="https://github.com/sponsors/krmanik" target="_blank" rel="noopener noreferrer"
			>Sponsor</a
		>
		{#if onshare}
			<button type="button" class="{foot} border-0 bg-transparent p-0" onclick={onshare}>Share</button>
		{/if}
		{#if showThemeToggle}
			<button
				type="button"
				class="{foot} ml-auto grid size-8 place-items-center border-0 bg-transparent p-0"
				aria-label={currentTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				onclick={toggleTheme}
			>
				{#if currentTheme() === 'dark'}<Sun class="size-4" />{:else}<Moon class="size-4" />{/if}
			</button>
		{/if}
	</div>
</div>
