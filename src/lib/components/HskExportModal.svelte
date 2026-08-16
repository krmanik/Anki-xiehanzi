<script lang="ts">
	import { base } from '$app/paths';
	import { btnPrimary, btnSecondary } from '$lib/buttonStyles';
	import type { HskEntry } from '$lib/hsk';
	import {
		buildRows,
		columnsFor,
		exportFilename,
		toCsv,
		toDocx,
		toJson,
		toTsv,
		toXlsx,
		DEFAULT_COLUMN_KEYS,
		EXPORT_COLUMNS,
		EXPORT_FORMATS,
		type ExportContext,
		type ExportFormat
	} from '$lib/hskExport';
	import { PENDING_WORDS_KEY } from '$lib/hskHandoff';
	import { buildHskPdf } from '$lib/hskPdf';
	import X from '@lucide/svelte/icons/x';
	import Download from '@lucide/svelte/icons/download';
	import Sparkles from '@lucide/svelte/icons/sparkles';

	let {
		entries,
		ctx,
		filtered = false,
		onClose
	}: {
		entries: HskEntry[];
		ctx: ExportContext;
		/** true when `entries` is a search result rather than the whole level */
		filtered?: boolean;
		onClose: () => void;
	} = $props();

	let format = $state<ExportFormat>('csv');
	// One field selection for every file format — the PDF lays the same columns
	// out, so switching format keeps whatever the user picked.
	let columnKeys = $state<string[]>([...DEFAULT_COLUMN_KEYS]);
	let colorPdf = $state(true);
	let pdfLandscape = $state(false);
	let deckAudio = $state(true);
	let deckExamples = $state(true);
	let busy = $state(false);
	let progress = $state(0);
	let status = $state('');

	/** Formats laid out from the selected fields. */
	const fielded = $derived(format !== 'json' && format !== 'anki');

	function toggleColumn(key: string) {
		columnKeys = columnKeys.includes(key)
			? columnKeys.filter((k) => k !== key)
			: [...columnKeys, key];
	}

	function save(blob: Blob, name: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		a.rel = 'noopener';
		document.body.appendChild(a);
		a.click();
		a.remove();
		// Revoke late — Safari cancels the download if the URL dies too soon.
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
	}

	async function downloadPdf() {
		const name = exportFilename(ctx, 'pdf');
		const pdf = await buildHskPdf(entries, ctx, {
			colored: colorPdf,
			landscape: pdfLandscape,
			fields: columnKeys,
			onProgress: (fraction, label) => {
				progress = Math.round(fraction * 100);
				status = label;
			}
		});
		// Copy into a fresh buffer: pdf-lib returns a view onto a larger one.
		save(new Blob([pdf.slice()], { type: 'application/pdf' }), name);
		return name;
	}

	/** Hand the word list to the deck creator through sessionStorage. */
	function openInCreator() {
		sessionStorage.setItem(
			PENDING_WORDS_KEY,
			JSON.stringify({
				label: `${ctx.listName} · ${ctx.levelLabel}`,
				words: entries.map((e) => e.s),
				options: { audio: deckAudio, examples: deckExamples }
			})
		);
		window.location.href = `${base}/create`;
	}

	async function run() {
		if (busy) return;
		if (format === 'anki') return openInCreator();

		busy = true;
		progress = 0;
		status = 'Preparing…';
		try {
			const name = exportFilename(ctx, format);
			if (format === 'pdf') {
				status = `Downloaded ${await downloadPdf()}`;
				return;
			}
			if (format === 'json') {
				save(new Blob([toJson(entries)], { type: 'application/json;charset=utf-8' }), name);
			} else {
				const rows = buildRows(entries, columnsFor(columnKeys), ctx);
				if (format === 'csv') {
					// The BOM is what makes Excel open UTF-8 CSV with hanzi intact.
					save(new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }), name);
				} else if (format === 'txt') {
					save(new Blob([toTsv(rows)], { type: 'text/plain;charset=utf-8' }), name);
				} else if (format === 'xlsx') {
					save(await toXlsx(rows, ctx.levelLabel), name);
				} else if (format === 'docx') {
					save(await toDocx(rows, `${ctx.listName} · ${ctx.levelLabel}`), name);
				}
			}
			status = `Downloaded ${name}`;
		} catch (e) {
			status = `Export failed: ${e instanceof Error ? e.message : String(e)}`;
		} finally {
			busy = false;
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5"
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && onClose()}
>
	<div
		class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
		role="dialog"
		aria-modal="true"
		aria-label="Download word list"
	>
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="text-xl font-bold tracking-tight">Download {ctx.levelLabel}</h2>
				<p class="mt-1 text-sm text-neutral-500">
					{entries.length.toLocaleString()}
					{filtered ? 'matching words' : 'words'} · {ctx.listName}
				</p>
			</div>
			<button
				onclick={onClose}
				aria-label="Close"
				class="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
			>
				<X size={18} />
			</button>
		</div>

		<h3 class="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">Format</h3>
		<div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
			{#each EXPORT_FORMATS as f (f.id)}
				<button
					type="button"
					onclick={() => {
						format = f.id;
						status = '';
					}}
					class="rounded-lg border p-3 text-left transition {format === f.id
						? 'border-neutral-900 bg-neutral-900 text-white'
						: 'border-neutral-200 hover:border-neutral-900'}"
				>
					<div class="text-sm font-semibold">{f.label}</div>
					<div
						class="mt-0.5 text-[11px] leading-snug {format === f.id
							? 'text-neutral-300'
							: 'text-neutral-500'}"
					>
						{f.hint}
					</div>
				</button>
			{/each}
		</div>

		{#if fielded}
			<h3 class="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">Fields</h3>
			<p class="mt-1 text-xs text-neutral-500">
				Tick what you want in the file. The order is fixed; the columns you leave out are dropped.
			</p>
			<div class="mt-2 flex flex-wrap gap-1.5">
				{#each EXPORT_COLUMNS as col (col.key)}
					<button
						type="button"
						onclick={() => toggleColumn(col.key)}
						class="rounded-full border px-3 py-1 text-xs transition {columnKeys.includes(col.key)
							? 'border-neutral-900 bg-neutral-100 text-neutral-900'
							: 'border-neutral-200 text-neutral-400 hover:border-neutral-400'}"
					>
						{col.label}
					</button>
				{/each}
			</div>
		{/if}

		{#if format === 'pdf'}
			<h3 class="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">Page</h3>
			<div class="mt-2 space-y-2">
				<label class="flex items-center gap-2 text-sm text-neutral-700">
					<input type="checkbox" bind:checked={colorPdf} class="h-4 w-4 accent-neutral-900" />
					Tone-coloured hanzi and pinyin
				</label>
				<label class="flex items-center gap-2 text-sm text-neutral-700">
					<input type="checkbox" bind:checked={pdfLandscape} class="h-4 w-4 accent-neutral-900" />
					Landscape A4
					<span class="text-neutral-500">— more room once you add fields</span>
				</label>
			</div>
			<p class="mt-3 text-xs leading-relaxed text-neutral-500">
				Columns are sized from their widest entry and every row is the same height, so the page
				reads as a grid. Written directly as a PDF with the Chinese fonts embedded — characters
				render anywhere and the text stays selectable. The fonts are fetched once (about 4 MB) the
				first time you export a PDF.
			</p>
		{:else if format === 'json'}
			<p class="mt-6 text-xs leading-relaxed text-neutral-500">
				Every field of every word, including all readings and their full definitions — the field
				picker does not apply.
			</p>
		{:else if format === 'anki'}
			<div class="mt-6 rounded-lg border border-indigo-200 bg-indigo-50/60 p-4">
				<h4 class="flex items-center gap-2 text-sm font-semibold">
					<Sparkles size={15} class="text-indigo-600" /> Build this level as a deck
				</h4>
				<p class="mt-1.5 text-xs leading-relaxed text-neutral-600">
					These {entries.length.toLocaleString()} words are handed to the deck creator, where you pick
					the card layout, tone colours and stroke practice, then export a
					<code class="rounded bg-white px-1 py-0.5">.apkg</code>.
				</p>

				<div class="mt-3 space-y-2">
					<label class="flex items-start gap-2 text-xs text-neutral-700">
						<input
							type="checkbox"
							bind:checked={deckAudio}
							class="mt-0.5 h-4 w-4 shrink-0 accent-neutral-900"
						/>
						<span>
							<strong>Audio</strong> — a text-to-speech clip per word, bundled into the deck.
							{#if entries.length > 800}
								<span class="text-neutral-500"
									>Generated one word at a time, so {entries.length.toLocaleString()} words will take a
									while.</span
								>
							{/if}
						</span>
					</label>
					<label class="flex items-start gap-2 text-xs text-neutral-700">
						<input
							type="checkbox"
							bind:checked={deckExamples}
							class="mt-0.5 h-4 w-4 shrink-0 accent-neutral-900"
						/>
						<span>
							<strong>Example sentences</strong> — real sentences using the word, with pinyin and a
							translation, on the back of every card.
						</span>
					</label>
				</div>

				<p class="mt-3 text-xs leading-relaxed text-neutral-600">
					Both stay editable in the creator. Prefer something ready-made? <a
						class="font-medium text-indigo-600 underline underline-offset-2"
						href="{base}/hsk#decks">Download a prebuilt deck</a
					>.
				</p>
			</div>
		{/if}

		{#if status}
			<div class="mt-4">
				<p class="text-sm text-neutral-500">{status}</p>
				{#if busy && progress > 0}
					<div class="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-100">
						<div class="h-full rounded-full bg-neutral-900 transition-all" style="width:{progress}%"></div>
					</div>
				{/if}
			</div>
		{/if}

		<div class="mt-6 flex flex-wrap items-center justify-end gap-2">
			<button class={btnSecondary} onclick={onClose}>Cancel</button>
			<button
				class="{btnPrimary} inline-flex items-center gap-2"
				onclick={run}
				disabled={busy || (fielded && columnKeys.length === 0)}
			>
				{#if format === 'anki'}
					<Sparkles size={15} /> Open deck creator
				{:else}
					<Download size={15} />
					{busy ? 'Preparing…' : `Download .${EXPORT_FORMATS.find((f) => f.id === format)?.ext}`}
				{/if}
			</button>
		</div>
	</div>
</div>
