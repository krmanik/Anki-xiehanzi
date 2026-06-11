<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Alert,
		Button,
		Checkbox,
		Fileupload,
		Input,
		Progressbar,
		Select,
		Textarea
	} from 'flowbite-svelte';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import WordCard from '$lib/components/WordCard.svelte';
	import CardPreview from '$lib/components/CardPreview.svelte';
	import CardCustomizer from '$lib/components/CardCustomizer.svelte';
	import ExportPreview from '$lib/components/ExportPreview.svelte';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import {
		CARD_STYLE_LS_KEY,
		CARD_TABS_LS_KEY,
		DEFAULT_TEMPLATE,
		type CardElementStyles,
		type TemplateOpts
	} from '$lib/deck';
	import { CONTROL_BUTTONS_TOKEN, SEPARATOR_TOKEN } from '$lib/deckTemplate';

	import CONSTANTS from '$lib/dict/contants';
	import { CARD_PRESETS, presetToCard, presetNeedsAudio, type CardPreset } from '$lib/cardPresets';
	import { TONE_PRESETS, TONE_KEYS, resolvePalette } from '$lib/tonePresets';
	import { CARD_THEME_GROUPS } from '$lib/cardThemes';
	import { posDisplay } from '$lib/dict/cedict';
	import {
		cutParagraph,
		generateDeck,
		initJieba,
		loadDict,
		loadHskWordsDict,
		lookupWord,
		resolveWithSegmentation,
		playWordAudio,
		setupSql,
		wordsByLevel,
		getSmartSentences,
		type TabContent,
		type Word,
		type ExampleSentence
	} from '$lib/deck';

	const FIELDS = CONSTANTS.FIELDS;

	const DISPLAY_FIELDS = [
		FIELDS.SIMPLIFIED,
		FIELDS.TRADITIONAL,
		FIELDS.PINYIN,
		FIELDS.ZHUYIN,
		FIELDS.PART_OF_SPEECH,
		FIELDS.SIMPLE_MEANING,
		FIELDS.DEFINITIONS
	];

	// Defaults for a new card type: Simplified on front, all display fields on back;
	// control bar + separator shown on both sides by default.
	function newCard() {
		return {
			front: [`front${FIELDS.SIMPLIFIED}`, `front${CONTROL_BUTTONS_TOKEN}`, `front${SEPARATOR_TOKEN}`],
			back: [
				...DISPLAY_FIELDS.map((f) => `back${f}`),
				`back${CONTROL_BUTTONS_TOKEN}`,
				`back${SEPARATOR_TOKEN}`,
				`back${FIELDS.AUDIO}`
			],
			additional: [] as string[],
			elementStyles: {} as CardElementStyles
		};
	}

	const WRITING = 'writingComponent';

	let words = $state<Word[]>([]);
	let deckName = $state('xiehanzi');
	// Ordered list of card items: note fields + the writing component, all
	// reorderable. `fields` (the apkg note fields) is derived from it.
	let order = $state<string[]>([
		FIELDS.SIMPLIFIED,
		FIELDS.TRADITIONAL,
		FIELDS.PINYIN,
		FIELDS.ZHUYIN,
		FIELDS.PART_OF_SPEECH,
		FIELDS.SIMPLE_MEANING,
		CONTROL_BUTTONS_TOKEN,
		SEPARATOR_TOKEN,
		FIELDS.DEFINITIONS,
		FIELDS.BREAKDOWN,
		FIELDS.RADICAL,
		FIELDS.HSK_LEVEL,
		FIELDS.FREQUENCY,
		FIELDS.EXAMPLES,
		FIELDS.AUDIO,
		WRITING
	]);
	// Layout tokens are positioning-only; note fields exclude the writing component
	// and the chrome tokens (control buttons / separator).
	let fields = $derived(order.filter((o) => o !== WRITING && o !== CONTROL_BUTTONS_TOKEN && o !== SEPARATOR_TOKEN));
	let includeAudio = $state(false);
	let template = $state<TemplateOpts>({ ...DEFAULT_TEMPLATE });
	let page = $state(1);
	let showCustomizer = $state(false);
	let showPreview = $state(false);
	let appearanceOpen = $state(true);
	let mobileTab = $state<'customize' | 'preview'>('customize');
	let wordValue = $state('');
	let selectType = $state('Word');
	let texAreaValue = $state('');
	let progressbarValue = $state(0);
	let hskWordsDict = $state<Set<string>>(new Set());
	let fileStatus = $state('');
	let fileProgress = $state(0);
	let fileProcessing = $state(false);

	let paragraphProgress = $state(0);
	let paragraphProcessing = $state(false);
	let paragraphStatus = $state('');
	let translateFailedWords = $state<string[]>([]);
	let showBreakToast = $state(false);
	let breakPreviewing = $state(false);
	let showBreakModal = $state(false);
	let breakPreviewWords = $state<Word[]>([]);
	let breakSelectedWords = $state<Set<string>>(new Set());

	let activeTab = $state(0);
	let tabs = $state<string[]>(['Card 1']);
	let tabContent = $state<TabContent>({
		'Card 1': newCard()
	});

	// table selection / pagination
	let selected = $state<Set<Word>>(new Set());
	let currentPage = $state(1);
	let rowsPerPage = $state(10);

	const prevNextButtonText = ['', 'Create Card Types', 'Input Chinese Characters'];

	const selectionTypes = [
		{ value: 'Word', name: 'Word' },
		{ value: 'Paragraph', name: 'Paragraph' },
		{ value: 'File', name: 'File' },
		{ value: 'HSK', name: 'HSK Level' }
	];

	// HSK-level word source: pick levels, populate the list with all their words.
	const HSK_LEVELS = ['1', '2', '3', '4', '5', '6', '7+'];
	let selectedLevels = $state<Set<string>>(new Set());
	let hskProcessing = $state(false);
	let hskProgress = $state(0);
	let hskStatus = $state('');

	function toggleLevel(lvl: string) {
		const next = new Set(selectedLevels);
		if (next.has(lvl)) next.delete(lvl);
		else next.add(lvl);
		selectedLevels = next;
	}

	async function addWordsByLevel() {
		if (hskProcessing || selectedLevels.size === 0) return;
		hskProcessing = true;
		hskProgress = 0;
		hskStatus = 'Loading word list…';
		try {
			const list = await wordsByLevel([...selectedLevels]);
			const existing = new Set(words.map((w) => w.Simplified));
			const todo = list.filter((w) => !existing.has(w));
			const added: Word[] = [];
			for (let i = 0; i < todo.length; i++) {
				hskProgress = Math.round(((i + 1) / todo.length) * 100);
				hskStatus = `Adding ${i + 1} / ${todo.length}…`;
				added.push(await lookupWord(todo[i]));
			}
			words = [...words, ...added];
			hskProgress = 100;
			hskStatus = `Added ${added.length} words.`;
		} finally {
			hskProcessing = false;
		}
	}

	// Button styles matching the site's black/neutral design system.
	const btnPrimary =
		'rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40';
	const btnSecondary =
		'rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-40';
	const btnDanger =
		'rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-40';

	const fieldLabels: Record<string, string> = Object.fromEntries(
		[
			{ id: WRITING, label: 'Writing Component' },
			{ id: CONTROL_BUTTONS_TOKEN, label: 'Control buttons' },
			{ id: SEPARATOR_TOKEN, label: 'Separator line' },
			{ id: FIELDS.SIMPLIFIED, label: 'Simplified' },
			{ id: FIELDS.TRADITIONAL, label: 'Traditional' },
			{ id: FIELDS.PINYIN, label: 'Pinyin' },
			{ id: FIELDS.ZHUYIN, label: 'Zhuyin' },
			{ id: FIELDS.PART_OF_SPEECH, label: 'Part of Speech' },
			{ id: FIELDS.SIMPLE_MEANING, label: 'Simple Meaning' },
			{ id: FIELDS.DEFINITIONS, label: 'Dictionary Definitions' },
			{ id: FIELDS.BREAKDOWN, label: 'Character Breakdown' },
			{ id: FIELDS.RADICAL, label: 'Radical' },
			{ id: FIELDS.HSK_LEVEL, label: 'HSK Level' },
			{ id: FIELDS.FREQUENCY, label: 'Frequency' },
			{ id: FIELDS.EXAMPLES, label: 'Example Sentences' },
			{ id: FIELDS.AUDIO, label: 'Audio' }
		].map((f) => [f.id, f.label])
	);

	// ---- field ordering (drag + up/down) ----
	let dragIndex = $state<number | null>(null);

	function moveField(index: number, dir: -1 | 1) {
		const j = index + dir;
		if (j < 0 || j >= order.length) return;
		const next = [...order];
		[next[index], next[j]] = [next[j], next[index]];
		order = next;
	}

	function onFieldDrop(target: number) {
		if (dragIndex === null || dragIndex === target) return;
		const next = [...order];
		const [moved] = next.splice(dragIndex, 1);
		next.splice(target, 0, moved);
		order = next;
		dragIndex = null;
	}

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

	const rowsPerPageOptions = [5, 10, 25, 50, 100, 500].map((n) => ({ value: n, name: String(n) }));

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

	// ---- card-type tabs ----
	function findNextTabNumber() {
		let n = 1;
		while (tabs.includes(`Card ${n}`)) n++;
		return n;
	}

	function handleAddTab() {
		const name = `Card ${findNextTabNumber()}`;
		tabs = [...tabs, name];
		tabContent = { ...tabContent, [name]: newCard() };
		activeTab = tabs.length - 1;
	}

	// Unique tab name from a desired base (e.g. "Beginner", "Beginner 2").
	function uniqueTabName(base: string) {
		if (!tabs.includes(base)) return base;
		let n = 2;
		while (tabs.includes(`${base} ${n}`)) n++;
		return `${base} ${n}`;
	}

	// One-click preset: add a ready-made card type and switch to it. The very
	// first time (still the lone empty "Card 1") we replace it rather than append.
	function addPreset(preset: CardPreset) {
		const card = presetToCard(preset);
		// Replace only the pristine, untouched default card — not a previously
		// chosen preset that happens to share a Simplified-only front.
		const def = newCard();
		const sig = (c: { front: string[]; back: string[] }) =>
			JSON.stringify([c.front, c.back]);
		const replaceFirst =
			tabs.length === 1 &&
			!!tabContent[tabs[0]] &&
			sig(tabContent[tabs[0]]) === sig(def);

		if (replaceFirst) {
			const old = tabs[0];
			const name = uniqueTabName(preset.name);
			tabs = [name];
			const next = { ...tabContent };
			delete next[old];
			next[name] = card;
			tabContent = next;
			activeTab = 0;
		} else {
			const name = uniqueTabName(preset.name);
			tabs = [...tabs, name];
			tabContent = { ...tabContent, [name]: card };
			activeTab = tabs.length - 1;
		}

		if (presetNeedsAudio(preset)) includeAudio = true;
	}

	function handleCloseTab(index: number) {
		const removed = tabs[index];
		tabs = tabs.filter((_, i) => i !== index);
		const next = { ...tabContent };
		delete next[removed];
		tabContent = next;
		activeTab = 0;
	}

	function handleCheckboxChange(fieldId: string, side: 'front' | 'back' | 'additional') {
		const current = tabs[activeTab];
		const content = { ...tabContent[current] };
		const isChecked = content[side].includes(fieldId);
		content[side] = isChecked
			? content[side].filter((id) => id !== fieldId)
			: [...content[side], fieldId];
		tabContent = { ...tabContent, [current]: content };
	}

	// ---- word lookup ----
	async function searchAndAdd(word: string) {
		if (!word.trim()) return;
		if (words.some((w) => w.Simplified === word.trim())) return;
		const result = await lookupWord(word);
		words = [...words, result];
		wordValue = '';
	}

	async function generateWords(file: File) {
		fileStatus = 'Processing...';
		fileProcessing = true;
		fileProgress = 0;
		const text = await file.text();
		const lines = text.split('\n').filter((l) => l.trim());
		const added: Word[] = [];
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			fileProgress = Math.round(((i + 1) / lines.length) * 100);
			if (words.some((w) => w.Simplified === line.trim())) continue;
			if (added.some((w) => w.Simplified === line.trim())) continue;
			added.push(await lookupWord(line));
		}
		words = [...words, ...added];
		fileProgress = 100;
		fileProcessing = false;
		fileStatus = 'Completed';
	}

	async function generateFromParagraph() {
		const cutWords = cutParagraph(texAreaValue);
		if (cutWords.length === 0) return;

		paragraphProcessing = true;
		paragraphProgress = 0;
		paragraphStatus = '';
		showBreakToast = false;
		translateFailedWords = [];

		const added: Word[] = [];
		const failed: string[] = [];

		for (let i = 0; i < cutWords.length; i++) {
			const word = cutWords[i];
			paragraphProgress = Math.round(((i + 1) / cutWords.length) * 100);
			paragraphStatus = `Processing ${i + 1} / ${cutWords.length}…`;
			if (words.some((w) => w.Simplified === word.trim())) continue;
			if (added.some((w) => w.Simplified === word.trim())) continue;
			try {
				added.push(await lookupWord(word));
			} catch {
				failed.push(word);
			}
		}

		words = [...words, ...added];
		paragraphProcessing = false;
		paragraphStatus = `Added ${added.length} word${added.length === 1 ? '' : 's'}${failed.length ? `, ${failed.length} failed` : ''}.`;

		if (failed.length > 0) {
			translateFailedWords = failed;
			showBreakToast = true;
		}
	}

	async function previewBreakWords() {
		breakPreviewing = true;
		const existing = new Set(words.map((w) => w.Simplified));
		const seen = new Set<string>();
		const preview: Word[] = [];

		for (const failedWord of translateFailedWords) {
			const resolved = await resolveWithSegmentation(failedWord);
			for (const w of resolved) {
				if (seen.has(w.Simplified) || existing.has(w.Simplified)) continue;
				seen.add(w.Simplified);
				preview.push(w);
			}
		}

		breakPreviewWords = preview;
		breakSelectedWords = new Set(preview.map((w) => w.Simplified));
		breakPreviewing = false;
		showBreakModal = true;
	}

	function toggleBreakWord(simplified: string) {
		const next = new Set(breakSelectedWords);
		if (next.has(simplified)) next.delete(simplified);
		else next.add(simplified);
		breakSelectedWords = next;
	}

	function toggleAllBreakWords() {
		if (breakSelectedWords.size === breakPreviewWords.length) {
			breakSelectedWords = new Set();
		} else {
			breakSelectedWords = new Set(breakPreviewWords.map((w) => w.Simplified));
		}
	}

	function addSelectedBreakWords() {
		const toAdd = breakPreviewWords.filter((w) => breakSelectedWords.has(w.Simplified));
		words = [...words, ...toAdd];
		paragraphStatus += ` Added ${toAdd.length} character${toAdd.length === 1 ? '' : 's'}.`;
		showBreakModal = false;
		showBreakToast = false;
		translateFailedWords = [];
		breakPreviewWords = [];
		breakSelectedWords = new Set();
	}

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) generateWords(file);
	}

	// ---- table actions ----
	function toggleRow(word: Word) {
		const next = new Set(selected);
		if (next.has(word)) next.delete(word);
		else next.add(word);
		selected = next;
	}

	function deleteSelectedWord() {
		if (selected.size === 0) return;
		words = words.filter((w) => !selected.has(w));
		selected = new Set();
	}

	function deleteWord(word: Word) {
		words = words.filter((w) => w !== word);
		if (selected.has(word)) {
			const next = new Set(selected);
			next.delete(word);
			selected = next;
		}
	}

	function cancelSelection() {
		selected = new Set();
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
		} finally {
			isGenerating = false;
			showPreview = false;
		}
	}

	// derived view
	let totalPages = $derived(Math.max(1, Math.ceil(words.length / rowsPerPage)));
	let pagedWords = $derived(
		words.slice((currentPage - 1) * rowsPerPage, (currentPage - 1) * rowsPerPage + rowsPerPage)
	);
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

			<h2 class="mt-6 text-xl font-semibold">Audio Settings</h2>
			<div>
				<Checkbox bind:checked={includeAudio}>Include Audio (Text-to-Speech)</Checkbox>
				<div class="mt-2 text-sm text-gray-500">
					{#if includeAudio}
						⚠️ Audio generation may take longer and requires internet connection
					{:else}
						Audio files will not be generated for faster deck creation
					{/if}
				</div>
				{#if includeAudio}
					<div class="mt-2">
						<Alert color="blue">
							Please open Anki-xiehanzi in Microsoft Edge browser to generate audio using
							Text-to-Speech.
						</Alert>
					</div>
				{/if}
			</div>

			<button
				type="button"
				onclick={() => (appearanceOpen = !appearanceOpen)}
				aria-expanded={appearanceOpen}
				class="mt-6 flex w-full items-center gap-2 border-b border-neutral-200 pb-2 text-left"
			>
				<ChevronDown size={18} class="text-neutral-400 transition {appearanceOpen ? '' : '-rotate-90'}" />
				<span class="text-xl font-semibold">Customize appearance</span>
				<span class="text-sm font-normal text-neutral-400">tone colors, font, definitions — optional</span>
			</button>

			{#if appearanceOpen}

			<!-- Card theme picker -->
			<div class="mt-4">
				<p class="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">Card theme</p>
				<div class="flex flex-wrap gap-2">
					<button
						class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition {!template.cardTheme ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}"
						onclick={() => (template.cardTheme = '')}
					>
						<span class="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 bg-white text-[9px] text-neutral-400">–</span>
						None
					</button>
					{#each CARD_THEME_GROUPS as g (g.id)}
						<button
							class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition {template.cardTheme === g.id ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200 hover:border-neutral-400'}"
							onclick={() => (template.cardTheme = g.id)}
							title={g.description}
						>
							<span class="relative flex h-5 w-5 shrink-0 overflow-hidden rounded-full border border-neutral-200">
								<span class="absolute inset-0 w-1/2" style="background:{g.swatch[0]}"></span>
								<span class="absolute inset-0 left-1/2" style="background:{g.swatch[1]}"></span>
							</span>
							{g.label}
						</button>
					{/each}
				</div>
				{#if template.cardTheme}
					<div class="mt-3 inline-flex overflow-hidden rounded-lg border border-neutral-300">
						{#each (['auto', 'light', 'dark'] as const) as m}
							<button
								class="px-3 py-1.5 text-sm capitalize transition {template.cardThemeMode === m ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'}"
								onclick={() => (template.cardThemeMode = m)}
							>{m}</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
				<div class="inline-flex overflow-hidden rounded-lg border border-neutral-300">
					<button
						class="px-3 py-1.5 text-sm {!template.mono
							? 'bg-neutral-900 text-white'
							: 'text-neutral-600'}"
						onclick={() => (template.mono = false)}>Tone colors</button
					>
					<button
						class="px-3 py-1.5 text-sm {template.mono
							? 'bg-neutral-900 text-white'
							: 'text-neutral-600'}"
						onclick={() => (template.mono = true)}>Black & white</button
					>
				</div>

				<label class="flex items-center gap-2 text-sm {template.mono ? 'opacity-40' : ''}">
					<input
						type="checkbox"
						class="h-4 w-4 accent-neutral-900"
						bind:checked={template.colorHanzi}
						disabled={template.mono}
					/> Color hanzi
				</label>
				<label class="flex items-center gap-2 text-sm {template.mono ? 'opacity-40' : ''}">
					<input
						type="checkbox"
						class="h-4 w-4 accent-neutral-900"
						bind:checked={template.colorPinyin}
						disabled={template.mono}
					/> Color pinyin
				</label>
				<label class="flex items-center gap-2 text-sm" title="Multi-reading characters show only their most common reading (the one with the longest definition)">
					<input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.commonPinyinOnly} /> Most common pinyin only
				</label>

				<label class="flex items-center gap-2 text-sm {template.mono ? 'opacity-40' : ''}">
					Tone palette
					<select
						bind:value={template.tonePreset}
						disabled={template.mono}
						class="min-w-[10rem] rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
					>
						{#each TONE_PRESETS as p (p.id)}
							<option value={p.id}>{p.label}</option>
						{/each}
						<option value="custom">Custom…</option>
					</select>
				</label>

				<label class="flex items-center gap-2 text-sm">
					Hanzi font
					<select
						bind:value={template.font}
						class="min-w-[10rem] rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
					>
						<option value="default">Default (sans)</option>
						<option value="kaiti">Kaiti 楷体</option>
						<option value="songti">Songti 宋体</option>
					</select>
				</label>

				<label class="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						class="h-4 w-4 accent-neutral-900"
						bind:checked={template.collapseDict}
					/> Collapse dictionary definitions
				</label>
			</div>

			{#if !template.mono}
				<div class="mt-3 flex flex-wrap items-center gap-4">
					<div class="flex items-center gap-1.5">
						<span class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Tones</span>
						{#each TONE_KEYS as k (k)}
							<span
								class="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold text-white"
								style="background-color:{palette[k]}"
								title={`Tone ${k}`}>{k}</span
							>
						{/each}
					</div>
					{#if template.tonePreset === 'custom'}
						<div class="flex flex-wrap items-center gap-3">
							{#each TONE_KEYS as k (k)}
								<label class="flex items-center gap-1 text-xs text-neutral-600">
									Tone {k}
									<input
										type="color"
										bind:value={template.toneColors[k]}
										class="h-7 w-8 cursor-pointer rounded border border-neutral-200 p-0.5"
									/>
								</label>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			{#if examplesUsed}
				<div class="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
					<p class="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">Example sentences</p>
					<div class="flex flex-wrap items-end gap-4">
						<label class="flex flex-col gap-1 text-xs text-neutral-600">
							How many
							<input type="number" min="1" max="10" bind:value={template.exampleOptions.count}
								class="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
						</label>
						<label class="flex flex-col gap-1 text-xs text-neutral-600">
							Min length (chars)
							<input type="number" min="1" max="50" bind:value={template.exampleOptions.minChars}
								class="w-24 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
						</label>
						<label class="flex flex-col gap-1 text-xs text-neutral-600">
							Max length (chars)
							<input type="number" min="1" max="80" bind:value={template.exampleOptions.maxChars}
								class="w-24 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
						</label>
					</div>
					<div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
						<span class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Show</span>
						<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.exampleOptions.showSimplified} /> Simplified</label>
						<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.exampleOptions.showTraditional} /> Traditional</label>
						<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.exampleOptions.showPinyin} /> Pinyin</label>
						<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.exampleOptions.showTranslation} /> Translation</label>
					</div>
					<div class="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm {template.mono ? 'opacity-40' : ''}">
						<span class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Color</span>
						<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.exampleOptions.colorizeHanzi} disabled={template.mono} /> Hanzi</label>
						<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.exampleOptions.colorizePinyin} disabled={template.mono} /> Pinyin</label>
					</div>
					<p class="mt-3 border-t border-neutral-200 pt-3 text-[11px] text-neutral-400">Examples show as a collapsible card (tap the bar to expand), like Definitions.</p>
				</div>
			{/if}
			{/if}

			<div class="mt-6 flex items-center gap-3">
				<h2 class="text-xl font-semibold">Create Card Types</h2>
				<button
					onclick={() => (showCustomizer = true)}
					class="ml-auto flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-900"
				>
					<Settings2 size={14} />
					Advanced customisation
				</button>
			</div>
			<p class="mb-2 text-sm text-neutral-500">
				Each card type is one Anki template. Drag to set field order, then choose which fields show
				on the front and back. The preview updates live.
			</p>

			<div class="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
				<p class="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
					Quick start — add a ready-made card type
				</p>
				<div class="flex flex-wrap gap-2">
					{#each CARD_PRESETS as preset (preset.id)}
						<button
							type="button"
							onclick={() => addPreset(preset)}
							title={preset.description}
							class="group rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-left transition hover:border-neutral-900 hover:shadow-[3px_3px_0_0_#111]"
						>
							<span class="block text-sm font-semibold text-neutral-900">{preset.name}</span>
							<span class="block max-w-[14rem] text-[11px] leading-snug text-neutral-500">{preset.description}</span>
						</button>
					{/each}
				</div>
			</div>

			<div>
				<ul class="flex flex-wrap gap-2 border-b border-neutral-200">
					{#each tabs as tab, index (tab)}
						<li
							class="flex cursor-pointer items-center gap-1 rounded-t px-3 py-2 text-sm {activeTab ===
							index
								? 'border-b-2 border-neutral-900 font-semibold'
								: 'text-neutral-500'}"
						>
							<span
								onclick={() => (activeTab = index)}
								onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (activeTab = index)}
								role="button"
								tabindex="0">{tab}</span
							>
							{#if tabs.length > 1}
								<button onclick={() => handleCloseTab(index)} aria-label="close tab">
									<CircleX size={15} />
								</button>
							{/if}
						</li>
					{/each}
					<li class="text-lg text-neutral-500">
						<button class="cursor-pointer px-3 py-2" onclick={handleAddTab} aria-label="add card type">+</button>
					</li>
				</ul>

				{#if tabContent[tabs[activeTab]]}
					<div class="py-4">
						<!-- field editor -->
						<div>
							<p class="mb-2 text-xs text-neutral-500">Tick a field to show it on the front and/or back of this card type.</p>
							<div
								class="grid grid-cols-[1fr_3rem_3rem] items-center gap-2 px-3 pb-1 font-mono text-[10px] uppercase tracking-wider text-neutral-400"
							>
								<span>Field</span><span class="text-center">Front</span
								><span class="text-center">Back</span>
							</div>
							<ul class="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
								{#each order as item, index (item)}
									{@const isChrome = item === CONTROL_BUTTONS_TOKEN || item === SEPARATOR_TOKEN}
										<li
											draggable="true"
											ondragstart={() => (dragIndex = index)}
											ondragover={(e) => e.preventDefault()}
											ondrop={() => onFieldDrop(index)}
											class="grid grid-cols-[1fr_3rem_3rem] items-center gap-2 px-3 py-2 {item === WRITING || isChrome
												? 'bg-neutral-50'
												: 'bg-white'} {dragIndex === index ? 'opacity-50' : ''}"
										>
											<span class="flex items-center gap-2">
												<GripVertical size={15} class="cursor-grab text-neutral-300" />
												<span class="text-sm">{fieldLabels[item] ?? item}</span>
												<span class="ml-auto flex flex-col">
													<button
														class="text-neutral-400 hover:text-neutral-900 disabled:opacity-20"
														disabled={index === 0}
														onclick={() => moveField(index, -1)}
														aria-label="move up"><ChevronUp size={13} /></button
													>
													<button
														class="text-neutral-400 hover:text-neutral-900 disabled:opacity-20"
														disabled={index === order.length - 1}
														onclick={() => moveField(index, 1)}
														aria-label="move down"><ChevronDown size={13} /></button
													>
												</span>
											</span>
											<span class="text-center">
												<input
													type="checkbox"
													class="h-4 w-4 accent-neutral-900"
													aria-label={`${fieldLabels[item] ?? item} front`}
													checked={tabContent[tabs[activeTab]].front.includes(`front${item}`)}
													onchange={() => handleCheckboxChange(`front${item}`, 'front')}
												/>
											</span>
											<span class="text-center">
												<input
													type="checkbox"
													class="h-4 w-4 accent-neutral-900"
													aria-label={`${fieldLabels[item] ?? item} back`}
													checked={tabContent[tabs[activeTab]].back.includes(`back${item}`)}
													onchange={() => handleCheckboxChange(`back${item}`, 'back')}
												/>
											</span>
										</li>
								{/each}
							</ul>
						</div>
					</div>
				{/if}
			</div>
		</div>
		<!-- Sticky live preview — right column on lg+, preview tab on mobile -->
		<div class="{mobileTab === 'customize' ? 'hidden lg:block' : ''} w-full space-y-3 lg:w-[320px] lg:shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
			{#if tabContent[tabs[activeTab]]}
				<p class="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">Live preview — {tabs[activeTab]}</p>
				<CardPreview
					label="Front"
					side="front"
					items={frontItems}
					colorize={!template.mono && template.colorHanzi}
					font={template.font}
					collapseDict={template.collapseDict}
					commonPinyinOnly={template.commonPinyinOnly}
					elementStyles={activeStyles}
					groups={activeGroups}
					{order}
					toneColors={palette}
					cardTheme={template.cardTheme}
					cardThemeMode={template.cardThemeMode}
					exampleSentences={previewExamples}
					exampleOptions={template.exampleOptions}
				/>
				<CardPreview
					label="Back"
					side="back"
					items={backItems}
					colorize={!template.mono && template.colorHanzi}
					font={template.font}
					collapseDict={template.collapseDict}
					commonPinyinOnly={template.commonPinyinOnly}
					elementStyles={activeStyles}
					groups={activeGroups}
					{order}
					toneColors={palette}
					cardTheme={template.cardTheme}
					cardThemeMode={template.cardThemeMode}
					exampleSentences={previewExamples}
					exampleOptions={template.exampleOptions}
				/>
			{/if}
		</div>
		</div>
	{/if}

	{#if page === 2}
		<div>
			<h2 class="text-xl font-semibold">Enter Chinese Characters</h2>

			<div class="my-4 inline-flex overflow-hidden rounded-lg border border-neutral-300">
				{#each selectionTypes as st}
					<button
						class="px-4 py-1.5 text-sm {selectType === st.value
							? 'bg-neutral-900 text-white'
							: 'text-neutral-600 hover:bg-neutral-100'}"
						onclick={() => (selectType = st.value)}>{st.name}</button
					>
				{/each}
			</div>

			{#if selectType === 'Word'}
				<div class="my-4 flex items-center gap-3">
					<Input
						class="w-3/5"
						placeholder="Type a word, e.g. 中国"
						bind:value={wordValue}
						onkeydown={(e) => e.key === 'Enter' && searchAndAdd(wordValue)}
					/>
					<button class={btnPrimary} onclick={() => searchAndAdd(wordValue)}>Add</button>
				</div>
			{/if}

			{#if selectType === 'File'}
				<div class="my-4">
					<Fileupload accept="text/*" onchange={handleFileChange} />
					{#if fileProcessing || fileProgress > 0}
						<div class="mt-3">
							<div class="mb-1 flex justify-between text-xs text-neutral-500">
								<span>{fileProcessing ? 'Processing…' : 'Completed'}</span>
								<span>{fileProgress}%</span>
							</div>
							<Progressbar progress={fileProgress} />
						</div>
					{:else}
						<p class="mt-1 text-sm text-neutral-500">
							{fileStatus || 'Upload a text file with one word per line.'}
						</p>
					{/if}
				</div>
			{/if}

			{#if selectType === 'HSK'}
				<div class="my-4">
					<p class="mb-2 text-sm text-neutral-500">
						Pick one or more HSK levels — every word at those levels is added to your deck,
						most-common first.
					</p>
					<div class="mb-3 flex flex-wrap gap-2">
						{#each HSK_LEVELS as lvl (lvl)}
							<button
								type="button"
								onclick={() => toggleLevel(lvl)}
								class="rounded-lg border px-3 py-1.5 text-sm transition {selectedLevels.has(lvl)
									? 'border-neutral-900 bg-neutral-900 text-white'
									: 'border-neutral-300 text-neutral-600 hover:border-neutral-900'}"
							>
								HSK {lvl}
							</button>
						{/each}
					</div>
					<button
						class={btnPrimary}
						onclick={addWordsByLevel}
						disabled={selectedLevels.size === 0 || hskProcessing}
					>
						{hskProcessing ? 'Adding…' : 'Add words'}
					</button>
					{#if hskProcessing || hskProgress > 0}
						<div class="mt-3">
							<div class="mb-1 flex justify-between text-xs text-neutral-500">
								<span>{hskStatus}</span>
								<span>{hskProgress}%</span>
							</div>
							<Progressbar progress={hskProgress} />
						</div>
					{/if}
				</div>
			{/if}

			{#if selectType === 'Paragraph'}
				<div class="my-4">
					<Textarea
						class="w-full"
						rows={6}
						placeholder="Paste Chinese text — it will be segmented into words."
						bind:value={texAreaValue}
					/>
					<div class="mt-2">
						<button
							class={btnPrimary}
							onclick={generateFromParagraph}
							disabled={!texAreaValue.trim() || paragraphProcessing}
						>
							{paragraphProcessing ? 'Processing…' : 'Generate words'}
						</button>
					</div>
					{#if paragraphProcessing || paragraphProgress > 0}
						<div class="mt-3">
							<div class="mb-1 flex justify-between text-xs text-neutral-500">
								<span>{paragraphStatus}</span>
								<span>{paragraphProgress}%</span>
							</div>
							<Progressbar progress={paragraphProgress} />
						</div>
					{/if}
				</div>
			{/if}

			<Progressbar progress={progressbarValue} class="my-4" />
			<p class="mb-2 text-sm text-gray-500">
				{#if progressbarValue > 0}
					{progressbarValue.toFixed(1)}% - {includeAudio ? 'Processing audio...' : 'Processing...'}
				{:else}
					{includeAudio ? 'Ready to generate (includes audio)' : 'Ready to generate (no audio)'}
				{/if}
			</p>

			<div class="my-4 flex flex-wrap items-center justify-between gap-2">
				<div class="flex gap-2">
					<button class={btnDanger} onclick={deleteSelectedWord}>Delete</button>
					<button class={btnSecondary} onclick={cancelSelection}>Cancel</button>
				</div>
				<div class="flex gap-2">
					<button class={btnSecondary} onclick={exportCSV} disabled={words.length === 0}>Export CSV</button>
					<button class={btnSecondary} onclick={() => (showPreview = true)} disabled={words.length === 0 || isGenerating}>
						Preview
					</button>
					<button class={btnPrimary} onclick={doGenerateDeck} disabled={words.length === 0 || isGenerating}>
						{isGenerating ? 'Generating…' : 'Generate'}
					</button>
				</div>
			</div>

			{#if words.length === 0}
				<p class="rounded-lg border border-dashed border-neutral-300 py-10 text-center text-sm text-neutral-400">
					No words yet. Add words above to build your deck.
				</p>
			{:else}
				<div class="grid gap-3">
					{#each pagedWords as word (word)}
						<WordCard
							{word}
							selected={selected.has(word)}
							colorize={!template.mono && template.colorHanzi}
							toneColors={palette}
							onToggle={() => toggleRow(word)}
							onDelete={() => deleteWord(word)}
							onPlay={() => void playWordAudio(word.Simplified, hskWordsDict)}
						/>
					{/each}
				</div>
			{/if}

			<div class="my-4 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="text-sm text-gray-500">Rows per page</span>
					<div class="w-24">
						<Select
							items={rowsPerPageOptions}
							bind:value={rowsPerPage}
							onchange={() => (currentPage = 1)}
						/>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<Button
						size="xs"
						color="alternative"
						disabled={currentPage <= 1}
						onclick={() => (currentPage = currentPage - 1)}>Prev</Button
					>
					<span class="text-sm">Page {currentPage} / {totalPages}</span>
					<Button
						size="xs"
						color="alternative"
						disabled={currentPage >= totalPages}
						onclick={() => (currentPage = currentPage + 1)}>Next</Button
					>
				</div>
			</div>
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

	<nav class="mt-10 flex items-center justify-between gap-4 border-t border-neutral-200 pt-6">
		{#if page > 1}
			<button
				class="group flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 transition hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111]"
				onclick={() => (page = page - 1)}
			>
				<ArrowLeft size={16} class="shrink-0 text-neutral-400 transition group-hover:text-neutral-900" />
				<div class="text-left">
					<div class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Previous</div>
					<div class="font-semibold text-neutral-900">{prevNextButtonText[page - 1]}</div>
				</div>
			</button>
		{:else}
			<div></div>
		{/if}

		{#if page < 2}
			<button
				class="group flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 transition hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111]"
				onclick={() => (page = page + 1)}
			>
				<div class="text-right">
					<div class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Next</div>
					<div class="font-semibold text-neutral-900">{prevNextButtonText[page + 1]}</div>
				</div>
				<ArrowRight size={16} class="shrink-0 text-neutral-400 transition group-hover:text-neutral-900" />
			</button>
		{:else}
			<div></div>
		{/if}
	</nav>
</section>

{#if showBreakToast}
	<div class="fixed bottom-6 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
		<p class="mb-2 text-sm font-medium text-amber-900">
			Google Translate failed for {translateFailedWords.length} word{translateFailedWords.length === 1 ? '' : 's'}.
			Break into individual characters and look up in dictionary?
		</p>
		<div class="flex gap-2">
			<button class={btnPrimary} onclick={previewBreakWords} disabled={breakPreviewing}>
				{breakPreviewing ? 'Loading…' : 'Preview'}
			</button>
			<button
				class={btnSecondary}
				onclick={() => {
					showBreakToast = false;
					translateFailedWords = [];
				}}
			>
				Skip
			</button>
		</div>
	</div>
{/if}

{#if showBreakModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
		<div class="flex w-full max-w-sm flex-col rounded-xl bg-white shadow-2xl">
			<div class="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
				<h3 class="font-semibold text-neutral-900">
					{breakPreviewWords.length} character{breakPreviewWords.length === 1 ? '' : 's'} found
				</h3>
				<button
					class="text-xs text-neutral-500 hover:text-neutral-900"
					onclick={toggleAllBreakWords}
				>
					{breakSelectedWords.size === breakPreviewWords.length ? 'Deselect all' : 'Select all'}
				</button>
			</div>
			{#if breakPreviewWords.length === 0}
				<p class="px-4 py-6 text-center text-sm text-neutral-500">No characters found in dictionary.</p>
			{:else}
				<ul class="max-h-72 overflow-y-auto divide-y divide-neutral-100">
					{#each breakPreviewWords as w (w.Simplified)}
						<li class="flex items-center gap-3 px-4 py-2">
							<input
								type="checkbox"
								checked={breakSelectedWords.has(w.Simplified)}
								onchange={() => toggleBreakWord(w.Simplified)}
								class="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
							/>
							<span class="text-xl font-medium">{w.Simplified}</span>
							<span class="text-xs text-neutral-500 truncate">{w.Pinyin} — {w.Definitions.split(' │ ')[0]}</span>
						</li>
					{/each}
				</ul>
			{/if}
			<div class="flex gap-2 border-t border-neutral-200 px-4 py-3">
				<button
					class={btnPrimary}
					onclick={addSelectedBreakWords}
					disabled={breakSelectedWords.size === 0}
				>
					Add selected ({breakSelectedWords.size})
				</button>
				<button
					class={btnSecondary}
					onclick={() => {
						showBreakModal = false;
						showBreakToast = false;
						translateFailedWords = [];
						breakPreviewWords = [];
						breakSelectedWords = new Set();
					}}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
