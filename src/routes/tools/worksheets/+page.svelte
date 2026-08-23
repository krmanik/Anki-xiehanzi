<script lang="ts">
	/** Character worksheets: a rich study page per character, or a dense
	 * multi-character practice sheet with a configurable grid. */
	import { buildWorksheetPdf } from '$lib/pdf/worksheetPdf';
	import { buildPracticeSheetPdf, type PracticeSheetOptions } from '$lib/pdf/practiceSheetPdf';
	import { btnPrimary } from '$lib/buttonStyles';
	import ToolWordInput from '$lib/components/ToolWordInput.svelte';
	import Download from '@lucide/svelte/icons/download';
	import Eye from '@lucide/svelte/icons/eye';

	type Template = 'study' | 'practice';
	let template = $state<Template>('study');

	let wordsText = $state('');

	// Study page options
	let boxesPerRow = $state(10);
	let traceCount = $state(5);
	let showStrokeOrder = $state(true);

	// Practice sheet options
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

	let building = $state(false);
	let error = $state('');
	let unsupported = $state<string[]>([]);
	let truncated = $state(0);

	let previewUrl = $state('');
	let previewLoading = $state(false);
	let previewError = $state('');

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

	function studyOptions() {
		return { boxesPerRow, traceCount, showStrokeOrder };
	}
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

	async function generate() {
		const words = wordsText.split(/\s+/).filter(Boolean);
		if (!words.length || building) return;
		building = true;
		error = '';
		unsupported = [];
		truncated = 0;
		try {
			if (template === 'study') {
				const result = await buildWorksheetPdf(words, studyOptions());
				unsupported = result.unsupported;
				truncated = result.truncated;
				save(new Blob([result.bytes.slice()], { type: 'application/pdf' }), 'worksheet.pdf');
			} else {
				const result = await buildPracticeSheetPdf(words, practiceOptions());
				unsupported = result.unsupported;
				save(new Blob([result.bytes.slice()], { type: 'application/pdf' }), 'practice-sheet.pdf');
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			building = false;
		}
	}

	// The preview is the real PDF for the first character/word, one page,
	// shown in the browser's own PDF viewer — pixel-accurate for free, no
	// second rendering path to keep in sync with the real generator.
	const firstWord = $derived(wordsText.split(/\s+/).find(Boolean) ?? '');

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

	const fieldLabel = 'text-sm text-neutral-600';
	const fieldInput = 'mt-1 w-full rounded-md border border-neutral-200 px-2 py-1.5 text-sm';
	const fieldSelect = fieldInput;
</script>

<svelte:head>
	<title>Worksheet generator · Anki xiehanzi</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-5 py-10">
	<header class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">Worksheet generator</h1>
		<p class="mt-2 max-w-2xl text-neutral-600">
			Two ways to print a character to practice: a rich study page with vocabulary and example
			sentences, or a dense, configurable practice sheet — rows of guide boxes across a whole
			word list.
		</p>
	</header>

	<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
		<div class="min-w-0">
			<label class="mb-5 block max-w-xs {fieldLabel}">
				Template
				<select bind:value={template} class={fieldSelect}>
					<option value="study">Study page — one rich page per character</option>
					<option value="practice">Practice sheet — dense grid, one row per character</option>
				</select>
			</label>

			<ToolWordInput bind:value={wordsText} />

			{#if template === 'study'}
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
			{:else}
				<div class="mt-5 space-y-5">
					<section class="rounded-xl border border-neutral-200 p-4">
						<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Page & grid</h2>
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
						<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Pinyin</h2>
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
						<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Stroke order</h2>
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
						<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
							Hint boxes <span class="font-normal normal-case text-neutral-400">— full guide glyph</span>
						</h2>
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
						<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
							Trace boxes <span class="font-normal normal-case text-neutral-400">— faded, trace-over glyph</span>
						</h2>
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
						<h2 class="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
							Blank boxes <span class="font-normal normal-case text-neutral-400">— no guide at all</span>
						</h2>
						<label class="{fieldLabel} block max-w-[10rem]">
							Repeat
							<input type="number" min="0" max="20" bind:value={blankCount} class={fieldInput} />
						</label>
					</section>
				</div>
			{/if}

			<button
				type="button"
				onclick={generate}
				disabled={building || !wordsText.trim()}
				class="{btnPrimary} mt-6 inline-flex items-center gap-2"
			>
				<Download size={15} />
				{building ? 'Generating…' : 'Generate PDF'}
			</button>

			{#if error}<p class="mt-3 text-sm text-red-600">{error}</p>{/if}
			{#if truncated}
				<p class="mt-3 text-sm text-amber-700">
					Only the first 40 characters were used — one full page each adds up fast for a big list.
					{truncated} more were dropped.
				</p>
			{/if}
			{#if unsupported.length}
				<p class="mt-3 text-sm text-amber-700">
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
			<p class="mt-2 text-xs text-neutral-400">Shows the first character only — the real file covers every word.</p>
		</aside>
	</div>
</div>
