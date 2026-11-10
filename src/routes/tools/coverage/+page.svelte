<script lang="ts">
	import { PageHeader } from '$lib/ui';
	/**
	 * HSK coverage analyzer: segment pasted text, classify each unique word
	 * against an HSK standard, and show what fraction of the text each level
	 * covers plus everything that falls outside the list.
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { initJieba, cutParagraph } from '$lib/deck';
	import { buildHskLookup, classifyWords, type CoverageResult, type HskListId } from '$lib/hskCoverage';
	import { levelLabel, loadHskIndex, type HskIndex } from '$lib/hsk';
	import { setPendingWords } from '$lib/hskHandoff';
	import { btnPrimary } from '$lib/buttonStyles';
	import PickerModal from '$lib/components/PickerModal.svelte';
	import WordEntry from '$lib/components/dict/WordEntry.svelte';
	import WordPopup from '$lib/components/dict/WordPopup.svelte';

	let text = $state('');
	let listId = $state<HskListId>('new');
	let index = $state<HskIndex | null>(null);
	let result = $state<CoverageResult | null>(null);
	let selected = $state<string | null>(null);
	let anchor = $state<DOMRect | null>(null);
	let fullWord = $state<string | null>(null);
	let jiebaReady = false;
	let analyzing = $state(false);
	let error = $state('');

	// Mixed on purpose: everyday words, upper-level ones and a few the lists
	// lack (人工智能, 大数据), so every part of the result has something in it.
	const SAMPLE =
		'随着人工智能技术的迅速发展，越来越多的企业开始利用大数据来分析消费者的需求。专家认为，这种趋势不仅改变了传统行业的经营模式，也给普通人的日常生活带来了深远的影响。';

	function loadSample() {
		text = SAMPLE;
		analyze();
	}

	function openWord(w: string, rect: DOMRect) {
		selected = w;
		anchor = rect;
	}

	function showMore() {
		fullWord = selected;
		selected = null;
	}

	onMount(() => {
		loadHskIndex()
			.then((idx) => (index = idx))
			.catch(() => {});
	});

	const listName = $derived(index?.lists.find((l) => l.id === listId)?.name ?? listId);

	async function analyze() {
		if (!text.trim() || analyzing) return;
		analyzing = true;
		error = '';
		try {
			if (!jiebaReady) {
				await initJieba();
				jiebaReady = true;
			}
			const words = cutParagraph(text);
			const lookup = await buildHskLookup(listId);
			result = classifyWords(words, lookup);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			analyzing = false;
		}
	}

	function sendUnknown() {
		if (!result?.unknown.length) return;
		setPendingWords({
			label: `Beyond ${listName} · ${result.unknown.length} word${result.unknown.length === 1 ? '' : 's'}`,
			words: result.unknown,
			options: { audio: true, examples: true },
			then: 'export'
		});
		goto(`${base}/create`);
	}

	const knownCount = $derived(result ? result.total - result.unknown.length : 0);
</script>

<svelte:head>
	<title>HSK coverage analyzer · Anki-xiehanzi</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<PageHeader title="HSK coverage" subtitle="How much of a text sits inside each HSK level." />

	<textarea
		bind:value={text}
		rows={6}
		placeholder="粘贴一段中文…"
		lang="zh-Hans"
		class="w-full rounded-card border-0 bg-sunk p-3 text-base text-ink outline-none placeholder:text-muted/70 transition-[background-color,box-shadow] focus:bg-surface focus:ring-2 focus:ring-accent"
	></textarea>

	<div class="mt-3 flex flex-wrap items-center gap-3">
		{#if index}
			<select bind:value={listId} class="min-h-10 rounded-card border-0 bg-surface py-1.5 pr-9 pl-3 text-sm text-ink ring-1 ring-line ring-inset transition-[background-color,box-shadow] focus:bg-surface focus:ring-2 focus:ring-accent">
				{#each index.lists as list (list.id)}
					<option value={list.id}>{list.name}</option>
				{/each}
			</select>
		{/if}
		<button type="button" onclick={analyze} disabled={analyzing || !text.trim()} class={btnPrimary}>
			{analyzing ? 'Analyzing…' : 'Analyze'}
		</button>
		{#if !text}
			<button type="button" onclick={loadSample} class="text-sm font-medium text-accent hover:text-ink">
				Try a sample →
			</button>
		{/if}
		{#if error}<p class="text-sm text-err-ink">{error}</p>{/if}
	</div>

	{#if result}
		<div class="mt-8">
			<p class="text-sm text-muted">
				<strong>{knownCount}</strong> of <strong>{result.total}</strong> unique words are in
				{listName}
				({result.total ? Math.round((knownCount / result.total) * 100) : 0}%).
			</p>

			<div class="mt-4 space-y-2">
				{#each result.byLevel as row (row.level)}
					<div class="flex items-center gap-3">
						<span class="w-20 shrink-0 text-[13px] text-muted font-semibold">
							{levelLabel(row.level)}
						</span>
						<div class="h-2 flex-1 overflow-hidden rounded-full bg-sunk">
							<div class="h-full rounded-full bg-accent" style="width:{row.percent}%"></div>
						</div>
						<span class="w-16 shrink-0 text-right text-xs text-muted">
							{row.count} · {Math.round(row.percent)}%
						</span>
					</div>
				{/each}
			</div>

			{#if result.unknown.length}
				<div class="mt-8">
					<div class="flex items-center justify-between gap-3">
						<h2 class="text-[13px] text-muted font-semibold">
							Beyond {listName} ({result.unknown.length})
						</h2>
						<button type="button" onclick={sendUnknown} class={btnPrimary}>
							Send to deck creator
						</button>
					</div>
					<div class="mt-3 flex flex-wrap gap-2" lang="zh-Hans">
						{#each result.unknown as word (word)}
							<button
								type="button"
								onclick={(e) => openWord(word, (e.currentTarget as HTMLElement).getBoundingClientRect())}
								class="rounded-md border border-line px-2.5 py-1 text-lg transition hover:border-accent"
							>
								{word}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

{#if selected && anchor}
	{#key selected}
		<WordPopup
			word={selected}
			{anchor}
			onclose={() => (selected = null)}
			onMore={showMore}
			onOpenWord={(w) => (selected = w)}
		/>
	{/key}
{/if}

{#if fullWord}
	<PickerModal title={fullWord} onclose={() => (fullWord = null)}>
		<WordEntry word={fullWord} onOpenWord={(w) => (fullWord = w)} />
	</PickerModal>
{/if}
