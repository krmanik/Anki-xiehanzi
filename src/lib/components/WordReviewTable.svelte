<!--
  The words in the deck: one row each, paged, with a bulk delete once rows are
  ticked. Export lives on its own step now; this is only the list.
-->
<script lang="ts">
	import WordCard from '$lib/components/WordCard.svelte';
	import { buttonClass } from '$lib/ui';
	import { playWordAudio, type Word } from '$lib/deck';
	import type { TemplateOpts } from '$lib/deck';
	import type { TonePalette } from '$lib/tonePresets';

	let {
		words = $bindable(),
		template,
		palette,
		hskWordsDict
	}: {
		words: Word[];
		template: TemplateOpts;
		palette: TonePalette;
		hskWordsDict: Set<string>;
	} = $props();

	const PAGE_SIZES = [10, 25, 50, 100, 500];

	let selected = $state<Set<Word>>(new Set());
	let currentPage = $state(1);
	let rowsPerPage = $state(25);

	function toggleRow(word: Word) {
		const next = new Set(selected);
		if (next.has(word)) next.delete(word);
		else next.add(word);
		selected = next;
	}

	function deleteSelected() {
		words = words.filter((w) => !selected.has(w));
		selected = new Set();
	}

	function deleteWord(word: Word) {
		words = words.filter((w) => w !== word);
		if (selected.has(word)) {
			const next = new Set(selected);
			next.delete(word);
			selected = next;
		}
	}

	let totalPages = $derived(Math.max(1, Math.ceil(words.length / rowsPerPage)));
	// Deleting the last rows of the last page would leave an empty page behind.
	$effect(() => {
		if (currentPage > totalPages) currentPage = totalPages;
	});
	let pagedWords = $derived(words.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage));

	const pager =
		'grid size-9 place-items-center rounded-full border-0 bg-sunk text-ink hover:bg-line disabled:opacity-40';
</script>

{#if words.length === 0}
	<p class="m-0 rounded-panel bg-sunk px-4 py-10 text-center text-muted">No words yet.</p>
{:else}
	<div class="mb-3 flex min-h-9 flex-wrap items-center gap-2">
		<h3 class="m-0 text-base font-semibold text-ink">
			{words.length.toLocaleString()} word{words.length === 1 ? '' : 's'}
		</h3>
		{#if selected.size}
			<span class="text-sm text-muted">· {selected.size} selected</span>
			<button type="button" class="{buttonClass('secondary', 'sm')} ml-auto" onclick={() => (selected = new Set())}
				>Clear</button
			>
			<button
				type="button"
				class="{buttonClass('secondary', 'sm')} text-rose-ink"
				onclick={deleteSelected}>Delete {selected.size}</button
			>
		{/if}
	</div>

	<div class="grid gap-2">
		{#each pagedWords as word (word)}
			<WordCard
				{word}
				selected={selected.has(word)}
				colorize={!template.mono && template.colorHanzi}
				toneColors={palette}
				onToggle={() => toggleRow(word)}
				onDelete={() => deleteWord(word)}
				onPlay={() => void playWordAudio(word.Simplified, hskWordsDict)}
			/>
		{/each}
	</div>

	{#if words.length > PAGE_SIZES[0]}
		<div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
			<label class="flex items-center gap-2">
				Per page
				<select
					bind:value={rowsPerPage}
					onchange={() => (currentPage = 1)}
					class="min-h-9 rounded-full border-0 bg-sunk py-0 pr-8 pl-3 text-sm text-ink"
				>
					{#each PAGE_SIZES as n (n)}<option value={n}>{n}</option>{/each}
				</select>
			</label>
			<div class="flex items-center gap-2">
				<button
					type="button"
					class={pager}
					aria-label="Previous page"
					disabled={currentPage <= 1}
					onclick={() => (currentPage -= 1)}>‹</button
				>
				<span>{currentPage} / {totalPages}</span>
				<button
					type="button"
					class={pager}
					aria-label="Next page"
					disabled={currentPage >= totalPages}
					onclick={() => (currentPage += 1)}>›</button
				>
			</div>
		</div>
	{/if}
{/if}
