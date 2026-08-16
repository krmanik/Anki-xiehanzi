<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { btnPrimary, btnSecondary } from '$lib/buttonStyles';
	import HskWordCard from '$lib/components/HskWordCard.svelte';
	import HskExportModal from '$lib/components/HskExportModal.svelte';
	import {
		filterEntries,
		formatClassifier,
		hanziTones,
		levelLabel,
		loadHskIndex,
		loadHskLevel,
		pinyinTones,
		sortEntries,
		SORT_MODES,
		type HskEntry,
		type HskListMeta,
		type SortMode
	} from '$lib/hsk';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Download from '@lucide/svelte/icons/download';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Rows3 from '@lucide/svelte/icons/rows-3';
	import Search from '@lucide/svelte/icons/search';
	import Palette from '@lucide/svelte/icons/palette';

	const listId = $derived(page.params.list ?? 'new');
	const level = $derived(page.params.level ?? '1');

	let lists = $state<HskListMeta[]>([]);
	let entries = $state<HskEntry[]>([]);
	let loading = $state(true);
	let error = $state('');

	let query = $state('');
	let sort = $state<SortMode>('list');
	let view = $state<'cards' | 'table'>('cards');
	let colorize = $state(true);
	let pageSize = $state(100);
	let pageNo = $state(1);
	let openWord = $state<string | null>(null);
	let showExport = $state(false);

	const meta = $derived(lists.find((l) => l.id === listId) ?? null);
	const levelMeta = $derived(meta?.levels.find((l) => l.level === level) ?? null);
	const listName = $derived(meta ? `${meta.name} (${meta.year})` : listId === 'old' ? 'Old HSK' : 'New HSK');
	const label = $derived(levelLabel(level));
	const ctx = $derived({ listName, levelLabel: label });

	const visible = $derived(sortEntries(filterEntries(entries, query), sort));
	const pageCount = $derived(pageSize === 0 ? 1 : Math.max(1, Math.ceil(visible.length / pageSize)));
	const pageItems = $derived(
		pageSize === 0 ? visible : visible.slice((pageNo - 1) * pageSize, pageNo * pageSize)
	);

	// Reset paging whenever the result set changes underneath it.
	$effect(() => {
		query;
		sort;
		pageSize;
		listId;
		level;
		pageNo = 1;
	});

	$effect(() => {
		const id = listId;
		const lvl = level;
		loading = true;
		error = '';
		openWord = null;
		Promise.all([loadHskIndex(), loadHskLevel(id, lvl)])
			.then(([index, data]) => {
				// A slow fetch for a level the user has already navigated away from
				// must not overwrite the current one.
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
</script>

<svelte:head>
	<title>{label} word list — {listName} — Anki xiehanzi</title>
	<meta
		name="description"
		content="All {levelMeta?.count ?? ''} {listName} {label} words with tone-coloured pinyin, zhuyin, traditional characters and meanings. Free download as CSV, Excel, Word, PDF, text or an Anki deck."
	/>
</svelte:head>

<section class="mx-auto max-w-6xl px-5 py-10">
	<a
		href="{base}/hsk"
		class="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-neutral-400 transition hover:text-neutral-900"
	>
		<ArrowLeft size={14} /> All HSK lists
	</a>

	<div class="mt-4 flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">{listName}</p>
			<h1 class="mt-1 text-4xl font-extrabold tracking-tight">{label}</h1>
			<p class="mt-1.5 text-sm text-neutral-500">
				{#if loading}
					Loading word list…
				{:else}
					{entries.length.toLocaleString()} words{#if query}
						· {visible.length.toLocaleString()} matching{/if}
				{/if}
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			{#if switchHref}
				<a class={btnSecondary} href={switchHref}>{otherList?.name} instead</a>
			{/if}
			<button
				class="{btnPrimary} inline-flex items-center gap-2"
				onclick={() => (showExport = true)}
				disabled={loading || !visible.length}
			>
				<Download size={15} /> Download
			</button>
		</div>
	</div>

	{#if meta}
		<div class="mt-6 flex flex-wrap gap-1.5">
			{#each meta.levels as l (l.level)}
				<a
					href="{base}/hsk/{meta.id}/{l.level}"
					class="rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition {l.level ===
					level
						? 'border-neutral-900 bg-neutral-900 text-white'
						: 'border-neutral-200 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900'}"
					>{levelLabel(l.level)}</a
				>
			{/each}
		</div>
	{/if}

	<div
		class="sticky top-[57px] z-30 -mx-5 mt-6 border-y border-neutral-200 bg-white/90 px-5 py-3 backdrop-blur"
	>
		<div class="flex flex-wrap items-center gap-2">
			<div class="relative min-w-[200px] flex-1">
				<Search size={15} class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
				<input
					bind:value={query}
					type="search"
					placeholder="Search hanzi, pinyin, zhuyin or meaning…"
					aria-label="Search this level"
					class="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-neutral-900"
				/>
			</div>

			<select
				bind:value={sort}
				aria-label="Sort order"
				class="rounded-lg border border-neutral-300 py-2 pl-3 pr-8 text-sm outline-none transition focus:border-neutral-900"
			>
				{#each SORT_MODES as m (m.value)}
					<option value={m.value}>{m.label}</option>
				{/each}
			</select>

			<select
				bind:value={pageSize}
				aria-label="Words per page"
				class="rounded-lg border border-neutral-300 py-2 pl-3 pr-8 text-sm outline-none transition focus:border-neutral-900"
			>
				<option value={50}>50 / page</option>
				<option value={100}>100 / page</option>
				<option value={250}>250 / page</option>
				<option value={0}>Show all</option>
			</select>

			<div class="flex overflow-hidden rounded-lg border border-neutral-300">
				<button
					onclick={() => (view = 'cards')}
					aria-label="Card view"
					aria-pressed={view === 'cards'}
					class="p-2 transition {view === 'cards'
						? 'bg-neutral-900 text-white'
						: 'text-neutral-500 hover:text-neutral-900'}"><LayoutGrid size={15} /></button
				>
				<button
					onclick={() => (view = 'table')}
					aria-label="Table view"
					aria-pressed={view === 'table'}
					class="p-2 transition {view === 'table'
						? 'bg-neutral-900 text-white'
						: 'text-neutral-500 hover:text-neutral-900'}"><Rows3 size={15} /></button
				>
			</div>

			<button
				onclick={() => (colorize = !colorize)}
				aria-pressed={colorize}
				title="Toggle tone colours"
				class="rounded-lg border p-2 transition {colorize
					? 'border-neutral-900 text-neutral-900'
					: 'border-neutral-300 text-neutral-400 hover:text-neutral-900'}"
			>
				<Palette size={15} />
			</button>
		</div>
	</div>

	{#if error}
		<p class="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
			Could not load {label}: {error}
		</p>
	{:else if loading}
		<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(9) as _}
				<div class="h-40 animate-pulse rounded-xl bg-neutral-100"></div>
			{/each}
		</div>
	{:else if !visible.length}
		<p class="mt-10 text-center text-neutral-500">
			No word in {label} matches “{query}”.
		</p>
	{:else if view === 'cards'}
		<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each pageItems as entry, i (entry.s + entry.p)}
				<HskWordCard
					{entry}
					index={(pageSize === 0 ? 0 : (pageNo - 1) * pageSize) + i + 1}
					{colorize}
					open={openWord === entry.s}
					onToggle={() => (openWord = openWord === entry.s ? null : entry.s)}
				/>
			{/each}
		</div>
	{:else}
		<div class="mt-8 overflow-x-auto rounded-xl border border-neutral-200">
			<table class="w-full min-w-[720px] border-collapse text-sm">
				<thead>
					<tr class="border-b border-neutral-200 bg-neutral-50 text-left">
						<th class="w-12 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">#</th>
						<th class="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">Word</th>
						<th class="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">Trad.</th>
						<th class="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">Pinyin</th>
						<th class="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">Zhuyin</th>
						<th class="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">Meaning</th>
						<th class="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">POS</th>
					</tr>
				</thead>
				<tbody>
					{#each pageItems as entry, i (entry.s + entry.p)}
						<tr class="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
							<td class="px-3 py-2 font-mono text-[11px] text-neutral-300"
								>{(pageSize === 0 ? 0 : (pageNo - 1) * pageSize) + i + 1}</td
							>
							<td class="px-3 py-2 text-xl" lang="zh-Hans">
								{#each hanziTones(entry.s, entry.p) as c}<span
										class={colorize ? `tone${c.tone}` : ''}>{c.ch}</span
									>{/each}
							</td>
							<td class="px-3 py-2 text-base text-neutral-400" lang="zh-Hant"
								>{entry.t !== entry.s ? entry.t : ''}</td
							>
							<td class="whitespace-nowrap px-3 py-2">
								{#each pinyinTones(entry.y, entry.p) as p, pi}<span
										class={colorize ? `tone${p.tone}` : ''}>{p.text}</span
									>{#if pi < pinyinTones(entry.y, entry.p).length - 1}&nbsp;{/if}{/each}
							</td>
							<td class="whitespace-nowrap px-3 py-2 font-mono text-xs text-neutral-500">{entry.z}</td>
							<td class="px-3 py-2 text-neutral-600">
								{entry.m}
								{#if entry.c?.length}
									<span class="ml-1 text-xs text-neutral-400"
										>CL: {entry.c.map(formatClassifier).join(', ')}</span
									>
								{/if}
							</td>
							<td class="whitespace-nowrap px-3 py-2 text-xs text-neutral-500">{entry.o?.[0] ?? ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if !loading && !error && pageCount > 1}
		<div class="mt-8 flex flex-wrap items-center justify-center gap-2">
			<button class={btnSecondary} onclick={() => (pageNo = Math.max(1, pageNo - 1))} disabled={pageNo === 1}
				>Previous</button
			>
			<span class="font-mono text-xs uppercase tracking-wider text-neutral-500">
				Page {pageNo} / {pageCount}
			</span>
			<button
				class={btnSecondary}
				onclick={() => (pageNo = Math.min(pageCount, pageNo + 1))}
				disabled={pageNo === pageCount}>Next</button
			>
		</div>
	{/if}
</section>

{#if showExport}
	<HskExportModal
		entries={visible}
		{ctx}
		filtered={visible.length !== entries.length}
		onClose={() => (showExport = false)}
	/>
{/if}
