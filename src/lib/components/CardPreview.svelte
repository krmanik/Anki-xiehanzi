<script lang="ts">
	import { colorizeHanzi, toneOfPinyin } from '$lib/tone';
	import { elementOrder, groupOrder, bodyOrderFromLayout, withMetaCluster, META_CLUSTER_ID, FIELD_TO_ELEMENT, DEFAULT_EXAMPLE_OPTIONS, type CardElementId, type CardElementStyles, type CardGroup, type ElementStyle, type ExampleOptions } from '$lib/deckTemplate';
	import { resolveTheme, mergeElementStyles } from '$lib/cardThemes';
	import { hskLevelLabel, frequencyBand } from '$lib/dict/meta';
	import { STANDARD_TONES, type TonePalette, type ToneKey } from '$lib/tonePresets';
	import type { Word, ExampleSentence } from '$lib/deck';
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
		colorPinyin = false,
		font = 'default',
		collapseDict = false,
		commonPinyinOnly = false,
		elementStyles = {} as CardElementStyles,
		groups = [] as CardGroup[],
		order = [] as string[],
		toneColors = null,
		cardTheme = '',
		cardThemeMode = 'auto' as 'auto' | 'light' | 'dark',
		word = null,
		exampleSentences = null,
		exampleOptions = null,
		interactive = false,
		selectedElement = $bindable<CardElementId | null>(null),
		selectedGroup = $bindable<string | null>(null)
	}: {
		label: string;
		items: string[];
		side?: 'front' | 'back';
		colorize?: boolean;
		colorPinyin?: boolean;
		font?: string;
		collapseDict?: boolean;
		commonPinyinOnly?: boolean;
		elementStyles?: CardElementStyles;
		groups?: CardGroup[];
		order?: string[];
		toneColors?: TonePalette | null;
		cardTheme?: string;
		cardThemeMode?: 'auto' | 'light' | 'dark';
		/** When set, the preview renders this real word instead of the example. */
		word?: Word | null;
		/** Real example sentences for the previewed word (else a sample is shown). */
		exampleSentences?: ExampleSentence[] | null;
		exampleOptions?: ExampleOptions | null;
		interactive?: boolean;
		selectedElement?: CardElementId | null;
		selectedGroup?: string | null;
	} = $props();

	// Detect OS dark preference for auto mode.
	let systemDark = $state(false);
	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		systemDark = mq.matches;
		const handler = (e: MediaQueryListEvent) => { systemDark = e.matches; };
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});

	// Theme: merge theme elementStyles (base) under card-level overrides.
	const activeTheme = $derived(cardTheme ? resolveTheme(cardTheme, cardThemeMode, systemDark) : undefined);
	const effectiveES = $derived(
		activeTheme ? mergeElementStyles(activeTheme.elementStyles, elementStyles) : elementStyles
	);
	const themeCssVars = $derived(
		activeTheme
			? Object.entries(activeTheme.cssVars)
					.map(([k, v]) => `${k}:${v}`)
					.join(';')
			: ''
	);

	// Inline tone color for a preview hanzi span (honours the chosen palette).
	function toneStyle(tone: number): string {
		return colorize && toneColors ? `color:${toneColors[String(tone) as ToneKey]}` : '';
	}

	// Palette color for a tone (1-5), for inline-colored example sentences.
	function paletteColor(tone: number): string {
		return (toneColors ?? STANDARD_TONES)[String(tone) as ToneKey];
	}
	const CJK_RE = /[㐀-䶿一-鿿豈-﫿]/;
	// Inline-colored hanzi HTML for a sentence (best-effort syllable→char align).
	function exHanziHtml(sentence: string, py: string): string {
		const on = colorize && (exOpts?.colorizeHanzi ?? true);
		const sylls = (py ?? '').split(/\s+/).filter((s) => /[a-zü]/i.test(s.normalize('NFD').replace(/[̀-ͯ]/g, '')));
		let si = 0;
		let html = '';
		for (const ch of sentence ?? '') {
			if (CJK_RE.test(ch)) {
				const t = si < sylls.length ? toneOfPinyin(sylls[si]) : 5;
				si++;
				html += on ? `<span style="color:${paletteColor(t)}">${ch}</span>` : ch;
			} else html += ch;
		}
		return html;
	}
	// Inline tone-colored pinyin for the main Pinyin field.
	function pinyinHtml(py: string): string {
		if (!colorPinyin || !toneColors) return py;
		return (py ?? '')
			.split(/(\s+|,)/)
			.map((p) => {
				if (p === '' || p === ',' || /^\s+$/.test(p)) return p;
				const hasLetter = /[a-zü]/i.test(p.normalize('NFD').replace(/[̀-ͯ]/g, ''));
				if (!hasLetter) return p;
				return `<span style="color:${paletteColor(toneOfPinyin(p))}">${p}</span>`;
			})
			.join('');
	}
	// Inline-colored pinyin HTML for a sentence.
	function exPinyinHtml(py: string): string {
		const on = colorize && (exOpts?.colorizePinyin ?? true);
		return (py ?? '')
			.split(/(\s+|,)/)
			.map((p) => {
				if (p === '' || p === ',' || /^\s+$/.test(p)) return p;
				const hasLetter = /[a-zü]/i.test(p.normalize('NFD').replace(/[̀-ͯ]/g, ''));
				if (!hasLetter) return p;
				return on ? `<span style="color:${paletteColor(toneOfPinyin(p))}">${p}</span>` : p;
			})
			.join('');
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
		hsk: 'HSK 1', frequency: 'Top 500',
		examples: ['中国是一个大国。', '我想去中国旅行。']
	};

	// Most-common reading index (longest definition); used by commonPinyinOnly.
	function pickReadingIdx(w: Word): number {
		if (!w.readings || w.readings.length <= 1) return 0;
		let best = 0;
		let bestLen = -1;
		w.readings.forEach((r, i) => {
			const l = (r.definition ?? '').trim().length;
			if (l > bestLen) { bestLen = l; best = i; }
		});
		return best;
	}

	// Display source: a real Word when provided, otherwise the example. When
	// commonPinyinOnly is on, collapse a multi-reading char to its common reading.
	const src = $derived.by(() => {
		if (!word) return ex;
		const r =
			commonPinyinOnly && word.readings && word.readings.length > 1
				? word.readings[pickReadingIdx(word)]
				: null;
		return {
					Simplified: word.Simplified,
					Traditional: word.Traditional || word.Simplified,
					syllable: r?.syllable ?? word.readings?.[0]?.syllable ?? word.Syllable ?? '',
					pinyin: r?.pinyinPlain ?? word.Pinyin,
					zhuyin: r?.zhuyin ?? word.Zhuyin,
					simple: word.SimpleMeaning,
					// Definitions block is never reduced by commonPinyinOnly — keep all senses.
					definition: word.commonMeaning || word.readings?.[0]?.definition || '',
					breakdown: (word.breakdown ?? []).map((b) => ({
						character: b.character,
						pinyin: b.pinyin,
						definition: b.definition
					})),
					radical: (word.breakdown ?? [])
						.filter((b) => b.radical)
						.map((b) => ({ character: b.character, radical: b.radical })),
					hsk: hskLevelLabel(word.level) ?? '',
					frequency: frequencyBand(word.rank) ?? '',
					// Example sentences are fetched at export, not on the Word — show the
					// sample so the layout still previews.
					examples: ex.examples
		};
	});

	// Example sentences: real ones when provided, else a sample (designer mode).
	const sampleExamples: ExampleSentence[] = [
		{
			simplified: '中国是一个大国。',
			traditional: '中國是一個大國。',
			pinyin: 'zhōng guó shì yī gè dà guó 。',
			translation: 'China is a big country.'
		}
	];
	const exList = $derived(
		exampleSentences && exampleSentences.length
			? exampleSentences
			: word
				? []
				: sampleExamples
	);
	const exOpts = $derived(exampleOptions ?? DEFAULT_EXAMPLE_OPTIONS);

	const simp = $derived(colorizeHanzi(src.Simplified, src.syllable));
	const trad = $derived(colorizeHanzi(src.Traditional, src.syllable));
	const hasWriting = $derived(items.includes(WRITING));
	const globalFont = $derived(fontStacks[font] || '');

	// Control buttons + separator are selectable per side (tokens in `items`); the
	// writing card always shows the quiz toolbar. Mirrors the exported templates.
	const showControls = $derived(items.includes('ControlButtons') || hasWriting);
	const showSep = $derived(items.includes('Separator') || hasWriting);

	// The play button is part of the toolbar only when Audio is selected on this side.
	const audioSel = $derived(items.includes('Audio'));

	// One merged control group. When the writing component is present it shows the
	// full writer toolbar; otherwise the basic set (menu, [audio], more).
	const controlIcons = $derived(
		hasWriting
			? [Menu, Volume2, PenLine, RotateCcw, ChevronRight, EllipsisVertical]
			: audioSel
				? [Menu, Volume2, EllipsisVertical]
				: [Menu, EllipsisVertical]
	);

	function hanziFont(id: 'simplified' | 'traditional'): string {
		const ov = effectiveES[id]?.fontFamily;
		if (ov && ov !== 'default') return fontStacks[ov] ?? ov;
		return globalFont;
	}

	// Flex order follows the layout sequence (so table/chrome reorder takes effect).
	// Falls back to the shown items when no explicit layout order is supplied.
	const bodyOrder = $derived<CardElementId[]>(
		order.length
			? bodyOrderFromLayout(order)
			: ['controlButtons', 'hr', ...(items.map((i) => FIELD_TO_ELEMENT[i]).filter(Boolean) as CardElementId[])]
	);

	// Flex `order` for a body block — drives reorder + the move up/down positioning.
	function ord(id: CardElementId): number {
		return elementOrder(effectiveES, id, bodyOrder);
	}

	function styleToInline(s: ElementStyle | undefined, opts: { hanzi?: boolean } = {}): string {
		if (!s) return '';
		const r: string[] = [];
		if (s.fontSize)        r.push(`font-size:${s.fontSize}`);
		if (!opts.hanzi && s.fontFamily && s.fontFamily !== 'default')
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
		if (s.backgroundImage) r.push(`background-image:${s.backgroundImage}`);
		if (s.padding)         r.push(`padding:${s.padding}`);
		if (s.borderRadius)    r.push(`border-radius:${s.borderRadius}`);
		if (s.letterSpacing)   r.push(`letter-spacing:${s.letterSpacing}`);
		if (s.lineHeight)      r.push(`line-height:${s.lineHeight}`);
		if (s.borderColor)     r.push(`border-color:${s.borderColor}`);
		if (s.borderWidth)     r.push(`border-width:${s.borderWidth}`);
		if (s.borderStyle)     r.push(`border-style:${s.borderStyle}`);
		if (s.boxShadow)       r.push(`box-shadow:${s.boxShadow}`);
		return r.join(';');
	}

	function elStyle(id: CardElementId): string {
		return styleToInline(effectiveES[id], { hanzi: id === 'simplified' || id === 'traditional' });
	}

	function isHidden(id: CardElementId): boolean {
		return effectiveES[id]?.visible === false;
	}

	// ── Groups (designer) ────────────────────────────────────────────────────
	// Item field name (e.g. 'Pinyin') → body element id (e.g. 'pinyin').
	const elOf = (item: string): CardElementId | undefined => FIELD_TO_ELEMENT[item];

	// User groups plus the synthetic POS/HSK/frequency meta cluster, so the live
	// preview matches the exported card's one-row meta layout.
	const presentEls = $derived(items.map((i) => FIELD_TO_ELEMENT[i]).filter(Boolean) as CardElementId[]);
	const effGroups = $derived(withMetaCluster(groups, presentEls));

	// Ordered render slots: standalone items + group containers (in body order).
	const slots = $derived.by(() => {
		const gOf = new Map<CardElementId, string>();
		for (const g of effGroups) for (const m of g.members) gOf.set(m, g.id);
		const byId = new Map(effGroups.map((g) => [g.id, g]));
		const memberItems = new Map<string, string[]>();
		for (const item of items) {
			const el = elOf(item);
			const gid = el ? gOf.get(el) : undefined;
			if (gid) {
				if (!memberItems.has(gid)) memberItems.set(gid, []);
				memberItems.get(gid)!.push(item);
			}
		}
		const out: Array<{ kind: 'single'; item: string } | { kind: 'group'; group: CardGroup; items: string[] }> = [];
		const done = new Set<string>();
		for (const item of items) {
			const el = elOf(item);
			const gid = el ? gOf.get(el) : undefined;
			if (gid && byId.has(gid)) {
				if (!done.has(gid)) {
					done.add(gid);
					out.push({ kind: 'group', group: byId.get(gid)!, items: memberItems.get(gid)! });
				}
			} else {
				out.push({ kind: 'single', item });
			}
		}
		return out;
	});

	function groupInline(g: CardGroup): string {
		const r = [`order:${groupOrder(effectiveES, g, bodyOrder)}`];
		if (g.display === 'flex') {
			r.push('display:flex', `flex-direction:${g.direction}`, 'gap:8px', 'flex-wrap:wrap');
			r.push(g.direction === 'row' ? 'align-items:center;justify-content:center' : 'align-items:center');
		} else {
			r.push('display:block');
		}
		const s = styleToInline(g.style);
		return s ? r.join(';') + ';' + s : r.join(';');
	}

	function selectGroup(id: string, e: Event) {
		if (!interactive) return;
		e.stopPropagation();
		selectedGroup = id;
		selectedElement = null;
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
		selectedGroup = null;
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
			const firstSyll = (src.pinyin ?? '').split(/\s+/)[0] ?? '';
			writer = HanziWriter.create(writerEl, src.Simplified[0], {
				width: 80, height: 80, padding: 4, showOutline: true,
				strokeColor: colorize ? paletteColor(toneOfPinyin(firstSyll)) : '#333'
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
	style="--surface2:#ffffff;--surface3:#f5f5f5;--surface4:#e5e5e5;--text1:#262626;--text2:#737373;--accent:#3a6df0;--body-bg:#f5f5f5;--btn-radius:4px;--btn-border:none;--container-radius:8px;--chip-radius:9999px;background-color:{effectiveES.card?.backgroundColor ?? '#ffffff'};{effectiveES.card?.backgroundImage ? 'background-image:' + effectiveES.card.backgroundImage + ';' : ''}text-align:{effectiveES.card?.textAlign ?? 'center'};{elStyle('card')}{themeCssVars ? ';' + themeCssVars : ''}"
	role="button"
	tabindex="0"
	onclick={(e) => select('card', e)}
	onkeydown={onkey('card')}
>
	<div class="px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] border-b" style="border-color:var(--surface4);background:var(--surface3);color:var(--text2)">
		{label}
		{#if interactive && selectedElement === 'card'}<span class={SEL_BADGE}>Card</span>{/if}
	</div>

	<div class="flex min-h-[150px] flex-col items-center gap-2 p-4">

		{#if showControls && (!isHidden('controlButtons') || interactive)}
			<div
				class="flex w-full items-center justify-center gap-1.5 rounded py-1 {selClass('controlButtons')} {isHidden('controlButtons') ? 'opacity-30' : ''}"
				style="order:{ord('controlButtons')};{elStyle('controlButtons')}"
				role="button"
				tabindex="0"
				onclick={(e) => select('controlButtons', e)}
				onkeydown={onkey('controlButtons')}
			>
				{#each controlIcons as Icon, i (i)}
					{@const isNext = Icon === ChevronRight}
					<span class="flex h-6 w-6 items-center justify-center" style="border-radius:var(--btn-radius,4px);border:var(--btn-border,none);{isNext ? 'background:var(--btn-next-bg,var(--surface3));color:var(--btn-next-fg,var(--text2))' : 'background:var(--btn-bg,var(--surface3));color:var(--btn-fg,var(--text2))'}"><Icon size={13} /></span>
				{/each}
				{#if interactive && selectedElement === 'controlButtons'}<span class={SEL_BADGE}>Controls</span>{/if}
			</div>
		{/if}

		{#if showSep && (!isHidden('hr') || interactive)}
			<div
				class="w-full rounded py-0.5 {selClass('hr')} {isHidden('hr') ? 'opacity-30' : ''}"
				style="order:{ord('hr')}"
				role="button"
				tabindex="0"
				onclick={(e) => select('hr', e)}
				onkeydown={onkey('hr')}
			>
				<hr class="w-full border-t" style="border-color:var(--surface4);{elStyle('hr')}" />
				{#if interactive && selectedElement === 'hr'}<div class="mt-0.5 text-center font-mono text-[9px] text-blue-500">separator</div>{/if}
			</div>
		{/if}

		{#if items.length === 0 && !interactive}
			<span class="text-sm text-neutral-300" style="order:999">Nothing selected</span>
		{/if}

		{#snippet itemBody(item: string)}

			{#if item === 'Simplified' && (!isHidden('simplified') || interactive)}
				<div
					class="font-semibold leading-none {selClass('simplified')} {isHidden('simplified') ? 'opacity-30' : ''}"
					style="order:{ord('simplified')};font-size:{effectiveES.simplified?.fontSize ?? '2.5em'};font-family:{hanziFont('simplified') || 'inherit'};{elStyle('simplified')}"
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
					style="order:{ord('traditional')};font-size:{effectiveES.traditional?.fontSize ?? '1.5em'};font-family:{hanziFont('traditional') || 'inherit'};{elStyle('traditional')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('traditional', e)}
					onkeydown={onkey('traditional')}
				>
					<span style="color:var(--surface4)">〔</span>{#each trad as c}<span class={colorize ? `tone${c.tone}` : ''} style={toneStyle(c.tone)}>{c.ch}</span>{/each}<span style="color:var(--surface4)">〕</span>
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
					{@html pinyinHtml(src.pinyin)}
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
					{src.zhuyin}
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
					<span class="px-2 py-0.5 text-[11px]" style="border-radius:var(--chip-radius,9999px);background:var(--chip-bg,var(--text1));color:var(--chip-fg,var(--surface2));text-transform:var(--pos-chip-transform,none);border-bottom:var(--pos-dominant-underline,0 solid transparent)">Place Name</span>
					{#if interactive && selectedElement === 'partOfSpeech'}<span class={SEL_BADGE}>Part of Speech</span>{/if}
				</div>

			{:else if item === 'SimpleMeaning' && (!isHidden('simpleMeaning') || interactive)}
				<div
					class="w-full overflow-hidden {selClass('simpleMeaning')} {isHidden('simpleMeaning') ? 'opacity-30' : ''}"
					style="border-radius:var(--container-radius,8px);border:var(--panel-border,1.5px solid var(--surface4));background:var(--panel-bg,transparent);order:{ord('simpleMeaning')};{elStyle('simpleMeaning')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('simpleMeaning', e)}
					onkeydown={onkey('simpleMeaning')}
				>
					<div class="px-2.5 py-1 text-left text-[11px]" style="background:var(--panel-title-bg,var(--surface3));color:var(--section-title-color,var(--text2));text-transform:var(--section-title-transform,none);letter-spacing:var(--section-title-spacing,normal);font-weight:var(--section-title-weight,600);border-bottom:var(--section-title-border,none)">Common Meaning</div>
					<div class="px-2.5 py-2 text-[15px] font-semibold" style="color:var(--text1)">{src.simple}</div>
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
						<details class="text-sm" style="color:var(--text1)">
							<summary class="cursor-pointer text-xs" style="color:var(--text2)">Dictionary</summary>
							{src.definition}
						</details>
					{:else}
						<div class="text-sm" style="color:var(--text1)">{src.definition}</div>
					{/if}
					{#if interactive && selectedElement === 'definitions'}<div class="mt-0.5 text-center font-mono text-[9px] text-blue-500">Definitions</div>{/if}
				</div>

			{:else if item === 'Breakdown' && (!isHidden('breakdown') || interactive)}
				<div
					class="w-full overflow-hidden {selClass('breakdown')} {isHidden('breakdown') ? 'opacity-30' : ''}"
					style="border-radius:var(--container-radius,8px);border:var(--panel-border,1.5px solid var(--surface4));background:var(--panel-bg,transparent);order:{ord('breakdown')};{elStyle('breakdown')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('breakdown', e)}
					onkeydown={onkey('breakdown')}
				>
					<div class="px-2.5 py-1 text-left text-[11px]" style="background:var(--panel-title-bg,var(--surface3));color:var(--section-title-color,var(--text2));text-transform:var(--section-title-transform,none);letter-spacing:var(--section-title-spacing,normal);font-weight:var(--section-title-weight,600);border-bottom:var(--section-title-border,none)">Character Breakdown</div>
					<div class="flex flex-wrap justify-center gap-2 p-2.5">
						{#each src.breakdown as b (b.character)}
							<div class="flex min-w-[3.5rem] flex-col items-center gap-0.5 px-3 py-2" style="border-radius:var(--container-radius,8px);border:var(--tile-border,1px solid var(--surface4));background:var(--tile-bg,var(--surface3))">
								<span class="text-xl font-semibold leading-none" style="color:var(--text1)">{b.character}</span>
								<span class="text-[10px]" style="color:var(--text2)">{b.pinyin}</span>
								<span class="text-[10px] leading-tight" style="color:var(--text2)">{b.definition}</span>
							</div>
						{/each}
					</div>
					{#if interactive && selectedElement === 'breakdown'}<span class={SEL_BADGE}>Breakdown</span>{/if}
				</div>

			{:else if item === 'Radical' && (!isHidden('radical') || interactive)}
				<div
					class="w-full overflow-hidden {selClass('radical')} {isHidden('radical') ? 'opacity-30' : ''}"
					style="border-radius:var(--container-radius,8px);border:var(--panel-border,1.5px solid var(--surface4));background:var(--panel-bg,transparent);order:{ord('radical')};{elStyle('radical')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('radical', e)}
					onkeydown={onkey('radical')}
				>
					<div class="px-2.5 py-1 text-left text-[11px]" style="background:var(--panel-title-bg,var(--surface3));color:var(--section-title-color,var(--text2));text-transform:var(--section-title-transform,none);letter-spacing:var(--section-title-spacing,normal);font-weight:var(--section-title-weight,600);border-bottom:var(--section-title-border,none)">Radical</div>
					<div class="flex flex-wrap justify-center gap-1.5 p-2.5">
						{#each src.radical as r (r.character)}
							<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs" style="border-radius:var(--radical-chip-radius,9999px);border:var(--radical-chip-border,1px solid var(--surface4));background:var(--radical-chip-bg,var(--surface3));color:var(--text2)">
								<span class="font-bold" style="color:var(--text1)">{r.character}</span><span class="border-l pl-1.5 text-sm" style="border-color:var(--surface4);color:var(--radical-rad-color,inherit)">{r.radical}</span>
							</span>
						{/each}
					</div>
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
					<span class="inline-block border px-2.5 py-0.5 text-[11px] font-semibold" style="border-radius:var(--chip-radius,9999px);border-color:var(--hsk-border,color-mix(in srgb,var(--accent) 35%,transparent));background:var(--hsk-bg,color-mix(in srgb,var(--accent) 14%,transparent));color:var(--hsk-fg,var(--accent))">{src.hsk}</span>
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
					<span class="inline-block border px-2.5 py-0.5 text-[11px] font-semibold" style="border-radius:var(--chip-radius,9999px);border-color:var(--freq-border,var(--surface4));background:var(--freq-bg,var(--surface3));color:var(--freq-fg,var(--text2))">{src.frequency}</span>
					{#if interactive && selectedElement === 'frequency'}<span class={SEL_BADGE}>Frequency</span>{/if}
				</div>

			{:else if item === 'Examples' && (!isHidden('examples') || interactive)}
				<div
					class="w-full overflow-hidden text-left {selClass('examples')} {isHidden('examples') ? 'opacity-30' : ''}"
					style="border-radius:var(--container-radius,8px);border:var(--panel-border,1.5px solid var(--surface4));background:var(--panel-bg,transparent);order:{ord('examples')};{elStyle('examples')}"
					role="button"
					tabindex="0"
					onclick={(e) => select('examples', e)}
					onkeydown={onkey('examples')}
				>
					<div class="flex items-center justify-between px-2.5 py-1 text-[11px]" style="background:var(--panel-title-bg,var(--surface3));color:var(--section-title-color,var(--text2));text-transform:var(--section-title-transform,none);letter-spacing:var(--section-title-spacing,normal);font-weight:var(--section-title-weight,600);border-bottom:var(--section-title-border,none)">
						<span>Examples</span><span style="color:var(--text2)">▾</span>
					</div>
					{#each exList as s (s.simplified)}
						<div class="border-b py-1.5 last:border-0" style="border-color:var(--surface4);background:var(--example-item-bg,transparent);border-left:var(--example-item-left,none);border-radius:var(--container-radius,0px);padding:var(--example-item-pad,6px 4px)">
							{#if exOpts.showTraditional && (!isHidden('exampleTraditional') || interactive)}
								<div class="text-sm {selClass('exampleTraditional')} {isHidden('exampleTraditional') ? 'opacity-30' : ''}"
									style="color:var(--text1);{elStyle('exampleTraditional')}" role="button" tabindex="0"
									onclick={(e) => select('exampleTraditional', e)} onkeydown={onkey('exampleTraditional')}>{@html exHanziHtml(s.traditional, s.pinyin)}</div>
							{/if}
							{#if exOpts.showSimplified && (!isHidden('exampleSimplified') || interactive)}
								<div class="text-sm {selClass('exampleSimplified')} {isHidden('exampleSimplified') ? 'opacity-30' : ''}"
									style="color:var(--text1);{elStyle('exampleSimplified')}" role="button" tabindex="0"
									onclick={(e) => select('exampleSimplified', e)} onkeydown={onkey('exampleSimplified')}>{@html exHanziHtml(s.simplified, s.pinyin)}</div>
							{/if}
							{#if exOpts.showPinyin && (!isHidden('examplePinyin') || interactive)}
								<div class="text-xs {selClass('examplePinyin')} {isHidden('examplePinyin') ? 'opacity-30' : ''}"
									style="color:var(--text2);{elStyle('examplePinyin')}" role="button" tabindex="0"
									onclick={(e) => select('examplePinyin', e)} onkeydown={onkey('examplePinyin')}>{@html exPinyinHtml(s.pinyin)}</div>
							{/if}
							{#if exOpts.showTranslation && (!isHidden('exampleTranslation') || interactive)}
								<div class="text-xs {selClass('exampleTranslation')} {isHidden('exampleTranslation') ? 'opacity-30' : ''}"
									style="color:var(--text2);{elStyle('exampleTranslation')}" role="button" tabindex="0"
									onclick={(e) => select('exampleTranslation', e)} onkeydown={onkey('exampleTranslation')}>{s.translation}</div>
							{/if}
						</div>
					{/each}
					{#if interactive && selectedElement === 'examples'}<span class={SEL_BADGE}>Examples</span>{/if}
				</div>
			{/if}

		{/snippet}

		{#each slots as slot (slot.kind === 'group' ? slot.group.id : slot.item)}
			{#if slot.kind === 'single'}
				{@render itemBody(slot.item)}
			{:else if slot.group.id === META_CLUSTER_ID}
				<!-- Synthetic meta cluster: presentational only, not user-selectable. -->
				<div class="box-border" style={groupInline(slot.group)}>
					{#each slot.items as it (it)}
						{@render itemBody(it)}
					{/each}
				</div>
			{:else}
				<div
					class="relative box-border {interactive ? 'cursor-pointer rounded ring-2 transition-all ' + (selectedGroup === slot.group.id ? 'ring-violet-500 ring-offset-1' : 'ring-violet-200 hover:ring-violet-400 hover:ring-offset-1') : ''}"
					style={groupInline(slot.group)}
					role="button"
					tabindex="0"
					onclick={(e) => selectGroup(slot.group.id, e)}
					onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectGroup(slot.group.id, e)}
				>
					{#each slot.items as it (it)}
						{@render itemBody(it)}
					{/each}
					{#if interactive && selectedGroup === slot.group.id}<span class="absolute -top-2 left-1 rounded bg-violet-500 px-1.5 py-0.5 text-[9px] text-white">Group</span>{/if}
				</div>
			{/if}
		{/each}

		{#if interactive && items.length === 0}
			<p class="text-xs text-neutral-300" style="order:999">No fields — add fields from the table.</p>
		{/if}
	</div>
</div>
