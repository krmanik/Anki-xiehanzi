<script lang="ts">
	import { Button, chipClass, SectionLabel, Switch } from '$lib/ui';
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
	import { buildHskPdf } from '$lib/hskPdf';
	import X from '@lucide/svelte/icons/x';
	import Download from '@lucide/svelte/icons/download';

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
	let busy = $state(false);
	let progress = $state(0);
	let status = $state('');

	/** Formats laid out from the selected fields. */
	const fielded = $derived(format !== 'json');

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

	async function run() {
		if (busy) return;

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

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && onClose()}
>
	<div
		class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[24px] bg-surface p-5 text-ink shadow-xl sm:rounded-[24px] sm:p-7"
		role="dialog"
		aria-modal="true"
		aria-label="Download word list"
	>
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="m-0 text-[22px] leading-tight font-bold">Download {ctx.levelLabel}</h2>
				<p class="mt-1 mb-0 text-[15px] text-muted">
					{entries.length.toLocaleString()}
					{filtered ? 'matching words' : 'words'} · {ctx.listName}
				</p>
			</div>
			<button
				type="button"
				onclick={onClose}
				aria-label="Close"
				class="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-sunk hover:text-ink"
			>
				<X class="size-5" />
			</button>
		</div>

		<SectionLabel as="h3" class="mt-6 mb-2">Format</SectionLabel>
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Format">
			{#each EXPORT_FORMATS as f (f.id)}
				{@const on = format === f.id}
				<button
					type="button"
					role="radio"
					aria-checked={on}
					onclick={() => {
						format = f.id;
						status = '';
					}}
					class="rounded-card p-3 text-left transition-colors focus-visible:outline-3 focus-visible:outline-sky {on
						? 'bg-sky-soft ring-2 ring-sky-ink ring-inset'
						: 'bg-sunk hover:brightness-95'}"
				>
					<span class="block text-[15px] font-semibold {on ? 'text-sky-ink' : 'text-ink'}">{f.label}</span>
					<span class="mt-0.5 block text-[13px] leading-snug {on ? 'text-sky-ink/80' : 'text-muted'}">{f.hint}</span>
				</button>
			{/each}
		</div>

		{#if fielded}
			<SectionLabel as="h3" class="mt-6 mb-2">Fields</SectionLabel>
			<div class="flex flex-wrap gap-1.5">
				{#each EXPORT_COLUMNS as col (col.key)}
					<button
						type="button"
						aria-pressed={columnKeys.includes(col.key)}
						onclick={() => toggleColumn(col.key)}
						class={chipClass(columnKeys.includes(col.key))}
					>
						{col.label}
					</button>
				{/each}
			</div>
		{/if}

		{#if format === 'pdf'}
			<div class="mt-4 divide-y divide-line border-t border-line">
				<Switch bind:checked={colorPdf} label="Tone colours" hint="Colour hanzi and pinyin by tone" />
				<Switch bind:checked={pdfLandscape} label="Landscape" hint="More room for extra fields" />
			</div>
			<p class="mt-2 mb-0 text-[13.5px] text-muted">Chinese fonts are embedded; about 4 MB, fetched once.</p>
		{:else if format === 'json'}
			<p class="mt-5 mb-0 text-[13.5px] text-muted">Every field and every reading. No field picker.</p>
		{/if}

		{#if status}
			<div class="mt-4" role="status">
				<p class="m-0 text-[14px] text-muted">{status}</p>
				{#if busy && progress > 0}
					<div class="mt-1.5 h-2 overflow-hidden rounded-full bg-sunk">
						<div class="h-full rounded-full bg-mint transition-[width]" style="width:{progress}%"></div>
					</div>
				{/if}
			</div>
		{/if}

		<div class="mt-6 flex flex-wrap items-center justify-end gap-2">
			<Button variant="secondary" onclick={onClose}>Cancel</Button>
			<Button onclick={run} disabled={busy || (fielded && columnKeys.length === 0)}>
				<Download class="size-[18px]" />
				{busy ? 'Preparing…' : `Download .${EXPORT_FORMATS.find((f) => f.id === format)?.ext}`}
			</Button>
		</div>
	</div>
</div>
