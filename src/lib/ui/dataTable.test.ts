import { describe, expect, it } from 'vitest';
import {
	applyFacet,
	facetCounts,
	filterRows,
	normalize,
	selectionState,
	toggleAll,
	toggleKey
} from './dataTable';

interface Word {
	s: string;
	y: string;
	m: string;
	o: string[];
}

const words: Word[] = [
	{ s: '中', y: 'zhōng', m: 'within; among', o: ['Noun', 'Verb'] },
	{ s: '女', y: 'nǚ', m: 'female; woman', o: ['Noun'] },
	{ s: '发展', y: 'fā zhǎn', m: 'development; growth', o: ['Verb', 'Noun', 'Verb'] },
	{ s: '又', y: 'yòu', m: '(once) again; also', o: ['Adverb'] }
];
const text = (w: Word) => `${w.s} ${w.y} ${w.m}`;
const pos = (w: Word) => w.o;

describe('normalize', () => {
	it('drops tone marks and case, keeps hanzi', () => {
		expect(normalize('Zhōng 中')).toBe('zhong 中');
		expect(normalize('nǚ')).toBe('nu');
	});
});

describe('filterRows', () => {
	it('matches toneless pinyin against tone-marked text', () => {
		expect(filterRows(words, 'zhong', text).map((w) => w.s)).toEqual(['中']);
		expect(filterRows(words, 'nu', text).map((w) => w.s)).toEqual(['女']);
	});
	it('requires every term', () => {
		expect(filterRows(words, 'fa growth', text).map((w) => w.s)).toEqual(['发展']);
		expect(filterRows(words, 'fa woman', text)).toEqual([]);
	});
	it('matches hanzi and returns everything for a blank query', () => {
		expect(filterRows(words, '展', text).map((w) => w.s)).toEqual(['发展']);
		expect(filterRows(words, '   ', text)).toHaveLength(4);
	});
});

describe('facets', () => {
	it('counts each value once per row, most common first', () => {
		expect(facetCounts(words, pos)).toEqual([
			{ value: 'Noun', count: 3 },
			{ value: 'Verb', count: 2 },
			{ value: 'Adverb', count: 1 }
		]);
	});
	it('filters by a value, null is all', () => {
		expect(applyFacet(words, 'Verb', pos).map((w) => w.s)).toEqual(['中', '发展']);
		expect(applyFacet(words, null, pos)).toHaveLength(4);
	});
});

describe('selection', () => {
	it('toggles one key without mutating', () => {
		const a = new Set(['中']);
		const b = toggleKey(a, '女');
		expect([...b]).toEqual(['中', '女']);
		expect([...a]).toEqual(['中']);
		expect([...toggleKey(b, '中')]).toEqual(['女']);
	});
	it('reports none / some / all of what is visible', () => {
		expect(selectionState(new Set(), ['中', '女'])).toBe('none');
		expect(selectionState(new Set(['中']), ['中', '女'])).toBe('some');
		expect(selectionState(new Set(['中', '女', '又']), ['中', '女'])).toBe('all');
		expect(selectionState(new Set(['中']), [])).toBe('none');
	});
	it('select-all adds the visible rows and keeps hidden selections', () => {
		const next = toggleAll(new Set(['又']), ['中', '女']);
		expect([...next].sort()).toEqual(['中', '又', '女'].sort());
	});
	it('select-all on a fully selected view clears only the visible rows', () => {
		const next = toggleAll(new Set(['中', '女', '又']), ['中', '女']);
		expect([...next]).toEqual(['又']);
	});
});
