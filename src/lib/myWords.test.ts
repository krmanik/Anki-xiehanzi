import { beforeEach, describe, expect, it } from 'vitest';
import {
	lastSettings,
	splitTypedWords,
	BAG_KEY,
	DRAFT_KEY,
	LISTS_KEY,
	deleteDeck,
	loadBag,
	loadDecks,
	loadDraft,
	makeBackup,
	mergeBag,
	mergeDecks,
	parseBackup,
	parseDecks,
	parseSettings,
	saveDeck,
	saveDraft,
	savedDate,
	wordPreview,
	type DeckSettings,
	type SavedDeck
} from './myWords';

// Map-backed localStorage keeps these in the fast `node` project.
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
	value: {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
		removeItem: (k: string) => void store.delete(k)
	},
	writable: true
});

const settings: DeckSettings = {
	includeAudio: true,
	tabs: ['Standard'],
	tabContent: { Standard: { front: ['frontSimplified'], back: ['backPinyin'], additional: [], elementStyles: {} } },
	order: ['Simplified', 'Pinyin'],
	template: { mono: false } as DeckSettings['template']
};
const deck = (name: string, savedAt: number, words = ['爱'], extra: Partial<SavedDeck> = {}): SavedDeck => ({
	name,
	words,
	savedAt,
	...extra
});

beforeEach(() => store.clear());

describe('parseSettings', () => {
	it('keeps a whole set of card settings', () => {
		expect(parseSettings(settings)).toEqual(settings);
	});
	it('rejects a set with any part missing rather than half-restoring it', () => {
		expect(parseSettings({ ...settings, tabs: [] })).toBeUndefined();
		expect(parseSettings({ ...settings, tabs: ['Nope'] })).toBeUndefined();
		expect(parseSettings({ ...settings, order: undefined })).toBeUndefined();
		expect(parseSettings({ ...settings, template: null })).toBeUndefined();
		expect(parseSettings('x')).toBeUndefined();
	});
});

describe('parseDecks / mergeDecks', () => {
	it('drops bad rows, dedupes words, and sorts newest first', () => {
		const got = parseDecks([
			deck('A', 1, ['爱', ' 爱 ', '八']),
			{ name: '', words: ['x'] },
			{ name: 'No words', words: [] },
			'junk',
			deck('B', 5)
		]);
		expect(got.map((d) => d.name)).toEqual(['B', 'A']);
		expect(got[1].words).toEqual(['爱', '八']);
		expect(parseDecks('nope')).toEqual([]);
	});

	it('one entry per name: the newer save wins', () => {
		const got = mergeDecks([deck('A', 1, ['爱'])], [deck('A', 2, ['爱', '八']), deck('B', 3)]);
		expect(got.map((d) => [d.name, d.words.length])).toEqual([
			['B', 1],
			['A', 2]
		]);
		expect(mergeDecks([deck('A', 9, ['新'])], [deck('A', 2, ['旧'])])[0].words).toEqual(['新']);
	});

	it('a newer copy without card settings keeps the older copy’s', () => {
		const got = mergeDecks([deck('A', 1, ['爱'], { settings })], [deck('A', 2, ['爱', '八'])]);
		expect(got[0].words).toEqual(['爱', '八']);
		expect(got[0].settings).toEqual(settings);
	});
});

describe('storage', () => {
	it('saves by deck name, so sending the same deck again updates its entry', () => {
		saveDeck(deck('HSK 3 — 6 Nov', 1, ['会']));
		saveDeck(deck('HSK 3 — 6 Nov', 2, ['会', '发展'], { settings }));
		saveDeck(deck('My words — 6 Nov', 3));
		const decks = loadDecks();
		expect(decks).toHaveLength(2);
		expect(decks[1]).toMatchObject({ name: 'HSK 3 — 6 Nov', words: ['会', '发展'], settings });
		expect(JSON.parse(store.get(LISTS_KEY)!)).toHaveLength(2);
		expect(deleteDeck('HSK 3 — 6 Nov').map((d) => d.name)).toEqual(['My words — 6 Nov']);
	});

	it('a draft round-trips and an empty one clears the entry', () => {
		saveDraft({ words: ['爱'], deckName: 'D', savedAt: 4, settings });
		expect(loadDraft()).toEqual({ words: ['爱'], deckName: 'D', savedAt: 4, settings });
		saveDraft({ words: [], deckName: 'D', savedAt: 5 });
		expect(store.has(DRAFT_KEY)).toBe(false);
		saveDraft({ words: ['爱'], deckName: 'D', savedAt: 4 });
		saveDraft(null);
		expect(loadDraft()).toBeNull();
	});

	it('reads the dictionary’s bag, tolerating junk', () => {
		store.set(BAG_KEY, JSON.stringify(['爱', 2, '爱']));
		expect(loadBag()).toEqual(['爱', '2']);
		store.set(BAG_KEY, '{oops');
		expect(loadBag()).toEqual([]);
	});
});

describe('backup', () => {
	it('round-trips decks and the bag', () => {
		const text = JSON.stringify(makeBackup([deck('A', 1, ['爱'], { settings })], ['八'], 7));
		expect(parseBackup(text)).toEqual({ decks: [deck('A', 1, ['爱'], { settings })], bag: ['八'] });
	});

	it('says what is wrong with a file that is not a backup', () => {
		expect(() => parseBackup('not json')).toThrow(/not JSON/);
		expect(() => parseBackup('{"decks":[]}')).toThrow(/not a My words backup/);
	});

	it('restoring merges the bag without losing its order', () => {
		expect(mergeBag(['爱', '八'], ['八', '吧'])).toEqual(['爱', '八', '吧']);
	});
});

describe('display helpers', () => {
	it('dates this year without the year, other years with it', () => {
		const now = new Date(2026, 10, 6);
		expect(savedDate(new Date(2026, 10, 6).getTime(), now)).toBe('6 Nov');
		expect(savedDate(new Date(2025, 0, 2).getTime(), now)).toBe('2 Jan 2025');
	});
	it('previews the first words', () => {
		expect(wordPreview(['a', 'b', 'c'], 2)).toBe('a b …');
		expect(wordPreview(['a'], 2)).toBe('a');
	});
});

describe('splitTypedWords', () => {
	it('splits on spaces and either script’s commas, dropping repeats and blanks', () => {
		expect(splitTypedWords(' 你好 谢谢，学习、你好;中国\n ')).toEqual(['你好', '谢谢', '学习', '中国']);
		expect(splitTypedWords('   ')).toEqual([]);
	});
});

describe('lastSettings', () => {
	it('takes the newest deck that has settings', () => {
		const st = (n: number) => ({ includeAudio: n > 1, tabs: [], tabContent: {}, order: [], template: {} }) as never;
		expect(
			lastSettings([
				{ name: 'a', words: [], savedAt: 1, settings: st(1) },
				{ name: 'b', words: [], savedAt: 3 },
				{ name: 'c', words: [], savedAt: 2, settings: st(2) }
			])?.includeAudio
		).toBe(true);
		expect(lastSettings([])).toBeUndefined();
	});
});
