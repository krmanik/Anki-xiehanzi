<script lang="ts">
	import { onMount } from 'svelte';
	import { Checkbox, Input } from 'flowbite-svelte';
	import AppearancePanel from '$lib/components/AppearancePanel.svelte';
	import CardTypeEditor from '$lib/components/CardTypeEditor.svelte';
	import LivePreview from '$lib/components/LivePreview.svelte';
	import WordSourceInput from '$lib/components/WordSourceInput.svelte';
	import WordReviewTable from '$lib/components/WordReviewTable.svelte';
	import StepNav from '$lib/components/StepNav.svelte';
	import CardCustomizer from '$lib/components/CardCustomizer.svelte';
	import ExportPreview from '$lib/components/ExportPreview.svelte';
	import ExportSuccess from '$lib/components/ExportSuccess.svelte';
	import { popupHidden } from '$lib/share.svelte';
	import {
		CARD_STYLE_LS_KEY,
		CARD_TABS_LS_KEY,
		DEFAULT_TEMPLATE,
		type CardElementStyles,
		type TemplateOpts
	} from '$lib/deck';
	import { CONTROL_BUTTONS_TOKEN, SEPARATOR_TOKEN } from '$lib/deckTemplate';
	import { FIELDS, WRITING, DEFAULT_ORDER, newCard, fieldLabels } from '$lib/cardEditorModel';
	import { resolvePalette } from '$lib/tonePresets';
	import { posDisplay } from '$lib/dict/cedict';
	import {
		generateDeck,
		initJieba,
		loadDict,
		loadHskWordsDict,
		lookupWord,
		setupSql,
		getSmartSentences,
		type TabContent,
		type Word,
		type ExampleSentence
	} from '$lib/deck';

	let words = $state<Word[]>([]);
	let deckName = $state('Anki xiehanzi');
	// Ordered list of card items: note fields + the writing component, all
	// reorderable. `fields` (the apkg note fields) is derived from it.
	let order = $state<string[]>([...DEFAULT_ORDER]);
	// Layout tokens are positioning-only; note fields exclude the writing component
	// and the chrome tokens (control buttons / separator).
	let fields = $derived(order.filter((o) => o !== WRITING && o !== CONTROL_BUTTONS_TOKEN && o !== SEPARATOR_TOKEN));
	let includeAudio = $state(false);
	let template = $state<TemplateOpts>({ ...DEFAULT_TEMPLATE });
	let page = $state(1);
	let showCustomizer = $state(false);
	let showPreview = $state(false);
	let showSettingsPreview = $state(false);
	let settingsPreviewWords = $state<Word[]>([]);
	let loadingSettingsPreview = $state(false);
	let appearanceOpen = $state(true);
	let mobileTab = $state<'customize' | 'preview'>('customize');
	let hskWordsDict = $state<Set<string>>(new Set());

	let activeTab = $state(0);
	let tabs = $state<string[]>(['Card 1']);
	let tabContent = $state<TabContent>({
		'Card 1': newCard()
	});

	const prevNextButtonText = ['', 'Create Card Types', 'Input Chinese Characters'];

	// active card preview: ordered ids (fields + writing) selected on each side
	const frontItems = $derived(
		order.filter((o) => tabContent[tabs[activeTab]]?.front.includes(`front${o}`))
	);
	const backItems = $derived(
		order.filter((o) => tabContent[tabs[activeTab]]?.back.includes(`back${o}`))
	);
	// Per-card-type element styles for the active tab (drives the live previews).
	const activeStyles = $derived(tabContent[tabs[activeTab]]?.elementStyles ?? {});
	const activeGroups = $derived(tabContent[tabs[activeTab]]?.groups ?? []);
	// Resolved tone palette (preset or custom) for the live previews.
	const palette = $derived(resolvePalette(template.tonePreset, template.toneColors));

	// Example-sentence options + UI show only when a card type uses the field.
	const examplesUsed = $derived(
		tabs.some((t) => {
			const c = tabContent[t];
			return !!c && (c.front.includes('frontExamples') || c.back.includes('backExamples'));
		})
	);

	// Fetch real sentences for the live preview word (中国) when the field is used,
	// re-fetching when the length/count options change.
	let previewExamples = $state<ExampleSentence[]>([]);
	$effect(() => {
		const o = template.exampleOptions;
		const used = examplesUsed;
		const args = { limit: o.count, minChars: o.minChars, maxChars: o.maxChars };
		if (!used) {
			previewExamples = [];
			return;
		}
		let cancelled = false;
		getSmartSentences('中国', args)
			.then((r) => {
				if (!cancelled) previewExamples = r;
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	});

	// Sync Audio field with includeAudio checkbox (Audio sits before the writing component)
	$effect(() => {
		if (includeAudio && !order.includes(FIELDS.AUDIO)) {
			const wi = order.indexOf(WRITING);
			const next = [...order];
			next.splice(wi === -1 ? next.length : wi, 0, FIELDS.AUDIO);
			order = next;
		} else if (!includeAudio && order.includes(FIELDS.AUDIO)) {
			order = order.filter((o) => o !== FIELDS.AUDIO);
		}
	});

	// Persist the deck-wide template (tone palette + custom colors, font, etc.)
	// so choices — including a custom palette — survive a page refresh.
	let stylesRestored = $state(false);
	$effect(() => {
		JSON.stringify(template); // track deep changes
		if (!stylesRestored) return;
		try {
			localStorage.setItem(CARD_STYLE_LS_KEY, JSON.stringify(template));
		} catch (_) {/* ignore storage errors */}
	});

	// Persist per-card-type element styles whenever they change.
	$effect(() => {
		const map: Record<string, CardElementStyles> = {};
		for (const name of tabs) map[name] = tabContent[name]?.elementStyles ?? {};
		if (!stylesRestored) return; // don't overwrite storage before the restore pass
		try {
			localStorage.setItem(CARD_TABS_LS_KEY, JSON.stringify(map));
		} catch (_) {/* ignore storage errors */}
	});

	onMount(async () => {
		deckName = `Anki xiehanzi ${new Date().toISOString().slice(0, 10)} ${Math.floor(Date.now() / 1000)}`;

		// Restore saved card style from localStorage.
		try {
			const saved = localStorage.getItem(CARD_STYLE_LS_KEY);
			if (saved) {
				const parsed = JSON.parse(saved) as Partial<typeof DEFAULT_TEMPLATE>;
				template = { ...DEFAULT_TEMPLATE, ...parsed };
			}
		} catch (_) {/* ignore parse/storage errors */}

		// Restore saved per-card-type element styles, merged onto existing tabs.
		try {
			const savedTabs = localStorage.getItem(CARD_TABS_LS_KEY);
			if (savedTabs) {
				const parsed = JSON.parse(savedTabs) as Record<string, CardElementStyles>;
				const next = { ...tabContent };
				for (const name of Object.keys(next)) {
					if (parsed[name]) next[name] = { ...next[name], elementStyles: parsed[name] };
				}
				tabContent = next;
			}
		} catch (_) {/* ignore parse/storage errors */}

		// Migrate legacy deck-wide element styles onto the first card type so older
		// customisations aren't lost now that styling is per card type.
		if (template.elementStyles && Object.keys(template.elementStyles).length) {
			const first = tabs[0];
			if (first && tabContent[first] && Object.keys(tabContent[first].elementStyles).length === 0) {
				tabContent = {
					...tabContent,
					[first]: { ...tabContent[first], elementStyles: { ...template.elementStyles } }
				};
			}
		}
		stylesRestored = true;

		loadDict();
		initJieba();
		hskWordsDict = await loadHskWordsDict();
	});

	async function openSettingsPreview() {
		loadingSettingsPreview = true;
		const defaults = ['写', '汉字', '的', '比如', '好'];
		settingsPreviewWords = await Promise.all(defaults.map(lookupWord));
		showSettingsPreview = true;
		loadingSettingsPreview = false;
	}

	// Cell value for a CSV column. PartOfSpeech lives on `word.pos` (an array of
	// codes), not a direct field — map it to display labels so it isn't blank.
	function csvCell(w: Word, col: string): string {
		if (col === FIELDS.PART_OF_SPEECH) return w.pos.map((p) => posDisplay(p)).join('; ');
		return (w as any)[col] ?? '';
	}

	function exportCSV() {
		const cols = fields.filter((f) => f !== FIELDS.AUDIO);
		const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
		const header = cols.map(escape).join(',');
		const rows = words.map((w) => cols.map((c) => escape(csvCell(w, c))).join(','));
		const csv = [header, ...rows].join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${deckName}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	let isGenerating = $state(false);
	let showSuccess = $state(false);
	let exportedDeckName = $state('');
	let progressbarValue = $state(0);
	async function doGenerateDeck() {
		if (isGenerating || words.length === 0) return;
		isGenerating = true;
		try {
			// Fresh SQLite db per export — genanki runs CREATE TABLE without
			// IF NOT EXISTS, so reusing a db throws "table col already exists" on
			// the second click.
			const exportDb = await setupSql();
			await generateDeck({
				words,
				deckName,
				includeAudio,
				fields,
				order,
				tabContent,
				hskWordsDict,
				db: exportDb,
				template,
				onProgress: (v) => (progressbarValue = v)
			});
			exportedDeckName = deckName;
			if (!popupHidden()) showSuccess = true;
		} finally {
			isGenerating = false;
			showPreview = false;
		}
	}
</script>

<svelte:head>
	<title>Create Deck — Anki xiehanzi</title>
</svelte:head>

<section class="mx-auto max-w-5xl px-5 py-10">
	<p class="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">Deck generator</p>
	<h1 class="mb-6 mt-2 text-4xl font-extrabold tracking-tight">Create Deck</h1>

	{#if page === 1}
		<div class="mb-4 flex overflow-hidden rounded-lg border border-neutral-200 lg:hidden">
			<button
				class="flex-1 py-2 text-sm font-medium transition {mobileTab === 'customize' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'}"
				onclick={() => (mobileTab = 'customize')}>Customize</button>
			<button
				class="flex-1 py-2 text-sm font-medium transition {mobileTab === 'preview' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'}"
				onclick={() => (mobileTab = 'preview')}>Preview</button>
		</div>
		<div class="lg:flex lg:items-start lg:gap-8">
		<div class="{mobileTab === 'preview' ? 'hidden lg:block' : ''} min-w-0 flex-1">
			<h2 class="mt-6 text-xl font-semibold">Enter Deck Title</h2>
			<Input class="w-3/5" placeholder="Text input" bind:value={deckName} />

			<div class="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
				<div class="flex items-center gap-3">
					<Checkbox bind:checked={includeAudio}>Include Audio (Text-to-Speech)</Checkbox>
					{#if !includeAudio}
						<span class="ml-auto text-xs text-neutral-400">Faster without audio</span>
					{/if}
				</div>
				{#if includeAudio}
					<div class="mt-2 text-xs text-amber-600">⚠️ Requires internet · may take longer · use Microsoft Edge</div>
				{/if}
			</div>

			<AppearancePanel
				bind:template
				bind:open={appearanceOpen}
				{palette}
				{examplesUsed}
				loadingPreview={loadingSettingsPreview}
				onpreview={openSettingsPreview}
			/>

			<CardTypeEditor
				bind:tabs
				bind:tabContent
				bind:activeTab
				bind:order
				bind:includeAudio
				onshowcustomizer={() => (showCustomizer = true)}
			/>
		</div>
		<!-- Sticky live preview — right column on lg+, preview tab on mobile -->
		<div class="{mobileTab === 'customize' ? 'hidden lg:block' : ''} w-full space-y-3 lg:w-[320px] lg:shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pt-9">
			{#if tabContent[tabs[activeTab]]}
				<LivePreview
					tabName={tabs[activeTab]}
					{template}
					{palette}
					{order}
					{frontItems}
					{backItems}
					elementStyles={activeStyles}
					groups={activeGroups}
					exampleSentences={previewExamples}
				/>
			{/if}
		</div>
		</div>
	{/if}

	{#if page === 2}
		<div>
			<WordSourceInput bind:words />

			<WordReviewTable
				bind:words
				{template}
				{palette}
				{hskWordsDict}
				{includeAudio}
				{progressbarValue}
				{isGenerating}
				onexportcsv={exportCSV}
				onpreview={() => (showPreview = true)}
				ongenerate={doGenerateDeck}
			/>
		</div>
	{/if}

	{#if showCustomizer && tabContent[tabs[activeTab]]}
		<CardCustomizer
			bind:template
			bind:tabContent
			{tabs}
			bind:activeTab
			bind:order
			{fieldLabels}
			onclose={() => (showCustomizer = false)}
		/>
	{/if}

	{#if showPreview}
		<ExportPreview
			{words}
			{tabs}
			{tabContent}
			{template}
			{fields}
			{order}
			{includeAudio}
			{palette}
			{isGenerating}
			onGenerate={doGenerateDeck}
			onclose={() => (showPreview = false)}
		/>
	{/if}

	{#if showSettingsPreview}
		<ExportPreview
			words={settingsPreviewWords}
			{tabs}
			{tabContent}
			{template}
			{fields}
			{order}
			{includeAudio}
			{palette}
			isGenerating={false}
			onclose={() => (showSettingsPreview = false)}
		/>
	{/if}

	{#if showSuccess}
		<ExportSuccess deckName={exportedDeckName} onClose={() => (showSuccess = false)} />
	{/if}

	<StepNav bind:page labels={prevNextButtonText} maxPage={2} />
</section>
