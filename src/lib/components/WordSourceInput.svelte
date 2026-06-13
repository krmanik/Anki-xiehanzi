<script lang="ts">
	import { Input, Fileupload, Progressbar, Textarea } from 'flowbite-svelte';
	import { btnPrimary } from '$lib/buttonStyles';
	import BreakWordsModal from '$lib/components/BreakWordsModal.svelte';
	import {
		cutParagraph,
		lookupWord,
		lookupWordWithFallback,
		wordsByLevel,
		wordsByBct,
		wordsByYct,
		type Word
	} from '$lib/deck';

	let { words = $bindable() }: { words: Word[] } = $props();

	const selectionTypes = [
		{ value: 'Word', name: 'Word' },
		{ value: 'Paragraph', name: 'Paragraph' },
		{ value: 'File', name: 'File' },
		{ value: 'HSK', name: 'HSK Level' },
		{ value: 'BCT', name: 'BCT Level' },
		{ value: 'YCT', name: 'YCT Level' }
	];
	let selectType = $state('Word');

	// ---- single word ----
	let wordValue = $state('');
	async function searchAndAdd(word: string) {
		if (!word.trim()) return;
		if (words.some((w) => w.Simplified === word.trim())) return;
		const result = await lookupWord(word);
		words = [...words, result];
		wordValue = '';
	}

	// ---- file ----
	let fileStatus = $state('');
	let fileProgress = $state(0);
	let fileProcessing = $state(false);

	async function generateWords(file: File) {
		fileStatus = 'Processing...';
		fileProcessing = true;
		fileProgress = 0;
		const text = await file.text();
		const lines = text.split('\n').filter((l) => l.trim());
		const added: Word[] = [];
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			fileProgress = Math.round(((i + 1) / lines.length) * 100);
			if (words.some((w) => w.Simplified === line.trim())) continue;
			if (added.some((w) => w.Simplified === line.trim())) continue;
			added.push(await lookupWord(line));
		}
		words = [...words, ...added];
		fileProgress = 100;
		fileProcessing = false;
		fileStatus = 'Completed';
	}

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) generateWords(file);
	}

	// ---- HSK levels ----
	const HSK_LEVELS = ['1', '2', '3', '4', '5', '6', '7+'];
	let selectedLevels = $state<Set<string>>(new Set());
	let hskProcessing = $state(false);
	let hskProgress = $state(0);
	let hskStatus = $state('');

	function toggleLevel(lvl: string) {
		const next = new Set(selectedLevels);
		if (next.has(lvl)) next.delete(lvl);
		else next.add(lvl);
		selectedLevels = next;
	}

	async function addWordsByLevel() {
		if (hskProcessing || selectedLevels.size === 0) return;
		hskProcessing = true;
		hskProgress = 0;
		hskStatus = 'Loading word list…';
		try {
			const list = await wordsByLevel([...selectedLevels]);
			const existing = new Set(words.map((w) => w.Simplified));
			const todo = list.filter((w) => !existing.has(w));
			const added: Word[] = [];
			for (let i = 0; i < todo.length; i++) {
				hskProgress = Math.round(((i + 1) / todo.length) * 100);
				hskStatus = `Adding ${i + 1} / ${todo.length}…`;
				added.push(await lookupWord(todo[i]));
			}
			words = [...words, ...added];
			hskProgress = 100;
			hskStatus = `Added ${added.length} words.`;
		} finally {
			hskProcessing = false;
		}
	}

	// ---- BCT levels ----
	const BCT_LEVELS = ['A', 'B'];
	let selectedBctLevels = $state<Set<string>>(new Set());
	let bctProcessing = $state(false);
	let bctProgress = $state(0);
	let bctStatus = $state('');

	function toggleBctLevel(lvl: string) {
		const next = new Set(selectedBctLevels);
		if (next.has(lvl)) next.delete(lvl);
		else next.add(lvl);
		selectedBctLevels = next;
	}

	async function addWordsByBct() {
		if (bctProcessing || selectedBctLevels.size === 0) return;
		bctProcessing = true;
		bctProgress = 0;
		bctStatus = 'Loading word list…';
		try {
			const list = await wordsByBct([...selectedBctLevels]);
			const existing = new Set(words.map((w) => w.Simplified));
			const todo = list.filter((w) => !existing.has(w));
			const added: Word[] = [];
			for (let i = 0; i < todo.length; i++) {
				bctProgress = Math.round(((i + 1) / todo.length) * 100);
				bctStatus = `Adding ${i + 1} / ${todo.length}…`;
				added.push(await lookupWord(todo[i]));
			}
			words = [...words, ...added];
			bctProgress = 100;
			bctStatus = `Added ${added.length} words.`;
		} finally {
			bctProcessing = false;
		}
	}

	// ---- YCT levels ----
	const YCT_LEVELS = ['1', '2', '3', '4'];
	let selectedYctLevels = $state<Set<string>>(new Set());
	let yctProcessing = $state(false);
	let yctProgress = $state(0);
	let yctStatus = $state('');

	function toggleYctLevel(lvl: string) {
		const next = new Set(selectedYctLevels);
		if (next.has(lvl)) next.delete(lvl);
		else next.add(lvl);
		selectedYctLevels = next;
	}

	async function addWordsByYct() {
		if (yctProcessing || selectedYctLevels.size === 0) return;
		yctProcessing = true;
		yctProgress = 0;
		yctStatus = 'Loading word list…';
		try {
			const list = await wordsByYct([...selectedYctLevels]);
			const existing = new Set(words.map((w) => w.Simplified));
			const todo = list.filter((e) => !existing.has(e.word));
			const added: Word[] = [];
			for (let i = 0; i < todo.length; i++) {
				yctProgress = Math.round(((i + 1) / todo.length) * 100);
				yctStatus = `Adding ${i + 1} / ${todo.length}…`;
				added.push(await lookupWordWithFallback(todo[i].word, todo[i].meaning));
			}
			words = [...words, ...added];
			yctProgress = 100;
			yctStatus = `Added ${added.length} words.`;
		} finally {
			yctProcessing = false;
		}
	}

	// ---- paragraph + break flow ----
	let texAreaValue = $state('');
	let paragraphProgress = $state(0);
	let paragraphProcessing = $state(false);
	let paragraphStatus = $state('');
	let translateFailedWords = $state<string[]>([]);
	let showBreakToast = $state(false);

	async function generateFromParagraph() {
		const cutWords = cutParagraph(texAreaValue);
		if (cutWords.length === 0) return;

		paragraphProcessing = true;
		paragraphProgress = 0;
		paragraphStatus = '';
		showBreakToast = false;
		translateFailedWords = [];

		const added: Word[] = [];
		const failed: string[] = [];

		for (let i = 0; i < cutWords.length; i++) {
			const word = cutWords[i];
			paragraphProgress = Math.round(((i + 1) / cutWords.length) * 100);
			paragraphStatus = `Processing ${i + 1} / ${cutWords.length}…`;
			if (words.some((w) => w.Simplified === word.trim())) continue;
			if (added.some((w) => w.Simplified === word.trim())) continue;
			try {
				added.push(await lookupWord(word));
			} catch {
				failed.push(word);
			}
		}

		words = [...words, ...added];
		paragraphProcessing = false;
		paragraphStatus = `Added ${added.length} word${added.length === 1 ? '' : 's'}${failed.length ? `, ${failed.length} failed` : ''}.`;

		if (failed.length > 0) {
			translateFailedWords = failed;
			showBreakToast = true;
		}
	}
