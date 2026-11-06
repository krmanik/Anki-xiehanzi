<!--
  Where the Patreon login lands (`/auth?next=…&back=…#patreon=<session>`).

  It is the tab a Buy or a Log in opened: store the login — every other tab of
  the site picks it up from localStorage — then go on to the checkout (`next`)
  or close. A tab the browser will not let us close (opened by hand, or the
  pop-up was blocked and this is the original tab) goes `back` instead.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { errorText, resolveAccount, safeBack, safeNext } from '$lib/account';
	import { buttonClass } from '$lib/ui';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';

	let message = $state('Logging you in…');
	let error = $state<string | null>(null);
	let back = $state(`${base}/shop`);

	onMount(() => {
		const params = new URLSearchParams(location.search);
		const state = resolveAccount(location.hash, Math.floor(Date.now() / 1000));
		history.replaceState(null, '', location.pathname + location.search);
		back = safeBack(params.get('back'), location.origin) ?? `${base}/shop`;

		// A Buy: on to the checkout whatever the login said — even "Deny" —
		// so a refused permission never costs the sale.
		const next = safeNext(params.get('next'));
		if (next) {
			message = 'Opening checkout…';
			location.replace(next);
			return;
		}

		if (state.kind === 'out' && state.error) {
			error = errorText(state.error);
			return;
		}
		message = 'Logged in. You can close this tab.';
		window.close();
		// Still here: this tab was not opened by the site. Carry on in it.
		setTimeout(() => location.replace(back), 400);
	});
</script>

<svelte:head>
	<title>Logging in · Anki-xiehanzi</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 py-16 text-center">
	{#if error}
		<div>
			<p class="m-0 text-[17px] font-semibold text-ink">{error}</p>
			<a href={back} class="{buttonClass('primary')} mt-5">Back to the site</a>
		</div>
	{:else}
		<p class="m-0 inline-flex items-center gap-2.5 text-[17px] font-semibold text-ink">
			<LoaderCircle class="size-5 animate-spin text-sky-ink" />
			{message}
		</p>
	{/if}
</section>
