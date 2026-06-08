<script lang="ts">
	import { colorizeHanzi } from '$lib/tone';
	import { elementOrder, type CardElementId, type CardElementStyles, type ElementStyle } from '$lib/deckTemplate';
	import type { TonePalette, ToneKey } from '$lib/tonePresets';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import Menu from '@lucide/svelte/icons/menu';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';

	const WRITING = 'writingComponent';

	const fontStacks: Record<string, string> = {
		default: '',
		kaiti: '"Kaiti SC", "STKaiti", "KaiTi", serif',
		songti: '"Songti SC", "STSong", "SimSun", serif'
	};

	let {
		label,
		items,
		side = 'front',
		colorize = true,
		font = 'default',
		collapseDict = false,
		elementStyles = {} as CardElementStyles,
		toneColors = null,
		interactive = false,
		selectedElement = $bindable<CardElementId | null>(null)
	}: {
		label: string;
		items: string[];
		side?: 'front' | 'back';
		colorize?: boolean;
		font?: string;
		collapseDict?: boolean;
		elementStyles?: CardElementStyles;
		toneColors?: TonePalette | null;
		interactive?: boolean;
		selectedElement?: CardElementId | null;
	} = $props();

	// Inline tone color for a preview hanzi span (honours the chosen palette).
	function toneStyle(tone: number): string {
		return colorize && toneColors ? `color:${toneColors[String(tone) as ToneKey]}` : '';
	}

	const ex = {
		Simplified: '中国', Traditional: '中國', syllable: 'Zhong1 guo2',
		pinyin: 'Zhōng guó', zhuyin: 'ㄓㄨㄥ ㄍㄨㄛˊ', simple: 'China',
		definition: 'China; Middle Kingdom',
		breakdown: [
			{ character: '中', pinyin: 'zhōng', definition: 'middle' },
			{ character: '国', pinyin: 'guó', definition: 'country' }
		],
		radical: [
			{ character: '中', radical: '丨' },
			{ character: '国', radical: '囗' }
		],
		hsk: 'HSK 1', frequency: 'Top 500'
	};

	const simp = $derived(colorizeHanzi(ex.Simplified, ex.syllable));
	const trad = $derived(colorizeHanzi(ex.Traditional, ex.syllable));
	const hasWriting = $derived(items.includes(WRITING));
	const globalFont = $derived(fontStacks[font] || '');

	// Control buttons + separator are answer-side chrome; they also appear on the
	// writing card's front (the quiz toolbar). Mirrors the exported templates.
	const showChrome = $derived(side === 'back' || hasWriting);

	// One merged control group. When the writing component is present it shows the
	// full writer toolbar (menu, audio, reveal, replay, next, more); otherwise the
	// basic set (menu, audio, more) — never two separate rows.
	const controlIcons = $derived(
		hasWriting
			? [Menu, Volume2, PenLine, RotateCcw, ChevronRight, EllipsisVertical]
			: [Menu, Volume2, EllipsisVertical]
	);

	function hanziFont(id: 'simplified' | 'traditional'): string {
		const ov = elementStyles[id]?.fontFamily;
		if (ov && ov !== 'default') return fontStacks[ov] ?? ov;
		return globalFont;
	}

	// Flex `order` for a body block — drives the move up/down positioning.
	function ord(id: CardElementId): number {
		return elementOrder(elementStyles, id);
	}

	function elStyle(id: CardElementId): string {
		const s: ElementStyle | undefined = elementStyles[id];
		if (!s) return '';
		const r: string[] = [];
		if (s.fontSize)        r.push(`font-size:${s.fontSize}`);
		if (id !== 'simplified' && id !== 'traditional' && s.fontFamily && s.fontFamily !== 'default')
			r.push(`font-family:${fontStacks[s.fontFamily] ?? s.fontFamily}`);
		if (s.fontWeight)      r.push(`font-weight:${s.fontWeight}`);
		if (s.color)           r.push(`color:${s.color}`);
		if (s.textAlign) {
			const as = s.textAlign === 'left' ? 'flex-start' : s.textAlign === 'right' ? 'flex-end' : 'center';
			r.push(`text-align:${s.textAlign}`);
			r.push(`align-self:${as}`);
		}
		if (s.marginTop)       r.push(`margin-top:${s.marginTop}`);
		if (s.marginBottom)    r.push(`margin-bottom:${s.marginBottom}`);
		if (s.backgroundColor) r.push(`background-color:${s.backgroundColor}`);
		if (s.padding)         r.push(`padding:${s.padding}`);
		if (s.borderRadius)    r.push(`border-radius:${s.borderRadius}`);
		if (s.letterSpacing)   r.push(`letter-spacing:${s.letterSpacing}`);
		if (s.lineHeight)      r.push(`line-height:${s.lineHeight}`);
		if (s.borderColor)     r.push(`border-color:${s.borderColor}`);
		if (s.borderWidth)     r.push(`border-width:${s.borderWidth}`);
		return r.join(';');
	}

	function isHidden(id: CardElementId): boolean {
		return elementStyles[id]?.visible === false;
	}

	function selClass(id: CardElementId): string {
		if (!interactive) return '';
		return (
			'cursor-pointer rounded ring-2 transition-all ' +
			(selectedElement === id
				? 'ring-blue-500 ring-offset-1'
				: 'ring-transparent hover:ring-blue-300 hover:ring-offset-1')
		);
	}

	function select(id: CardElementId, e: Event) {
		if (!interactive) return;
		e.stopPropagation();
		selectedElement = id;
	}

	// Keyboard handler satisfying a11y requirements for click-equivalent interactions.
	function onkey(id: CardElementId) {
		return (e: KeyboardEvent) => {
			if (interactive && (e.key === 'Enter' || e.key === ' ')) select(id, e);
		};
	}

	let writerEl: HTMLDivElement | undefined = $state();
	$effect(() => {
		if (!hasWriting || !writerEl) return;
		let writer: any;
		let cancelled = false;
		writerEl.innerHTML = '';
		import('hanzi-writer').then(({ default: HanziWriter }) => {
			if (cancelled || !writerEl) return;
			writer = HanziWriter.create(writerEl, ex.Simplified[0], {
				width: 80, height: 80, padding: 4, showOutline: true,
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

	const SEL_BADGE = 'ml-1 rounded bg-blue-500 px-1.5 py-0.5 align-middle text-[9px] text-white font-sans';
</script>

<div
	class="relative overflow-hidden rounded-xl border border-neutral-200 transition-all {selClass('card')}"
	style="background-color:{elementStyles.card?.backgroundColor ?? '#ffffff'};text-align:{elementStyles.card?.textAlign ?? 'center'};{elStyle('card')}"
	role="button"
	tabindex="0"
	onclick={(e) => select('card', e)}
	onkeydown={onkey('card')}
>
	<div class="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
		{label}
		{#if interactive && selectedElement === 'card'}<span class={SEL_BADGE}>Card</span>{/if}
	</div>

	<div class="flex min-h-[150px] flex-col items-center gap-2 p-4">

		{#if showChrome && (!isHidden('controlButtons') || interactive)}
			<div
				class="flex w-full items-center justify-center gap-1.5 rounded py-1 {selClass('controlButtons')} {isHidden('controlButtons') ? 'opacity-30' : ''}"
				style="order:{ord('controlButtons')};{elStyle('controlButtons')}"
				role="button"
				tabindex="0"
				onclick={(e) => select('controlButtons', e)}
				onkeydown={onkey('controlButtons')}
			>
				{#each controlIcons as Icon, i (i)}
					<span class="flex h-6 w-6 items-center justify-center rounded bg-[#5b6a9e] text-white"><Icon size={13} /></span>
				{/each}
				{#if interactive && selectedElement === 'controlButtons'}<span class={SEL_BADGE}>Controls</span>{/if}
			</div>
		{/if}

		{#if showChrome && (!isHidden('hr') || interactive)}
			<div
				class="w-full rounded py-0.5 {selClass('hr')} {isHidden('hr') ? 'opacity-30' : ''}"
				style="order:{ord('hr')}"
				role="button"
				tabindex="0"
				onclick={(e) => select('hr', e)}
				onkeydown={onkey('hr')}
			>
				<hr class="w-full border-t border-neutral-300" style={elStyle('hr')} />
				{#if interactive && selectedElement === 'hr'}<div class="mt-0.5 text-center font-mono text-[9px] text-blue-500">separator</div>{/if}
			</div>
		{/if}

		{#if items.length === 0 && !interactive}
			<span class="text-sm text-neutral-300" style="order:999">Nothing selected</span>
		{/if}

		{#each items as item (item)}

			{#if item === 'Simplified' && (!isHidden('simplified') || interactive)}
				<div
					class="font-semibold leading-none {selClass('simplified')} {isHidden('simplified') ? 'opacity-30' : ''}"
					style="order:{ord('simplified')};font-size:{elementStyles.simplified?.fontSize ?? '2.5em'};font-family:{hanziFont('simplified') || 'inherit'};{elStyle('simplified')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('simplified', e)}
					onkeydown={onkey('simplified')}
				>
					{#each simp as c}<span class={colorize ? `tone${c.tone}` : ''} style={toneStyle(c.tone)}>{c.ch}</span>{/each}
					{#if interactive && selectedElement === 'simplified'}<span class={SEL_BADGE}>Simplified</span>{/if}
				</div>

			{:else if item === 'Traditional' && (!isHidden('traditional') || interactive)}
				<div
					class="leading-none text-neutral-700 {selClass('traditional')} {isHidden('traditional') ? 'opacity-30' : ''}"
					style="order:{ord('traditional')};font-size:{elementStyles.traditional?.fontSize ?? '1.5em'};font-family:{hanziFont('traditional') || 'inherit'};{elStyle('traditional')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('traditional', e)}
					onkeydown={onkey('traditional')}
				>
					<span class="text-neutral-300">〔</span>{#each trad as c}<span class={colorize ? `tone${c.tone}` : ''} style={toneStyle(c.tone)}>{c.ch}</span>{/each}<span class="text-neutral-300">〕</span>
					{#if interactive && selectedElement === 'traditional'}<span class={SEL_BADGE}>Traditional</span>{/if}
				</div>

			{:else if item === WRITING}
				<div style="order:{ord('simplified')}" class="flex flex-col items-center">
					<div bind:this={writerEl} class="h-24 w-24"></div>
				</div>

			{:else if item === 'Pinyin' && (!isHidden('pinyin') || interactive)}
				<div
					class="text-lg text-neutral-600 {selClass('pinyin')} {isHidden('pinyin') ? 'opacity-30' : ''}"
					style="order:{ord('pinyin')};{elStyle('pinyin')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('pinyin', e)}
					onkeydown={onkey('pinyin')}
				>
					{ex.pinyin}
					{#if interactive && selectedElement === 'pinyin'}<span class={SEL_BADGE}>Pinyin</span>{/if}
				</div>

			{:else if item === 'Zhuyin' && (!isHidden('zhuyin') || interactive)}
				<div
					class="text-base text-neutral-500 {selClass('zhuyin')} {isHidden('zhuyin') ? 'opacity-30' : ''}"
					style="order:{ord('zhuyin')};{elStyle('zhuyin')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('zhuyin', e)}
					onkeydown={onkey('zhuyin')}
				>
					{ex.zhuyin}
					{#if interactive && selectedElement === 'zhuyin'}<span class={SEL_BADGE}>Zhuyin</span>{/if}
				</div>

			{:else if item === 'PartOfSpeech' && (!isHidden('partOfSpeech') || interactive)}
				<div
					class="flex flex-wrap justify-center gap-1 {selClass('partOfSpeech')} {isHidden('partOfSpeech') ? 'opacity-30' : ''}"
					style="order:{ord('partOfSpeech')};{elStyle('partOfSpeech')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('partOfSpeech', e)}
					onkeydown={onkey('partOfSpeech')}
				>
					<span class="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] text-white">Place Name</span>
					{#if interactive && selectedElement === 'partOfSpeech'}<span class={SEL_BADGE}>Part of Speech</span>{/if}
				</div>

			{:else if item === 'SimpleMeaning' && (!isHidden('simpleMeaning') || interactive)}
				<div
					class="text-[15px] font-semibold text-neutral-800 {selClass('simpleMeaning')} {isHidden('simpleMeaning') ? 'opacity-30' : ''}"
					style="order:{ord('simpleMeaning')};{elStyle('simpleMeaning')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('simpleMeaning', e)}
					onkeydown={onkey('simpleMeaning')}
				>
					{ex.simple}
					{#if interactive && selectedElement === 'simpleMeaning'}<span class={SEL_BADGE}>Simple Meaning</span>{/if}
				</div>

			{:else if item === 'Definitions' && (!isHidden('definitions') || interactive)}
				<div
					class="{selClass('definitions')} {isHidden('definitions') ? 'opacity-30' : ''}"
					style="order:{ord('definitions')};{elStyle('definitions')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('definitions', e)}
					onkeydown={onkey('definitions')}
				>
					{#if collapseDict}
						<details class="text-sm text-neutral-700">
							<summary class="cursor-pointer text-xs text-neutral-400">Dictionary</summary>
							{ex.definition}
						</details>
					{:else}
						<div class="text-sm text-neutral-700">{ex.definition}</div>
					{/if}
					{#if interactive && selectedElement === 'definitions'}<div class="mt-0.5 text-center font-mono text-[9px] text-blue-500">Definitions</div>{/if}
				</div>

			{:else if item === 'Breakdown' && (!isHidden('breakdown') || interactive)}
				<div
					class="flex flex-wrap justify-center gap-2 {selClass('breakdown')} {isHidden('breakdown') ? 'opacity-30' : ''}"
					style="order:{ord('breakdown')};{elStyle('breakdown')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('breakdown', e)}
					onkeydown={onkey('breakdown')}
				>
					{#each ex.breakdown as b (b.character)}
						<div class="flex flex-col items-center rounded-lg border border-neutral-200 px-2.5 py-1.5">
							<span class="text-lg leading-none">{b.character}</span>
							<span class="text-[10px] text-neutral-500">{b.pinyin}</span>
							<span class="text-[10px] text-neutral-500">{b.definition}</span>
						</div>
					{/each}
					{#if interactive && selectedElement === 'breakdown'}<span class={SEL_BADGE}>Breakdown</span>{/if}
				</div>

			{:else if item === 'Radical' && (!isHidden('radical') || interactive)}
				<div
					class="flex flex-wrap justify-center gap-1.5 {selClass('radical')} {isHidden('radical') ? 'opacity-30' : ''}"
					style="order:{ord('radical')};{elStyle('radical')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('radical', e)}
					onkeydown={onkey('radical')}
				>
					{#each ex.radical as r (r.character)}
						<span class="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500">
							<span class="font-semibold text-neutral-800">{r.character}</span>{r.radical}
						</span>
					{/each}
					{#if interactive && selectedElement === 'radical'}<span class={SEL_BADGE}>Radical</span>{/if}
				</div>

			{:else if item === 'HskLevel' && (!isHidden('hskLevel') || interactive)}
				<div
					class="{selClass('hskLevel')} {isHidden('hskLevel') ? 'opacity-30' : ''}"
					style="order:{ord('hskLevel')};{elStyle('hskLevel')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('hskLevel', e)}
					onkeydown={onkey('hskLevel')}
				>
					<span class="inline-block rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-500">{ex.hsk}</span>
					{#if interactive && selectedElement === 'hskLevel'}<span class={SEL_BADGE}>HSK Level</span>{/if}
				</div>

			{:else if item === 'Frequency' && (!isHidden('frequency') || interactive)}
				<div
					class="{selClass('frequency')} {isHidden('frequency') ? 'opacity-30' : ''}"
					style="order:{ord('frequency')};{elStyle('frequency')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('frequency', e)}
					onkeydown={onkey('frequency')}
				>
					<span class="inline-block rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-500">{ex.frequency}</span>
					{#if interactive && selectedElement === 'frequency'}<span class={SEL_BADGE}>Frequency</span>{/if}
				</div>

			{:else if item === 'Audio' && (!isHidden('audio') || interactive)}
				<div
					class="mt-1 inline-flex items-center gap-1 text-neutral-400 {selClass('audio')} {isHidden('audio') ? 'opacity-30' : ''}"
					style="order:{ord('audio')};{elStyle('audio')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('audio', e)}
					onkeydown={onkey('audio')}
				>
					<Volume2 size={16} /><span class="text-xs">audio</span>
					{#if interactive && selectedElement === 'audio'}<span class={SEL_BADGE}>Audio</span>{/if}
				</div>
			{/if}

		{/each}

		{#if interactive && items.length === 0}
			<p class="text-xs text-neutral-300" style="order:999">No fields — add fields from the table.</p>
		{/if}
	</div>
</div>
