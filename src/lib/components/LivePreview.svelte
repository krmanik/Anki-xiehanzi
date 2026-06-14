<script lang="ts">
	import CardPreview from '$lib/components/CardPreview.svelte';
	import type { TemplateOpts, ExampleSentence, CardElementStyles } from '$lib/deck';
	import type { CardGroup } from '$lib/deckTemplate';
	import type { TonePalette } from '$lib/tonePresets';

	let {
		tabName,
		template,
		palette,
		order,
		frontItems,
		backItems,
		elementStyles,
		groups,
		exampleSentences
	}: {
		tabName: string;
		template: TemplateOpts;
		palette: TonePalette;
		order: string[];
		frontItems: string[];
		backItems: string[];
		elementStyles: CardElementStyles;
		groups: CardGroup[];
		exampleSentences: ExampleSentence[];
	} = $props();
</script>

<p class="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">Live preview — {tabName}</p>
<CardPreview
	label="Front"
	side="front"
	items={frontItems}
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
	{exampleSentences}
	exampleOptions={template.exampleOptions}
/>
<CardPreview
	label="Back"
	side="back"
	items={backItems}
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
	{exampleSentences}
	exampleOptions={template.exampleOptions}
/>
