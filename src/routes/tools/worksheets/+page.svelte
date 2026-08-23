<script lang="ts">
	/** Character study worksheet PDF: one rich page per character. */
	import { buildWorksheetPdf } from '$lib/pdf/worksheetPdf';
	import { btnPrimary } from '$lib/buttonStyles';
	import ToolWordInput from '$lib/components/ToolWordInput.svelte';
	import Download from '@lucide/svelte/icons/download';

	let wordsText = $state('');
	let boxesPerRow = $state(10);
	let traceCount = $state(5);
	let showStrokeOrder = $state(true);
	let building = $state(false);
	let error = $state('');
	let unsupported = $state<string[]>([]);
	let truncated = $state(0);

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

	async function generate() {
		const words = wordsText.split(/\s+/).filter(Boolean);
		if (!words.length || building) return;
		building = true;
		error = '';
		unsupported = [];
		truncated = 0;
		try {
			const result = await buildWorksheetPdf(words, { boxesPerRow, traceCount, showStrokeOrder });
			unsupported = result.unsupported;
			truncated = result.truncated;
			save(new Blob([result.bytes.slice()], { type: 'application/pdf' }), 'worksheet.pdf');
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			building = false;
		}
	}
</script>

<svelte:head>
	<title>Worksheet generator · Anki xiehanzi</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-5 py-10">
	<header class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
			Worksheet generator
		</h1>
		<p class="mt-2 max-w-2xl text-neutral-600">
			One study page per character: the character card, five words that use it, a few example
			sentences, a stroke-by-stroke order row, then mi-zi-ge (米字格) practice boxes. Best for a
			handful of characters you're actively studying.
		</p>
	</header>

	<ToolWordInput bind:value={wordsText} />

	<div class="mt-5 grid gap-4 sm:grid-cols-3">
		<label class="text-sm text-neutral-600">
			Boxes per row
			<input
				type="number"
				min="4"
				max="16"
				bind:value={boxesPerRow}
				class="mt-1 w-full rounded-md border border-neutral-200 px-2 py-1.5"
			/>
		</label>
		<label class="text-sm text-neutral-600">
			Traced boxes
			<input
				type="number"
				min="0"
				max="20"
				bind:value={traceCount}
				class="mt-1 w-full rounded-md border border-neutral-200 px-2 py-1.5"
			/>
		</label>
		<label class="flex items-center gap-2 text-sm text-neutral-600 sm:mt-6">
			<input type="checkbox" bind:checked={showStrokeOrder} />
			Show stroke order
		</label>
	</div>

	<button type="button" onclick={generate} disabled={building || !wordsText.trim()} class="{btnPrimary} mt-6 inline-flex items-center gap-2">
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
