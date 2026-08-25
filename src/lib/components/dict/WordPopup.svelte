<script lang="ts">
	/**
	 * A tiny, anchored lookup popup — a small tinted box next to the word you
	 * clicked, not a centered dialog: simplified + traditional, tone-colored
	 * pinyin, every reading's numbered senses, measure word, character count.
	 * No stroke order, no example sentences, no compounds — "More info" hands
	 * off to the full `WordEntry` in a real modal for that. Deliberately
	 * doesn't import `WordEntry`/`CharacterPanel`: this has to feel instant on
	 * every click, not pull in the stroke-order pipeline.
	 *
	 * A span jieba cut that isn't itself a dictionary word (十个 = 十 + 个, two
	 * words glued by segmentation, not one) falls back to a per-character
	 * breakdown instead of a bare "no entry" — each character is its own real
	 * word here, so the fallback is usually exactly what "十个" should have
	 * shown as two words to begin with.
	 */
	import { lookup, type CedictEntry } from '$lib/dict/cedict';
	import { orderReadings, senses } from '$lib/dictionary';
	import { toneOfPinyin } from '$lib/tone';
	import { speak } from '$lib/dict/audio';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	let {
		word,
		anchor,
		onclose,
		onMore,
		onOpenWord,
		saved = false,
		onToggleSave,
		colorize = true
	}: {
		word: string;
		/** Viewport rect of the clicked word, from `getBoundingClientRect()`. */
		anchor: DOMRect;
		onclose: () => void;
		onMore: () => void;
		/** Drill into a character from the no-entry fallback list. */
		onOpenWord?: (word: string) => void;
		saved?: boolean;
		onToggleSave?: () => void;
		/** Mirrors the reader's own Colorize toggle — off means plain black/grey. */
		colorize?: boolean;
	} = $props();

	interface CharHit {
		ch: string;
		entry: CedictEntry | null;
	}

	let entry = $state<CedictEntry | null>(null);
	let charFallback = $state<CharHit[] | null>(null);
	let loading = $state(true);
	let el = $state<HTMLDivElement | undefined>(undefined);
	let top = $state(-9999);
	let left = $state(-9999);
	let ready = $state(false);

	const readings = $derived(orderReadings(entry?.readings ?? []));

	/** Tone per character of `entry.simplified`, from the main reading's syllables. */
	function tonesOf(pinyinPlain: string): number[] {
		return pinyinPlain
			.split(/\s+/)
			.filter(Boolean)
			.map((syl) => toneOfPinyin(syl));
	}
	const tones = $derived(tonesOf(readings[0]?.pinyinPlain ?? ''));

	/** `pinyinPlain` split into tone-colored syllable spans (live `.toneN`, not the dead `.ex-toneN` set used only inside exported Anki cards). */
	function pinyinParts(pinyinPlain: string): { syl: string; tone: number }[] {
		return pinyinPlain
			.split(/\s+/)
			.filter(Boolean)
			.map((syl) => ({ syl, tone: toneOfPinyin(syl) }));
	}

	const charCount = $derived([...word].length);

	$effect(() => {
		const w = word;
		loading = true;
		entry = null;
		charFallback = null;
		ready = false;
		lookup(w).then(async (found) => {
			if (found || [...w].length < 2) {
				entry = found;
				loading = false;
				return;
			}
			const chars = [...w];
			const hits = await Promise.all(chars.map((c) => lookup(c).catch(() => null)));
			charFallback = chars.map((ch, i) => ({ ch, entry: hits[i] }));
			loading = false;
		});
	});

	// Position after content renders (so real height is known), clamped inside
	// the viewport — a popup opened near the bottom/right edge flips to the
	// other side of the anchor instead of running off-screen.
	$effect(() => {
		if (!el || loading) return;
		const rect = el.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const margin = 8;
		let t = anchor.bottom + 6;
		let l = anchor.left;
		if (l + rect.width > vw - margin) l = vw - rect.width - margin;
		if (l < margin) l = margin;
		if (t + rect.height > vh - margin) t = anchor.top - rect.height - 6;
		if (t < margin) t = margin;
		top = t;
		left = l;
		ready = true;
	});

	// Outside-click dismiss that doesn't swallow the click: the listener only
	// starts acting after this tick, so the very click that opened the popup
	// (still bubbling to `window` when this mounts) doesn't close it again —
	// and clicking a *different* word closes this one while still reaching
	// that word's own click handler underneath.
	let armed = false;
	$effect(() => {
		const id = setTimeout(() => (armed = true), 0);
		return () => clearTimeout(id);
	});
	function onWindowClick(e: MouseEvent) {
		if (armed && el && !el.contains(e.target as Node)) onclose();
	}
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onclick={onWindowClick} onscroll={onclose} {onkeydown} />

