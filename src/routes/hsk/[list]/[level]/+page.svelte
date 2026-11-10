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
	import { setPendingWords, type PendingThen } from '$lib/hskHandoff';
	import { playHskWord } from '$lib/hskAudio';
	import { Button, DataTable, ICON_BUTTON, ISLAND_GHOST, ISLAND_PRIMARY, PAGE, toneText } from '$lib/ui';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Download from '@lucide/svelte/icons/download';
	import FileDown from '@lucide/svelte/icons/file-down';
	import Send from '@lucide/svelte/icons/send';
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

	/**
	 * The creator loads the words and goes straight to Export with the standard
	 * card (`then: 'export'`); Send also presses Send to Anki there.
	 */
	function addToDeck(keys: string[], then: PendingThen = 'export') {
		const words = pick(keys).map((e) => e.s);
		if (!words.length) return;
		setPendingWords({
			label: `${listName} · ${label}`,
			words,
			options: { audio: true, examples: true },
			then
		});
		goto(`${base}/create`);
	}

	// Word · pinyin · meaning · (part of speech) · actions. On a phone the row
	// stacks: word and pinyin, the meaning under them, actions on the right.
	const GRID =
		'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[8rem_8.5rem_minmax(0,1fr)_5.5rem] lg:grid-cols-[8.75rem_8.75rem_minmax(0,1fr)_11.5rem_5.5rem]';
	const iconBtn = ICON_BUTTON;
	const selectClass =
		'min-h-12 rounded-card border-0 bg-sunk py-0 pr-9 pl-4 text-[15px] font-semibold text-ink focus:ring-2 focus:ring-accent';
</script>

<svelte:head>
	<title>{label} word list — {listName} — Anki-xiehanzi</title>
	<meta
		name="description"
		content="All {meta?.levels[levelIndex]?.count ?? ''} {listName} {label} words with tone-coloured pinyin, zhuyin, traditional characters and meanings. Free download as CSV, Excel, Word, PDF, text or an Anki deck."
	/>
</svelte:head>

<div class={PAGE}>
	<header class="flex flex-wrap items-end justify-between gap-6 pt-9 pb-6 sm:pt-[60px] sm:pb-[26px]">
		<div class="min-w-0">
			<a href="{base}/hsk#decks" class="font-semibold text-muted no-underline hover:text-ink"
				>{meta ? `${meta.name} · ${meta.year}` : listName}</a
			>
			<h1 class="m-0 text-[60px] leading-[0.9] font-bold tracking-[-0.05em] text-ink sm:text-[84px]">{label}</h1>
			<p class="mt-2.5 mb-0 text-[17px] text-muted">
				{loading ? '…' : `${entries.length.toLocaleString()} words`}
			</p>
			<div class="mt-4 flex flex-wrap items-center gap-2">
				{#if prebuilt && deckManifest}
					<Button size="sm" onclick={() => (showDeck = true)}>
						<Download class="size-4" />Download deck
						<span class="font-medium opacity-60">{formatBytes(prebuilt.bytes)}</span>
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
				{#if switchHref && otherList}
					<a
						href={switchHref}
						class="inline-flex min-h-9 items-center gap-1 px-2 text-sm font-semibold text-muted no-underline hover:text-ink"
						>{otherList.name}<ArrowRight class="size-4" /></a
					>
				{/if}
			</div>
		</div>
		{#if meta}
			<nav aria-label="Levels" class="flex flex-wrap gap-2">
				{#each meta.levels as l (l.level)}
					<a
						href="{base}/hsk/{meta.id}/{l.level}"
						class="xhz-key"
						aria-label="{levelLabel(l.level)}, {l.count.toLocaleString()} words"
						aria-current={l.level === level ? 'page' : undefined}
						>{l.level.replace('-', '–')}<small>{l.count.toLocaleString()}</small></a
					>
				{/each}
			</nav>
		{/if}
	</header>

	{#if error}
		<p class="rounded-card bg-err-soft p-4 text-err-ink">Could not load {label}: {error}</p>
	{:else if loading}
		<div class="flex flex-col gap-3" aria-busy="true" aria-label="Loading words">
			<div class="h-12 animate-pulse rounded-card bg-sunk"></div>
			<div class="h-10 w-2/3 animate-pulse rounded-card bg-sunk"></div>
			{#each Array(8) as _, i (i)}
				<div class="h-16 animate-pulse rounded-[20px] bg-sunk"></div>
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
							<span class="font-zh text-[28px] leading-[1.05] font-semibold sm:text-[32px]" lang="zh-Hans"
								>{#each hanziTones(e.s, e.p) as c, ci (ci)}<span class={toneText(c.tone)}
										>{c.ch}</span
									>{/each}</span
							>
							<span class="text-[16.5px] font-semibold"
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
						<p class="m-0 line-clamp-2 min-w-0 text-[15px] text-muted sm:text-base sm:text-ink">{listMeaning(e.m)}</p>
						<p class="m-0 hidden text-sm text-muted lg:block">{(e.o ?? []).slice(0, 2).join(' · ')}</p>
					</div>
				{/snippet}

				{#snippet bulk(keys, clear)}
					<button type="button" class={ISLAND_PRIMARY} onclick={() => addToDeck(keys)}>
						<SquarePlus class="size-4" />Add to my deck
					</button>
					<!-- Desktop only: phones have no AnkiConnect. -->
					<button type="button" class="{ISLAND_GHOST} max-sm:hidden" onclick={() => addToDeck(keys, 'send')}>
						<Send class="size-4" />Send to Anki
					</button>
					<button
						type="button"
						class={ISLAND_GHOST}
						onclick={() => (exporting = { entries: pick(keys), filtered: true })}
					>
						<FileDown class="size-4" /><span class="max-sm:sr-only">Export</span>
					</button>
					<button type="button" class={ISLAND_GHOST} onclick={clear}>Clear</button>
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
