<!--
  A top-bar entry that opens a submenu (Tools) instead of a page: a disclosure
  button and a panel of links, one line each. Closes on a pick, Escape, or a
  click anywhere else.
-->
<script lang="ts">
	import { base } from '$app/paths';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import IconDot from '$lib/ui/IconDot.svelte';
	import { isActive, withBase, type NavItem } from '$lib/nav';
	import { NAV_ICONS } from './navIcons';

	let {
		item,
		current,
		linkClass
	}: {
		item: NavItem;
		/** Current path without the base. */
		current: string;
		/** The top bar's shared link classes, so the button lines up with its neighbours. */
		linkClass: string;
	} = $props();

	let open = $state(false);
	let root = $state<HTMLElement>();
	let button = $state<HTMLButtonElement>();

	const on = $derived(isActive(current, item));
	const panelId = $derived(`nav-sub-${item.path.replace(/\W/g, '')}`);

	function close(refocus = false) {
		open = false;
		if (refocus) button?.focus();
	}
</script>

<svelte:window
	onpointerdown={(e) => {
		if (open && root && !root.contains(e.target as Node)) close();
	}}
	onkeydown={(e) => {
		if (open && e.key === 'Escape') close(true);
	}}
/>

<div class="relative" bind:this={root}>
	<button
		bind:this={button}
		type="button"
		aria-expanded={open}
		aria-controls={panelId}
		class="{linkClass} inline-flex items-center gap-1 border-0 {on || open
			? 'bg-sky-soft font-semibold text-sky-ink'
			: 'bg-transparent text-muted hover:bg-sunk hover:text-ink'}"
		onclick={() => (open = !open)}
	>
		{item.label}
		<ChevronDown class="size-4 transition-transform {open ? 'rotate-180' : ''}" aria-hidden="true" />
	</button>

	{#if open}
		<div
			id={panelId}
			class="absolute top-full right-0 z-50 mt-2 w-72 rounded-panel bg-surface p-2 shadow-lg ring-1 ring-line ring-inset"
		>
			<ul class="m-0 flex list-none flex-col gap-0.5 p-0">
				{#each item.children ?? [] as child (child.path)}
					{@const Icon = NAV_ICONS[child.icon]}
					{@const here = isActive(current, child)}
					<li>
						<a
							href={withBase(child.path, base)}
							aria-current={here ? 'page' : undefined}
							onclick={() => close()}
							class="flex items-center gap-3 rounded-card px-2.5 py-2 no-underline transition-colors focus-visible:outline-3 focus-visible:outline-sky {here
								? 'bg-sky-soft'
								: 'hover:bg-sunk'}"
						>
							<IconDot hue={child.hue} size="sm"><Icon /></IconDot>
							<span class="min-w-0">
								<span class="block text-[15px] font-semibold text-ink">{child.label}</span>
								{#if child.blurb}<span class="block text-[13px] text-muted">{child.blurb}</span>{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
