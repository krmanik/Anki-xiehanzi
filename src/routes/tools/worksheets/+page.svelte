<script lang="ts">
	/** One worksheet generator, one Template dropdown picking which layout it
	 * builds — a single word list, a single options panel, a single Generate
	 * button and preview, whichever template is selected. */
	import { buildWorksheetPdf } from '$lib/pdf/worksheetPdf';
	import { buildPracticeSheetPdf, type PracticeSheetOptions } from '$lib/pdf/practiceSheetPdf';
	import { btnPrimary, btnSecondary } from '$lib/buttonStyles';
	import ToolWordInput from '$lib/components/ToolWordInput.svelte';
	import Download from '@lucide/svelte/icons/download';
	import Eye from '@lucide/svelte/icons/eye';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	type Template = 'practice' | 'study';
	let template = $state<Template>('practice');

	let wordsText = $state('');
	const words = $derived(wordsText.split(/\s+/).filter(Boolean));
	const firstWord = $derived(words[0] ?? '');
	const charCount = $derived(new Set([...words.join('')].filter((ch) => !/\s/.test(ch))).size);

	const fieldLabel = 'text-sm text-neutral-600';
	const fieldInput = 'mt-1 w-full rounded-md border border-neutral-200 px-2 py-1.5 text-sm';
	const fieldSelect = fieldInput;
	const colorInput = 'mt-1 h-9 w-full rounded-md border border-neutral-200';

	const GRID_STYLE_OPTIONS: { id: NonNullable<PracticeSheetOptions['gridStyle']>; label: string }[] = [
		{ id: 'blank', label: 'Blank' },
		{ id: 'tian', label: 'Crosshair' },
		{ id: 'dotted', label: 'Dotted cross' },
		{ id: 'mi', label: 'Diagonal grid' },
		{ id: 'hui', label: 'Nested box' }
	];

	// ── Shared grid look — the practice grid AND the study page's practice
	// section both draw through this, so picking a box style once applies
	// everywhere a grid appears. ─────────────────────────────────────────
	let gridStyle = $state<PracticeSheetOptions['gridStyle']>('mi');
	let gridColor = $state('#d9d9d9');

	// ── Study page options ────────────────────────────────────────────────
	let boxesPerRow = $state(10);
	let studyTraceCount = $state(5);
	let showStrokeOrder = $state(true);
	let showPinyin = $state(true);
	let showDefinition = $state(true);
	let showVocabulary = $state(true);
	let vocabCount = $state(5);
	let showExamples = $state(true);
	let exampleCount = $state(4);

	function studyOptions() {
		return {
			boxesPerRow,
			traceCount: studyTraceCount,
			gridStyle,
			gridColor,
			showStrokeOrder,
			showPinyin,
			showDefinition,
			showVocabulary,
			vocabCount,
			showExamples,
			exampleCount
		};
	}

	// ── Practice sheet options ───────────────────────────────────────────
	let layout = $state<PracticeSheetOptions['layout']>('grid');
	let unit = $state<PracticeSheetOptions['unit']>('char');
	let gridSize = $state<PracticeSheetOptions['gridSize']>('medium');
	let orientation = $state<PracticeSheetOptions['orientation']>('portrait');
	let phonetics = $state<PracticeSheetOptions['phonetics']>('above');
	let toneColors = $state(true);
	let pinyinRuled = $state(true);
	let showMeaning = $state(false);
	let hintCount = $state(1);
	let hintStrength = $state<PracticeSheetOptions['hintStrength']>('solid');
	let useHintColor = $state(false);
	let hintColor = $state('#212121');
	let strokeOrderMode = $state<PracticeSheetOptions['strokeOrder']>('row');
	let traceCount = $state(4);
	let traceStrength = $state<PracticeSheetOptions['traceStrength']>('faded');
	let traceColor = $state('#9e9e9e');
	let blankCount = $state(3);
	let rowsPerItem = $state(1);
	let fillPage = $state(false);
	let repeatCount = $state(3);

	function practiceOptions(): PracticeSheetOptions {
		return {
			layout,
			unit,
			gridSize,
			orientation,
			gridStyle,
			gridColor,
			phonetics,
			toneColors,
			pinyinRuled,
			showMeaning,
			hintCount,
			hintStrength,
			hintColor: useHintColor ? hintColor : undefined,
			strokeOrder: strokeOrderMode,
			traceCount,
			traceStrength,
			traceColor,
			blankCount,
			rowsPerItem,
			fillPage,
			repeatCount
		};
	}

	// ── Templates — a gallery of starting points, not a fork in the tool.
	// Picking one just fills in the same options above; every field stays
	// editable afterwards. ────────────────────────────────────────────────
	interface TemplateDef {
		id: string;
		name: string;
		description: string;
		apply: () => void;
	}
	const TEMPLATES: TemplateDef[] = [
		{
			id: 'char-grid',
			name: 'Character Grid',
			description: 'One row per character, a plain guide-box grid.',
			apply: () => {
				template = 'practice';
				layout = 'grid';
				unit = 'char';
				rowsPerItem = 1;
				fillPage = false;
				gridSize = 'medium';
				gridStyle = 'mi';
				phonetics = 'above';
				toneColors = true;
				showMeaning = false;
				hintCount = 1;
				hintStrength = 'solid';
				strokeOrderMode = 'off';
				traceCount = 4;
				traceStrength = 'faded';
				blankCount = 3;
			}
		},
		{
			id: 'stroke-order',
			name: 'Stroke Order Practice',
			description: 'A cumulative stroke-order preview above every row.',
			apply: () => {
				template = 'practice';
				layout = 'grid';
				unit = 'char';
				rowsPerItem = 1;
				fillPage = false;
				gridSize = 'medium';
				gridStyle = 'tian';
				phonetics = 'above';
				toneColors = true;
				showMeaning = false;
				hintCount = 1;
				hintStrength = 'solid';
				strokeOrderMode = 'row';
				traceCount = 3;
				traceStrength = 'faded';
				blankCount = 2;
			}
		},
		{
			id: 'big-bold',
			name: 'Big & Bold',
			description: 'Large boxes, one stroke revealed per box — good for young beginners.',
			apply: () => {
				template = 'practice';
				layout = 'grid';
				unit = 'char';
				rowsPerItem = 1;
				fillPage = false;
				gridSize = 'large';
				gridStyle = 'hui';
				phonetics = 'above';
				toneColors = true;
				showMeaning = false;
				hintCount = 1;
				hintStrength = 'solid';
				strokeOrderMode = 'per-box';
				traceCount = 4;
				traceStrength = 'color';
				blankCount = 2;
			}
		},
		{
			id: 'char-meaning',
			name: 'Character + Meaning',
			description: 'Each row adds the character’s English meaning under its pinyin.',
			apply: () => {
				template = 'practice';
				layout = 'grid';
				unit = 'char';
				rowsPerItem = 1;
				fillPage = false;
				gridSize = 'medium';
				gridStyle = 'mi';
				phonetics = 'above';
				toneColors = true;
				showMeaning = true;
				hintCount = 1;
				hintStrength = 'solid';
				strokeOrderMode = 'off';
				traceCount = 4;
				traceStrength = 'faded';
				blankCount = 2;
			}
		},
		{
			id: 'blank-drill',
			name: 'Blank Drill',
			description: 'No hints at all — just blank boxes, for testing recall.',
			apply: () => {
				template = 'practice';
				layout = 'grid';
				unit = 'char';
				rowsPerItem = 2;
				fillPage = false;
				gridSize = 'small';
				gridStyle = 'dotted';
				phonetics = 'none';
				showMeaning = false;
				hintCount = 0;
				strokeOrderMode = 'off';
				traceCount = 0;
				blankCount = 0;
			}
		},
		{
			id: 'sentence-copybook',
			name: 'Sentence Copybook',
			description: 'The whole line, copied out box by box, repeated down the page.',
			apply: () => {
				template = 'practice';
				layout = 'sentence';
				unit = 'char';
				rowsPerItem = 1;
				fillPage = false;
				gridSize = 'medium';
				gridStyle = 'mi';
				orientation = 'landscape';
				phonetics = 'above';
				toneColors = true;
				repeatCount = 3;
			}
		},
		{
			id: 'word-practice',
			name: 'Word Practice',
			description: 'One row per word — a 2-3 character word gets a box for every character in it.',
			apply: () => {
				template = 'practice';
				layout = 'grid';
				unit = 'word';
				rowsPerItem = 1;
				fillPage = false;
				gridSize = 'medium';
				gridStyle = 'mi';
				phonetics = 'above';
				toneColors = true;
				showMeaning = true;
				hintCount = 1;
				hintStrength = 'solid';
				strokeOrderMode = 'off';
				traceCount = 3;
				traceStrength = 'faded';
				blankCount = 1;
			}
		},
		{
			id: 'full-page',
			name: 'Full Page Practice',
			description: 'One character (or word) fills the rest of the page with boxes.',
			apply: () => {
				template = 'practice';
				layout = 'grid';
				unit = 'char';
				rowsPerItem = 1;
				fillPage = true;
				gridSize = 'medium';
				gridStyle = 'mi';
				phonetics = 'above';
				toneColors = true;
				showMeaning = false;
				hintCount = 1;
				hintStrength = 'solid';
				strokeOrderMode = 'off';
				traceCount = 4;
				traceStrength = 'faded';
				blankCount = 0;
			}
		},
		{
			id: 'study-page',
			name: 'Vocabulary Study Page',
			description: 'One rich page per character: card, vocabulary, examples, stroke order, practice grid.',
			apply: () => {
				template = 'study';
				gridStyle = 'mi';
				boxesPerRow = 10;
				studyTraceCount = 5;
				showStrokeOrder = true;
				showPinyin = true;
				showDefinition = true;
				showVocabulary = true;
				vocabCount = 5;
				showExamples = true;
				exampleCount = 4;
			}
		}
	];
	let activeTemplate = $state('char-grid');
	function pickTemplate(t: TemplateDef) {
		activeTemplate = t.id;
		t.apply();
	}

	// ── Build / download / preview — one flow, branching on `template` ─────
	let building = $state(false);
	let error = $state('');
	let unsupported = $state<string[]>([]);
	let truncated = $state(0);

	function save(bytes: Uint8Array, name: string) {
		const url = URL.createObjectURL(new Blob([bytes.slice()], { type: 'application/pdf' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		a.rel = 'noopener';
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
	}

	async function build(list: string[]) {
		return template === 'study'
			? { ...(await buildWorksheetPdf(list, studyOptions())), name: 'worksheet.pdf' }
			: { ...(await buildPracticeSheetPdf(list, practiceOptions())), truncated: 0, name: 'practice-sheet.pdf' };
	}

	async function generate() {
		if (!words.length || building) return;
		building = true;
		error = '';
		unsupported = [];
		truncated = 0;
		try {
			const result = await build(words);
			unsupported = result.unsupported;
			truncated = result.truncated;
			save(result.bytes, result.name);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			building = false;
		}
	}

	let openingFull = $state(false);
	async function openFullPreview() {
		if (!words.length || openingFull) return;
		openingFull = true;
		error = '';
		try {
			const result = await build(words);
			const url = URL.createObjectURL(new Blob([result.bytes.slice()], { type: 'application/pdf' }));
			window.open(url, '_blank');
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			openingFull = false;
		}
	}

	// The live preview is the real PDF for the first character only, one
	// page, shown in the browser's own PDF viewer — pixel-accurate for free.
	let previewUrl = $state('');
	let previewLoading = $state(false);
	let previewError = $state('');

	let previewToken = 0;
	function setPreviewUrl(url: string) {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = url;
	}
	$effect(() => {
		const word = firstWord;
		const t = template;
		const opts = t === 'study' ? studyOptions() : practiceOptions();
		const token = ++previewToken;
		if (!word) {
			setPreviewUrl('');
			previewError = '';
			return;
		}
		const timer = setTimeout(async () => {
			previewLoading = true;
			previewError = '';
			try {
				const result =
					t === 'study'
						? await buildWorksheetPdf([word], opts as ReturnType<typeof studyOptions>)
						: await buildPracticeSheetPdf([word], opts as PracticeSheetOptions);
				if (token !== previewToken) return;
				setPreviewUrl(URL.createObjectURL(new Blob([result.bytes.slice()], { type: 'application/pdf' })));
			} catch (e) {
				if (token === previewToken) previewError = e instanceof Error ? e.message : String(e);
			} finally {
				if (token === previewToken) previewLoading = false;
			}
		}, 400);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>Worksheet generator · Anki xiehanzi</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10">
	<header class="mb-6">
		<h1 class="text-2xl font-bold tracking-tight text-neutral-900 sm:text-4xl">Worksheet generator</h1>
		<p class="mt-2 max-w-2xl text-sm text-neutral-600 sm:text-base">
			One word list, one PDF: a rich study page with vocabulary and example sentences, or a
			configurable practice sheet of guide boxes — pick the template below.
		</p>
	</header>

	<ToolWordInput bind:value={wordsText} />
	{#if charCount}
		<p class="mt-2 text-xs text-neutral-400">{charCount} unique character{charCount === 1 ? '' : 's'}</p>
	{/if}

	<div class="mt-6">
		<h2 class="mb-2 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Templates</h2>
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
			{#each TEMPLATES as t (t.id)}
				<button
					type="button"
					onclick={() => pickTemplate(t)}
					class="rounded-lg border p-3 text-left transition {activeTemplate === t.id
						? 'border-neutral-900 bg-neutral-50'
						: 'border-neutral-200 hover:border-neutral-400'}"
				>
					<span class="block text-sm font-medium text-neutral-900">{t.name}</span>
					<span class="mt-0.5 block text-xs text-neutral-500">{t.description}</span>
				</button>
			{/each}
		</div>
		<p class="mt-2 text-xs text-neutral-400">
			A template just fills in a starting point — every option below stays yours to change.
		</p>
	</div>

	{#snippet boxStylePicker()}
		<p class="mt-4 mb-2 {fieldLabel}">Box style</p>
		<div class="grid grid-cols-3 gap-2 sm:grid-cols-5">
			{#each GRID_STYLE_OPTIONS as opt (opt.id)}
				<button
					type="button"
					onclick={() => (gridStyle = opt.id)}
					class="flex flex-col items-center gap-1 rounded-lg border p-2 transition {gridStyle === opt.id
						? 'border-neutral-900 bg-neutral-50'
						: 'border-neutral-200 hover:border-neutral-400'}"
				>
					<svg viewBox="0 0 40 40" width="36" height="36" class="text-neutral-500">
						<rect x="2" y="2" width="36" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.75" />
						{#if opt.id === 'tian' || opt.id === 'mi'}
							<line x1="20" y1="2" x2="20" y2="38" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2.5" />
							<line x1="2" y1="20" x2="38" y2="20" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2.5" />
						{/if}
						{#if opt.id === 'mi'}
							<line x1="2" y1="2" x2="38" y2="38" stroke="currentColor" stroke-width="1" />
							<line x1="2" y1="38" x2="38" y2="2" stroke="currentColor" stroke-width="1" />
						{/if}
						{#if opt.id === 'dotted'}
							<line x1="20" y1="2" x2="20" y2="38" stroke="currentColor" stroke-width="1.5" stroke-dasharray="1 2.5" stroke-linecap="round" />
							<line x1="2" y1="20" x2="38" y2="20" stroke="currentColor" stroke-width="1.5" stroke-dasharray="1 2.5" stroke-linecap="round" />
						{/if}
						{#if opt.id === 'hui'}
							<rect x="9" y="9" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.25" />
						{/if}
					</svg>
					<span class="text-[11px] leading-tight text-neutral-600">{opt.label}</span>
				</button>
			{/each}
		</div>
	{/snippet}

	<div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
		<div class="min-w-0 space-y-5">
			{#if template === 'study'}
				<section class="rounded-xl border border-neutral-200 p-4">
					<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Character card content</h2>
					<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
						<label class="flex items-center gap-2 text-sm text-neutral-600">
							<input type="checkbox" bind:checked={showPinyin} />
							Pinyin
						</label>
						<label class="flex items-center gap-2 text-sm text-neutral-600">
							<input type="checkbox" bind:checked={showDefinition} />
							Definition
						</label>
						<label class="flex items-center gap-2 text-sm text-neutral-600">
							<input type="checkbox" bind:checked={showVocabulary} />
							Vocabulary
						</label>
						<label class="flex items-center gap-2 text-sm text-neutral-600">
							<input type="checkbox" bind:checked={showExamples} />
							Example sentences
						</label>
					</div>
					<div class="mt-3 grid grid-cols-2 gap-4 sm:w-1/2">
						{#if showVocabulary}
							<label class={fieldLabel}>
								Vocabulary words
								<input type="number" min="0" max="10" bind:value={vocabCount} class={fieldInput} />
							</label>
						{/if}
						{#if showExamples}
							<label class={fieldLabel}>
								Example sentences
								<input type="number" min="0" max="8" bind:value={exampleCount} class={fieldInput} />
							</label>
						{/if}
					</div>
				</section>

				<section class="rounded-xl border border-neutral-200 p-4">
					<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Practice section</h2>
					<label class="mb-3 flex items-center gap-2 text-sm text-neutral-600">
						<input type="checkbox" bind:checked={showStrokeOrder} />
						Show stroke order row
					</label>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
						<label class={fieldLabel}>
							Boxes per row
							<input type="number" min="4" max="16" bind:value={boxesPerRow} class={fieldInput} />
						</label>
						<label class={fieldLabel}>
							Traced boxes
							<input type="number" min="0" max="20" bind:value={studyTraceCount} class={fieldInput} />
						</label>
						<label class={fieldLabel}>
							Guide color
							<input type="color" bind:value={gridColor} class={colorInput} />
						</label>
					</div>
					{@render boxStylePicker()}
				</section>
			{:else}
				<section class="rounded-xl border border-neutral-200 p-4">
					<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Page & grid</h2>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
						<label class={fieldLabel}>
							Layout
							<select bind:value={layout} class={fieldSelect}>
								<option value="grid">Character grid</option>
								<option value="sentence">Sentence copybook</option>
							</select>
						</label>
						<label class={fieldLabel}>
							Grid size
							<select bind:value={gridSize} class={fieldSelect}>
								<option value="small">Small</option>
								<option value="medium">Medium</option>
								<option value="large">Large</option>
							</select>
						</label>
						<label class={fieldLabel}>
							Orientation
							<select bind:value={orientation} class={fieldSelect}>
								<option value="portrait">A4 portrait</option>
								<option value="landscape">A4 landscape</option>
							</select>
						</label>
						<label class={fieldLabel}>
							Guide color
							<input type="color" bind:value={gridColor} class={colorInput} />
						</label>
					</div>
					{@render boxStylePicker()}
				</section>

				<section class="rounded-xl border border-neutral-200 p-4">
					<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Pinyin</h2>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<label class={fieldLabel}>
							Display
							<select bind:value={phonetics} class={fieldSelect}>
								<option value="above">Above each row</option>
								<option value="below">Below each row</option>
								<option value="none">Hidden</option>
							</select>
						</label>
						<label class="flex items-center gap-2 text-sm text-neutral-600 sm:mt-6">
							<input type="checkbox" bind:checked={toneColors} />
							Use tone colors
						</label>
						{#if layout === 'grid'}
							<label class="flex items-center gap-2 text-sm text-neutral-600 sm:mt-6">
								<input type="checkbox" bind:checked={pinyinRuled} />
								Ruled line under pinyin
							</label>
						{/if}
					</div>
				</section>

				{#if layout === 'sentence'}
					<section class="rounded-xl border border-neutral-200 p-4">
						<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
							Repeat <span class="font-normal normal-case text-neutral-400">— how many times the line copies down the page</span>
						</h2>
						<label class="{fieldLabel} block max-w-[10rem]">
							Lines
							<input type="number" min="1" max="10" bind:value={repeatCount} class={fieldInput} />
						</label>
					</section>
				{:else}
					<section class="rounded-xl border border-neutral-200 p-4">
						<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Row content</h2>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<label class={fieldLabel}>
								Group by
								<select bind:value={unit} class={fieldSelect}>
									<option value="char">Character — one row per character</option>
									<option value="word">Word — one row per word, a box per character in it</option>
								</select>
							</label>
							<label class="flex items-center gap-2 text-sm text-neutral-600 sm:mt-6">
								<input type="checkbox" bind:checked={showMeaning} />
								Show English meaning under the pinyin
							</label>
						</div>
					</section>

					<section class="rounded-xl border border-neutral-200 p-4">
						<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Stroke order</h2>
						<label class={fieldLabel}>
							Mode
							<select bind:value={strokeOrderMode} class="{fieldSelect} max-w-xs">
								<option value="row">Preview row above the grid</option>
								<option value="per-box">One stroke per box</option>
								<option value="off">Off</option>
							</select>
						</label>
					</section>

					<section class="rounded-xl border border-neutral-200 p-4">
						<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
							Hint boxes <span class="font-normal normal-case text-neutral-400">— full guide glyph</span>
						</h2>
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<label class={fieldLabel}>
								Repeat
								<input type="number" min="0" max="10" bind:value={hintCount} class={fieldInput} />
							</label>
							<label class={fieldLabel}>
								Strength
								<select bind:value={hintStrength} class={fieldSelect}>
									<option value="solid">Solid</option>
									<option value="light">Light</option>
									<option value="ghost">Ghost</option>
								</select>
							</label>
							<label class="flex items-center gap-2 text-sm text-neutral-600 sm:mt-6">
								<input type="checkbox" bind:checked={useHintColor} />
								Custom color
							</label>
							{#if useHintColor}
								<input type="color" bind:value={hintColor} class="{colorInput} sm:mt-6" />
							{/if}
						</div>
					</section>

					<section class="rounded-xl border border-neutral-200 p-4">
						<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
							Trace boxes <span class="font-normal normal-case text-neutral-400">— faded, trace-over glyph</span>
						</h2>
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
							<label class={fieldLabel}>
								Repeat
								<input type="number" min="0" max="20" bind:value={traceCount} class={fieldInput} />
							</label>
							<label class={fieldLabel}>
								Style
								<select bind:value={traceStrength} class={fieldSelect}>
									<option value="faded">Faded gray</option>
									<option value="ghost">Ghost (very faint)</option>
									<option value="color">Tinted color</option>
								</select>
							</label>
							{#if traceStrength === 'color'}
								<label class={fieldLabel}>
									Color
									<input type="color" bind:value={traceColor} class={colorInput} />
								</label>
							{/if}
						</div>
					</section>

					<section class="rounded-xl border border-neutral-200 p-4">
						<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
							Blank boxes <span class="font-normal normal-case text-neutral-400">— no guide at all, added after the hints/traces above</span>
						</h2>
						<label class="{fieldLabel} block max-w-[10rem]">
							Minimum
							<input type="number" min="0" max="20" bind:value={blankCount} class={fieldInput} />
						</label>
					</section>

					<section class="rounded-xl border border-neutral-200 p-4">
						<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
							How far to fill <span class="font-normal normal-case text-neutral-400">— every row of boxes always reaches the page's right edge</span>
						</h2>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<label class={fieldLabel}>
								Rows per character{unit === 'word' ? '/word' : ''}
								<input
									type="number"
									min="1"
									max="20"
									bind:value={rowsPerItem}
									disabled={fillPage}
									class="{fieldInput} disabled:opacity-40"
								/>
							</label>
							<label class="flex items-center gap-2 text-sm text-neutral-600 sm:mt-6">
								<input type="checkbox" bind:checked={fillPage} />
								Fill the whole page instead — one item per page
							</label>
						</div>
					</section>
				{/if}
			{/if}

			<div class="flex flex-wrap gap-3">
				<button
					type="button"
					onclick={generate}
					disabled={building || !words.length}
					class="{btnPrimary} inline-flex items-center gap-2"
				>
					<Download size={15} />
					{building ? 'Generating…' : 'Generate PDF'}
				</button>
				<button
					type="button"
					onclick={openFullPreview}
					disabled={openingFull || !words.length}
					class="{btnSecondary} inline-flex items-center gap-2"
				>
					<ExternalLink size={15} />
					{openingFull ? 'Opening…' : 'Open full PDF in a new tab'}
				</button>
			</div>

			{#if error}<p class="text-sm text-red-600">{error}</p>{/if}
			{#if truncated}
				<p class="text-sm text-amber-700">
					Only the first 40 characters were used — one full page each adds up fast for a big list.
					{truncated} more were dropped.
				</p>
			{/if}
			{#if unsupported.length}
				<p class="text-sm text-amber-700">
					{unsupported.length} character{unsupported.length === 1 ? '' : 's'} skipped — no stroke
					data available: <span lang="zh-Hans">{unsupported.join(' ')}</span>
				</p>
			{/if}
		</div>

		<aside class="lg:sticky lg:top-20 lg:self-start">
			<div class="mb-2 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-neutral-400">
				<Eye size={13} /> Preview {firstWord ? `· ${firstWord}` : ''}
			</div>
			<div
				class="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
				style="aspect-ratio: {template === 'practice' && orientation === 'landscape' ? '297/210' : '210/297'};"
			>
				{#if previewUrl}
					<iframe src={previewUrl} title="Worksheet preview" class="h-full w-full" class:opacity-50={previewLoading}></iframe>
				{:else if previewLoading}
					<div class="flex h-full items-center justify-center text-sm text-neutral-400">Rendering…</div>
				{:else if previewError}
					<div class="flex h-full items-center justify-center p-4 text-center text-sm text-red-500">{previewError}</div>
				{:else}
					<div class="flex h-full items-center justify-center p-4 text-center text-sm text-neutral-400">
						Type a word or character to see a preview.
					</div>
				{/if}
			</div>
			<p class="mt-2 text-xs text-neutral-400">Live preview shows the first character only — the generated file covers every word.</p>
		</aside>
	</div>
</div>