<div
	bind:this={el}
	style="top:{top}px; left:{left}px; visibility:{ready ? 'visible' : 'hidden'}"
	class="fixed z-50 w-72 max-w-[calc(100vw-16px)] rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm shadow-xl"
	lang="zh-Hans"
>
	{#if loading}
		<p class="text-neutral-400">…</p>
	{:else if entry}
		<div class="flex items-start justify-between gap-2">
			<p class="flex items-baseline gap-2">
				<span class="text-xl font-semibold">
					{#each [...entry.simplified] as ch, i (i)}<span
							class={colorize ? `tone${tones[i] ?? 5}` : ''}>{ch}</span
						>{/each}
				</span>
				{#if entry.traditional !== entry.simplified}
					<span class="text-base text-neutral-400" lang="zh-Hant">{entry.traditional}</span>
				{/if}
			</p>
			<div class="flex shrink-0 items-center gap-1">
				<button
					type="button"
					onclick={() => speak(entry!.simplified, { pinyin: readings[0]?.syllable })}
					class="rounded p-1 text-neutral-400 transition hover:bg-amber-100 hover:text-neutral-800"
					aria-label="Listen"
				>
					<Volume2 size={14} />
				</button>
				{#if onToggleSave}
					<button
						type="button"
						onclick={onToggleSave}
						class="rounded p-1 transition hover:bg-amber-100 {saved
							? 'text-emerald-600'
							: 'text-neutral-400 hover:text-neutral-800'}"
						aria-label={saved ? 'Remove from word list' : 'Add to word list'}
					>
						{#if saved}<Check size={14} />{:else}<Plus size={14} />{/if}
					</button>
				{/if}
			</div>
		</div>

		<div class="mt-1.5 grid gap-2">
			{#each readings as reading (reading.syllable)}
				<div>
					<p class="font-medium">
						{#each pinyinParts(reading.pinyinPlain) as p, i (i)}{i
								? ' '
								: ''}<span class={colorize ? `tone${p.tone}` : ''}>{p.syl}</span>{/each}
					</p>
					<ol class="mt-0.5 grid gap-0.5 text-neutral-700">
						{#each senses(reading.definition) as sense, i (i)}
							<li class="flex gap-1.5">
								<span class="text-neutral-400">{i + 1}.</span>
								<span>{sense}</span>
							</li>
						{/each}
					</ol>
				</div>
			{:else}
				{#if entry.commonMeaning && entry.commonMeaning !== '#'}<p class="text-neutral-700">{entry.commonMeaning}</p>{/if}
			{/each}
		</div>

		{#if entry.classifiers.length}
			<p class="mt-2 flex flex-wrap items-baseline gap-1.5 text-xs text-neutral-500">
				<span class="font-mono uppercase tracking-wide text-neutral-400">measure word</span>
				{#each entry.classifiers as cl (cl)}<span lang="zh-Hans">{cl}</span>{/each}
			</p>
		{/if}

		<div class="mt-2 flex items-center justify-between border-t border-amber-200/70 pt-2">
			<span class="text-xs text-neutral-400"
				>{charCount} character{charCount === 1 ? '' : 's'}</span
			>
			<button
				type="button"
				onclick={onMore}
				class="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
			>
				More info <ArrowRight size={12} />
			</button>
		</div>
	{:else if charFallback?.some((c) => c.entry)}
		<p class="mb-2 text-xs text-neutral-400">
			"{word}" isn't its own word — here's each character:
		</p>
		<div class="grid gap-2">
			{#each charFallback as hit (hit.ch)}
				{@const hitReadings = orderReadings(hit.entry?.readings ?? [])}
				{@const hitTone = hitReadings[0] ? toneOfPinyin(hitReadings[0].pinyinPlain.trim()) : 5}
				{#if hit.entry}
					<button
						type="button"
						onclick={() => onOpenWord?.(hit.ch)}
						class="flex items-baseline gap-2 rounded px-1 py-0.5 text-left transition hover:bg-amber-100"
					>
						<span class="text-lg font-semibold {colorize ? `tone${hitTone}` : ''}">{hit.ch}</span>
						{#if hitReadings[0]}<span
								class="text-xs text-neutral-500 {colorize ? `tone${hitTone}` : ''}"
								>{hitReadings[0].pinyinPlain}</span
							>{/if}
						<span class="min-w-0 flex-1 truncate text-xs text-neutral-600"
							>{senses(hitReadings[0]?.definition ?? '')[0] ||
								(hit.entry.commonMeaning !== '#' ? hit.entry.commonMeaning : '')}</span
						>
					</button>
				{:else}
					<p class="flex items-baseline gap-2 px-1 text-neutral-400">
						<span class="text-lg">{hit.ch}</span>
						<span class="text-xs">no entry</span>
					</p>
				{/if}
			{/each}
		</div>
	{:else}
		<p class="text-neutral-500">No entry for "{word}"</p>
	{/if}
</div>
