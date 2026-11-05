<!--
  One HSK level as a word list: filter, part-of-speech chips, row checkboxes.
  A selection goes to the deck creator (`hskHandoff`) or to a file export; the
  whole list's Anki deck is the prebuilt download for the list.
-->
<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import HskExportModal from '$lib/components/HskExportModal.svelte';
	import HskDeckModal from '$lib/components/HskDeckModal.svelte';
	import {
		entryKey,
		entrySearchText,
		hanziTones,
		levelLabel,
		listMeaning,
		loadHskIndex,
		loadHskLevel,
		pinyinTones,
		sortEntries,
		SORT_MODES,
		type HskEntry,
		type HskListMeta,
		type SortMode
	} from '$lib/hsk';
	import { findDeck, formatBytes, loadHskDecks, type HskDeckManifest } from '$lib/hskDecks';
	import { setPendingWords } from '$lib/hskHandoff';
	import { playHskWord } from '$lib/hskAudio';
	import { Badge, Button, chipClass, DataTable, HUES, IconDot, PageHeader, toneText } from '$lib/ui';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Download from '@lucide/svelte/icons/download';
	import FileDown from '@lucide/svelte/icons/file-down';
	import SquarePlus from '@lucide/svelte/icons/square-plus';
	import Volume2 from '@lucide/svelte/icons/volume-2';

	const listId = $derived(page.params.list ?? 'new');
	const level = $derived(page.params.level ?? '1');

	let lists = $state<HskListMeta[]>([]);
	let entries = $state<HskEntry[]>([]);
	let loading = $state(true);
	let error = $state('');

	let sort = $state<SortMode>('list');
	let selected = $state<string[]>([]);
	/** What the export modal writes: the whole level, or the selection. */
	let exporting = $state<{ entries: HskEntry[]; filtered: boolean } | null>(null);
	let showDeck = $state(false);
	let deckManifest = $state<HskDeckManifest | null>(null);

	/** One .apkg per list, every level a subdeck — there is no per-level file. */
	const prebuilt = $derived(findDeck(deckManifest, listId));

	$effect(() => {
		loadHskDecks().then((m) => (deckManifest = m));
	});

	const meta = $derived(lists.find((l) => l.id === listId) ?? null);
	const levelIndex = $derived(meta?.levels.findIndex((l) => l.level === level) ?? 0);
	const listName = $derived(
		meta ? `${meta.name} (${meta.year})` : listId === 'old' ? 'Old HSK' : 'New HSK'
	);
	const label = $derived(levelLabel(level));
	const ctx = $derived({ listName, levelLabel: label });

	const sorted = $derived(sortEntries(entries, sort));
	const byKey = $derived(new Map(entries.map((e) => [entryKey(e), e])));
	const pick = (keys: string[]) => keys.map((k) => byKey.get(k)).filter((e): e is HskEntry => !!e);

	$effect(() => {
		const id = listId;
		const lvl = level;
		loading = true;
		error = '';
		selected = [];
		Promise.all([loadHskIndex(), loadHskLevel(id, lvl)])
			.then(([index, data]) => {
				// A slow fetch for a level the reader has already left must not
				// overwrite the current one.
				if (id !== listId || lvl !== level) return;
				lists = index.lists;
				entries = data;
				loading = false;
			})
			.catch((e) => {
				if (id !== listId || lvl !== level) return;
				error = e instanceof Error ? e.message : String(e);
				loading = false;
			});
	});

	const otherList = $derived(lists.find((l) => l.id !== listId) ?? null);
	/** Same level in the other list when it exists, else that list's first level. */
	const switchHref = $derived.by(() => {
		if (!otherList) return null;
		const target = otherList.levels.find((l) => l.level === level) ?? otherList.levels[0];
		return `${base}/hsk/${otherList.id}/${target.level}`;
	});

	function addToDeck(keys: string[]) {
		const words = pick(keys).map((e) => e.s);
		if (!words.length) return;
		setPendingWords({
			label: `${listName} · ${label}`,
			words,
			options: { audio: true, examples: true }
		});
		goto(`${base}/create`);
	}

	// Word · pinyin · meaning · (part of speech) · actions. On a phone the row
	// stacks: word and pinyin, the meaning under them, actions on the right.
	const GRID =
		'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[7.5rem_8.5rem_minmax(0,1fr)_5rem] lg:grid-cols-[8.5rem_9.5rem_minmax(0,1fr)_12rem_5rem]';
	const iconBtn =
		'grid size-9 place-items-center rounded-full text-muted hover:bg-sunk hover:text-ink focus-visible:outline-3 focus-visible:outline-sky';
	const selectClass =
		'min-h-11 rounded-full border-0 bg-sunk py-0 pr-9 pl-4 text-[15px] text-ink focus:ring-3 focus:ring-sky';
</script>

