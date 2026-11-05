<script lang="ts">
	/**
	 * Everything known about one character, in the order the slide deck teaches
	 * it: how it is written, how it is built, where it came from, what it builds,
	 * and where it is used.
	 *
	 * The word entry above owns the readings and senses; this panel is what
	 * opens when a reader clicks a single character in a word.
	 */
	import { base } from '$app/paths';
	import StrokeAnimation from './StrokeAnimation.svelte';
	import {
		charactersWithComponent,
		getSmartSentences,
		lookupCharacters,
		wordsContaining,
		type CharInfo,
		type ExampleSentence,
		type RelatedCharacter
	} from '$lib/dict/cedict';
	import { loadCharAssets } from '$lib/dict/chardata';
	import {
		componentRole,
		componentsOf,
		describeStructure,
		etymologyTypeBlurb,
		etymologyTypeLabel,
		structureLabel,
		type Etymology,
		type SearchHit
	} from '$lib/dictionary';
	import { loadRadicals, type Radical } from '$lib/radicals';
	import { colorizeSentenceHanzi, colorizePinyinString, toneOfPinyin } from '$lib/tone';
	import { speak } from '$lib/dict/audio';
	import Volume2 from '@lucide/svelte/icons/volume-2';

	let {
		char,
		onOpenWord,
		onOpenChar,
		showSentences = true
	}: {
		char: string;
		onOpenWord?: (word: string) => void;
		onOpenChar?: (char: string) => void;
		/** Off when the entry above is the same single character and already prints them. */
		showSentences?: boolean;
	} = $props();

	let info = $state<CharInfo | null>(null);
	let etymology = $state<Etymology | null>(null);
	let components = $state<CharInfo[]>([]);
	let related = $state<RelatedCharacter[]>([]);
	let words = $state<SearchHit[]>([]);
	let sentences = $state<ExampleSentence[]>([]);
	let radical = $state<Radical | null>(null);
	let loading = $state(true);

	const SENTENCE_STEP = 4;
	let sentenceLimit = $state(SENTENCE_STEP);
	let loadingSentences = $state(false);
	let mayHaveMore = $state(false);

	const tone = $derived(toneOfPinyin(info?.pinyin?.split(/[\s/]+/)[0] ?? ''));

	/** The tone palette from app.css, so the strokes are drawn in the tone's colour. */
	const TONE_INK: Record<number, string> = {
		1: '#f44336',
		2: '#ff9800',
		3: '#4caf50',
		4: '#2196f3',
		5: '#9e9e9e'
	};
	const structure = $derived(structureLabel(info?.decomposition ?? ''));
	const structureText = $derived(describeStructure(info?.decomposition ?? '', char));

	$effect(() => {
		const c = char;
		let cancelled = false;
		loading = true;
		info = null;
		etymology = null;
		components = [];
		related = [];
		words = [];
		sentences = [];
		radical = null;
		sentenceLimit = SENTENCE_STEP;
		mayHaveMore = false;

		(async () => {
			const [[charInfo], assets] = await Promise.all([lookupCharacters([c]), loadCharAssets()]);
			if (cancelled) return;
			info = charInfo ?? null;
			etymology = assets.etymology[c] ?? null;
			loading = false;

			const parts = componentsOf(charInfo?.decomposition ?? '', c);
			// Each list is independent; a slow one must not hold up the rest.
			void lookupCharacters(parts).then((r) => !cancelled && (components = r));
			void charactersWithComponent(c, 18).then((r) => !cancelled && (related = r));
			void wordsContaining(c, 10).then((r) => !cancelled && (words = r));
			if (showSentences) void loadSentences(c, SENTENCE_STEP, () => cancelled);
			void loadRadicals()
				.then((index) => {
					if (cancelled) return;
					const want = charInfo?.radical || c;
					radical =
						index.radicals.find(
							(r) =>
								r.char === want ||
								r.variants.includes(want) ||
								r.simplified.includes(want) ||
								r.traditional.includes(want)
						) ?? null;
				})
				.catch(() => {});
		})();

		return () => {
			cancelled = true;
		};
	});

	/** Same paging as the word entry's sentence list. */
	async function loadSentences(c: string, limit: number, cancelled: () => boolean): Promise<void> {
		loadingSentences = true;
		try {
			const found = await getSmartSentences(c, { limit, maxChars: 22 });
			if (cancelled()) return;
			sentences = found;
			sentenceLimit = limit;
			mayHaveMore = found.length >= limit;
		} finally {
			if (!cancelled()) loadingSentences = false;
		}
	}

	const label = 'text-[13px] text-muted font-semibold';
	const panel = 'rounded-panel border border-line bg-surface p-4 sm:p-5';
