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
		expect(targetNote({ kind: 'existing', name: 'Boya::Book 1' })).toMatch(/^Adds new words to “Boya › Book 1”.*reviews are kept/);
		expect(targetNote({ kind: 'new', name: 'X' })).toMatch(/^Makes a new deck “X”.*not added twice/);
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
		expect(heldNote('Boya::Book 1', 1200)).toBe('“Boya › Book 1” already holds 1,200 notes.');
		expect(heldNote('X', 1)).toBe('“X” already holds 1 note.');
		expect(heldNote('X', 0)).toBe('“X” is in Anki and empty.');
	});
});