<svelte:head>
	<title>{label} word list — {listName} — Anki-xiehanzi</title>
	<meta
		name="description"
		content="All {meta?.levels[levelIndex]?.count ?? ''} {listName} {label} words with tone-coloured pinyin, zhuyin, traditional characters and meanings. Free download as CSV, Excel, Word, PDF, text or an Anki deck."
	/>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
	<PageHeader
		title={label}
		subtitle={loading ? listName : `${entries.length.toLocaleString()} words · ${listName}`}
		crumbs={[
			{ label: 'HSK lists', href: `${base}/hsk` },
			{ label: listName, href: `${base}/hsk#decks` },
			{ label }
		]}
	>
		{#snippet lead()}
			<IconDot hue={HUES[Math.max(0, levelIndex) % HUES.length]} size="lg" shape="tile"
				>{level.replace('-', '–')}</IconDot
			>
		{/snippet}
		{#snippet actions()}
			{#if prebuilt && deckManifest}
				<Button size="sm" onclick={() => (showDeck = true)}>
					<Download class="size-4" />Download deck
					<span class="font-medium opacity-80">{formatBytes(prebuilt.bytes)}</span>
				</Button>
			{/if}
			<Button
				size="sm"
				variant="secondary"
				disabled={loading || !entries.length}
				onclick={() => (exporting = { entries: sorted, filtered: false })}
			>
				<FileDown class="size-4" />Export list
			</Button>
		{/snippet}
	</PageHeader>

	{#if meta}
		<nav aria-label="Levels" class="mb-6 flex flex-wrap items-center gap-1.5">
			{#each meta.levels as l (l.level)}
				<a
					href="{base}/hsk/{meta.id}/{l.level}"
					class="{chipClass(l.level === level)} no-underline"
					aria-current={l.level === level ? 'page' : undefined}>{levelLabel(l.level)}</a
				>
			{/each}
			{#if switchHref && otherList}
				<a
					href={switchHref}
					class="ml-1 inline-flex min-h-9 items-center gap-0.5 text-sm font-semibold text-accent no-underline hover:underline"
					>{otherList.name} instead<ChevronRight class="size-4" /></a
				>
			{/if}
		</nav>
	{/if}

	{#if error}
		<p class="rounded-card bg-rose-soft p-4 text-rose-ink">Could not load {label}: {error}</p>
	{:else if loading}
		<div class="flex flex-col gap-3" aria-busy="true" aria-label="Loading words">
			<div class="h-11 animate-pulse rounded-full bg-sunk"></div>
			<div class="h-9 w-2/3 animate-pulse rounded-full bg-sunk"></div>
			{#each Array(8) as _, i (i)}
				<div class="h-14 animate-pulse rounded-card bg-sunk"></div>
			{/each}
		</div>
	{:else}
		{#key `${listId}/${level}`}
			<DataTable
				rows={sorted}
				key={entryKey}
				text={entrySearchText}
				facets={(e) => e.o ?? []}
				rowLabel={(e) => e.s}
				maxFacets={6}
				label="{label} words"
				placeholder="Filter words"
				bind:selected
			>
				{#snippet tools()}
					<label class="sr-only" for="hsk-sort">Sort</label>
					<select id="hsk-sort" bind:value={sort} class={selectClass}>
						{#each SORT_MODES as m (m.value)}
							<option value={m.value}>{m.label}</option>
						{/each}
					</select>
				{/snippet}

				{#snippet head()}
					<div class={GRID}>
						<span>Word</span>
						<span>Pinyin</span>
						<span>Meaning</span>
						<span class="hidden lg:block">Part of speech</span>
						<span></span>
					</div>
				{/snippet}

				{#snippet row(e: HskEntry)}
					{@const pinyin = pinyinTones(e.y, e.p)}
					<div class={GRID}>
						<div class="flex min-w-0 flex-wrap items-baseline gap-x-3 sm:contents">
							<span class="font-zh text-2xl leading-snug" lang="zh-Hans"
								>{#each hanziTones(e.s, e.p) as c, ci (ci)}<span class={toneText(c.tone)}
										>{c.ch}</span
									>{/each}</span
							>
							<span class="text-[15px] font-medium"
								>{#each pinyin as py, pi (pi)}<span class={toneText(py.tone)}>{py.text}</span
									>{#if pi < pinyin.length - 1}{' '}{/if}{/each}</span
							>
						</div>
						<div class="row-span-2 flex items-center justify-end gap-0.5 sm:order-last sm:row-span-1">
							<button
								type="button"
								class={iconBtn}
								aria-label="Play {e.s}"
								onclick={() => playHskWord(e.s, e.p)}
							>
								<Volume2 class="size-[18px]" />
							</button>
							<a
								href="{base}/dictionary?q={encodeURIComponent(e.s)}"
								class={iconBtn}
								aria-label="Look up {e.s} in the dictionary"
								title="Every reading, characters and examples"
							>
								<BookOpen class="size-[18px]" />
							</a>
						</div>
						<p class="m-0 line-clamp-2 min-w-0 text-[15px] text-muted sm:text-ink">{listMeaning(e.m)}</p>
						<div class="hidden flex-wrap gap-1 lg:flex">
							{#each (e.o ?? []).slice(0, 2) as o (o)}<Badge>{o}</Badge>{/each}
						</div>
					</div>
				{/snippet}

				{#snippet bulk(keys, clear)}
					<button
						type="button"
						class="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ground px-4 text-sm font-semibold text-ink hover:brightness-95"
						onclick={() => addToDeck(keys)}
					>
						<SquarePlus class="size-4" />Add to my deck
					</button>
					<button
						type="button"
						class="inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ground ring-1 ring-ground/40 ring-inset hover:bg-ground/10"
						onclick={() => (exporting = { entries: pick(keys), filtered: true })}
					>
						<FileDown class="size-4" />Export
					</button>
					<button
						type="button"
						class="min-h-9 rounded-full px-3 text-sm font-semibold text-ground/80 hover:text-ground"
						onclick={clear}>Clear</button
					>
				{/snippet}
			</DataTable>
		{/key}
	{/if}
</div>

{#if exporting}
	<HskExportModal
		entries={exporting.entries}
		{ctx}
		filtered={exporting.filtered}
		onClose={() => (exporting = null)}
	/>
{/if}

{#if showDeck && meta && deckManifest && prebuilt}
	<HskDeckModal
		list={meta}
		manifest={deckManifest}
		deck={prebuilt}
		onClose={() => (showDeck = false)}
	/>
{/if}
