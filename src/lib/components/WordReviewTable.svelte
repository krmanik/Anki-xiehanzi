<!--
  The words in the deck: one row each, paged, with a bulk delete once rows are
  ticked. The rows scroll inside their own box; the pager is bound out so the
  page can pin it to the bottom bar beside Next.
-->
<script lang="ts">
	import WordCard from '$lib/components/WordCard.svelte';
	import { buttonClass } from '$lib/ui';
	import { playWordAudio, type Word } from '$lib/deck';
	import type { TemplateOpts } from '$lib/deck';
	import type { TonePalette } from '$lib/tonePresets';

	let {
		words = $bindable(),
		page = $bindable(1),
		pageSize = $bindable(25),
		template,
		palette,
		hskWordsDict
	}: {
		words: Word[];
		page?: number;
		pageSize?: number;
		template: TemplateOpts;
		palette: TonePalette;
		hskWordsDict: Set<string>;
	} = $props();

	let selected = $state<Set<Word>>(new Set());

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

	let pagedWords = $derived(words.slice((page - 1) * pageSize, page * pageSize));

	// A new page starts at its first row, not wherever the last one was scrolled to.
	let box = $state<HTMLDivElement>();
	$effect(() => {
		void page;
		void pageSize;
		box?.scrollTo?.({ top: 0 });
	});
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

	<div
		bind:this={box}
		class="-mx-1 grid max-h-[max(18rem,calc(100dvh-16rem))] grid-cols-1 gap-2 overflow-y-auto overscroll-contain px-1 py-0.5"
	>
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
{/if}
