<script lang="ts">
	/** Character worksheets: a rich study page per character, and a dense
	 * multi-character practice sheet with a configurable grid. Both always on
	 * the page — no picker to switch between them. */
	import { buildWorksheetPdf } from '$lib/pdf/worksheetPdf';
	import { buildPracticeSheetPdf, type PracticeSheetOptions } from '$lib/pdf/practiceSheetPdf';
	import { btnPrimary } from '$lib/buttonStyles';
	import ToolWordInput from '$lib/components/ToolWordInput.svelte';
	import Download from '@lucide/svelte/icons/download';
	import Eye from '@lucide/svelte/icons/eye';

	let wordsText = $state('');
	const firstWord = $derived(wordsText.split(/\s+/).find(Boolean) ?? '');

	function save(blob: Blob, name: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		a.rel = 'noopener';
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
	}

	const fieldLabel = 'text-sm text-neutral-600';
	const fieldInput = 'mt-1 w-full rounded-md border border-neutral-200 px-2 py-1.5 text-sm';
	const fieldSelect = fieldInput;

	// ── Study page ─────────────────────────────────────────────────────────
	let boxesPerRow = $state(10);
	let traceCount = $state(5);
	let showStrokeOrder = $state(true);

	let studyBuilding = $state(false);
	let studyError = $state('');
	let studyUnsupported = $state<string[]>([]);
	let studyTruncated = $state(0);
	let studyPreviewUrl = $state('');
	let studyPreviewLoading = $state(false);
	let studyPreviewError = $state('');

	function studyOptions() {
		return { boxesPerRow, traceCount, showStrokeOrder };
	}

	async function generateStudy() {
		const words = wordsText.split(/\s+/).filter(Boolean);
		if (!words.length || studyBuilding) return;
		studyBuilding = true;
		studyError = '';
		studyUnsupported = [];
		studyTruncated = 0;
		try {
			const result = await buildWorksheetPdf(words, studyOptions());
			studyUnsupported = result.unsupported;
			studyTruncated = result.truncated;
			save(new Blob([result.bytes.slice()], { type: 'application/pdf' }), 'worksheet.pdf');
		} catch (e) {
			studyError = e instanceof Error ? e.message : String(e);
		} finally {
			studyBuilding = false;
		}
	}

	let studyPreviewToken = 0;
	function setStudyPreviewUrl(url: string) {
		if (studyPreviewUrl) URL.revokeObjectURL(studyPreviewUrl);
		studyPreviewUrl = url;
	}
	$effect(() => {
		const word = firstWord;
		const opts = studyOptions();
		const token = ++studyPreviewToken;
		if (!word) {
			setStudyPreviewUrl('');
			studyPreviewError = '';
			return;
		}
		const timer = setTimeout(async () => {
			studyPreviewLoading = true;
			studyPreviewError = '';
			try {
				const result = await buildWorksheetPdf([word], opts);
				if (token !== studyPreviewToken) return;
				setStudyPreviewUrl(URL.createObjectURL(new Blob([result.bytes.slice()], { type: 'application/pdf' })));
			} catch (e) {
				if (token === studyPreviewToken) studyPreviewError = e instanceof Error ? e.message : String(e);
			} finally {
				if (token === studyPreviewToken) studyPreviewLoading = false;
			}
		}, 400);
		return () => clearTimeout(timer);
	});

	// ── Practice sheet ─────────────────────────────────────────────────────
	let gridSize = $state<PracticeSheetOptions['gridSize']>('medium');
	let orientation = $state<PracticeSheetOptions['orientation']>('landscape');
	let gridStyle = $state<PracticeSheetOptions['gridStyle']>('mi');
	let gridColor = $state('#b3b3b3');
	let phonetics = $state<PracticeSheetOptions['phonetics']>('above');
	let toneColors = $state(true);
	let pinyinRuled = $state(true);
	let hintCount = $state(1);
	let hintStrength = $state<PracticeSheetOptions['hintStrength']>('solid');
	let strokeOrderMode = $state<PracticeSheetOptions['strokeOrder']>('row');
	let practiceTraceCount = $state(4);
	let traceStrength = $state<PracticeSheetOptions['traceStrength']>('faded');
	let traceColor = $state('#9e9e9e');
	let blankCount = $state(3);

	let practiceBuilding = $state(false);
	let practiceError = $state('');
	let practiceUnsupported = $state<string[]>([]);
	let practicePreviewUrl = $state('');
	let practicePreviewLoading = $state(false);
	let practicePreviewError = $state('');

	function practiceOptions(): PracticeSheetOptions {
		return {
			gridSize,
			orientation,
			gridStyle,
			gridColor,
			phonetics,
			toneColors,
			pinyinRuled,
			hintCount,
			hintStrength,
			strokeOrder: strokeOrderMode,
			traceCount: practiceTraceCount,
			traceStrength,
			traceColor,
			blankCount
		};
	}

	async function generatePractice() {
		const words = wordsText.split(/\s+/).filter(Boolean);
		if (!words.length || practiceBuilding) return;
		practiceBuilding = true;
		practiceError = '';
		practiceUnsupported = [];
		try {
			const result = await buildPracticeSheetPdf(words, practiceOptions());
			practiceUnsupported = result.unsupported;
			save(new Blob([result.bytes.slice()], { type: 'application/pdf' }), 'practice-sheet.pdf');
		} catch (e) {
			practiceError = e instanceof Error ? e.message : String(e);
		} finally {
			practiceBuilding = false;
		}
	}

	let practicePreviewToken = 0;
	function setPracticePreviewUrl(url: string) {
		if (practicePreviewUrl) URL.revokeObjectURL(practicePreviewUrl);
		practicePreviewUrl = url;
	}
	$effect(() => {
		const word = firstWord;
		const opts = practiceOptions();
		const token = ++practicePreviewToken;
		if (!word) {
			setPracticePreviewUrl('');
			practicePreviewError = '';
			return;
		}
		const timer = setTimeout(async () => {
			practicePreviewLoading = true;
			practicePreviewError = '';
			try {
				const result = await buildPracticeSheetPdf([word], opts);
				if (token !== practicePreviewToken) return;
				setPracticePreviewUrl(URL.createObjectURL(new Blob([result.bytes.slice()], { type: 'application/pdf' })));
			} catch (e) {
				if (token === practicePreviewToken) practicePreviewError = e instanceof Error ? e.message : String(e);
			} finally {
				if (token === practicePreviewToken) practicePreviewLoading = false;
			}
		}, 400);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>Worksheet generator · Anki xiehanzi</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-5 py-10">
	<header class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">Worksheet generator</h1>
		<p class="mt-2 max-w-2xl text-neutral-600">
			One word list, two printable sheets: a rich study page with vocabulary and example
			sentences, and a dense, configurable practice sheet of guide boxes.
		</p>
	</header>

	<ToolWordInput bind:value={wordsText} />

	<!-- ── Study page ────────────────────────────────────────────────────── -->
	<div class="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
		<div class="min-w-0">
			<h2 class="text-lg font-semibold text-neutral-900">Study page</h2>
			<p class="mt-1 text-sm text-neutral-500">One rich page per character: card, vocabulary, examples, stroke order, practice grid.</p>

			<div class="mt-5 grid gap-4 sm:grid-cols-3">
				<label class={fieldLabel}>
					Boxes per row
					<input type="number" min="4" max="16" bind:value={boxesPerRow} class={fieldInput} />
				</label>
				<label class={fieldLabel}>
					Traced boxes
					<input type="number" min="0" max="20" bind:value={traceCount} class={fieldInput} />
				</label>
				<label class="flex items-center gap-2 text-sm text-neutral-600 sm:mt-6">
					<input type="checkbox" bind:checked={showStrokeOrder} />
					Show stroke order
				</label>
			</div>

			<button
				type="button"
				onclick={generateStudy}
				disabled={studyBuilding || !wordsText.trim()}
				class="{btnPrimary} mt-6 inline-flex items-center gap-2"
			>
				<Download size={15} />
				{studyBuilding ? 'Generating…' : 'Generate study page PDF'}
			</button>

			{#if studyError}<p class="mt-3 text-sm text-red-600">{studyError}</p>{/if}
			{#if studyTruncated}
				<p class="mt-3 text-sm text-amber-700">
					Only the first 40 characters were used — one full page each adds up fast for a big list.
					{studyTruncated} more were dropped.
				</p>
			{/if}
			{#if studyUnsupported.length}
				<p class="mt-3 text-sm text-amber-700">
					{studyUnsupported.length} character{studyUnsupported.length === 1 ? '' : 's'} skipped — no
					stroke data available: <span lang="zh-Hans">{studyUnsupported.join(' ')}</span>
				</p>
			{/if}
		</div>

		<aside class="lg:sticky lg:top-20 lg:self-start">
			<div class="mb-2 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-neutral-400">
				<Eye size={13} /> Preview {firstWord ? `· ${firstWord}` : ''}
			</div>
			<div class="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50" style="aspect-ratio: 210/297;">
				{#if studyPreviewUrl}
					<iframe src={studyPreviewUrl} title="Study page preview" class="h-full w-full" class:opacity-50={studyPreviewLoading}></iframe>
				{:else if studyPreviewLoading}
					<div class="flex h-full items-center justify-center text-sm text-neutral-400">Rendering…</div>
				{:else if studyPreviewError}
					<div class="flex h-full items-center justify-center p-4 text-center text-sm text-red-500">{studyPreviewError}</div>
				{:else}
					<div class="flex h-full items-center justify-center p-4 text-center text-sm text-neutral-400">
						Type a word or character to see a preview.
					</div>
				{/if}
			</div>
			<p class="mt-2 text-xs text-neutral-400">Shows the first character only — the real file covers every word.</p>
		</aside>
	</div>

	<hr class="my-10 border-neutral-200" />

	<!-- ── Practice sheet ────────────────────────────────────────────────── -->
	<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
		<div class="min-w-0">
			<h2 class="text-lg font-semibold text-neutral-900">Practice sheet</h2>
			<p class="mt-1 text-sm text-neutral-500">A dense grid, one row per character, across the whole word list.</p>

			<div class="mt-5 space-y-5">
				<section class="rounded-xl border border-neutral-200 p-4">
					<h3 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Page & grid</h3>
					<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
						<label class={fieldLabel}>
							Grid size
							<select bind:value={gridSize} class={fieldSelect}>
								<option value="small">Small</option>
								<option value="medium">Medium</option>
								<option value="large">Large</option>
							</select>
						</label>
						<label class={fieldLabel}>
							Page orientation
							<select bind:value={orientation} class={fieldSelect}>
								<option value="landscape">A4 landscape</option>
								<option value="portrait">A4 portrait</option>
							</select>
						</label>
						<label class={fieldLabel}>
							Box style
							<select bind:value={gridStyle} class={fieldSelect}>
								<option value="mi">米 mi-zi-ge</option>
								<option value="tian">田 tian-zi-ge</option>
								<option value="hui">回 nested box</option>
								<option value="dotted">Dotted cross</option>
								<option value="blank">Blank box</option>
							</select>
						</label>
						<label class={fieldLabel}>
							Guide color
							<input type="color" bind:value={gridColor} class="mt-1 h-9 w-full rounded-md border border-neutral-200" />
						</label>
					</div>
				</section>

				<section class="rounded-xl border border-neutral-200 p-4">
					<h3 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Pinyin</h3>
					<div class="grid gap-4 sm:grid-cols-3">
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
						<label class="flex items-center gap-2 text-sm text-neutral-600 sm:mt-6">
							<input type="checkbox" bind:checked={pinyinRuled} />
							Ruled line under pinyin
						</label>
					</div>
				</section>

				<section class="rounded-xl border border-neutral-200 p-4">
					<h3 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Stroke order</h3>
					<div class="grid gap-4 sm:grid-cols-3">
						<label class={fieldLabel}>
							Mode
							<select bind:value={strokeOrderMode} class={fieldSelect}>
								<option value="row">Preview row above the grid</option>
								<option value="per-box">One stroke per box</option>
								<option value="off">Off</option>
							</select>
						</label>
					</div>
				</section>

				<section class="rounded-xl border border-neutral-200 p-4">
					<h3 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
						Hint boxes <span class="font-normal normal-case text-neutral-400">— full guide glyph</span>
					</h3>
					<div class="grid gap-4 sm:grid-cols-3">
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
					</div>
				</section>

				<section class="rounded-xl border border-neutral-200 p-4">
					<h3 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
						Trace boxes <span class="font-normal normal-case text-neutral-400">— faded, trace-over glyph</span>
					</h3>
					<div class="grid gap-4 sm:grid-cols-3">
						<label class={fieldLabel}>
							Repeat
							<input type="number" min="0" max="20" bind:value={practiceTraceCount} class={fieldInput} />
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
								<input type="color" bind:value={traceColor} class="mt-1 h-9 w-full rounded-md border border-neutral-200" />
							</label>
						{/if}
					</div>
				</section>

				<section class="rounded-xl border border-neutral-200 p-4">
					<h3 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
						Blank boxes <span class="font-normal normal-case text-neutral-400">— no guide at all</span>
					</h3>
					<label class="{fieldLabel} block max-w-[10rem]">
						Repeat
						<input type="number" min="0" max="20" bind:value={blankCount} class={fieldInput} />
					</label>
				</section>
			</div>

			<button
				type="button"
				onclick={generatePractice}
				disabled={practiceBuilding || !wordsText.trim()}
				class="{btnPrimary} mt-6 inline-flex items-center gap-2"
			>
				<Download size={15} />
				{practiceBuilding ? 'Generating…' : 'Generate practice sheet PDF'}
			</button>

			{#if practiceError}<p class="mt-3 text-sm text-red-600">{practiceError}</p>{/if}
			{#if practiceUnsupported.length}
				<p class="mt-3 text-sm text-amber-700">
					{practiceUnsupported.length} character{practiceUnsupported.length === 1 ? '' : 's'} skipped —
					no stroke data available: <span lang="zh-Hans">{practiceUnsupported.join(' ')}</span>
				</p>
			{/if}
		</div>

		<aside class="lg:sticky lg:top-20 lg:self-start">
			<div class="mb-2 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-neutral-400">
				<Eye size={13} /> Preview {firstWord ? `· ${firstWord}` : ''}
			</div>
			<div
				class="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
				style="aspect-ratio: {orientation === 'landscape' ? '297/210' : '210/297'};"
			>
				{#if practicePreviewUrl}
					<iframe src={practicePreviewUrl} title="Practice sheet preview" class="h-full w-full" class:opacity-50={practicePreviewLoading}></iframe>
				{:else if practicePreviewLoading}
					<div class="flex h-full items-center justify-center text-sm text-neutral-400">Rendering…</div>
				{:else if practicePreviewError}
					<div class="flex h-full items-center justify-center p-4 text-center text-sm text-red-500">{practicePreviewError}</div>
				{:else}
					<div class="flex h-full items-center justify-center p-4 text-center text-sm text-neutral-400">
						Type a word or character to see a preview.
					</div>
				{/if}
			</div>
			<p class="mt-2 text-xs text-neutral-400">Shows the first character only — the real file covers every word.</p>
		</aside>
	</div>
</div>
