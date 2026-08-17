<script lang="ts">
	/**
	 * The Kangxi radical browser — all 214 radicals from
	 * `static/data/radicals/index.json` (~600 KB), with the glyph SVGs loaded
	 * lazily per radical. Nothing here touches cedict.db.
	 */
	import { base } from '$app/paths';
	import { btnPrimary } from '$lib/buttonStyles';
	import RadicalCard from '$lib/components/RadicalCard.svelte';
	import RadicalDeckModal from '$lib/components/RadicalDeckModal.svelte';
	import RadicalDetail from '$lib/components/RadicalDetail.svelte';
	import {
		RADICAL_SORTS,
		filterRadicals,
		loadRadicalDeck,
		loadRadicals,
		sortRadicals,
		strokeCounts,
		type Radical,
		type RadicalDeckManifest,
		type RadicalSort
	} from '$lib/radicals';
	import Download from '@lucide/svelte/icons/download';
	import Palette from '@lucide/svelte/icons/palette';
	import Search from '@lucide/svelte/icons/search';

	let radicals = $state<Radical[]>([]);
	let loading = $state(true);
	let error = $state('');

	let query = $state('');
	let sort = $state<RadicalSort>('number');
	let strokes = $state<number | null>(null);
	let colorize = $state(true);
	let selected = $state<number | null>(null);
	let deck = $state<RadicalDeckManifest | null>(null);
	let building = $state(false);

	const counts = $derived(strokeCounts(radicals));
	const visible = $derived(
		sortRadicals(
			filterRadicals(radicals, query).filter((r) => strokes === null || r.strokes === strokes),
			sort
		)
	);
	const current = $derived(radicals.find((r) => r.number === selected) ?? null);

	$effect(() => {
		loadRadicals()
			.then((index) => {
				radicals = index.radicals;
				loading = false;
			})
			.catch((e) => {
				error = e instanceof Error ? e.message : String(e);
				loading = false;
			});
		loadRadicalDeck().then((m) => (deck = m));
	});

	// A radical filtered out from under the detail panel should close it.
	$effect(() => {
		if (selected !== null && !visible.some((r) => r.number === selected)) selected = null;
	});

	// The panel sits above the grid, so opening a radical from halfway down the
	// 214 would otherwise scroll nothing and look like nothing happened.
	let panel = $state<HTMLDivElement>();
	$effect(() => {
		if (selected === null || !panel) return;
		panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
	});

	const onKey = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && selected !== null) selected = null;
	};
</script>

<svelte:window on:keydown={onKey} />