</script>

<h2 class="text-xl font-semibold">Enter Chinese Characters</h2>

<div class="my-4 inline-flex overflow-hidden rounded-lg border border-neutral-300">
	{#each selectionTypes as st}
		<button
			class="px-4 py-1.5 text-sm {selectType === st.value
				? 'bg-neutral-900 text-white'
				: 'text-neutral-600 hover:bg-neutral-100'}"
			onclick={() => (selectType = st.value)}>{st.name}</button
		>
	{/each}
</div>

{#if selectType === 'Word'}
	<div class="my-4 flex items-center gap-3">
		<Input
			class="w-3/5"
			placeholder="Type a word, e.g. 中国"
			bind:value={wordValue}
			onkeydown={(e) => e.key === 'Enter' && searchAndAdd(wordValue)}
		/>
		<button class={btnPrimary} onclick={() => searchAndAdd(wordValue)}>Add</button>
	</div>
{/if}

{#if selectType === 'File'}
	<div class="my-4">
		<Fileupload accept="text/*" onchange={handleFileChange} />
		{#if fileProcessing || fileProgress > 0}
			<div class="mt-3">
				<div class="mb-1 flex justify-between text-xs text-neutral-500">
					<span>{fileProcessing ? 'Processing…' : 'Completed'}</span>
					<span>{fileProgress}%</span>
				</div>
				<Progressbar progress={fileProgress} />
			</div>
		{:else}
			<p class="mt-1 text-sm text-neutral-500">
				{fileStatus || 'Upload a text file with one word per line.'}
			</p>
		{/if}
	</div>
{/if}

{#if selectType === 'HSK'}
	<div class="my-4">
		<p class="mb-2 text-sm text-neutral-500">
			Pick one or more HSK levels — every word at those levels is added to your deck,
			most-common first.
		</p>
		<div class="mb-3 flex flex-wrap gap-2">
			{#each HSK_LEVELS as lvl (lvl)}
				<button
					type="button"
					onclick={() => toggleLevel(lvl)}
					class="rounded-lg border px-3 py-1.5 text-sm transition {selectedLevels.has(lvl)
						? 'border-neutral-900 bg-neutral-900 text-white'
						: 'border-neutral-300 text-neutral-600 hover:border-neutral-900'}"
				>
					HSK {lvl}
				</button>
			{/each}
		</div>
		<button
			class={btnPrimary}
			onclick={addWordsByLevel}
			disabled={selectedLevels.size === 0 || hskProcessing}
		>
			{hskProcessing ? 'Adding…' : 'Add words'}
		</button>
		{#if hskProcessing || hskProgress > 0}
			<div class="mt-3">
				<div class="mb-1 flex justify-between text-xs text-neutral-500">
					<span>{hskStatus}</span>
					<span>{hskProgress}%</span>
				</div>
				<Progressbar progress={hskProgress} />
			</div>
		{/if}
	</div>
{/if}

{#if selectType === 'BCT'}
	<div class="my-4">
		<p class="mb-2 text-sm text-neutral-500">
			Pick BCT level A (600 words) or B (4000 words) — every word at that level is added to
			your deck.
		</p>
		<div class="mb-3 flex flex-wrap gap-2">
			{#each BCT_LEVELS as lvl (lvl)}
				<button
					type="button"
					onclick={() => toggleBctLevel(lvl)}
					class="rounded-lg border px-3 py-1.5 text-sm transition {selectedBctLevels.has(lvl)
						? 'border-neutral-900 bg-neutral-900 text-white'
						: 'border-neutral-300 text-neutral-600 hover:border-neutral-900'}"
				>
					BCT {lvl}
				</button>
			{/each}
		</div>
		<button
			class={btnPrimary}
			onclick={addWordsByBct}
			disabled={selectedBctLevels.size === 0 || bctProcessing}
		>
			{bctProcessing ? 'Adding…' : 'Add words'}
		</button>
		{#if bctProcessing || bctProgress > 0}
			<div class="mt-3">
				<div class="mb-1 flex justify-between text-xs text-neutral-500">
					<span>{bctStatus}</span>
					<span>{bctProgress}%</span>
				</div>
				<Progressbar progress={bctProgress} />
			</div>
		{/if}
	</div>
{/if}

{#if selectType === 'YCT'}
	<div class="my-4">
		<p class="mb-2 text-sm text-neutral-500">
			Pick one or more YCT levels (1–4) — every word at those levels is added to your deck.
		</p>
		<div class="mb-3 flex flex-wrap gap-2">
			{#each YCT_LEVELS as lvl (lvl)}
				<button
					type="button"
					onclick={() => toggleYctLevel(lvl)}
					class="rounded-lg border px-3 py-1.5 text-sm transition {selectedYctLevels.has(lvl)
						? 'border-neutral-900 bg-neutral-900 text-white'
						: 'border-neutral-300 text-neutral-600 hover:border-neutral-900'}"
				>
					YCT {lvl}
				</button>
			{/each}
		</div>
		<button
			class={btnPrimary}
			onclick={addWordsByYct}
			disabled={selectedYctLevels.size === 0 || yctProcessing}
		>
			{yctProcessing ? 'Adding…' : 'Add words'}
		</button>
		{#if yctProcessing || yctProgress > 0}
			<div class="mt-3">
				<div class="mb-1 flex justify-between text-xs text-neutral-500">
					<span>{yctStatus}</span>
					<span>{yctProgress}%</span>
				</div>
				<Progressbar progress={yctProgress} />
			</div>
		{/if}
	</div>
{/if}

{#if selectType === 'Paragraph'}
	<div class="my-4">
		<Textarea
			class="w-full"
			rows={6}
			placeholder="Paste Chinese text — it will be segmented into words."
			bind:value={texAreaValue}
		/>
		<div class="mt-2">
			<button
				class={btnPrimary}
				onclick={generateFromParagraph}
				disabled={!texAreaValue.trim() || paragraphProcessing}
			>
				{paragraphProcessing ? 'Processing…' : 'Generate words'}
			</button>
		</div>
		{#if paragraphProcessing || paragraphProgress > 0}
			<div class="mt-3">
				<div class="mb-1 flex justify-between text-xs text-neutral-500">
					<span>{paragraphStatus}</span>
					<span>{paragraphProgress}%</span>
				</div>
				<Progressbar progress={paragraphProgress} />
			</div>
		{/if}
	</div>
{/if}

{#if showBreakToast}
	<BreakWordsModal
		bind:words
		failedWords={translateFailedWords}
		ondismiss={() => {
			showBreakToast = false;
			translateFailedWords = [];
		}}
		onadd={(n) => (paragraphStatus += ` Added ${n} character${n === 1 ? '' : 's'}.`)}
	/>
{/if}
