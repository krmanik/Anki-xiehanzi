/**
 * Pure half of `DataTable.svelte`: text filter, facet chips and row selection.
 * Selections are plain `Set`s, never mutated — every helper returns a new one,
 * so a component can hold one in `$state` and reassign it.
 */

/**
 * Lowercase and strip combining marks, so "zhong" finds "zhōng" and "nu" finds
 * "nǚ". Hanzi pass through unchanged.
 */
export function normalize(s: string): string {
	return s
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase();
}

/** Rows whose text contains every whitespace-separated term of the query. */
export function filterRows<T>(rows: readonly T[], query: string, text: (row: T) => string): T[] {
	const terms = normalize(query).split(/\s+/).filter(Boolean);
	if (terms.length === 0) return [...rows];
	return rows.filter((row) => {
		const hay = normalize(text(row));
		return terms.every((t) => hay.includes(t));
	});
}

export interface FacetCount {
	value: string;
	count: number;
}

/** Each facet value with how many rows carry it, most common first. */
export function facetCounts<T>(rows: readonly T[], facets: (row: T) => readonly string[]): FacetCount[] {
	const counts = new Map<string, number>();
	for (const row of rows) {
		// A row listing a value twice still counts once.
		for (const v of new Set(facets(row))) counts.set(v, (counts.get(v) ?? 0) + 1);
	}
	return [...counts]
		.map(([value, count]) => ({ value, count }))
		.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/** Rows carrying the facet value; `null` means "All". */
export function applyFacet<T>(
	rows: readonly T[],
	facet: string | null,
	facets: (row: T) => readonly string[]
): T[] {
	return facet === null ? [...rows] : rows.filter((row) => facets(row).includes(facet));
}

export function toggleKey(selected: ReadonlySet<string>, key: string): Set<string> {
	const next = new Set(selected);
	if (next.has(key)) next.delete(key);
	else next.add(key);
	return next;
}

export type SelectionState = 'none' | 'some' | 'all';

/** How much of what is on screen is selected — drives the header checkbox. */
export function selectionState(selected: ReadonlySet<string>, visible: readonly string[]): SelectionState {
	if (visible.length === 0) return 'none';
	const n = visible.filter((k) => selected.has(k)).length;
	return n === 0 ? 'none' : n === visible.length ? 'all' : 'some';
}

/**
 * The header checkbox: when everything visible is selected, deselect what is
 * visible; otherwise select it all. Rows hidden by the filter keep their state.
 */
export function toggleAll(selected: ReadonlySet<string>, visible: readonly string[]): Set<string> {
	const next = new Set(selected);
	if (selectionState(selected, visible) === 'all') visible.forEach((k) => next.delete(k));
	else visible.forEach((k) => next.add(k));
	return next;
}
