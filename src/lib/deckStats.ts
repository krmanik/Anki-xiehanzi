/**
 * Pure deck statistics for the export preview: how many words, their HSK-level
 * spread and frequency-band spread. Kept free of DOM/sql so it unit-tests in the
 * fast `node` project.
 */

import { lowestHskLevel, frequencyBand } from './dict/meta';

export interface StatBucket {
	label: string;
	count: number;
}

export interface DeckStats {
	total: number;
	withLevel: number;
	withRank: number;
	levels: StatBucket[]; // HSK 1..7+ then Unknown, only non-empty buckets
	bands: StatBucket[]; // Top 100..10000+ then Unknown, only non-empty buckets
}

// Minimal shape — accept anything carrying level + rank (e.g. Word).
export interface StatWord {
	level: string | null;
	rank: number | null;
}

const BAND_ORDER = ['Top 100', 'Top 500', 'Top 1000', 'Top 2000', 'Top 5000', 'Top 10000', '10000+'];

function levelSortKey(label: string): number {
	if (label === 'Unknown') return Number.POSITIVE_INFINITY;
	const m = label.match(/\d+/);
	return m ? Number(m[0]) : Number.POSITIVE_INFINITY - 1;
}

export function computeDeckStats(words: StatWord[]): DeckStats {
	const levelCounts = new Map<string, number>();
	const bandCounts = new Map<string, number>();
	let withLevel = 0;
	let withRank = 0;

	for (const w of words) {
		const lvl = lowestHskLevel(w.level);
		const levelLabel = lvl ? `HSK ${lvl}` : 'Unknown';
		if (lvl) withLevel++;
		levelCounts.set(levelLabel, (levelCounts.get(levelLabel) ?? 0) + 1);

		const band = frequencyBand(w.rank);
		const bandLabel = band ?? 'Unknown';
		if (band) withRank++;
		bandCounts.set(bandLabel, (bandCounts.get(bandLabel) ?? 0) + 1);
	}

	const levels = [...levelCounts.entries()]
		.map(([label, count]) => ({ label, count }))
		.sort((a, b) => levelSortKey(a.label) - levelSortKey(b.label));

	const bandRank = (label: string) => {
		const i = BAND_ORDER.indexOf(label);
		return i < 0 ? BAND_ORDER.length : i;
	};
	const bands = [...bandCounts.entries()]
		.map(([label, count]) => ({ label, count }))
		.sort((a, b) => bandRank(a.label) - bandRank(b.label));

	return { total: words.length, withLevel, withRank, levels, bands };
}
