import { describe, expect, it } from 'vitest';
import { classifyWords, type HskLookupEntry } from './hskCoverage';

const lookup = new Map<string, HskLookupEntry>([
	['你好', { level: '1', listName: 'New HSK (2025)' }],
	['谢谢', { level: '1', listName: 'New HSK (2025)' }],
	['图书馆', { level: '3', listName: 'New HSK (2025)' }]
]);

describe('classifyWords', () => {
	it('buckets known words by level and collects the rest as unknown', () => {
		const result = classifyWords(['你好', '谢谢', '图书馆', '喵星人'], lookup);
		expect(result.total).toBe(4);
		expect(result.unknown).toEqual(['喵星人']);
		expect(result.byLevel).toEqual([
			{ level: '1', count: 2, percent: 50 },
			{ level: '3', count: 1, percent: 25 }
		]);
	});

	it('sorts levels numerically, not lexically', () => {
		const mixed = new Map<string, HskLookupEntry>([
			['a', { level: '2', listName: 'x' }],
			['b', { level: '10', listName: 'x' }],
			['c', { level: '1', listName: 'x' }]
		]);
		const result = classifyWords(['a', 'b', 'c'], mixed);
		expect(result.byLevel.map((l) => l.level)).toEqual(['1', '2', '10']);
	});

	it('returns an empty result for an empty word list', () => {
		const result = classifyWords([], lookup);
		expect(result).toEqual({ total: 0, byLevel: [], unknown: [] });
	});
});
