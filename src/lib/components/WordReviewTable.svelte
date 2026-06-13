<script lang="ts">
	import { Button, Progressbar, Select } from 'flowbite-svelte';
	import WordCard from '$lib/components/WordCard.svelte';
	import { btnPrimary, btnSecondary, btnDanger } from '$lib/buttonStyles';
	import { playWordAudio, type Word } from '$lib/deck';
	import type { TemplateOpts } from '$lib/deck';
	import type { TonePalette } from '$lib/tonePresets';

	let {
		words = $bindable(),
		template,
		palette,
		hskWordsDict,
		includeAudio,
		progressbarValue,
		isGenerating,
		onexportcsv,
		onpreview,
		ongenerate
	}: {
		words: Word[];
		template: TemplateOpts;
		palette: TonePalette;
		hskWordsDict: Set<string>;
		includeAudio: boolean;
		progressbarValue: number;
		isGenerating: boolean;
		onexportcsv: () => void;
		onpreview: () => void;
		ongenerate: () => void;
	} = $props();

	const rowsPerPageOptions = [5, 10, 25, 50, 100, 500].map((n) => ({ value: n, name: String(n) }));

	let selected = $state<Set<Word>>(new Set());
	let currentPage = $state(1);
	let rowsPerPage = $state(10);

	function toggleRow(word: Word) {
		const next = new Set(selected);
		if (next.has(word)) next.delete(word);
		else next.add(word);
		selected = next;
	}

	function deleteSelectedWord() {
		if (selected.size === 0) return;
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

	function cancelSelection() {
		selected = new Set();
	}

	let totalPages = $derived(Math.max(1, Math.ceil(words.length / rowsPerPage)));
	let pagedWords = $derived(
		words.slice((currentPage - 1) * rowsPerPage, (currentPage - 1) * rowsPerPage + rowsPerPage)
	);
</script>

<Progressbar progress={progressbarValue} class="my-4" />
<p class="mb-2 text-sm text-gray-500">
	{#if progressbarValue > 0}
		{progressbarValue.toFixed(1)}% - {includeAudio ? 'Processing audio...' : 'Processing...'}
	{:else}
		{includeAudio ? 'Ready to generate (includes audio)' : 'Ready to generate (no audio)'}
	{/if}
</p>

<div class="my-4 flex flex-wrap items-center justify-between gap-2">
	<div class="flex gap-2">
		<button class={btnDanger} onclick={deleteSelectedWord}>Delete</button>
		<button class={btnSecondary} onclick={cancelSelection}>Cancel</button>
	</div>
	<div class="flex gap-2">
		<button class={btnSecondary} onclick={onexportcsv} disabled={words.length === 0}>Export CSV</button>
		<button class={btnSecondary} onclick={onpreview} disabled={words.length === 0 || isGenerating}>
			Preview
		</button>
		<button class={btnPrimary} onclick={ongenerate} disabled={words.length === 0 || isGenerating}>
			{isGenerating ? 'Generating…' : 'Generate'}
		</button>
	</div>
</div>

{#if words.length === 0}
	<p class="rounded-lg border border-dashed border-neutral-300 py-10 text-center text-sm text-neutral-400">
		No words yet. Add words above to build your deck.
	</p>
{:else}
	<div class="grid gap-3">
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

<div class="my-4 flex items-center justify-between">
	<div class="flex items-center gap-2">
		<span class="text-sm text-gray-500">Rows per page</span>
		<div class="w-24">
			<Select
				items={rowsPerPageOptions}
				bind:value={rowsPerPage}
				onchange={() => (currentPage = 1)}
			/>
		</div>
	</div>
	<div class="flex items-center gap-2">
		<Button
			size="xs"
			color="alternative"
			disabled={currentPage <= 1}
			onclick={() => (currentPage = currentPage - 1)}>Prev</Button
		>
		<span class="text-sm">Page {currentPage} / {totalPages}</span>
		<Button
			size="xs"
			color="alternative"
			disabled={currentPage >= totalPages}
			onclick={() => (currentPage = currentPage + 1)}>Next</Button
		>
	</div>
</div>
