<script lang="ts">
	/** Two-sided printable flashcard PDF: a word list in, fronts+backs pages out. */
	import { buildFlashcardPdf, type FlashcardField } from '$lib/pdf/flashcardPdf';
	import { btnPrimary } from '$lib/buttonStyles';
	import ToolWordInput from '$lib/components/ToolWordInput.svelte';
	import Download from '@lucide/svelte/icons/download';

	let wordsText = $state('');
	let cols = $state(4);
	let rows = $state(5);
	let showPinyin = $state(true);
	let showMeaning = $state(true);
	let showLevel = $state(false);
	let building = $state(false);
	let error = $state('');
	let unsupported = $state<string[]>([]);

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
		try {
			const fields: FlashcardField[] = [
				...(showPinyin ? (['pinyin'] as const) : []),
				...(showMeaning ? (['meaning'] as const) : []),
				...(showLevel ? (['level'] as const) : [])
			];
			const result = await buildFlashcardPdf(words, { cols, rows, fields });
			unsupported = result.unsupported;
			save(new Blob([result.bytes.slice()], { type: 'application/pdf' }), 'flashcards.pdf');
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			building = false;
		}
	}
</script>

<svelte:head>
	<title>Printable flashcards · Anki xiehanzi</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-5 py-10">
	<header class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
			Printable flashcards
		</h1>
		<p class="mt-2 max-w-2xl text-neutral-600">
			A two-sided flashcard PDF — hanzi on the fronts page, pinyin and meaning on the backs page,
			laid out so a long-edge duplex print lines every card's back up under its front.
		</p>
	</header>

	<ToolWordInput bind:value={wordsText} />

	<div class="mt-5 grid gap-4 sm:grid-cols-2">
		<label class="text-sm text-neutral-600">
			Columns
			<input
				type="number"
				min="1"
				max="8"
				bind:value={cols}
				class="mt-1 w-full rounded-md border border-neutral-200 px-2 py-1.5"
			/>
		</label>
		<label class="text-sm text-neutral-600">
			Rows
			<input
				type="number"
				min="1"
				max="10"
				bind:value={rows}
				class="mt-1 w-full rounded-md border border-neutral-200 px-2 py-1.5"
			/>
		</label>
	</div>

	<div class="mt-4 flex flex-wrap gap-4 text-sm text-neutral-600">
		<label class="flex items-center gap-2"><input type="checkbox" bind:checked={showPinyin} /> Pinyin</label>
		<label class="flex items-center gap-2"><input type="checkbox" bind:checked={showMeaning} /> Meaning</label>
		<label class="flex items-center gap-2"><input type="checkbox" bind:checked={showLevel} /> HSK level</label>
	</div>

	<button type="button" onclick={generate} disabled={building || !wordsText.trim()} class="{btnPrimary} mt-6 inline-flex items-center gap-2">
		<Download size={15} />
		{building ? 'Generating…' : 'Generate PDF'}
	</button>

	{#if error}<p class="mt-3 text-sm text-red-600">{error}</p>{/if}
	{#if unsupported.length}
		<p class="mt-3 text-sm text-amber-700">
			{unsupported.length} character{unsupported.length === 1 ? '' : 's'} may not render —
			outside the current font's coverage: <span lang="zh-Hans">{unsupported.join(' ')}</span>
		</p>
	{/if}
</div>
