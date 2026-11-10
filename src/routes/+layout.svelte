<script lang="ts">
	// Self-hosted fonts (bundled by Vite, so they resolve under the Pages base path).
	// Noto Sans SC is split by unicode-range: only the chunks a page renders load.
	import '@fontsource-variable/onest';
	import '@fontsource-variable/noto-sans-sc';
	import '../app.css';
	import { onMount, tick } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import ShareModal from '$lib/components/ShareModal.svelte';
	import HeaderLinks from '$lib/components/shell/HeaderLinks.svelte';
	import Logo from '$lib/components/shell/Logo.svelte';
	import NavMenu from '$lib/components/shell/NavMenu.svelte';
	import NavDropdown from '$lib/components/shell/NavDropdown.svelte';
	import SiteFooter from '$lib/components/shell/SiteFooter.svelte';
	import { initSharePrefs, popupHidden } from '$lib/share.svelte';
	import { initTheme } from '$lib/theme.svelte';
	import { isActive, SHOP, stripBase, TOPBAR, withBase } from '$lib/nav';
	import { ICON_BUTTON, SCRIM } from '$lib/ui/styles';

	let { children } = $props();

	const showThemeToggle = true;

	let drawerOpen = $state(false);
	let showShare = $state(false);
	let drawer = $state<HTMLElement>();
	let menuButton = $state<HTMLButtonElement>();

	const current = $derived(stripBase(page.url.pathname, base));

	onMount(() => {
		// The Share entry appears only after the visitor dismisses the
		// export-success popup with "Do not show again".
		initSharePrefs();
		initTheme();
	});

	afterNavigate(() => (drawerOpen = false));

	// Lock the page behind the open drawer.
	$effect(() => {
		document.body.style.overflow = drawerOpen ? 'hidden' : '';
	});

	async function openDrawer() {
		drawerOpen = true;
		await tick();
		drawer?.querySelector<HTMLElement>('a, button, input')?.focus();
	}

	function closeDrawer() {
		drawerOpen = false;
		menuButton?.focus();
	}

	const onshare = $derived(
		popupHidden()
			? () => {
					drawerOpen = false;
					showShare = true;
				}
			: undefined
	);

	const iconButton = ICON_BUTTON;
	const link =
		'inline-flex h-10 items-center rounded-xl px-3.5 text-[15px] font-medium xl:text-base no-underline transition-colors focus-visible:outline-3 focus-visible:outline-accent';
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && drawerOpen) closeDrawer();
	}}
/>

<header class="sticky top-3 z-40 mx-auto mt-3 max-w-[1180px] px-3 sm:px-7">
	<div
		class="flex h-14 items-center gap-0.5 rounded-[18px] bg-surface/85 pr-2 pl-3 shadow-object backdrop-blur-md sm:h-[60px] sm:rounded-[22px] sm:pl-[18px]"
	>
		<Logo />
		<nav aria-label="Main" class="ml-auto hidden items-center gap-0.5 lg:flex">
			{#each TOPBAR as item (item.path)}
				{@const on = isActive(current, item)}
				{#if item.children}
					<NavDropdown {item} {current} linkClass={link} />
				{:else}
					<a
						href={withBase(item.path, base)}
						aria-current={on ? 'page' : undefined}
						class="{link} {on ? 'bg-sunk font-semibold text-ink' : 'text-muted hover:bg-sunk hover:text-ink'}"
						>{item.label}</a
					>
				{/if}
			{/each}
			<a
				href={withBase(SHOP.path, base)}
				aria-current={isActive(current, SHOP) ? 'page' : undefined}
				class="{link} gap-2 font-semibold text-ink hover:bg-sunk aria-[current=page]:bg-sunk"
				><span class="size-2 rounded-full bg-gold shadow-[0_0_0_3px_var(--xhz-gold-soft)]" aria-hidden="true"
				></span>{SHOP.label}</a
			>
		</nav>
		<div class="ml-auto flex items-center lg:ml-1">
			<HeaderLinks buttonClass={iconButton} {showThemeToggle} />
			<button
				bind:this={menuButton}
				type="button"
				class="{iconButton} lg:hidden"
				aria-label="Open menu"
				aria-expanded={drawerOpen}
				aria-controls="site-drawer"
				onclick={openDrawer}
			>
				<Menu class="size-5" />
			</button>
		</div>
	</div>
</header>

<main class="min-h-[70vh]">{@render children()}</main>
<SiteFooter />

{#if drawerOpen}
	<div class="fixed inset-0 z-50 lg:hidden">
		<button
			type="button"
			class="absolute inset-0 border-0 {SCRIM}"
			aria-label="Close menu"
			tabindex="-1"
			onclick={closeDrawer}
		></button>
		<div
			bind:this={drawer}
			id="site-drawer"
			role="dialog"
			aria-modal="true"
			aria-label="Menu"
			class="absolute inset-y-2 right-2 w-[min(320px,88vw)] overflow-y-auto rounded-tile bg-surface shadow-raised"
		>
			<button
				type="button"
				class="{iconButton} absolute top-4 right-3"
				aria-label="Close menu"
				onclick={closeDrawer}
			>
				<X class="size-5" />
			</button>
			<NavMenu {current} onnavigate={() => (drawerOpen = false)} {onshare} {showThemeToggle} />
		</div>
	</div>
{/if}

{#if showShare}
	<ShareModal onClose={() => (showShare = false)} />
{/if}
