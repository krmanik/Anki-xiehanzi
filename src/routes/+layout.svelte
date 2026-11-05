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
	import Search from '@lucide/svelte/icons/search';
	import ShareModal from '$lib/components/ShareModal.svelte';
	import Logo from '$lib/components/shell/Logo.svelte';
	import Sidebar from '$lib/components/shell/Sidebar.svelte';
	import SiteFooter from '$lib/components/shell/SiteFooter.svelte';
	import { initSharePrefs, popupHidden } from '$lib/share.svelte';
	import { initTheme } from '$lib/theme.svelte';
	import { isLanding, PREMIUM, stripBase, TOPBAR, withBase } from '$lib/nav';

	let { children } = $props();

	// The theme toggle stays in dev builds until every page is on the design
	// tokens (Phase 7): pages not yet redesigned hardcode white and grey.
	const showThemeToggle = import.meta.env.DEV;

	let drawerOpen = $state(false);
	let showShare = $state(false);
	let drawer = $state<HTMLElement>();
	let menuButton = $state<HTMLButtonElement>();

	const current = $derived(stripBase(page.url.pathname, base));
	const landing = $derived(isLanding(current));

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

	const iconButton =
		'grid size-10 place-items-center rounded-full text-muted hover:bg-sunk hover:text-ink focus-visible:outline-3 focus-visible:outline-sky';
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && drawerOpen) closeDrawer();
	}}
/>


{#snippet menuToggle(cls: string)}
	<button
		bind:this={menuButton}
		type="button"
		class="{iconButton} {cls}"
		aria-label="Open menu"
		aria-expanded={drawerOpen}
		aria-controls="site-drawer"
		onclick={openDrawer}
	>
		<Menu class="size-5" />
	</button>
{/snippet}

{#snippet searchLink()}
	<a href="{base}/dictionary" class={iconButton} aria-label="Look up a word">
		<Search class="size-5" />
	</a>
{/snippet}

{#if landing}
	<header class="sticky top-0 z-40 border-b border-line bg-ground">
		<div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-5">
			<Logo />
			<nav aria-label="Main" class="ml-auto hidden items-center gap-1 md:flex">
				{#each TOPBAR as item (item.path)}
					<a
						href={withBase(item.path, base)}
						class="rounded-full px-3.5 py-1.5 text-[15px] font-medium text-muted no-underline hover:bg-sunk hover:text-ink"
						>{item.label}</a
					>
				{/each}
				<a
					href={withBase(PREMIUM.path, base)}
					class="rounded-full bg-apricot-soft px-3.5 py-1.5 text-[15px] font-semibold text-apricot-ink no-underline hover:brightness-95"
					>{PREMIUM.label}</a
				>
			</nav>
			<div class="ml-auto flex items-center md:ml-0">
				{@render searchLink()}
				{@render menuToggle('md:hidden')}
			</div>
		</div>
	</header>
	<main class="min-h-[70vh]">{@render children()}</main>
	<SiteFooter />
{:else}
	<div class="lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
		<aside
			class="sticky top-0 hidden h-dvh overflow-y-auto border-r border-line bg-surface lg:block"
		>
			<Sidebar {current} {onshare} {showThemeToggle} />
		</aside>
		<div class="min-w-0">
			<header
				class="sticky top-0 z-40 flex items-center gap-1 border-b border-line bg-surface px-2 py-2 lg:hidden"
			>
				{@render menuToggle('')}
				<div class="mr-auto"><Logo /></div>
				{@render searchLink()}
			</header>
			<main class="min-h-[70vh]">{@render children()}</main>
			<SiteFooter />
		</div>
	</div>
{/if}

{#if drawerOpen}
	<div class="fixed inset-0 z-50 {landing ? 'md:hidden' : 'lg:hidden'}">
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
			<Sidebar
				current={landing ? '/' : current}
				onnavigate={() => (drawerOpen = false)}
				{onshare}
				{showThemeToggle}
			/>
		</div>
	</div>
{/if}

{#if showShare}
	<ShareModal onClose={() => (showShare = false)} />
{/if}
