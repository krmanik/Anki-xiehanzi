<script lang="ts">
	/**
	 * One dictionary entry: the word itself, every reading with its senses, and
	 * the characters it is made of — each of which opens the full character
	 * panel below, the way the slide deck drills from a word into a glyph.
	 */
	import CharacterPanel from './CharacterPanel.svelte';
	import {
		characterBreakdown,
		getSmartSentences,
		lookup,
		posDisplay,
		wordsContaining,
		type CedictEntry,
		type CharInfo,
		type ExampleSentence
	} from '$lib/dict/cedict';
	import {
		frequencyBand,
		levelLabels,
		orderReadings,
		plainZhuyin,
		senses,
		type SearchHit
	} from '$lib/dictionary';
	import { speak } from '$lib/dict/audio';
	import { preloadSyllables } from '$lib/dict/syllableAudio';
	import { colorizePinyinString, colorizeSentenceHanzi, toneOfPinyin } from '$lib/tone';
	import { untrack } from 'svelte';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let {
		word,
		onOpenWord,
		compact = false,
		onExpandedChange
	}: {
		word: string;
		onOpenWord?: (word: string) => void;
		compact?: boolean;
		/** Fires with the current `expanded` value on mount and every toggle — lets
		 * a caller wrapping this in a modal grow the modal itself past a small
		 * floating card once "More info" reveals the rest. */
		onExpandedChange?: (expanded: boolean) => void;
	} = $props();

	// Compact starts collapsed to simplified/pinyin/simple+full meaning only,
	// with everything else (traditional, chips, character breakdown, example
	// sentences, compounds) behind "More info" — a popup opened mid-read
	// shouldn't dump the whole dictionary entry before the reader's even asked
	// for it. A non-compact caller (the dictionary page) gets today's full view.
	// `compact` is a per-caller constant, not something that flips at runtime,
	// so only its initial value matters here — the word-change effect below is
	// what re-reads it on every new lookup.
	let expanded = $state(untrack(() => !compact));

	$effect(() => {
		onExpandedChange?.(expanded);
	});

	let entry = $state<CedictEntry | null>(null);
	let chars = $state<CharInfo[]>([]);
	let sentences = $state<ExampleSentence[]>([]);
	let compounds = $state<SearchHit[]>([]);
	let loading = $state(true);
	let openChar = $state<string | null>(null);

	const SENTENCE_STEP = 5;
	let sentenceLimit = $state(SENTENCE_STEP);
	let loadingSentences = $state(false);
	/** A full page came back, so the corpus may hold more. */
	let mayHaveMore = $state(false);

	/** Readings with the common one first — cedict's own order is not that. */
	const readings = $derived(orderReadings(entry?.readings ?? []));

	/** Tone of the nth syllable of the main reading, for the big hanzi. */
	const tones = $derived(
		(readings[0]?.pinyinPlain ?? '')
			.split(/\s+/)
			.filter(Boolean)
			.map((syl) => toneOfPinyin(syl))
	);

	const levels = $derived(levelLabels(entry?.level ?? null));
	const band = $derived(frequencyBand(entry?.rank ?? null));

	// The offsets table is ~60 KB and answers "can this be spoken"; the 3 MB
	// sprite itself still waits for an actual click.
	$effect(() => {
		preloadSyllables();
	});

	$effect(() => {
		const w = word;
		let cancelled = false;
		loading = true;
		entry = null;
		chars = [];
		sentences = [];
		compounds = [];
		openChar = null;
		sentenceLimit = SENTENCE_STEP;
		mayHaveMore = false;
		expanded = !compact;

		(async () => {
			const [found, breakdown] = await Promise.all([lookup(w), characterBreakdown(w)]);
			if (cancelled) return;
			entry = found;
			chars = breakdown;
			loading = false;
			// A one-character word opens its character panel straight away — that
			// is the whole entry, not an extra step.
			if (breakdown.length === 1) openChar = breakdown[0].character;

			void showSentences(w, SENTENCE_STEP, () => cancelled);
			if ([...w].length > 1) {
				void wordsContaining(w, 8).then(
					(r) => !cancelled && (compounds = r.filter((c) => c.simplified !== w))
				);
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	/**
	 * Fetch and show `limit` sentences. The ranker re-ranks the whole pool for
	 * each limit, so asking for more re-fetches rather than appending — the
	 * easiest examples stay at the top either way.
	 */
	async function showSentences(w: string, limit: number, cancelled: () => boolean): Promise<void> {
		loadingSentences = true;
		try {
			const found = await getSmartSentences(w, { limit, maxChars: 28 });
			if (cancelled()) return;
			sentences = found;
			sentenceLimit = limit;
			mayHaveMore = found.length >= limit;
		} finally {
			if (!cancelled()) loadingSentences = false;
		}
	}

	const label = 'font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-400';
	const chip = 'rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] text-neutral-500';
	const panel = 'rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5';
</script>

{#if loading}
	<p class="text-sm text-neutral-400">Looking up {word}…</p>
{:else if !entry}
	<p class="text-sm text-neutral-500">Nothing found for “{word}”.</p>
{:else}
	<article class="grid gap-4">
		<!-- Header: the word, its readings, what it is -->
		<header class="rounded-2xl border border-neutral-900 bg-white p-5 sm:p-6">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<div class="flex flex-wrap items-baseline gap-1" lang="zh-Hans">
						{#each [...entry.simplified] as ch, i (i)}
							<button
								type="button"
								onclick={() => (openChar = openChar === ch ? null : ch)}
								class="rounded-lg px-1 text-6xl leading-none transition hover:bg-neutral-100 tone{tones[
									i
								] ?? 5}"
								title="Show {ch} in full"
							>
								{ch}
							</button>
						{/each}
					</div>
					{#if entry.commonMeaning}
						<p class="mt-1.5 text-[15px] text-neutral-500">{entry.commonMeaning}</p>
					{/if}
					{#if expanded && entry.traditional !== entry.simplified}
						<p class="mt-2 flex items-baseline gap-2">
							<span class={label}>traditional</span>
							<span class="text-2xl" lang="zh-Hant">{entry.traditional}</span>
						</p>
					{/if}
				</div>

				<div class="flex flex-col items-end gap-2">
					<button
						type="button"
						onclick={() => speak(entry!.simplified, { pinyin: readings[0]?.syllable })}
						class="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-900"
					>
						<Volume2 size={14} /> Listen
					</button>
					{#if expanded}
						<div class="flex flex-wrap justify-end gap-1.5">
							{#each levels as lvl (lvl)}
								<span class="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
									{lvl}
								</span>
							{/each}
							{#if band}<span class={chip}>{band}</span>{/if}
							{#each entry.pos.map(posDisplay).filter(Boolean) as pos (pos)}
								<span class={chip}>{pos}</span>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Readings: one block per pronunciation, its senses under it — the
			     "full meaning" that stays visible even in a compact popup. -->
			<div class="mt-5 grid gap-4">
				{#each readings as reading (reading.syllable)}
					<div class="border-t border-neutral-100 pt-3 first:border-0 first:pt-0">
						<p class="flex flex-wrap items-baseline gap-3">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							<span class="text-2xl font-semibold"
								>{@html colorizePinyinString(reading.pinyinPlain)}</span
							>
							{#if reading.zhuyin}
								<span class="text-sm text-neutral-400">{plainZhuyin(reading.zhuyin)}</span>
							{/if}
							<!-- This reading, not the word's most common one: the sprite can say
							     either, so the button beside fèn must not play fēn. -->
							<button
								type="button"
								onclick={() =>
									speak(entry!.simplified, {
										pinyin: reading.syllable,
										skipRecording: reading.syllable !== readings[0]?.syllable
									})}
								aria-label="Play {reading.pinyinPlain}"
								class="text-neutral-300 transition hover:text-neutral-900"
							>
								<Volume2 size={14} />
							</button>
						</p>
						<ol class="mt-1.5 grid gap-1 text-[15px] text-neutral-700">
							{#each senses(reading.definition) as sense, i (i)}
								<li class="flex gap-2">
									<span class="font-mono text-[11px] leading-6 text-neutral-300">{i + 1}</span>
									<span>{sense}</span>
								</li>
							{/each}
						</ol>
					</div>
				{/each}
			</div>

			{#if expanded && entry.classifiers.length}
				<p class="mt-4 flex flex-wrap items-baseline gap-2 text-sm">
					<span class={label}>measure word</span>
					{#each entry.classifiers as cl (cl)}
						<span class="text-lg" lang="zh-Hans">{cl}</span>
					{/each}
				</p>
			{/if}
		</header>

		{#if compact}
			<button
				type="button"
				onclick={() => (expanded = !expanded)}
				class="-mt-2 flex items-center gap-1 justify-self-start text-xs font-medium text-indigo-600 hover:text-indigo-800"
			>
				<ChevronDown size={13} class={expanded ? 'rotate-180' : ''} />
				{expanded ? 'Show less' : 'More info'}
			</button>
		{/if}

		<!-- Character breakdown: the row of parts the word is written with -->
		{#if expanded && chars.length > 1}
			<section class={panel}>
				<h2 class={label}>Characters</h2>
				<div class="mt-3 flex flex-wrap gap-2">
					<!-- Keyed by position, not by character: 妈妈 and 星星 repeat one. -->
					{#each chars as ch, i (i)}
						<button
							type="button"
							onclick={() => (openChar = openChar === ch.character ? null : ch.character)}
							class="flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition
							{openChar === ch.character
								? 'border-neutral-900 bg-neutral-50'
								: 'border-neutral-200 hover:border-neutral-900'}"
						>
							<span class="text-3xl leading-none" lang="zh-Hans">{ch.character}</span>
							<span class="min-w-0">
								<span class="block text-xs text-neutral-500">{ch.pinyin}</span>
								<span class="block max-w-44 truncate text-xs text-neutral-700">{ch.definition}</span>
							</span>
							<ChevronDown
								size={14}
								class="shrink-0 text-neutral-300 {openChar === ch.character ? 'rotate-180' : ''}"
							/>
						</button>
					{/each}
				</div>
			</section>
		{/if}

		<!-- The expanded character -->
		{#if expanded && openChar}
			{#key openChar}
				<section class="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 sm:p-5">
					<div class="mb-4 flex items-baseline gap-3">
						<h2 class={label}>Character</h2>
						<span class="text-xl" lang="zh-Hans">{openChar}</span>
					</div>
					<CharacterPanel
						char={openChar}
						{onOpenWord}
						onOpenChar={(c) => (openChar = c)}
						showSentences={openChar !== entry.simplified}
					/>
				</section>
			{/key}
		{/if}

		<!-- Sentences for the whole word -->
		{#if expanded && sentences.length}
			<section class={panel}>
				<h2 class={label}>Example sentences</h2>
				<ul class="mt-3 grid gap-3">
					{#each sentences as sentence, i (i)}
						<li class="flex gap-3 border-l-2 border-neutral-100 pl-3">
							<span class="font-mono text-[11px] leading-7 text-neutral-300">{i + 1}</span>
							<div class="min-w-0">
								<button
									type="button"
									onclick={() =>
										speak(sentence.simplified, {
											pinyin: sentence.pinyin,
											spacing: 0.055,
											skipRecording: true
										})}
									class="text-left text-lg leading-snug"
									lang="zh-Hans"
								>
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html colorizeSentenceHanzi(sentence.simplified, sentence.pinyin)}
								</button>
								{#if sentence.pinyin}
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									<p class="text-xs text-neutral-500">
										{@html colorizePinyinString(sentence.pinyin)}
									</p>
								{/if}
								<p class="text-sm text-neutral-600">{sentence.translation}</p>
							</div>
						</li>
					{/each}
				</ul>
				{#if mayHaveMore}
					<button
						type="button"
						disabled={loadingSentences}
						onclick={() => showSentences(word, sentenceLimit + SENTENCE_STEP, () => false)}
						class="mt-3 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-40"
					>
						{loadingSentences ? 'Loading…' : 'Load more sentences'}
					</button>
				{/if}
			</section>
		{/if}

		<!-- Longer words built on this one -->
		{#if expanded && compounds.length}
			<section class={panel}>
				<h2 class={label}>Words containing {entry.simplified}</h2>
				<ul class="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
					{#each compounds as c (c.simplified)}
						<li>
							<button
								type="button"
								onclick={() => onOpenWord?.(c.simplified)}
								class="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-neutral-50"
							>
								<span class="text-lg" lang="zh-Hans">{c.simplified}</span>
								<span class="text-xs text-neutral-500">{c.pinyin}</span>
								<span class="min-w-0 flex-1 truncate text-xs text-neutral-600">{c.meaning}</span>
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</article>
{/if}
