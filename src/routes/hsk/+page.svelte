<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { loadHskIndex, levelLabel, type HskIndex, type HskListMeta } from '$lib/hsk';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Download from '@lucide/svelte/icons/download';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import FileText from '@lucide/svelte/icons/file-text';
	import Layers from '@lucide/svelte/icons/layers';
	import Palette from '@lucide/svelte/icons/palette';

	let index = $state<HskIndex | null>(null);
	let error = $state('');

	onMount(async () => {
		try {
			index = await loadHskIndex();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	});

	// New HSK first — it is the current standard.
	const lists = $derived.by(() => {
		const all = index?.lists ?? [];
		return [...all].sort((a, b) => (a.id === 'new' ? -1 : b.id === 'new' ? 1 : 0));
	});

	// One accent per level so the grid reads as a progression.
	const ACCENTS = [
		'from-rose-500 to-orange-400',
		'from-orange-500 to-amber-400',
		'from-emerald-500 to-teal-400',
		'from-sky-500 to-cyan-400',
		'from-indigo-500 to-violet-400',
		'from-fuchsia-500 to-pink-400',
		'from-neutral-800 to-neutral-500'
	];

	const TONE_LEGEND = [
		{ tone: 1, name: '1st · mā' },
		{ tone: 2, name: '2nd · má' },
		{ tone: 3, name: '3rd · mǎ' },
		{ tone: 4, name: '4th · mà' },
		{ tone: 5, name: 'neutral · ma' }
	];

	const listHref = (list: HskListMeta, level: string) => `${base}/hsk/${list.id}/${level}`;
</script>

<svelte:head>
	<title>HSK Word Lists — Anki xiehanzi</title>
	<meta
		name="description"
		content="Browse every Old HSK (2012) and New HSK 3.0 (2025) vocabulary level with tone-coloured pinyin, zhuyin, traditional forms and meanings. Free download as CSV, Excel, Word, PDF, text or an Anki deck."
	/>
</svelte:head>

<section class="mx-auto max-w-6xl px-5 py-12">
	<p class="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">Vocabulary lists</p>
	<h1 class="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">HSK Word Lists</h1>
	<p class="mt-3 max-w-2xl text-neutral-600">
		Every word of the old six-level HSK and the current nine-level HSK 3.0, with tone-coloured
		hanzi and pinyin, zhuyin, traditional forms, part of speech, classifiers and frequency. Read
		them right here, or take the whole level away as CSV, Excel, Word, PDF, plain text, JSON — or
		an Anki deck.
	</p>

	<div class="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
		<span class="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
			<Palette size={13} /> Tones
		</span>
		{#each TONE_LEGEND as t}
			<span class="font-mono text-xs tone{t.tone}">{t.name}</span>
		{/each}
	</div>

	{#if error}
		<p class="mt-10 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
			Could not load the word lists: {error}
		</p>
	{:else if !index}
		<div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each Array(8) as _}
				<div class="h-32 animate-pulse rounded-xl bg-neutral-100"></div>
			{/each}
		</div>
	{:else}
		{#each lists as list (list.id)}
			<div class="mt-14">
				<div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 pb-2">
					<h2 class="text-xl font-bold">
						{list.name}
						<span class="ml-1 font-mono text-sm font-normal text-neutral-400">{list.year}</span>
					</h2>
					<span class="font-mono text-xs text-neutral-400">
						{list.levels.length} levels · {list.total.toLocaleString()} words
					</span>
				</div>
				<p class="mt-2 text-sm text-neutral-500">{list.subtitle}</p>

				<div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{#each list.levels as lvl, i (lvl.level)}
						<a
							href={listHref(list, lvl.level)}
							class="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111]"
						>
							<span
								class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r {ACCENTS[i % ACCENTS.length]}"
							></span>
							<div class="flex items-start justify-between">
								<div>
									<div class="text-2xl font-extrabold tracking-tight">
										{levelLabel(lvl.level)}
									</div>
									<div class="mt-1 font-mono text-xs uppercase tracking-wider text-neutral-400">
										{lvl.count.toLocaleString()} words
									</div>
								</div>
								<ArrowRight
									size={18}
									class="mt-1 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-900"
								/>
							</div>
							<div class="mt-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
								<span class="inline-flex items-center gap-1"><Layers size={12} /> View</span>
								<span class="inline-flex items-center gap-1"><FileSpreadsheet size={12} /> Excel</span>
								<span class="inline-flex items-center gap-1"><FileText size={12} /> PDF</span>
								<span class="inline-flex items-center gap-1"><Download size={12} /> Anki</span>
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/each}

		<div class="mt-16 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
			<h2 class="text-lg font-bold">Which list should I learn?</h2>
			<div class="mt-3 grid gap-6 sm:grid-cols-2">
				<div>
					<h3 class="font-semibold">New HSK 3.0 (2025)</h3>
					<p class="mt-1 text-sm leading-relaxed text-neutral-600">
						The current standard: nine levels grouped 1–6 plus an advanced 7–9 band, ~11,000
						words. Use this if you are taking the exam today.
					</p>
				</div>
				<div>
					<h3 class="font-semibold">Old HSK (2012)</h3>
					<p class="mt-1 text-sm leading-relaxed text-neutral-600">
						The classic six-level syllabus, 5,000 words. Still the list most textbooks, graded
						readers and older courses are built around.
					</p>
				</div>
			</div>
			<p class="mt-5 text-sm text-neutral-600">
				Want cards instead of a list? <a
					class="font-medium text-indigo-600 underline underline-offset-2"
					href="{base}/decks">Download a prebuilt deck</a
				>
				or
				<a class="font-medium text-indigo-600 underline underline-offset-2" href="{base}/create"
					>build your own</a
				>.
			</p>
		</div>

		<p class="mt-6 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
			Data updated {index.generated} · CC-BY word data from CC-CEDICT and the HSK 3.0 word list
		</p>
	{/if}
</section>
