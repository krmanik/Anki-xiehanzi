<!--
  The header's right side: the GitHub link and, in dev builds, the theme icon.
-->
<script lang="ts">
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { currentTheme, toggleTheme } from '$lib/theme.svelte';
	import { REPO } from '$lib/share.svelte';

	let {
		buttonClass,
		showThemeToggle = false
	}: {
		/** The header's round icon-button classes. */
		buttonClass: string;
		showThemeToggle?: boolean;
	} = $props();
</script>

<a href={REPO} class={buttonClass} aria-label="Anki-xiehanzi on GitHub" target="_blank" rel="noopener noreferrer">
	<svg class="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
		><path
			d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"
		/></svg
	>
</a>

{#if showThemeToggle}
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
