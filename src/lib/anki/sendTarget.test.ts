import { describe, expect, it } from 'vitest';
import {
	deckLabel,
	deckQuery,
	heldNote,
	filterDecks,
	findDeck,
	parseSendPrefs,
	resolveTarget,
	sortDecks,
	suggestTarget,
	targetNote
} from './sendTarget';

const anki = ['Default', 'boya', 'Boya::Book 1', 'HSK', 'Anki xiehanzi::New HSK (2025)'];

describe('sendTarget', () => {
	it('sorts parents before their children, case-insensitively', () => {
		expect(sortDecks(['b', 'A::B', 'AB', 'A', 'A'])).toEqual(['A', 'A::B', 'AB', 'b']);
	});

	it('filters on every word of the query', () => {
		expect(filterDecks(anki, 'boya book')).toEqual(['Boya::Book 1']);
		expect(filterDecks(anki, '  ')).toBe(anki);
	});

	it('names decks as Anki shows them', () => {
		expect(deckLabel('Boya::Book 1')).toBe('Boya › Book 1');
	});

	it('suggests the page’s deck when Anki has it (by Anki’s case-insensitive name), else a new one', () => {
		expect(suggestTarget('Boya', anki)).toEqual({ kind: 'existing', name: 'boya' });
		expect(findDeck(anki, ' hsk ')).toBe('HSK');
		expect(suggestTarget(' My words ', anki)).toEqual({ kind: 'new', name: 'My words' });
	});

	it('a “new” name Anki already has is that deck — the note must not promise a new one', () => {
		expect(resolveTarget({ kind: 'new', name: 'HSK' }, anki)).toEqual({ kind: 'existing', name: 'HSK' });
		expect(resolveTarget({ kind: 'new', name: 'A :: B ' }, anki)).toEqual({ kind: 'new', name: 'A::B' });
	});

	it('says what the send will do, in one line', () => {
		expect(targetNote({ kind: 'existing', name: 'Boya::Book 1' })).toBe('New words go into “Boya › Book 1”.');
		expect(targetNote({ kind: 'new', name: 'X' })).toBe('Makes a new deck “X”.');
		expect(targetNote({ kind: 'new', name: ' ' })).toBeNull();
	});

	it('has no setting to skip the deck check; an old stored "ask" is dropped', () => {
		expect(parseSendPrefs(null)).toEqual({ openAfter: true });
		expect(parseSendPrefs({ ask: false, openAfter: 'x' })).toEqual({ openAfter: true });
		expect(parseSendPrefs({ ask: false, openAfter: false })).toEqual({ openAfter: false });
	});

	it('searches a deck by its name taken literally', () => {
		expect(deckQuery('Boya::Book 1')).toBe('deck:"Boya::Book 1"');
		expect(deckQuery('a_b*"c\\')).toBe('deck:"a\\_b\\*\\"c\\\\"');
	});

	it('says what the chosen deck already holds', () => {
		expect(heldNote('Boya::Book 1', 1200)).toBe('It already holds 1,200 notes.');
		expect(heldNote('X', 1)).toBe('It already holds 1 note.');
		expect(heldNote('X', 0)).toBe('It is empty.');
	});
});

describe('deck names and filtered decks', () => {
	it('cleans a name the way Anki stores it', async () => {
		const { cleanDeckName } = await import('./sendTarget');
		expect(cleanDeckName(' A :: B ')).toBe('A::B');
		expect(cleanDeckName('A::::B::')).toBe('A::B');
		expect(cleanDeckName(' :: ')).toBe('');
	});

	it('refuses a filtered deck, or a deck under one', async () => {
		const { targetProblem } = await import('./sendTarget');
		expect(targetProblem('Filt', ['Filt'])).toMatch(/filtered deck/);
		expect(targetProblem('filt :: Child', ['Filt'])).toMatch(/“Filt” is a filtered deck/);
		expect(targetProblem('Filtered', ['Filt'])).toBeNull();
		expect(targetProblem('Lesson', [])).toBeNull();
	});

	it('says what a send did, in one line', async () => {
		const { sentNote } = await import('./sendTarget');
		expect(sentNote('A::B', 12, 12)).toBe('12 words added to “A › B”.');
		expect(sentNote('L', 3, 0)).toBe('“L” already had all 3 words: updated in place.');
		expect(sentNote('L', 5, 1)).toBe('1 word added to “L”; 4 words already there, updated in place.');
		expect(sentNote('L', 2, undefined)).toBe('In Anki now: “L”.');
		expect(sentNote('L', 2, 2, ['Writing'])).toBe('2 words added to “L”. Card type no longer in this design stays in Anki: Writing.');
	});
});

describe('decks from before each deck had its own note type', () => {
	it('finds the deck’s notes on the shared note types, and says what a send does to them', async () => {
		const { legacyQuery, legacyNote, layoutNote, sentNote } = await import('./sendTarget');
		expect(legacyQuery('My_words')).toBe('deck:"My\\_words" (mid:1969669503 OR mid:1969669504)');
		expect(legacyNote(0)).toBeNull();
		expect(legacyNote(3)).toMatch(/holds 3 notes from an older version.*adds its words again/);
		expect(layoutNote('Basic - (Anki-xiehanzi)')).toMatch(/older layout.*skip the words already on it/);
		expect(sentNote('L', 2, 0, [], true)).toMatch(/Check Database/);
	});
});
