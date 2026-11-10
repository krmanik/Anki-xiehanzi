<!--
  A list of records with a filter box, facet chips, row checkboxes and a bulk
  action bar. The caller renders each row (`row`) and the actions for the
  selection (`bulk`); filtering and selection live in `dataTable.ts`.

  Rows are a list, not a <table>: each row is laid out by its snippet, which is
  what lets a row stack on a phone instead of scrolling sideways.
-->
<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import Search from '@lucide/svelte/icons/search';
	import Chip from './Chip.svelte';
	import {
		applyFacet,
		facetCounts,
		filterRows,
		selectionState,
		shownFacets,
		toggleAll,
		toggleKey
	} from './dataTable';
	import { buttonClass, CHECK, cx, FIELD, FIELD_INPUT, SEG } from './styles';

	let {
		rows,
		key,
		text,
		facets,
		rowLabel = key,
		label,
		placeholder = 'Filter',
		limit = 200,
		maxFacets = 8,
		selected = $bindable([]),
		tools,
		head,
		row,
		bulk,
		empty
	}: {
		rows: readonly T[];
		/** Stable id of a row; also the selection key. */
		key: (row: T) => string;
		/** Everything the filter box searches, as one string. */
		text: (row: T) => string;
		/** Facet values of a row (e.g. parts of speech); omit for no chips. */
		facets?: (row: T) => readonly string[];
		/** Accessible name of a row's checkbox. */
		rowLabel?: (row: T) => string;
		/** Accessible name of the whole list. */
		label: string;
		placeholder?: string;
		/** Rows rendered before "Show more". */
		limit?: number;
		/** Facet chips shown before "More". */
		maxFacets?: number;
		selected?: string[];
		/** Controls beside the filter box (a sort menu). */
		tools?: Snippet;
		/** Column captions; rendered beside the select-all checkbox on wide screens. */
		head?: Snippet;
		row: Snippet<[T, boolean]>;
		bulk?: Snippet<[string[], () => void]>;
		empty?: Snippet;
	} = $props();

	let query = $state('');
	let facet = $state<string | null>(null);
	let shown = $state(0);
	let allChips = $state(false);

	const sel = $derived(new Set(selected));
	const filtered = $derived(filterRows(rows, query, text));
	const chips = $derived(facets ? facetCounts(filtered, facets) : []);
	const chipView = $derived(shownFacets(chips, maxFacets, facet, allChips));
	const visible = $derived(facets ? applyFacet(filtered, facet, facets) : filtered);
	const visibleKeys = $derived(visible.map(key));
	const selState = $derived(selectionState(sel, visibleKeys));
	const page = $derived(visible.slice(0, Math.max(limit, shown)));

	const clear = () => (selected = []);
	const setAll = () => (selected = [...toggleAll(sel, visibleKeys)]);
	const setOne = (k: string) => (selected = [...toggleKey(sel, k)]);

	// A chip for a value the current filter no longer has would show nothing.
	$effect(() => {
		if (facet !== null && !chips.some((c) => c.value === facet)) facet = null;
	});

	const indeterminate = (node: HTMLInputElement, on: boolean) => {
		node.indeterminate = on;
		return { update: (v: boolean) => (node.indeterminate = v) };
	};
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-2.5">
		<label class="{FIELD} min-w-[8rem] flex-1 basis-[280px]">
			<Search class="size-[18px] shrink-0" aria-hidden="true" />
			<span class="sr-only">{placeholder}</span>
			<input type="search" bind:value={query} {placeholder} class={FIELD_INPUT} />
		</label>
		{#if tools}{@render tools()}{/if}
	</div>

	<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
		{#if chips.length}
			<!-- One sideways-scrolling line on a phone; wraps from sm up. -->
			<div class="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0">
				<div
					class="{SEG} flex-nowrap sm:flex-wrap [&>*]:shrink-0"
					role="group"
					aria-label="Filter by type"
				>
					<Chip selected={facet === null} onclick={() => (facet = null)} count={filtered.length}>All</Chip>
					{#each chipView.shown as c (c.value)}
						<Chip selected={facet === c.value} onclick={() => (facet = c.value)} count={c.count}
							>{c.value}</Chip
						>
					{/each}
					{#if chipView.hidden}
						<button type="button" aria-expanded="false" onclick={() => (allChips = true)}
							>{chipView.hidden} more…</button
						>
					{:else if allChips && chips.length > maxFacets}
						<button type="button" aria-expanded="true" onclick={() => (allChips = false)}>Fewer</button>
					{/if}
				</div>
			</div>
		{/if}
		<span class="ml-auto text-sm text-muted" aria-live="polite"
			>{visible.length.toLocaleString()} of {rows.length.toLocaleString()}</span
		>
	</div>

	<div class="rounded-tile bg-surface p-2 shadow-object sm:p-2.5">
		<div class="flex items-center gap-3 px-3.5 pt-2 pb-2.5 text-[13px] font-semibold text-muted">
			<input
				type="checkbox"
				class={CHECK}
				aria-label="Select all shown"
				checked={selState === 'all'}
				use:indeterminate={selState === 'some'}
				onchange={setAll}
				disabled={visible.length === 0}
			/>
			<span class={cx(head && 'sm:hidden')} aria-hidden="true">Select all</span>
			{#if head}<div class="hidden min-w-0 flex-1 sm:block">{@render head()}</div>{/if}
		</div>
		<ul class="m-0 list-none p-0" aria-label={label}>
			{#each page as r (key(r))}
				{@const k = key(r)}
				{@const on = sel.has(k)}
				<li
					class={cx(
						'xhz-row flex items-center gap-3 rounded-[20px] px-3.5 py-3 transition-colors hover:bg-sunk',
						on && 'is-on bg-sunk'
					)}
				>
					<input
						type="checkbox"
						class={CHECK}
						aria-label={`Select ${rowLabel(r)}`}
						checked={on}
						onchange={() => setOne(k)}
					/>
					<div class="min-w-0 flex-1">{@render row(r, on)}</div>
				</li>
			{:else}
				<li class="px-4 py-10 text-center text-muted">
					{#if empty}{@render empty()}{:else}Nothing matches “{query}”.{/if}
				</li>
			{/each}
		</ul>
	</div>

	{#if visible.length > page.length}
		<button
			type="button"
			class="{buttonClass('secondary', 'sm')} self-center"
			onclick={() => (shown = page.length + limit)}
			>Show more ({(visible.length - page.length).toLocaleString()} left)</button
		>
	{/if}

	{#if bulk && selected.length}
		<div class="sticky bottom-5 z-10 mx-auto mt-1 w-full sm:w-fit">
			<div class="xhz-island w-full max-sm:justify-between sm:w-fit" role="region" aria-label="Selection">
				<span class="grid size-9 shrink-0 place-items-center rounded-full bg-white font-bold text-black tabular-nums" aria-hidden="true"
					>{selected.length.toLocaleString()}</span
				>
				<span class="mr-auto pr-1 pl-0.5 font-semibold max-sm:sr-only sm:mr-1"
					><span class="sr-only">{`${selected.length.toLocaleString()} `}</span>selected</span
				>
				{@render bulk(selected, clear)}
			</div>
		</div>
	{/if}
</div>
