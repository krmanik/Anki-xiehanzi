<!--
  The header's account control. Logged out it is one "Log in" button and
  nothing else. Logged in it is an avatar that opens a small menu — My decks,
  My words, Log out — with GitHub and the theme icon to its right.
  The GitHub link shows either way (from `sm` up; the footer has it on phones). Same disclosure pattern as
  NavDropdown: closes on a pick, Escape, or a click anywhere else.
-->
<script lang="ts">
	import { base } from '$app/paths';
	import CircleUser from '@lucide/svelte/icons/circle-user';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import Library from '@lucide/svelte/icons/library';
	import LogIn from '@lucide/svelte/icons/log-in';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { account } from '$lib/accountStore.svelte';
	import { currentTheme, toggleTheme } from '$lib/theme.svelte';
	import { buttonClass as uiButton } from '$lib/ui';
	import { REPO } from '$lib/share.svelte';

	let {
		current,
		buttonClass,
		showThemeToggle = false
	}: {
		/** Current path without the base. */
		current: string;
		/** The header's round icon-button classes. */
		buttonClass: string;
		/** Show the theme icon while logged out too (dev builds). */
		showThemeToggle?: boolean;
	} = $props();

	let open = $state(false);
	let root = $state<HTMLElement>();
	let button = $state<HTMLButtonElement>();

	const session = $derived(account.session);
	// Not before the login has been read — no "Log in" flash for someone who is.
	const loggedOut = $derived(account.state?.kind === 'out' && account.enabled);
	const label = $derived(session ? `Account menu for ${session.name}` : 'Account menu');

	function close(refocus = false) {
		open = false;
		if (refocus) button?.focus();
	}

	const row =
		'flex w-full items-center gap-3 rounded-card border-0 bg-transparent px-2.5 py-2 text-left text-[15px] font-medium text-ink no-underline transition-colors hover:bg-sunk focus-visible:outline-3 focus-visible:outline-sky';
</script>

<svelte:window
	onpointerdown={(e) => {
		if (open && root && !root.contains(e.target as Node)) close();
	}}
	onkeydown={(e) => {
		if (open && e.key === 'Escape') close(true);
	}}
/>

{#if session}
	<div class="relative" bind:this={root}>
		<button
			bind:this={button}
			type="button"
			class={buttonClass}
			aria-label={label}
			aria-expanded={open}
			aria-controls="account-menu"
			onclick={() => (open = !open)}
		>
			{#if session.image}
				<img src={session.image} alt="" class="size-7 rounded-full object-cover" referrerpolicy="no-referrer" />
			{:else}
				<CircleUser class="size-5" />
			{/if}
		</button>

		{#if open}
			<div
				id="account-menu"
				class="absolute top-full right-0 z-50 mt-2 w-64 rounded-panel bg-surface p-2 shadow-lg ring-1 ring-line ring-inset"
			>
				<p class="m-0 truncate px-2.5 pt-1.5 pb-2 text-[15px] font-semibold text-ink">{session.name}</p>
				<ul class="m-0 flex list-none flex-col gap-0.5 p-0">
					<li>
						<a
							href="{base}/account"
							class="{row} {current === '/account' ? 'bg-sky-soft' : ''}"
							aria-current={current === '/account' ? 'page' : undefined}
							onclick={() => close()}><Library class="size-4 text-muted" /> My decks</a
						>
					</li>
					<li>
						<a
							href="{base}/words"
							class="{row} {current === '/words' ? 'bg-sky-soft' : ''}"
							aria-current={current === '/words' ? 'page' : undefined}
							onclick={() => close()}><Bookmark class="size-4 text-muted" /> My words</a
						>
					</li>
					<li class="mt-1 border-t border-line pt-1">
						<button
							type="button"
							class={row}
							onclick={() => {
								close();
								account.logOut();
							}}><LogOut class="size-4 text-muted" /> Log out</button
						>
					</li>
				</ul>
			</div>
		{/if}
	</div>
{:else if loggedOut}
	<button
		type="button"
		class="{uiButton('primary', 'sm')} ml-1 whitespace-nowrap"
		onclick={() => account.logIn()}><LogIn class="size-4" /> Log in</button
	>
{/if}

<!-- Hidden on phones: the header has no room for it beside Log in, and the
     footer links GitHub too. -->
<a href={REPO} class="{buttonClass} max-sm:hidden" aria-label="Anki-xiehanzi on GitHub" target="_blank" rel="noopener noreferrer">
	<svg class="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
		><path
			d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"
		/></svg
	>
</a>

{#if session || showThemeToggle}
	<button
		type="button"
		class={buttonClass}
		aria-label={currentTheme() === 'dark' ? 'Light mode' : 'Dark mode'}
		onclick={toggleTheme}
	>
		{#if currentTheme() === 'dark'}
			<Sun class="size-5" />
		{:else}
			<Moon class="size-5" />
		{/if}
	</button>
{/if}
