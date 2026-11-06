<script lang="ts">
	// Self-hosted fonts (bundled by Vite, so they resolve under the Pages base path).
	// Noto Sans SC is split by unicode-range: only the chunks a page renders load.
	import '@fontsource/poppins/400.css';
	import '@fontsource/poppins/500.css';
	import '@fontsource/poppins/600.css';
	import '@fontsource/poppins/700.css';
	import '@fontsource-variable/noto-sans-sc';
	import '../app.css';
	import { onMount, tick } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import ShareModal from '$lib/components/ShareModal.svelte';
	import AccountMenu from '$lib/components/shell/AccountMenu.svelte';
	import Logo from '$lib/components/shell/Logo.svelte';
	import NavMenu from '$lib/components/shell/NavMenu.svelte';
	import NavDropdown from '$lib/components/shell/NavDropdown.svelte';
	import SiteFooter from '$lib/components/shell/SiteFooter.svelte';
	import { initSharePrefs, popupHidden } from '$lib/share.svelte';
	import { initTheme } from '$lib/theme.svelte';
	import { account } from '$lib/accountStore.svelte';
	import { isActive, SHOP, stripBase, TOPBAR, withBase } from '$lib/nav';

	let { children } = $props();

	// The theme toggle stays in dev builds until every page is on the design
	// tokens (Phase 7): pages not yet redesigned hardcode white and grey.
	const showThemeToggle = import.meta.env.DEV;

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
		// The header's account menu needs the login on every page. Guarded, so
		// pages that call it too are fine.
		account.init();
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

	const iconButton =
		'grid size-10 place-items-center rounded-full border-0 bg-transparent text-muted hover:bg-sunk hover:text-ink focus-visible:outline-3 focus-visible:outline-sky';
	const link =
		'rounded-full px-3.5 py-1.5 text-[15px] font-medium no-underline transition-colors focus-visible:outline-3 focus-visible:outline-sky';
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && drawerOpen) closeDrawer();
	}}
/>

<header class="sticky top-0 z-40 border-b border-line bg-ground">
	<div class="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:px-5">
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
		<Logo />
		<nav aria-label="Main" class="ml-auto hidden items-center gap-1 lg:flex">
			{#each TOPBAR as item (item.path)}
				{@const on = isActive(current, item)}
				{#if item.children}
					<NavDropdown {item} {current} linkClass={link} />
				{:else}
					<a
						href={withBase(item.path, base)}
						aria-current={on ? 'page' : undefined}
						class="{link} {on ? 'bg-sky-soft font-semibold text-sky-ink' : 'text-muted hover:bg-sunk hover:text-ink'}"
						>{item.label}</a
					>
				{/if}
			{/each}
			<a
				href={withBase(SHOP.path, base)}
				aria-current={isActive(current, SHOP) ? 'page' : undefined}
				class="{link} ml-1 bg-lavender-soft font-semibold text-lavender-ink hover:brightness-95"
				>{SHOP.label}</a
			>
		</nav>
		<div class="ml-auto flex items-center lg:ml-1">
			<AccountMenu {current} buttonClass={iconButton} {showThemeToggle} />
		</div>
	</div>
</header>

<main class="min-h-[70vh]">{@render children()}</main>
<SiteFooter />

{#if drawerOpen}
	<div class="fixed inset-0 z-50 lg:hidden">
		<button
			type="button"
			class="absolute inset-0 border-0 bg-black/40"
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
			class="absolute inset-y-0 left-0 w-[min(300px,85vw)] overflow-y-auto bg-surface shadow-xl"
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
