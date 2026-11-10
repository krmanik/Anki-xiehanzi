<!--
  The live preview beside the Card style step: the real compiled card (the same
  `renderCardHtml` the export preview and the .apkg use) for the reader's own
  words. One frame, flipped between Front and Back like a card in Anki, paged
  word by word with ‹ ›. Falls back to the sample mock only when there are no
  words yet.

  Layout notes:
  - A real border, not a ring: the aside around it scrolls, and a scroller
    clips a ring (it is a box-shadow), which left only the rounded corners
    floating between two cards.
  - On wide screens the frame is capped to the viewport and scrolls inside,
    like a phone screen, so the side switch and pager never scroll away.
  - The card follows the site's theme (`night_mode`, the class Anki sets).
-->
<script lang="ts">
	import CardPreview from '$lib/components/CardPreview.svelte';
	import { getSmartSentences, renderCardHtml } from '$lib/deck';
	import type { TemplateOpts, ExampleSentence, CardElementStyles, Word } from '$lib/deck';
	import type { CardGroup, TabContent } from '$lib/deckTemplate';
	import type { TonePalette } from '$lib/tonePresets';
	import { currentTheme } from '$lib/theme.svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let {
		words,
		tabName,
		tabContent,
		fields,
		includeAudio,
		template,
		palette,
		order,
		frontItems,
		backItems,
		elementStyles,
		groups,
		side = $bindable('back')
	}: {
		words: Word[];
		tabName: string;
		tabContent: TabContent;
		fields: string[];
		includeAudio: boolean;
		template: TemplateOpts;
		palette: TonePalette;
		order: string[];
		frontItems: string[];
		backItems: string[];
		elementStyles: CardElementStyles;
		groups: CardGroup[];
		/** Which side is on show; bound to the Front | Back columns. */
		side?: Side;
	} = $props();

	type Side = 'front' | 'back';
	const SIDES: { id: Side; label: string }[] = [
		{ id: 'front', label: 'Front' },
		{ id: 'back', label: 'Back' }
	];

	let index = $state(0);
	const safeIndex = $derived(Math.min(index, Math.max(0, words.length - 1)));
	const word = $derived<Word | null>(words[safeIndex] ?? null);

	const examplesUsed = $derived.by(() => {
		const c = tabContent[tabName];
		return !!c && (c.front.includes('frontExamples') || c.back.includes('backExamples'));
	});

	// Real sentences for the word on show, re-fetched as it changes.
	let examples = $state<ExampleSentence[]>([]);
	$effect(() => {
		const w = word?.Simplified ?? '中国';
		const o = template.exampleOptions;
		if (!examplesUsed) {
			examples = [];
			return;
		}
		let cancelled = false;
		getSmartSentences(w, { limit: o.count, minChars: o.minChars, maxChars: o.maxChars })
			.then((r) => {
				if (!cancelled) examples = r;
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	});

	const dark = $derived(currentTheme() === 'dark');

	function doc(s: Side): string {
		if (!word) return '';
		try {
			const html = renderCardHtml({
				side: s,
				tab: tabName,
				word,
				fields,
				order,
				tabContent,
				template,
				includeAudio,
				examples
			});
			return dark ? html.replace('<body class="card">', '<body class="card night_mode">') : html;
		} catch {
			return '';
		}
	}
	const html = $derived(doc(side));

	/** Size the frame to its card, and keep following it (the writer and
	 *  folding sections change the height after load). CSS caps it on wide
	 *  screens; past the cap the card scrolls inside the frame. */
	function autoHeight(frame: HTMLIFrameElement) {
		let ro: ResizeObserver | null = null;
		const fit = () => {
			// The body, not the document: a document is never shorter than its
			// frame, so measuring it would only ever let the frame grow.
			const b = frame.contentDocument?.body;
			if (!b) return;
			const h = Math.ceil(b.getBoundingClientRect().height);
			if (h) frame.style.height = `${Math.min(h + 8, 1400)}px`;
		};
		const onload = () => {
			ro?.disconnect();
			fit();
			const b = frame.contentDocument?.body;
			if (b && typeof ResizeObserver !== 'undefined') {
				ro = new ResizeObserver(fit);
				ro.observe(b);
			}
		};
		frame.addEventListener('load', onload);
		return {
			destroy() {
				frame.removeEventListener('load', onload);
				ro?.disconnect();
			}
		};
	}

	const navBtn =
		'grid size-9 place-items-center rounded-full text-muted transition hover:bg-sunk hover:text-ink disabled:opacity-35 disabled:pointer-events-none focus-visible:outline-3 focus-visible:outline-accent';
	const sideBtn = (on: boolean) =>
		`min-h-8 rounded-full px-3.5 text-[13.5px] font-semibold transition focus-visible:outline-3 focus-visible:outline-accent ${
			on ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
		}`;
</script>

<p class="m-0 mb-2 text-sm font-semibold text-muted">
	Preview{tabName !== 'Card 1' ? ` · ${tabName}` : ''}
</p>

{#if word}
	<div class="overflow-hidden rounded-tile bg-surface shadow-object">
		<div class="flex items-center justify-between gap-2 border-b border-line px-2.5 py-2">
			<div class="flex rounded-full bg-sunk p-0.5" role="group" aria-label="Card side">
				{#each SIDES as s (s.id)}
					<button type="button" class={sideBtn(side === s.id)} aria-pressed={side === s.id} onclick={() => (side = s.id)}>
						{s.label}
					</button>
				{/each}
			</div>
			{#if words.length > 1}
				<div class="flex items-center">
					<button
						type="button"
						class={navBtn}
						aria-label="Previous word"
						disabled={safeIndex === 0}
						onclick={() => (index = safeIndex - 1)}><ChevronLeft class="size-[18px]" /></button
					>
					<span class="min-w-14 text-center text-[13px] text-muted tabular-nums" aria-live="polite">
						<span class="sr-only">Word </span>{safeIndex + 1} / {words.length}
					</span>
					<button
						type="button"
						class={navBtn}
						aria-label="Next word"
						disabled={safeIndex >= words.length - 1}
						onclick={() => (index = safeIndex + 1)}><ChevronRight class="size-[18px]" /></button
					>
				</div>
			{/if}
		</div>
		<iframe
			use:autoHeight
			title="{side === 'front' ? 'Front' : 'Back'} of the card for {word.Simplified}"
			sandbox="allow-scripts allow-same-origin"
			class="block h-48 w-full border-0 lg:max-h-[calc(100vh-15rem)] {dark ? 'bg-[#252525]' : 'bg-white'}"
			srcdoc={html}
		></iframe>
	</div>
{:else}
	<div class="space-y-3">
		{#each [['Front', 'front', frontItems], ['Back', 'back', backItems]] as [label, s, items] (label)}
			<CardPreview
				label={label as string}
				side={s as 'front' | 'back'}
				items={items as string[]}
				colorize={!template.mono && template.colorHanzi}
				colorPinyin={!template.mono && template.colorPinyin}
				font={template.font}
				collapseDict={template.collapseDict}
				commonPinyinOnly={template.commonPinyinOnly}
				{elementStyles}
				{groups}
				{order}
				toneColors={palette}
				cardTheme={template.cardTheme}
				cardThemeMode={template.cardThemeMode}
				exampleSentences={examples}
				exampleOptions={template.exampleOptions}
			/>
		{/each}
	</div>
{/if}
