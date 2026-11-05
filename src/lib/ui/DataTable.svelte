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
		toggleAll,
		toggleKey
	} from './dataTable';
	import { cx } from './styles';

	let {
		rows,
		key,
		text,
		facets,
		rowLabel = key,
		label,
		placeholder = 'Filter',
		limit = 200,
		selected = $bindable([]),
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
		selected?: string[];
		/** Column captions; rendered beside the select-all checkbox on wide screens. */
		head?: Snippet;
		row: Snippet<[T, boolean]>;
		bulk?: Snippet<[string[], () => void]>;
		empty?: Snippet;
	} = $props();

	let query = $state('');
	let facet = $state<string | null>(null);
	let shown = $state(0);

	const sel = $derived(new Set(selected));
	const filtered = $derived(filterRows(rows, query, text));
	const chips = $derived(facets ? facetCounts(filtered, facets) : []);
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
	<label
		class="flex min-h-11 items-center gap-2.5 rounded-full bg-sunk px-4 text-muted focus-within:outline-3 focus-within:outline-sky"
	>
		<Search class="size-[18px] shrink-0" aria-hidden="true" />
		<span class="sr-only">{placeholder}</span>
		<input
			type="search"
			bind:value={query}
			{placeholder}
			class="w-full border-0 bg-transparent p-0 text-[15px] text-ink placeholder:text-muted focus:ring-0 focus:outline-none"
		/>
	</label>

	{#if chips.length}
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
			<Chip selected={facet === null} onclick={() => (facet = null)} count={filtered.length}>All</Chip>
			{#each chips as c (c.value)}
				<Chip selected={facet === c.value} onclick={() => (facet = c.value)} count={c.count}
					>{c.value}</Chip
				>
			{/each}
		</div>
	{/if}

	<div class="overflow-hidden rounded-card ring-1 ring-line ring-inset">
		<div class="flex items-center gap-3 bg-sunk px-4 py-2.5 text-[13px] font-semibold text-muted">
			<input
				type="checkbox"
				class="size-[18px] rounded accent-[var(--xhz-sky-ink)]"
				aria-label="Select all shown"
				checked={selState === 'all'}
				use:indeterminate={selState === 'some'}
				onchange={setAll}
				disabled={visible.length === 0}
			/>
			{#if head}<div class="hidden min-w-0 flex-1 sm:block">{@render head()}</div>{/if}
			<span class={cx('ml-auto shrink-0', head && 'sm:ml-0')}
				>{visible.length.toLocaleString()} of {rows.length.toLocaleString()}</span
			>
		</div>
		<ul class="m-0 list-none p-0" aria-label={label}>
			{#each page as r (key(r))}
				{@const k = key(r)}
				{@const on = sel.has(k)}
				<li class={cx('flex items-center gap-3 border-t border-line px-4 py-2.5', on && 'bg-sky-soft')}>
					<input
						type="checkbox"
						class="size-[18px] shrink-0 rounded accent-[var(--xhz-sky-ink)]"
						aria-label={`Select ${rowLabel(r)}`}
						checked={on}
						onchange={() => setOne(k)}
					/>
					<div class="min-w-0 flex-1">{@render row(r, on)}</div>
				</li>
			{:else}
				<li class="border-t border-line px-4 py-8 text-center text-muted">
					{#if empty}{@render empty()}{:else}Nothing matches “{query}”.{/if}
				</li>
			{/each}
		</ul>
	</div>

	{#if visible.length > page.length}
		<button
			type="button"
			class="self-center rounded-full bg-sunk px-5 py-2 text-sm font-semibold text-ink hover:brightness-95"
			onclick={() => (shown = page.length + limit)}
			>Show more ({(visible.length - page.length).toLocaleString()} left)</button
		>
	{/if}

	{#if bulk && selected.length}
		<div
			class="sticky bottom-4 z-10 mx-auto flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-[20px] bg-ink py-2 pr-2 pl-5 text-ground shadow-lg sm:rounded-full"
			role="region"
			aria-label="Selection"
		>
			<span class="mr-auto font-semibold">{selected.length.toLocaleString()} selected</span>
			{@render bulk(selected, clear)}
		</div>
	{/if}
</div>
