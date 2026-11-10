<script lang="ts">
	import type { Word } from '$lib/deck';
	import { commonReadingIndex } from '$lib/noteFields';
	import { frequencyBand } from '$lib/dict/meta';
	import { colorizeHanzi } from '$lib/tone';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import Badge from '$lib/ui/Badge.svelte';
	import { rowMeaning } from '$lib/hsk';

	let {
		word,
		selected = false,
		colorize = true,
		onToggle,
		onDelete,
		onPlay
	}: {
		word: Word;
		selected?: boolean;
		colorize?: boolean;
		onToggle?: () => void;
		onDelete?: () => void;
		onPlay?: () => void | Promise<void>;
	} = $props();

	let playing = $state(false);
	async function play() {
		if (!onPlay || playing) return;
		playing = true;
		try {
			await onPlay();
		} finally {
			playing = false;
		}
	}

	const commonReading = $derived(word.readings[commonReadingIndex(word.readings, word.listSyllable)]);
	const allReadings = $derived(word.readings.map((r) => r.pinyin.replace(/<[^>]*>/g, '')).join(' · '));
	const firstSyllable = $derived(commonReading?.syllable ?? '');
	const simpChars = $derived(colorizeHanzi(word.Simplified, firstSyllable));
	const tradChars = $derived(colorizeHanzi(word.Traditional, firstSyllable));
	const levelLabel = $derived.by(() => {
		if (!word.level) return '';
		const nums = [...new Set(word.level.match(/\d+/g) ?? [])];
		return nums.length ? `HSK ${nums.join('·')}` : '';
	});
	const freqLabel = $derived(frequencyBand(word.rank) ?? '');
	const commonMeaning = $derived(
		rowMeaning([word.SimpleMeaning, word.commonMeaning, ...word.readings.map((r) => r.definition)])
	);
</script>

<!-- One word on the review list: a row to scan, not a card to read. -->
<div
	class="flex min-w-0 items-center gap-3 rounded-[20px] px-3 py-2.5 transition-colors sm:px-4 {selected
		? 'bg-sunk'
		: 'bg-surface hover:bg-sunk'}"
>
	<input
		type="checkbox"
		checked={selected}
		onchange={onToggle}
		aria-label="Select {word.Simplified}"
		class="xhz-check"
	/>

	<span class="shrink-0 font-zh text-[28px] leading-tight font-semibold sm:min-w-28">
		{#each simpChars as c}<span class={colorize ? `tone${c.tone}` : ''}>{c.ch}</span
			>{/each}{#if word.Traditional && word.Traditional !== word.Simplified}<span
				class="ml-1 hidden text-lg text-muted sm:inline">〔{word.Traditional}〕</span
			>{/if}
	</span>

	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-x-2 overflow-hidden text-sm whitespace-nowrap text-muted">
			<!-- The common reading only — the one the card leads with. All of them are on the card. -->
			{#if commonReading}
				<span title={word.readings.length > 1 ? allReadings : undefined}>{@html commonReading.pinyin}</span>
			{/if}
			{#if levelLabel}<Badge tint="sky">{levelLabel}</Badge>{/if}
			{#if freqLabel}<span class="hidden sm:contents"><Badge>{freqLabel}</Badge></span>{/if}
		</div>
		{#if commonMeaning}
			<p class="m-0 truncate text-[15px] text-ink" title={commonMeaning}>{commonMeaning}</p>
		{/if}
	</div>

	<div class="flex shrink-0 items-center">
		{#if onPlay}
			<button
				type="button"
				onclick={play}
				disabled={playing}
				aria-label="play audio"
				class="grid size-9 cursor-pointer place-items-center rounded-xl border-0 bg-transparent text-muted transition hover:bg-line hover:text-ink active:scale-90 disabled:opacity-40"
			>
				<Volume2 class="size-4 {playing ? 'animate-pulse' : ''}" />
			</button>
		{/if}
		{#if onDelete}
			<button
				type="button"
				onclick={onDelete}
				aria-label="delete word"
				class="grid size-9 cursor-pointer place-items-center rounded-xl border-0 bg-transparent text-muted transition hover:bg-err-soft hover:text-err-ink active:scale-90"
			>
				<Trash2 class="size-4" />
			</button>
		{/if}
	</div>
</div>
