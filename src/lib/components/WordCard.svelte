<script lang="ts">
	import type { Word } from '$lib/deck';
	import { posDisplay } from '$lib/dict/cedict';
	import { colorizeHanzi } from '$lib/tone';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Volume2 from '@lucide/svelte/icons/volume-2';

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

	const firstSyllable = $derived(word.readings[0]?.syllable ?? '');
	const simpChars = $derived(colorizeHanzi(word.Simplified, firstSyllable));
	const tradChars = $derived(colorizeHanzi(word.Traditional, firstSyllable));
	const levelLabel = $derived.by(() => {
		if (!word.level) return '';
		const nums = [...new Set(word.level.match(/\d+/g) ?? [])];
		return nums.length ? `HSK ${nums.join('·')}` : '';
	});
	const commonMeaning = $derived(word.commonMeaning || word.readings[0]?.definition || '');
	const hasDict = $derived(word.readings.some((r) => r.definition));
</script>

<div
	class="rounded-lg border p-4 transition {selected
		? 'border-neutral-900 bg-neutral-50'
		: 'border-neutral-200'}"
>
	<div class="flex items-start gap-3">
		<input
			type="checkbox"
			checked={selected}
			onchange={onToggle}
			class="mt-1.5 h-4 w-4 shrink-0 accent-neutral-900"
		/>

		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
				<span class="text-2xl font-semibold leading-tight">
					{#each simpChars as c}<span class={colorize ? `tone${c.tone}` : ''}>{c.ch}</span>{/each}
				</span>
				{#if word.Traditional && word.Traditional !== word.Simplified}
					<span class="text-xl text-neutral-400">〔</span>
					<span class="text-xl leading-tight">
						{#each tradChars as c}<span class={colorize ? `tone${c.tone}` : ''}>{c.ch}</span>{/each}
					</span>
					<span class="text-xl text-neutral-400">〕</span>
				{/if}
			</div>

			<div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
				{#each word.readings as r, i}
					<span>{@html r.pinyin}</span>
					<span class="text-neutral-400">{@html r.zhuyin}</span>
					{#if i < word.readings.length - 1}<span class="text-neutral-300">·</span>{/if}
				{/each}
			</div>

			{#if levelLabel || word.pos.length || word.classifiers.length}
				<div class="mt-2 flex flex-wrap gap-1.5">
					{#if levelLabel}
						<span class="rounded-full bg-neutral-900 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white">{levelLabel}</span>
					{/if}
					{#each word.pos as p}
						<span class="rounded-full border border-neutral-300 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-600">{posDisplay(p)}</span>
					{/each}
					{#each word.classifiers as cl}
						<span class="rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-[10px] tracking-wider text-indigo-700">CL {cl}</span>
					{/each}
				</div>
			{/if}

			{#if commonMeaning}
				<p class="mt-2 text-[15px] leading-snug text-neutral-900">{commonMeaning}</p>
			{/if}

			{#if hasDict}
				<details class="group mt-2">
					<summary class="flex w-fit cursor-pointer list-none items-center gap-1 font-mono text-xs uppercase tracking-wider text-neutral-400 hover:text-neutral-700">
						Dictionary <ChevronDown size={13} class="transition group-open:rotate-180" />
					</summary>
					<div class="mt-2 space-y-1.5 border-l-2 border-neutral-200 pl-3">
						{#each word.readings as r}
							{#if r.definition}
								<div class="text-sm">
									<span class="text-neutral-500">{@html r.pinyin}</span>
									<span class="text-neutral-700"> — {r.definition}</span>
								</div>
							{/if}
						{/each}
					</div>
				</details>
			{/if}
		</div>

		<div class="flex shrink-0 flex-col gap-1">
			{#if onPlay}
				<button
					onclick={play}
					disabled={playing}
					aria-label="play audio"
					class="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"
				>
					<Volume2 size={16} class={playing ? 'animate-pulse' : ''} />
				</button>
			{/if}
			{#if onDelete}
				<button
					onclick={onDelete}
					aria-label="delete word"
					class="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
				>
					<Trash2 size={16} />
				</button>
			{/if}
		</div>
	</div>
</div>
