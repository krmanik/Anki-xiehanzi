import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

// The dictionary layer is sql.js + a 10 MB database; the page only needs it to
// answer. Everything ranking-related is tested for real in dictionary.test.ts.
// vi.mock is hoisted above every import, so the spy has to be hoisted with it.
const { searchDictionary } = vi.hoisted(() => ({
	searchDictionary: vi.fn(async () => [
		{
			simplified: '好',
			traditional: '好',
			syllables: 'hao3',
			pinyin: 'hǎo',
			meaning: 'good; well',
			rank: 50,
			level: 'new-1',
			via: 'hanzi' as const,
			score: 300
		}
	])
}));

vi.mock('$lib/dict/cedict', () => ({
	loadCedict: vi.fn(async () => {}),
	searchDictionary,
	lookup: vi.fn(async (word: string) => ({
		simplified: word,
		traditional: word,
		commonMeaning: 'good; well',
		pos: ['a'],
		dominantPos: 'a',
		classifiers: [],
		level: 'new-1',
		rank: 50,
		readings: [
			{
				syllable: 'hao3',
				pinyin: 'hǎo',
				pinyinPlain: 'hǎo',
				zhuyin: 'ㄏㄠˇ',
				definition: 'good; well'
			}
		]
	})),
	characterBreakdown: vi.fn(async () => [
		{ character: '好', pinyin: 'hǎo', definition: 'good', radical: '女', decomposition: '⿰女子' }
	]),
	lookupCharacters: vi.fn(async () => [
		{ character: '好', pinyin: 'hǎo', definition: 'good', radical: '女', decomposition: '⿰女子' }
	]),
	getSmartSentences: vi.fn(async () => []),
	wordsContaining: vi.fn(async () => []),
	charactersWithComponent: vi.fn(async () => []),
	posDisplay: (raw: string) => (raw === 'a' ? 'Adjective' : raw)
}));

vi.mock('$lib/dict/chardata', () => ({
	loadCharAssets: vi.fn(async () => ({ etymology: {}, strokeNames: {}, strokeTypes: {} }))
}));

vi.mock('$lib/radicals', () => ({ loadRadicals: vi.fn(async () => ({ radicals: [] })) }));

vi.mock('hanzi-writer', () => ({
	default: { create: () => ({ animateCharacter() {}, showOutline() {}, hideOutline() {}, quiz() {} }) }
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn(async () => {}) }));

// `+`-prefixed files are SvelteKit-reserved, so this test lives outside routes/.
import Page from '../routes/dictionary/+page.svelte';

beforeEach(() => {
	localStorage.clear();
	searchDictionary.mockClear();
});

describe('Dictionary page', () => {
	it('shows the search box and the three ways to search', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: 'Dictionary' })).toBeInTheDocument();
		expect(screen.getByLabelText('Search the dictionary')).toBeInTheDocument();
		expect(screen.getByText('Three ways to search')).toBeInTheDocument();
	});

	it('labels what kind of query was typed', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.type(screen.getByLabelText('Search the dictionary'), 'hao3');
		expect(await screen.findByText('pinyin')).toBeInTheDocument();
	});

	it('searches, lists the result, and opens the entry', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.type(screen.getByLabelText('Search the dictionary'), '好');

		const result = await screen.findByText('good; well');
		await user.click(result);

		// The entry renders the reading and its sense, not just the list row.
		expect(await screen.findByText('ㄏㄠˇ')).toBeInTheDocument();
		expect(searchDictionary).toHaveBeenCalled();
	});

	it('keeps a word bag for the deck creator', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.type(screen.getByLabelText('Search the dictionary'), '好');
		await user.click(await screen.findByLabelText('Add 好 to the deck list'));
		expect(await screen.findByText(/Make a deck \(1\)/)).toBeInTheDocument();
		expect(JSON.parse(localStorage.getItem('xiehanzi:dict-bag')!)).toEqual(['好']);
	});
});
