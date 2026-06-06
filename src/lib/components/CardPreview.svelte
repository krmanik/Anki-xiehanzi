<script lang="ts">
	import { colorizeHanzi } from '$lib/tone';
	import Volume2 from '@lucide/svelte/icons/volume-2';

	let {
		label,
		fieldsOnSide,
		hasWriting = false,
		colorize = true,
		font = 'default'
	}: {
		label: string;
		fieldsOnSide: string[]; // ordered field ids shown on this side
		hasWriting?: boolean;
		colorize?: boolean;
		font?: string;
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
		definition: 'China; Middle Kingdom'
	};

	const simp = $derived(colorizeHanzi(ex.Simplified, ex.syllable));
	const trad = $derived(colorizeHanzi(ex.Traditional, ex.syllable));
	const has = (f: string) => fieldsOnSide.includes(f);
	const empty = $derived(fieldsOnSide.length === 0 && !hasWriting);

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
		{#if empty}
			<span class="text-sm text-neutral-300">Nothing selected</span>
		{/if}

		{#if has('Simplified')}
			<div class="text-4xl font-semibold leading-none" style:font-family={hanziFont || null}>
				{#each simp as c}<span class={colorize ? `tone${c.tone}` : ''}>{c.ch}</span>{/each}
			</div>
		{/if}
		{#if has('Traditional')}
			<div class="text-2xl leading-none text-neutral-700" style:font-family={hanziFont || null}>
				<span class="text-neutral-300">〔</span>{#each trad as c}<span
						class={colorize ? `tone${c.tone}` : ''}>{c.ch}</span
					>{/each}<span class="text-neutral-300">〕</span>
			</div>
		{/if}
		{#if hasWriting}
			<div bind:this={writerEl} class="h-20 w-20"></div>
		{/if}
		{#if has('Pinyin')}
			<div class="text-lg text-neutral-600">{ex.pinyin}</div>
		{/if}
		{#if has('Zhuyin')}
			<div class="text-base text-neutral-500">{ex.zhuyin}</div>
		{/if}
		{#if has('Definitions')}
			<div class="text-sm text-neutral-700">{ex.definition}</div>
		{/if}
		{#if has('Audio')}
			<div class="mt-1 inline-flex items-center gap-1 text-neutral-400">
				<Volume2 size={16} /> <span class="text-xs">audio</span>
			</div>
		{/if}
	</div>
</div>