{#if building}
	<RadicalDeckModal {radicals} {visible} {deck} onClose={() => (building = false)} />
{/if}

<svelte:head>
	<title>The 214 Kangxi Radicals — meanings, readings, stroke order — Anki xiehanzi</title>
	<meta
		name="description"
		content="Browse all 214 Kangxi radicals: meaning, pinyin, Hán-Việt, Japanese and Korean readings, the Chinese teaching name, stroke-order animation, oracle-bone to regular-script evolution, regional printed forms, and the characters each radical builds."
	/>
</svelte:head>

<section class="mx-auto max-w-6xl px-5 py-10">
	<p class="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">Kangxi 康熙部首</p>
	<div class="mt-1 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-4xl font-extrabold tracking-tight">The 214 radicals</h1>
			<p class="mt-1.5 max-w-2xl text-sm text-neutral-500">
				Every Chinese character is filed under one of these. Each entry carries its meaning and
				readings across Chinese, Vietnamese, Japanese and Korean, how it is written, how the glyph
				evolved from oracle bone to regular script, and the characters built from it.
			</p>
		</div>
		<button
			type="button"
			class="{btnPrimary} inline-flex items-center gap-2"
			onclick={() => (building = true)}
			disabled={!radicals.length}
		>
			<Download size={15} /> Get the deck
		</button>
	</div>

	<p class="mt-3 text-xs leading-relaxed text-neutral-400">
		Free deck builds in your browser — recognition and writing cards, audio, stroke order. Premium
		adds the glyph images and the rest of the detail; the button compares them.
	</p>

	<div
		class="sticky top-[57px] z-30 -mx-5 mt-6 border-y border-neutral-200 bg-white/90 px-5 py-3 backdrop-blur"
	>
		<div class="flex flex-wrap items-center gap-2">
			<div class="relative min-w-[220px] flex-1">
				<Search size={15} class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
				<input
					bind:value={query}
					type="search"
					placeholder="Search radical, pinyin, meaning, reading or an example character…"
					aria-label="Search radicals"
					class="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-neutral-900"
				/>
			</div>

			<select
				bind:value={sort}
				aria-label="Sort order"
				class="rounded-lg border border-neutral-300 py-2 pl-3 pr-8 text-sm outline-none transition focus:border-neutral-900"
			>
				{#each RADICAL_SORTS as mode (mode.value)}
					<option value={mode.value}>{mode.label}</option>
				{/each}
			</select>

			<button
				type="button"
				onclick={() => (colorize = !colorize)}
				aria-pressed={colorize}
				class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition {colorize
					? 'border-neutral-900 text-neutral-900'
					: 'border-neutral-300 text-neutral-500 hover:border-neutral-900'}"
			>
				<Palette size={15} /> Tone colours
			</button>
		</div>

		{#if counts.length}
			<div class="mt-2.5 flex flex-wrap gap-1.5">
				<button
					type="button"
					onclick={() => (strokes = null)}
					class="rounded-lg border px-2.5 py-1 font-mono text-xs transition {strokes === null
						? 'border-neutral-900 bg-neutral-900 text-white'
						: 'border-neutral-200 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900'}"
				>
					All
				</button>
				{#each counts as n (n)}
					<button
						type="button"
						onclick={() => (strokes = strokes === n ? null : n)}
						class="rounded-lg border px-2.5 py-1 font-mono text-xs transition {strokes === n
							? 'border-neutral-900 bg-neutral-900 text-white'
							: 'border-neutral-200 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900'}"
						title="{n} stroke{n === 1 ? '' : 's'}"
					>
						{n}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if loading}
		<p class="mt-10 text-sm text-neutral-500">Loading the radical table…</p>
	{:else if error}
		<p class="mt-10 text-sm text-red-600">Could not load the radicals: {error}</p>
	{:else}
		{#if current}
			<div class="mt-6 scroll-mt-[150px]" bind:this={panel}>
				<RadicalDetail radical={current} {colorize} onClose={() => (selected = null)} />
			</div>
		{/if}

		<p class="mt-6 font-mono text-xs uppercase tracking-wider text-neutral-400">
			{visible.length} of {radicals.length} radicals
		</p>

		<div
			class="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7"
		>
			{#each visible as radical (radical.number)}
				<RadicalCard
					{radical}
					{colorize}
					selected={selected === radical.number}
					onSelect={() => (selected = selected === radical.number ? null : radical.number)}
				/>
			{/each}
		</div>

		{#if !visible.length}
			<p class="mt-8 text-sm text-neutral-500">
				Nothing matches “{query}”.
				<button class="underline" type="button" onclick={() => { query = ''; strokes = null; }}>
					Clear the filters
				</button>
			</p>
		{/if}

		<p class="mt-10 border-t border-neutral-200 pt-4 text-xs leading-relaxed text-neutral-400">
			Readings from
			<a class="underline" href="https://en.wikipedia.org/wiki/Kangxi_radicals">Wikipedia</a>, example
			glosses from CC-CEDICT, glyph images from
			<a class="underline" href="https://www.zdic.net/">漢典 zdic.net</a>. Stroke order by
			<a class="underline" href="https://hanziwriter.org/">Hanzi Writer</a>. Want them as flashcards?
			<a class="underline" href="{base}/hsk#decks">See the decks</a>.
		</p>
	{/if}
</section>
