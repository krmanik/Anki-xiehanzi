<!--
  How much of a word list the reader knows, from their own Anki: one bar, one
  line of counts, and Known / Learning / New chips that filter the list.

  Before Anki is connected it is one button (desktop only — phones have no
  AnkiConnect). A browser that has connected before is checked quietly by the
  page, so the button is mostly seen once.
-->
<script lang="ts">
	import { anki, checkAnki, ANKI_STATUS_TEXT } from '$lib/anki/ankiStatus.svelte';
	import { loadProgress, progress } from '$lib/anki/progress.svelte';
	import { countStates, percent, type WordState } from '$lib/anki/progress';
	import { Button, Chip } from '$lib/ui';
	import ChartNoAxesColumn from '@lucide/svelte/icons/chart-no-axes-column';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';

	let {
		words,
		filter = $bindable(null)
	}: {
		words: readonly string[];
		filter?: WordState | null;
	} = $props();

	const count = $derived(countStates(words, progress.states));
	const shown = $derived(anki.status === 'ready' && progress.status === 'ready');

	async function connect() {
		const s = anki.status === 'ready' ? 'ready' : await checkAnki();
		if (s === 'ready') await loadProgress(true);
	}

	const CHIPS: { state: WordState; label: string; dot: string }[] = [
		{ state: 'known', label: 'Known', dot: 'bg-mint' },
		{ state: 'learning', label: 'Learning', dot: 'bg-apricot' },
		{ state: 'new', label: 'New', dot: 'bg-line' }
	];

	// A filter left on from a list with words in that state must not empty this one.
	$effect(() => {
		if (!shown) filter = null;
	});
</script>

{#if shown}
	<section class="mb-5 rounded-card bg-sunk p-4" aria-label="Your progress">
		<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
			<p class="m-0 font-semibold text-ink">
				{count.known.toLocaleString()} of {count.total.toLocaleString()} known
				<span class="font-medium text-muted">· {percent(count.known, count.total)}%</span>
			</p>
			{#if count.learning}
				<p class="m-0 text-[15px] text-muted">{count.learning.toLocaleString()} learning</p>
			{/if}
			<button
				type="button"
				class="ml-auto grid size-8 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink"
				aria-label="Refresh from Anki"
				title="Refresh from Anki"
				onclick={() => loadProgress(true)}
			>
				<RefreshCw class="size-4" />
			</button>
		</div>
		<!-- Known, then learning, on one track. -->
		<div
			class="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-surface"
			role="img"
			aria-label="{count.known} known, {count.learning} learning, {count.new} new"
		>
			<div class="bg-mint" style:width="{(count.known / Math.max(1, count.total)) * 100}%"></div>
			<div class="bg-apricot" style:width="{(count.learning / Math.max(1, count.total)) * 100}%"></div>
		</div>
		<div class="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Show words by progress">
			<Chip onTint selected={filter === null} onclick={() => (filter = null)} count={count.total}>All</Chip>
			{#each CHIPS as c (c.state)}
				<Chip onTint selected={filter === c.state} onclick={() => (filter = c.state)} count={count[c.state]}>
					<span class="size-2 rounded-full {c.dot}" aria-hidden="true"></span>{c.label}
				</Chip>
			{/each}
		</div>
	</section>
{:else if anki.status === 'checking' || progress.status === 'loading'}
	<p class="mb-5 hidden items-center gap-2 text-[15px] text-muted sm:flex" aria-live="polite">
		<span class="size-2 animate-pulse rounded-full bg-sky"></span>
		{#if progress.reading}
			Reading your Anki… {progress.reading.done.toLocaleString()} of {progress.reading.total.toLocaleString()} words
		{:else if anki.status === 'checking'}
			{ANKI_STATUS_TEXT.checking}
		{:else}
			Reading your Anki…
		{/if}
	</p>
{:else}
	<div class="mb-5 hidden flex-wrap items-center gap-x-3 gap-y-1 sm:flex">
		<Button size="sm" variant="secondary" onclick={connect}>
			<ChartNoAxesColumn class="size-4" />Show my progress
		</Button>
		{#if progress.status === 'error'}
			<p class="m-0 text-[15px] text-rose-ink">Could not read your Anki: {progress.error}</p>
		{:else if anki.status !== 'idle' && anki.status !== 'ready'}
			<p class="m-0 text-[15px] text-muted">{ANKI_STATUS_TEXT[anki.status]}</p>
		{/if}
	</div>
{/if}
