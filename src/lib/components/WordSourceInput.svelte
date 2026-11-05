<script lang="ts">
	import { onMount } from 'svelte';
	import { buttonClass, chipClass } from '$lib/ui';
	import { takePendingWords, type PendingWords } from '$lib/hskHandoff';
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

	let {
		words = $bindable(),
		onimport
	}: {
		words: Word[];
		/** A list handed over from /hsk or the dictionary is being loaded. */
		onimport?: (pending: PendingWords) => void;
	} = $props();

	// Progress/status are reactive $state; writing them every word forces a Svelte
	// re-render + style/layout per iteration. Update once per stride instead — the
	// bar still moves smoothly but DOM work drops ~25x on large batches.
	const PROGRESS_STRIDE = 25;

	const selectionTypes = [
		{ value: 'Word', name: 'Type words' },
		{ value: 'Paragraph', name: 'Paste text' },
		{ value: 'File', name: 'File' },
		{ value: 'HSK', name: 'HSK' },
		{ value: 'BCT', name: 'BCT' },
		{ value: 'YCT', name: 'YCT' }
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
			try {
				added.push(await lookupWord(line));
			} catch {
				// Skip a line that fails to look up rather than aborting the batch.
			}
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

	/** Look every word up and append the ones not already in the deck. */
	async function addWordList(list: string[]): Promise<number> {
		const existing = new Set(words.map((w) => w.Simplified));
		const todo = list.filter((w) => !existing.has(w));
		const added: Word[] = [];
		for (let i = 0; i < todo.length; i++) {
			if ((i + 1) % PROGRESS_STRIDE === 0 || i === todo.length - 1) {
				hskProgress = Math.round(((i + 1) / todo.length) * 100);
				hskStatus = `Adding ${i + 1} / ${todo.length}…`;
			}
			try {
				added.push(await lookupWord(todo[i]));
			} catch {
				// Skip a word that fails to look up rather than aborting the batch.
			}
		}
		words = [...words, ...added];
		return added.length;
	}

	async function addWordsByLevel() {
		if (hskProcessing || selectedLevels.size === 0) return;
		hskProcessing = true;
		hskProgress = 0;
		hskStatus = 'Loading word list…';
		try {
			const count = await addWordList(await wordsByLevel([...selectedLevels]));
			hskProgress = 100;
			hskStatus = `Added ${count} words.`;
		} finally {
			hskProcessing = false;
		}
	}

	// A level opened from /hsk hands its word list over in sessionStorage — too
	// many words for a query string. Consume it once, on arrival.
	let importedFrom = $state('');
	onMount(async () => {
		const pending = takePendingWords();
		if (!pending) return;
		onimport?.(pending);
		selectType = 'HSK';
		importedFrom = pending.label;
		hskProcessing = true;
		hskProgress = 0;
		hskStatus = `Loading ${pending.label}…`;
		try {
			const count = await addWordList(pending.words);
			hskProgress = 100;
			hskStatus = `Added ${count} words from ${pending.label}.`;
		} finally {
			hskProcessing = false;
		}
	});

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
				if ((i + 1) % PROGRESS_STRIDE === 0 || i === todo.length - 1) {
					bctProgress = Math.round(((i + 1) / todo.length) * 100);
					bctStatus = `Adding ${i + 1} / ${todo.length}…`;
				}
				try {
					added.push(await lookupWord(todo[i]));
				} catch {
					// Skip a word that fails to look up rather than aborting the batch.
				}
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
				if ((i + 1) % PROGRESS_STRIDE === 0 || i === todo.length - 1) {
					yctProgress = Math.round(((i + 1) / todo.length) * 100);
					yctStatus = `Adding ${i + 1} / ${todo.length}…`;
				}
				try {
					added.push(await lookupWordWithFallback(todo[i].word, todo[i].meaning));
				} catch {
					// Skip a word that fails to look up rather than aborting the batch.
				}
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
		const seen = new Set(words.map((w) => w.Simplified));

		for (let i = 0; i < cutWords.length; i++) {
			const word = cutWords[i];
			if ((i + 1) % PROGRESS_STRIDE === 0 || i === cutWords.length - 1) {
				paragraphProgress = Math.round(((i + 1) / cutWords.length) * 100);
				paragraphStatus = `Processing ${i + 1} / ${cutWords.length}…`;
			}
			const key = word.trim();
			if (seen.has(key)) continue;
			seen.add(key);
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

	const field =
		'block w-full min-w-0 rounded-card border-0 bg-sunk px-3.5 min-h-11 text-[15px] text-ink placeholder:text-muted focus:ring-3 focus:ring-sky';
	const hint = 'mt-2 mb-3 text-[13.5px] text-muted';
</script>

{#snippet progress(label: string, pct: number)}
	<div class="mt-3" role="status">
		<div class="mb-1 flex justify-between text-[13px] text-muted">
			<span>{label}</span><span>{pct}%</span>
		</div>
		<div class="h-2 overflow-hidden rounded-full bg-sunk">
			<div class="h-full rounded-full bg-mint transition-[width]" style="width:{pct}%"></div>
		</div>
	</div>
{/snippet}

{#snippet levels(all: string[], picked: Set<string>, prefix: string, toggle: (l: string) => void)}
	<div class="flex flex-wrap gap-1.5">
		{#each all as lvl (lvl)}
			<button type="button" aria-pressed={picked.has(lvl)} onclick={() => toggle(lvl)} class={chipClass(picked.has(lvl))}>
				{prefix}
				{lvl}
			</button>
		{/each}
	</div>
{/snippet}

<div class="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Where the words come from">
	{#each selectionTypes as st (st.value)}
		<button
			type="button"
			aria-pressed={selectType === st.value}
			class={chipClass(selectType === st.value)}
			onclick={() => (selectType = st.value)}>{st.name}</button
		>
	{/each}
</div>

{#if selectType === 'Word'}
	<form
		class="flex gap-2"
		onsubmit={(e) => {
			e.preventDefault();
			searchAndAdd(wordValue);
		}}
	>
		<input
			class={field}
			placeholder="Type a word, e.g. 中国"
			aria-label="Word"
			bind:value={wordValue}
		/>
		<button type="submit" class={buttonClass()}>Add</button>
	</form>
{/if}

{#if selectType === 'File'}
	<input
		type="file"
		accept="text/*"
		aria-label="Word list file"
		onchange={handleFileChange}
		class="block w-full text-sm text-muted file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-full file:border-0 file:bg-sky-soft file:px-4 file:font-semibold file:text-sky-ink"
	/>
	{#if fileProcessing || fileProgress > 0}
		{@render progress(fileProcessing ? 'Processing…' : 'Done', fileProgress)}
	{:else}
		<p class={hint}>{fileStatus || 'A text file, one word per line.'}</p>
	{/if}
{/if}

{#if selectType === 'HSK'}
	{#if importedFrom}
		<p class="mt-0 mb-3 rounded-card bg-mint-soft px-4 py-2.5 text-[15px] text-mint-ink">
			From <strong>{importedFrom}</strong>
		</p>
	{/if}
	{@render levels(HSK_LEVELS, selectedLevels, 'HSK', toggleLevel)}
	<p class={hint}>Every word at those levels, most common first.</p>
	<button class={buttonClass()} onclick={addWordsByLevel} disabled={selectedLevels.size === 0 || hskProcessing}>
		{hskProcessing ? 'Adding…' : 'Add words'}
	</button>
	{#if hskProcessing || hskProgress > 0}{@render progress(hskStatus, hskProgress)}{/if}
{/if}

{#if selectType === 'BCT'}
	{@render levels(BCT_LEVELS, selectedBctLevels, 'BCT', toggleBctLevel)}
	<p class={hint}>A is 600 words, B is 4,000.</p>
	<button class={buttonClass()} onclick={addWordsByBct} disabled={selectedBctLevels.size === 0 || bctProcessing}>
		{bctProcessing ? 'Adding…' : 'Add words'}
	</button>
	{#if bctProcessing || bctProgress > 0}{@render progress(bctStatus, bctProgress)}{/if}
{/if}

{#if selectType === 'YCT'}
	{@render levels(YCT_LEVELS, selectedYctLevels, 'YCT', toggleYctLevel)}
	<p class={hint}>Every word at those levels.</p>
	<button class={buttonClass()} onclick={addWordsByYct} disabled={selectedYctLevels.size === 0 || yctProcessing}>
		{yctProcessing ? 'Adding…' : 'Add words'}
	</button>
	{#if yctProcessing || yctProgress > 0}{@render progress(yctStatus, yctProgress)}{/if}
{/if}

{#if selectType === 'Paragraph'}
	<textarea
		class="{field} min-h-36 py-3"
		rows={6}
		aria-label="Chinese text"
		placeholder="Paste Chinese text — it is split into words."
		bind:value={texAreaValue}
	></textarea>
	<button
		class="{buttonClass()} mt-2"
		onclick={generateFromParagraph}
		disabled={!texAreaValue.trim() || paragraphProcessing}
	>
		{paragraphProcessing ? 'Processing…' : 'Split into words'}
	</button>
	{#if paragraphProcessing || paragraphProgress > 0}{@render progress(paragraphStatus, paragraphProgress)}{/if}
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
