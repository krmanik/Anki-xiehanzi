/**
 * Smart example-sentence ranking. We score candidate sentences so the most
 * useful ones surface first: lower difficulty (a proxy for HSK level /
 * commonness) and shorter length are preferred. Pure + unit-tested; the DB
 * lookup lives in cedict.ts.
 */

export interface RankableSentence {
	sentence: string;
	difficulty: number;
}

/**
 * Rank by a composite score (lower = better): difficulty plus a mild length
 * penalty, so easy, concise sentences win. Returns up to `limit` sentence
 * strings, de-duplicated.
 */
export function rankSentences(rows: RankableSentence[], limit = 3): string[] {
	const seen = new Set<string>();
	const scored = rows
		.filter((r) => {
			const s = (r.sentence ?? '').trim();
			if (!s || seen.has(s)) return false;
			seen.add(s);
			return true;
		})
		.map((r) => ({
			sentence: r.sentence.trim(),
			// Length measured in characters; /8 keeps it a gentle tiebreaker next to
			// difficulty rather than dominating it.
			score: (r.difficulty ?? 0) + [...r.sentence.trim()].length / 8
		}))
		.sort((a, b) => a.score - b.score);

	return scored.slice(0, limit).map((s) => s.sentence);
}
