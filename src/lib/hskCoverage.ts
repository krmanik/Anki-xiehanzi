/**
 * Classify a word list against an HSK standard, for the coverage-analyzer
 * tool. Loading is cached per list (`buildHskLookup`); classifying is pure
 * and unit-tested (`classifyWords`).
 */

import { loadHskIndex, loadHskLevel, type HskListMeta } from '$lib/hsk';

export type HskListId = 'old' | 'new';

export interface HskLookupEntry {
	level: string;
	listName: string;
}

const lookupCache = new Map<HskListId, Promise<Map<string, HskLookupEntry>>>();

/** Every word in `listId`, keyed by simplified form, mapped to its level. */
export function buildHskLookup(listId: HskListId): Promise<Map<string, HskLookupEntry>> {
	let hit = lookupCache.get(listId);
	if (!hit) {
		hit = (async () => {
			const index = await loadHskIndex();
			const list = index.lists.find((l) => l.id === listId) as HskListMeta | undefined;
			const map = new Map<string, HskLookupEntry>();
			if (!list) return map;
			const levels = await Promise.all(
				list.levels.map((meta) => loadHskLevel(listId, meta.level))
			);
			levels.forEach((entries, i) => {
				const level = list.levels[i].level;
				for (const entry of entries) {
					if (!map.has(entry.s)) map.set(entry.s, { level, listName: list.name });
				}
			});
			return map;
		})();
		lookupCache.set(listId, hit);
	}
	return hit;
}

export interface LevelCoverage {
	level: string;
	count: number;
	percent: number;
}

export interface CoverageResult {
	total: number;
	byLevel: LevelCoverage[];
	unknown: string[];
}

/** Classify unique words against a pre-built lookup. Pure — no I/O. */
export function classifyWords(
	words: string[],
	lookup: Map<string, HskLookupEntry>
): CoverageResult {
	const counts = new Map<string, number>();
	const unknown: string[] = [];

	for (const word of words) {
		const hit = lookup.get(word);
		if (hit) counts.set(hit.level, (counts.get(hit.level) ?? 0) + 1);
		else unknown.push(word);
	}

	const total = words.length;
	const byLevel = [...counts.entries()]
		.map(([level, count]) => ({ level, count, percent: total ? (count / total) * 100 : 0 }))
		.sort((a, b) => a.level.localeCompare(b.level, undefined, { numeric: true }));

	return { total, byLevel, unknown };
}
