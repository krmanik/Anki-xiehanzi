<script lang="ts">
	import { PageHeader } from '$lib/ui';
	/** Two-sided printable flashcard PDF — full control over what's on each
	 * side, a template gallery of starting points (every option stays
	 * editable after picking one, same convention as /tools/worksheets),
	 * a card-style picker, and a live preview of the real PDF. */
	import { buildFlashcardPdf, FLASHCARD_FIELDS, type FlashcardFieldId, type CardStyle } from '$lib/pdf/flashcardPdf';
	import { btnPrimary, btnSecondary } from '$lib/buttonStyles';
	import ToolWordInput from '$lib/components/ToolWordInput.svelte';
	import Download from '@lucide/svelte/icons/download';
	import Eye from '@lucide/svelte/icons/eye';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
	import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

	// Same reasoning as the worksheets page: a blob-URL iframe/embed depends on
	// the browser's own PDF viewer plugin, which headless/automated Chromium
	// never has. Rendering with pdf.js onto a canvas has no such dependency.
	GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

	async function renderPdfPreview(bytes: Uint8Array, pageNumber: number, canvas: HTMLCanvasElement): Promise<void> {
		const loadingTask = getDocument({ data: bytes.slice() });
		try {
			const pdf = await loadingTask.promise;
			const pg = await pdf.getPage(Math.min(pageNumber, pdf.numPages));
			const viewport = pg.getViewport({ scale: 2 });
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			await pg.render({ canvasContext: ctx, viewport, canvas }).promise;
		} finally {
			await loadingTask.destroy();
		}
	}

	let wordsText = $state('');
	const words = $derived(wordsText.split(/\s+/).filter(Boolean));

	const fieldLabel = 'text-sm text-muted';
	const fieldInput = 'mt-1 w-full min-h-10 rounded-card border-0 bg-sunk px-3 text-sm text-ink transition-[background-color,box-shadow] focus:bg-surface focus:ring-2 focus:ring-accent';

	let front = $state<FlashcardFieldId[]>(['hanzi-simplified']);
	let back = $state<FlashcardFieldId[]>(['pinyin', 'meaning']);
	let cardStyle = $state<CardStyle>('bordered');
	let cols = $state(4);
	let rows = $state(5);
	let strokeOrderSteps = $state(4);
	const needsStrokeSteps = $derived(front.includes('stroke-order') || back.includes('stroke-order'));

	function toggleField(side: 'front' | 'back', id: FlashcardFieldId, checked: boolean) {
		const list = side === 'front' ? front : back;
		const next = checked ? [...list, id] : list.filter((f) => f !== id);
		// Keep canonical order regardless of the order checkboxes were toggled in.
		const ordered = FLASHCARD_FIELDS.map((f) => f.id).filter((id) => next.includes(id));
		if (side === 'front') front = ordered;
		else back = ordered;
	}

	const CARD_STYLES: { id: CardStyle; label: string; description: string }[] = [
		{ id: 'bordered', label: 'Bordered', description: 'A plain hairline border around each card.' },
		{ id: 'tone-tint', label: 'Tone tint', description: "A light wash of the word's tone color." },
		{ id: 'minimal', label: 'Minimal', description: 'No border or fill — just the content.' }
	];

	interface TemplateDef {
		id: string;
		name: string;
		description: string;
		apply: () => void;
	}
	const TEMPLATES: TemplateDef[] = [
		{
			id: 'classic',
			name: 'Classic',
			description: 'Hanzi on the front, pinyin + meaning on the back.',
			apply: () => {
				front = ['hanzi-simplified'];
				back = ['pinyin', 'meaning'];
				cardStyle = 'bordered';
			}
		},
		{
			id: 'reading',
			name: 'Reading',
			description: 'Hanzi + pinyin on the front, meaning on the back.',
			apply: () => {
				front = ['hanzi-simplified', 'pinyin'];
				back = ['meaning'];
				cardStyle = 'bordered';
			}
		},
		{
			id: 'recall',
			name: 'Recall Drill',
			description: 'Meaning on the front — recall the character.',
			apply: () => {
				front = ['meaning'];
				back = ['hanzi-simplified', 'pinyin'];
				cardStyle = 'bordered';
			}
		},
		{
			id: 'stroke-practice',
			name: 'Stroke Practice',
			description: 'Hanzi + a stroke-order strip on the front, pinyin + meaning on the back.',
			apply: () => {
				front = ['hanzi-simplified', 'stroke-order'];
				back = ['pinyin', 'meaning'];
				cardStyle = 'bordered';
				strokeOrderSteps = 4;
			}
		},
		{
			id: 'full-study',
			name: 'Full Study',
			description: 'Traditional form, pinyin, meaning, level and measure word all on the back.',
			apply: () => {
				front = ['hanzi-simplified'];
				back = ['hanzi-traditional', 'pinyin', 'meaning', 'level', 'classifier'];
				cardStyle = 'tone-tint';
			}
		},
		{
			id: 'exam',
			name: 'HSK Exam',
			description: 'Hanzi on the front; pinyin, full definitions and level on the back.',
			apply: () => {
				front = ['hanzi-simplified'];
				back = ['pinyin', 'definitions', 'level'];
				cardStyle = 'bordered';
			}
		}
	];
	let activeTemplate = $state('classic');
	function pickTemplate(t: TemplateDef) {
		activeTemplate = t.id;
		t.apply();
	}

	function options() {
		return { cols, rows, front, back, cardStyle, strokeOrderSteps };
	}

	let building = $state(false);
	let error = $state('');
	let unsupported = $state<string[]>([]);

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

	async function generate() {
		if (!words.length || building) return;
		building = true;
		error = '';
		unsupported = [];
		try {
			const result = await buildFlashcardPdf(words, options());
			unsupported = result.unsupported;
			save(result.bytes, 'flashcards.pdf');
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
			const result = await buildFlashcardPdf(words, options());
			const url = URL.createObjectURL(new Blob([result.bytes.slice()], { type: 'application/pdf' }));
			window.open(url, '_blank');
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			openingFull = false;
		}
	}

	let previewSide = $state<'front' | 'back'>('front');
	let previewCanvas = $state<HTMLCanvasElement | undefined>();
	let previewReady = $state(false);
	let previewLoading = $state(false);
	let previewError = $state('');

	let previewToken = 0;
	$effect(() => {
		const list = words;
		const opts = options();
		const side = previewSide;
		const token = ++previewToken;
		if (!list.length) {
			previewReady = false;
			previewError = '';
			return;
		}
		const timer = setTimeout(async () => {
			previewLoading = true;
			previewError = '';
			try {
				// One sheet (front + back) is all the preview shows; building
				// every sheet of a long list for it froze the tab.
				const result = await buildFlashcardPdf(list, { ...opts, maxPages: 2 });
				if (token !== previewToken || !previewCanvas) return;
				await renderPdfPreview(result.bytes, side === 'front' ? 1 : 2, previewCanvas);
				if (token !== previewToken) return;
				previewReady = true;
			} catch (e) {
				if (token === previewToken) {
					previewReady = false;
					previewError = e instanceof Error ? e.message : String(e);
				}
			} finally {
				if (token === previewToken) previewLoading = false;
			}
		}, 400);
		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>Printable flashcards · Anki-xiehanzi</title>
</svelte:head>

<div class="mx-auto max-w-[1180px] px-4 pb-8 sm:px-7">
	<PageHeader title="Printable flashcards" subtitle="Two-sided cards that line up on a duplex print." />

	<ToolWordInput bind:value={wordsText} />

	<div class="mt-6">
		<h2 class="mb-2 text-[13px] font-semibold text-muted">Templates</h2>
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
			{#each TEMPLATES as t (t.id)}
				<button
					type="button"
					onclick={() => pickTemplate(t)}
					class="rounded-lg border p-3 text-left transition {activeTemplate === t.id
						? 'border-transparent bg-sunk'
						: 'border-line hover:border-muted'}"
				>
					<span class="block text-sm font-medium text-ink">{t.name}</span>
					<span class="mt-0.5 block text-xs text-muted">{t.description}</span>
				</button>
			{/each}
		</div>
		<p class="mt-2 text-xs text-muted">
			A template just fills in a starting point — every option below stays yours to change.
		</p>
	</div>

	<div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
		<div class="min-w-0 space-y-5">
			<section class="rounded-panel bg-surface p-5 shadow-object">
				<h2 class="mb-3 text-[13px] font-semibold text-muted">Card content</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<p class="mb-2 text-sm font-medium text-ink">Front</p>
						<div class="space-y-1.5">
							{#each FLASHCARD_FIELDS as f (f.id)}
								<label class="flex items-center gap-2 text-sm text-muted">
									<input
										type="checkbox"
										checked={front.includes(f.id)}
										onchange={(e) => toggleField('front', f.id, e.currentTarget.checked)}
									/>
									{f.label}
								</label>
							{/each}
						</div>
					</div>
					<div>
						<p class="mb-2 text-sm font-medium text-ink">Back</p>
						<div class="space-y-1.5">
							{#each FLASHCARD_FIELDS as f (f.id)}
								<label class="flex items-center gap-2 text-sm text-muted">
									<input
										type="checkbox"
										checked={back.includes(f.id)}
										onchange={(e) => toggleField('back', f.id, e.currentTarget.checked)}
									/>
									{f.label}
								</label>
							{/each}
						</div>
					</div>
				</div>
				{#if needsStrokeSteps}
					<label class="mt-4 block max-w-[10rem] {fieldLabel}">
						Stroke-order steps
						<input type="number" min="2" max="8" bind:value={strokeOrderSteps} class={fieldInput} />
					</label>
				{/if}
			</section>

			<section class="rounded-panel bg-surface p-5 shadow-object">
				<h2 class="mb-3 text-[13px] font-semibold text-muted">Card style</h2>
				<div class="grid grid-cols-3 gap-2">
					{#each CARD_STYLES as s (s.id)}
						<button
							type="button"
							onclick={() => (cardStyle = s.id)}
							class="rounded-lg border p-3 text-left transition {cardStyle === s.id
								? 'border-transparent bg-sunk'
								: 'border-line hover:border-muted'}"
						>
							<span class="block text-sm font-medium text-ink">{s.label}</span>
							<span class="mt-0.5 block text-xs text-muted">{s.description}</span>
						</button>
					{/each}
				</div>
			</section>

			<section class="rounded-panel bg-surface p-5 shadow-object">
				<h2 class="mb-3 text-[13px] font-semibold text-muted">Sheet layout</h2>
				<div class="grid grid-cols-2 gap-4 sm:w-1/2">
					<label class={fieldLabel}>
						Columns
						<input type="number" min="1" max="8" bind:value={cols} class={fieldInput} />
					</label>
					<label class={fieldLabel}>
						Rows
						<input type="number" min="1" max="10" bind:value={rows} class={fieldInput} />
					</label>
				</div>
			</section>

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

			{#if error}<p class="text-sm text-err-ink">{error}</p>{/if}
			{#if unsupported.length}
				<p class="text-sm text-warn-ink">
					{unsupported.length} character{unsupported.length === 1 ? '' : 's'} have no stroke data and
					print blank: <span lang="zh-Hans">{unsupported.join(' ')}</span>
				</p>
			{/if}
		</div>

		<aside class="lg:sticky lg:top-20 lg:self-start">
			<div class="mb-2 flex items-center justify-between gap-2">
				<div class="flex items-center gap-1.5 text-[13px] text-muted font-semibold">
					<Eye size={13} /> Preview
				</div>
				<div class="flex rounded-md border border-line text-xs">
					<button
						type="button"
						onclick={() => (previewSide = 'front')}
						class="px-2 py-1 {previewSide === 'front' ? 'bg-accent text-on-accent' : 'text-muted'}"
					>
						Front
					</button>
					<button
						type="button"
						onclick={() => (previewSide = 'back')}
						class="px-2 py-1 {previewSide === 'back' ? 'bg-accent text-on-accent' : 'text-muted'}"
					>
						Back
					</button>
				</div>
			</div>
			<div
				class="relative overflow-hidden rounded-card bg-surface shadow-object bg-sunk"
				style="aspect-ratio: 210/297;"
			>
				<canvas
					bind:this={previewCanvas}
					class="h-full w-full object-contain"
					class:invisible={!previewReady}
					class:opacity-50={previewLoading}
				></canvas>
				{#if !previewReady}
					<div class="absolute inset-0 flex items-center justify-center p-4 text-center text-sm">
						{#if previewLoading}
							<span class="text-muted">Rendering…</span>
						{:else if previewError}
							<span class="text-err-ink">{previewError}</span>
						{:else}
							<span class="text-muted">Type a word or character to see a preview.</span>
						{/if}
					</div>
				{/if}
			</div>
			<p class="mt-2 text-xs text-muted">Live preview of the real file — first sheet, at full size.</p>
		</aside>
	</div>
</div>