</script>

<div class="grid gap-4 lg:grid-cols-[220px_1fr]">
	<!-- Identity + writing -->
	<div class="flex flex-col items-center gap-3">
		<StrokeAnimation {char} size={200} color={TONE_INK[tone] ?? TONE_INK[5]} />
		<div class="text-center">
			<p class="text-lg font-semibold tone{tone}">{info?.pinyin || '—'}</p>
			{#if info?.definition}
				<p class="text-sm text-muted">{info.definition}</p>
			{/if}
			<button
				type="button"
				onclick={() => speak(char, { pinyin: info?.pinyin?.split(/[\s/]+/)[0] })}
				class="mx-auto mt-2 flex items-center gap-1.5 rounded-full bg-sunk px-2.5 py-1.5 text-[13px] text-muted transition hover:text-ink font-semibold"
			>
				<Volume2 size={13} /> Listen
			</button>
		</div>
	</div>

	<div class="grid gap-4">
		<!-- Structure & components -->
		{#if info?.decomposition}
			<section class={panel}>
				<div class="flex flex-wrap items-center gap-2">
					<h3 class={label}>Structure</h3>
					{#if structure}
						<span class="rounded-full bg-sunk px-2.5 py-0.5 text-xs text-muted">
							{structure}
						</span>
					{/if}
					<span class="font-mono text-sm text-muted" lang="zh-Hans">
						{info.decomposition}
					</span>
				</div>
				{#if structureText}
					<p class="mt-2 text-sm text-ink">{structureText}</p>
				{/if}

				{#if components.length}
					<div class="mt-3 flex flex-wrap gap-2">
						<!-- Keyed by position: 林 is 木 twice. -->
						{#each components as part, i (i)}
							{@const role = componentRole(part.character, etymology)}
							<button
								type="button"
								onclick={() => onOpenChar?.(part.character)}
								class="flex items-center gap-3 rounded-card bg-sunk px-3 py-2 text-left transition hover:bg-sky-soft"
							>
								<span class="text-3xl leading-none" lang="zh-Hans">{part.character}</span>
								<span class="min-w-0">
									<span class="block text-xs text-muted">{part.pinyin}</span>
									<span class="block max-w-40 truncate text-xs text-ink"
										>{part.definition}</span
									>
									{#if role}
										<span
											class="mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-xs font-medium
											{role === 'semantic' ? 'bg-mint-soft text-mint-ink' : 'bg-apricot-soft text-apricot-ink'}"
										>
											{role === 'semantic' ? 'meaning' : 'sound'}
										</span>
									{/if}
								</span>
							</button>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<!-- Etymology -->
		{#if etymology?.t || etymology?.h}
			<section class={panel}>
				<div class="flex flex-wrap items-center gap-2">
					<h3 class={label}>Origin</h3>
					{#if etymology.t}
						<span class="rounded-full bg-sky-soft px-2.5 py-0.5 text-xs font-medium text-sky-ink">
							{etymologyTypeLabel(etymology.t)}
						</span>
						<span class="text-xs text-muted">{etymologyTypeBlurb(etymology.t)}</span>
					{/if}
				</div>
				{#if etymology.h}
					<p class="mt-2 text-sm text-ink">{etymology.h}</p>
				{/if}
				{#if etymology.s || etymology.p}
					<p class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
						{#if etymology.s}
							<span class="flex items-baseline gap-1.5">
								<span class={label}>meaning from</span>
								<span class="text-lg" lang="zh-Hans">{etymology.s}</span>
							</span>
						{/if}
						{#if etymology.p}
							<span class="flex items-baseline gap-1.5">
								<span class={label}>sound from</span>
								<span class="text-lg" lang="zh-Hans">{etymology.p}</span>
							</span>
						{/if}
					</p>
				{/if}
			</section>
		{/if}

		<!-- Radical -->
		{#if radical}
			<section class={panel}>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<h3 class={label}>Radical</h3>
						<span class="text-3xl leading-none" lang="zh-Hans">{radical.char}</span>
						<span class="text-sm text-muted">
							{radical.pinyin} · {radical.meaning}
						</span>
					</div>
					<a
						href="{base}/radicals?q={encodeURIComponent(radical.char)}"
						class="rounded-full bg-sunk px-3 py-1.5 text-[13px] text-muted transition hover:text-ink font-semibold"
					>
						Kangxi {radical.number} →
					</a>
				</div>
			</section>
		{/if}

		<!-- Words built on this character -->
		{#if words.length}
			<section class={panel}>
				<h3 class={label}>Words with {char}</h3>
				<ul class="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
					{#each words as word (word.simplified)}
						<li>
							<button
								type="button"
								onclick={() => onOpenWord?.(word.simplified)}
								class="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-sunk"
							>
								<span class="text-lg" lang="zh-Hans">{word.simplified}</span>
								<span class="text-xs text-muted">{word.pinyin}</span>
								<span class="min-w-0 flex-1 truncate text-xs text-muted">{word.meaning}</span>
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Characters sharing this one as a component -->
		{#if related.length}
			<section class={panel}>
				<h3 class={label}>Characters built from {char}</h3>
				<div class="mt-3 flex flex-wrap gap-2">
					{#each related as rel (rel.character)}
						<button
							type="button"
							onclick={() => onOpenChar?.(rel.character)}
							title={rel.definition}
							class="flex flex-col items-center rounded-card bg-sunk px-3 py-2 transition hover:bg-sky-soft"
						>
							<span class="text-2xl leading-none" lang="zh-Hans">{rel.character}</span>
							<span class="text-xs text-muted">{rel.pinyin}</span>
							<span class="max-w-24 truncate text-xs text-muted">{rel.definition}</span>
						</button>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Sentences -->
		{#if sentences.length}
			<section class={panel}>
				<h3 class={label}>In use</h3>
				<ul class="mt-3 grid gap-3">
					{#each sentences as sentence, i (i)}
						<li class="border-l-2 border-line pl-3">
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
								<p class="text-xs text-muted">{@html colorizePinyinString(sentence.pinyin)}</p>
							{/if}
							<p class="text-sm text-muted">{sentence.translation}</p>
						</li>
					{/each}
				</ul>
				{#if mayHaveMore}
					<button
						type="button"
						disabled={loadingSentences}
						onclick={() => loadSentences(char, sentenceLimit + SENTENCE_STEP, () => false)}
						class="mt-3 rounded-full bg-sunk px-3 py-1.5 text-[13px] text-muted transition hover:text-ink disabled:opacity-40 font-semibold"
					>
						{loadingSentences ? 'Loading…' : 'Load more sentences'}
					</button>
				{/if}
			</section>
		{/if}

		{#if loading}
			<p class="text-sm text-muted">Loading {char}…</p>
		{:else if !info}
			<p class="text-sm text-muted">
				No character data for {char} — it may be outside the 9,500-character set.
			</p>
		{/if}
	</div>
</div>
