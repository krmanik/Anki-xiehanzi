/**
 * Pure helpers for word metadata display: HSK level labels and frequency bands.
 *
 * Kept free of sql.js / $app/paths so they unit-test in the fast `node` project.
 * The data itself comes from cedict.db (`word_levels.level`, `cedict.rank`).
 */

/**
 * Frequency band label from a CEDICT word rank (1 = most common).
 * Null rank → null (unknown / not in frequency list).
 */
export function frequencyBand(rank: number | null | undefined): string | null {
	if (rank == null || rank <= 0) return null;
	if (rank <= 100) return 'Top 100';
	if (rank <= 500) return 'Top 500';
	if (rank <= 1000) return 'Top 1000';
	if (rank <= 2000) return 'Top 2000';
	if (rank <= 5000) return 'Top 5000';
	if (rank <= 10000) return 'Top 10000';
	return '10000+';
}

/**
 * Parse a `word_levels.level` value into its HSK level tokens.
 * Values look like "new-1", "new-7+", or comma-joined "new-1,new-2".
 * Returns tokens without the "new-" prefix, e.g. ['1','2'] or ['7+'].
 */
export function hskLevels(level: string | null | undefined): string[] {
	if (!level) return [];
	return level
		.split(',')
		.map((s) => s.trim().replace(/^new-/i, '').trim())
		.filter(Boolean);
}

/** Numeric sort key for an HSK token ("7+" → 7, "3" → 3, junk → Infinity). */
function levelNum(token: string): number {
	const m = token.match(/\d+/);
	return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
}

/** Lowest (earliest-learned) HSK token in a level value, or null. */
export function lowestHskLevel(level: string | null | undefined): string | null {
	const tokens = hskLevels(level);
	if (!tokens.length) return null;
	return [...tokens].sort((a, b) => levelNum(a) - levelNum(b))[0];
}

/**
 * Human-readable HSK label from a `word_levels.level` value, using the lowest
 * level the word appears at, e.g. "new-2,new-4" → "HSK 2". Null when unknown.
 */
export function hskLevelLabel(level: string | null | undefined): string | null {
	const lowest = lowestHskLevel(level);
	return lowest ? `HSK ${lowest}` : null;
}
