<!--
  The live preview beside the Card style step: the real compiled card (the same
  `renderCardHtml` the export preview and the .apkg use) for the reader's own
  words, front and back, paged with ‹ ›. Falls back to the sample mock only when
  there are no words yet.
-->
<script lang="ts">
	import CardPreview from '$lib/components/CardPreview.svelte';
	import { getSmartSentences, renderCardHtml } from '$lib/deck';
	import type { TemplateOpts, ExampleSentence, CardElementStyles, Word } from '$lib/deck';
	import type { CardGroup, TabContent } from '$lib/deckTemplate';
	import type { TonePalette } from '$lib/tonePresets';
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
		groups
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
	} = $props();

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

	function doc(side: 'front' | 'back'): string {
		if (!word) return '';
		try {
			return renderCardHtml({
				side,
				tab: tabName,
				word,
				fields,
				order,
				tabContent,
				template,
				includeAudio,
				examples
			});
		} catch {
			return '';
		}
	}
	const frontDoc = $derived(doc('front'));
	const backDoc = $derived(doc('back'));

	/** Size the frame to its card, and keep following it (the writer and
	 *  folding sections change the height after load). */
	function autoHeight(frame: HTMLIFrameElement) {
		let ro: ResizeObserver | null = null;
		const fit = () => {
			// The body, not the document: a document is never shorter than its
			// frame, so measuring it would only ever let the frame grow.
			const b = frame.contentDocument?.body;
			if (!b) return;
			const h = Math.ceil(b.getBoundingClientRect().height);
			if (h) frame.style.height = `${Math.min(h + 16, 1400)}px`;
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
		'grid size-8 place-items-center rounded-full bg-sunk text-muted transition hover:text-ink disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-3 focus-visible:outline-sky';
</script>

<div class="mb-2 flex min-h-8 items-center justify-between gap-2">
	<p class="m-0 text-sm font-semibold text-muted">Preview{tabName !== 'Card 1' ? ` · ${tabName}` : ''}</p>
	{#if words.length > 1}
		<div class="flex items-center gap-1.5">
			<button type="button" class={navBtn} aria-label="Previous word" disabled={safeIndex === 0} onclick={() => (index = safeIndex - 1)}
				><ChevronLeft class="size-4" /></button
			>
			<span class="min-w-14 text-center text-[13px] text-muted tabular-nums">{safeIndex + 1} / {words.length}</span>
			<button
				type="button"
				class={navBtn}
				aria-label="Next word"
				disabled={safeIndex >= words.length - 1}
				onclick={() => (index = safeIndex + 1)}><ChevronRight class="size-4" /></button
			>
		</div>
	{/if}
</div>

{#if word}
	{#each [['Front', frontDoc], ['Back', backDoc]] as [label, html] (label)}
		<figure class="m-0 overflow-hidden rounded-panel bg-white ring-1 ring-line">
			<figcaption class="border-b border-line bg-surface px-4 py-2 text-[13px] font-semibold text-muted">{label}</figcaption>
			<iframe
				use:autoHeight
				title="{label} of the card for {word.Simplified}"
				sandbox="allow-scripts allow-same-origin"
				class="block h-40 w-full border-0 bg-white"
				srcdoc={html}
			></iframe>
		</figure>
	{/each}
{:else}
	{#each [['Front', 'front', frontItems], ['Back', 'back', backItems]] as [label, side, items] (label)}
		<CardPreview
			label={label as string}
			side={side as 'front' | 'back'}
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
{/if}
