<script lang="ts">
	/**
	 * The Kangxi radical browser — all 214 radicals from
	 * `static/data/radicals/index.json` (~600 KB), with the glyph SVGs loaded
	 * lazily per radical. Nothing here touches cedict.db.
	 */
	import { base } from '$app/paths';
	import { Button, chipClass, IconDot, PageHeader, SectionLabel } from '$lib/ui';
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
	const field =
		'min-h-11 rounded-card border-0 bg-sunk px-3.5 text-[15px] text-ink placeholder:text-muted focus:ring-3 focus:ring-sky';
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

<section class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
	<PageHeader title="The 214 radicals" subtitle="Meaning, readings, stroke order and the characters built from each.">
		{#snippet lead()}
			<IconDot hue="apricot" size="lg" shape="tile" class="font-zh">部</IconDot>
		{/snippet}
		{#snippet actions()}
			<Button onclick={() => (building = true)} disabled={!radicals.length}>
				<Download class="size-[18px]" /> Get the deck
			</Button>
		{/snippet}
	</PageHeader>

	<div class="sticky top-14 z-30 -mx-4 bg-ground/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
		<div class="flex flex-wrap items-center gap-2">
			<div class="relative min-w-[220px] flex-1">
				<Search class="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted" />
				<input
					bind:value={query}
					type="search"
					placeholder="Radical, pinyin, meaning or a character"
					aria-label="Search radicals"
					class="{field} w-full pl-10"
				/>
			</div>

			<select bind:value={sort} aria-label="Sort order" class="{field} pr-9">
				{#each RADICAL_SORTS as mode (mode.value)}
					<option value={mode.value}>{mode.label}</option>
				{/each}
			</select>

			<button type="button" onclick={() => (colorize = !colorize)} aria-pressed={colorize} class="{chipClass(colorize)} min-h-11">
				<Palette class="size-4" /> Tone colours
			</button>
		</div>

		{#if counts.length}
			<div class="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" role="group" aria-label="Stroke count">
				<button type="button" onclick={() => (strokes = null)} aria-pressed={strokes === null} class="{chipClass(strokes === null)} shrink-0">
					All
				</button>
				{#each counts as n (n)}
					<button
						type="button"
						onclick={() => (strokes = strokes === n ? null : n)}
						aria-pressed={strokes === n}
						class="{chipClass(strokes === n)} min-w-9 shrink-0 justify-center tabular-nums"
						title="{n} stroke{n === 1 ? '' : 's'}"
					>
						{n}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if loading}
		<p class="mt-10 text-sm text-muted">Loading the radical table…</p>
	{:else if error}
		<p class="mt-10 text-sm text-rose-ink">Could not load the radicals: {error}</p>
	{:else}
		{#if current}
			<div class="mt-6 scroll-mt-[150px]" bind:this={panel}>
				<RadicalDetail radical={current} {colorize} onClose={() => (selected = null)} />
			</div>
		{/if}

		<SectionLabel as="p" class="mt-6">{visible.length} of {radicals.length} radicals</SectionLabel>

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
			<p class="mt-8 text-sm text-muted">
				Nothing matches “{query}”.
				<button class="underline" type="button" onclick={() => { query = ''; strokes = null; }}>
					Clear the filters
				</button>
			</p>
		{/if}

		<p class="mt-10 border-t border-line pt-4 text-xs leading-relaxed text-muted">
			Readings from
			<a class="underline" href="https://en.wikipedia.org/wiki/Kangxi_radicals">Wikipedia</a>, example
			glosses from CC-CEDICT, glyph images from
			<a class="underline" href="https://www.zdic.net/">漢典 zdic.net</a>. Stroke order by
			<a class="underline" href="https://hanziwriter.org/">Hanzi Writer</a>. Want them as flashcards?
			<a class="underline" href="{base}/hsk">See the decks</a>.
		</p>
	{/if}
</section>
