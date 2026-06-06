<script lang="ts">
	import { colorizeHanzi } from '$lib/tone';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import Menu from '@lucide/svelte/icons/menu';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';

	const WRITING = 'writingComponent';

	let {
		label,
		items,
		colorize = true,
		font = 'default',
		collapseDict = false
	}: {
		label: string;
		items: string[]; // ordered ids on this side (field ids or 'writingComponent')
		colorize?: boolean;
		font?: string;
		collapseDict?: boolean;
	} = $props();

	const fontStacks: Record<string, string> = {
		default: '',
		kaiti: '"Kaiti SC", "STKaiti", "KaiTi", serif',
		songti: '"Songti SC", "STSong", "SimSun", serif'
	};
	const hanziFont = $derived(fontStacks[font] || '');

	// Dummy example word used purely for the preview.
	const ex = {
		Simplified: '中国',
		Traditional: '中國',
		syllable: 'Zhong1 guo2',
		pinyin: 'Zhōng guó',
		zhuyin: 'ㄓㄨㄥ ㄍㄨㄛˊ',
		simple: 'China',
		definition: 'China; Middle Kingdom'
	};

	const simp = $derived(colorizeHanzi(ex.Simplified, ex.syllable));
	const trad = $derived(colorizeHanzi(ex.Traditional, ex.syllable));
	const hasWriting = $derived(items.includes(WRITING));

	let writerEl: HTMLDivElement | undefined = $state();
	$effect(() => {
		if (!hasWriting || !writerEl) return;
		let writer: any;
		let cancelled = false;
		writerEl.innerHTML = '';
		import('hanzi-writer').then(({ default: HanziWriter }) => {
			if (cancelled || !writerEl) return;
			writer = HanziWriter.create(writerEl, ex.Simplified[0], {
				width: 80,
				height: 80,
				padding: 4,
				showOutline: true,
				strokeColor: colorize ? '#2196f3' : '#333'
			});
			writer.loopCharacterAnimation();
		});
		return () => {
			cancelled = true;
			if (writer) writer.hideCharacter();
			if (writerEl) writerEl.innerHTML = '';
		};
	});
</script>

<div class="overflow-hidden rounded-xl border border-neutral-200 bg-white">
	<div
		class="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400"
	>
		{label}
	</div>
	<div class="flex min-h-[150px] flex-col items-center justify-center gap-2 p-6 text-center">
		{#if items.length === 0}
			<span class="text-sm text-neutral-300">Nothing selected</span>
		{/if}

		{#each items as item (item)}
			{#if item === 'Simplified'}
				<div class="text-4xl font-semibold leading-none" style:font-family={hanziFont || null}>
					{#each simp as c}<span class={colorize ? `tone${c.tone}` : ''}>{c.ch}</span>{/each}
				</div>
			{:else if item === 'Traditional'}
				<div class="text-2xl leading-none text-neutral-700" style:font-family={hanziFont || null}>
					<span class="text-neutral-300">〔</span>{#each trad as c}<span
							class={colorize ? `tone${c.tone}` : ''}>{c.ch}</span
						>{/each}<span class="text-neutral-300">〕</span>
				</div>
			{:else if item === WRITING}
				<div bind:this={writerEl} class="h-24 w-24"></div>
				<div class="mt-1 flex items-center justify-center gap-1.5 text-white">
					{#each [Menu, PenLine, RotateCcw, ChevronRight, EllipsisVertical] as Icon}
						<span class="flex h-6 w-6 items-center justify-center rounded bg-[#5b6a9e]">
							<Icon size={13} />
						</span>
					{/each}
				</div>
				<hr class="my-1 w-full border-neutral-200" />
			{:else if item === 'Pinyin'}
				<div class="text-lg text-neutral-600">{ex.pinyin}</div>
			{:else if item === 'Zhuyin'}
				<div class="text-base text-neutral-500">{ex.zhuyin}</div>
			{:else if item === 'SimpleMeaning'}
				<div class="text-[15px] font-semibold text-neutral-800">{ex.simple}</div>
			{:else if item === 'Definitions'}
				{#if collapseDict}
					<details class="text-sm text-neutral-700">
						<summary class="cursor-pointer text-xs text-neutral-400">Dictionary</summary>
						{ex.definition}
					</details>
				{:else}
					<div class="text-sm text-neutral-700">{ex.definition}</div>
				{/if}
			{:else if item === 'Audio'}
				<div class="mt-1 inline-flex items-center gap-1 text-neutral-400">
					<Volume2 size={16} /> <span class="text-xs">audio</span>
				</div>
			{/if}
		{/each}
	</div>
</div>
