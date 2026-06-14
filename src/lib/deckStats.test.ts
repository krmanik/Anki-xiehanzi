import { describe, it, expect } from 'vitest';
import { computeDeckStats } from './deckStats';

describe('computeDeckStats', () => {
	it('counts totals and known-level / known-rank words', () => {
		const stats = computeDeckStats([
			{ level: 'new-1', rank: 50 },
			{ level: 'new-2,new-3', rank: 800 },
			{ level: null, rank: null }
		]);
		expect(stats.total).toBe(3);
		expect(stats.withLevel).toBe(2);
		expect(stats.withRank).toBe(2);
	});

	it('buckets HSK levels by lowest level, ordered, with Unknown last', () => {
		const stats = computeDeckStats([
			{ level: 'new-3', rank: null },
			{ level: 'new-1', rank: null },
			{ level: 'new-1', rank: null },
			{ level: null, rank: null }
		]);
		expect(stats.levels).toEqual([
			{ label: 'HSK 1', count: 2 },
			{ label: 'HSK 3', count: 1 },
			{ label: 'Unknown', count: 1 }
		]);
	});

	it('buckets frequency bands in band order', () => {
		const stats = computeDeckStats([
			{ level: null, rank: 5 },
			{ level: null, rank: 300 },
			{ level: null, rank: 300 },
			{ level: null, rank: null }
		]);
		expect(stats.bands).toEqual([
			{ label: 'Top 100', count: 1 },
			{ label: 'Top 500', count: 2 },
			{ label: 'Unknown', count: 1 }
		]);
	});

	it('handles an empty deck', () => {
		const stats = computeDeckStats([]);
		expect(stats).toEqual({ total: 0, withLevel: 0, withRank: 0, levels: [], bands: [] });
	});
});
