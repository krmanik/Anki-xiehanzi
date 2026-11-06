import { describe, expect, it } from 'vitest';
import {
	cacheWords,
	countStates,
	LEARNING_QUERY,
	levelDone,
	noteWordOf,
	parseNoteCache,
	percent,
	staleNotes,
	stateOf,
	STUDIED_QUERY,
	totals,
	updateCache,
	wordOfField,
	wordStates,
	type NoteCache
} from './progress';

const info = (noteId: number, word: string, mod = 100) => ({
	noteId,
	mod,
	fields: { Simplified: { value: word, order: 0 }, Pinyin: { value: 'x', order: 1 } }
});

describe('queries', () => {
	it('learning is studied narrowed to young cards', () => {
		expect(LEARNING_QUERY.startsWith(STUDIED_QUERY)).toBe(true);
		expect(LEARNING_QUERY).toContain('prop:ivl<21');
		expect(STUDIED_QUERY).toContain('-is:new');
		expect(STUDIED_QUERY).toContain('-is:suspended');
	});
});

describe('wordOfField', () => {
	it('strips markup, entities and spaces', () => {
		expect(wordOfField('<b>你好</b>')).toBe('你好');
		expect(wordOfField(' 爱&nbsp;')).toBe('爱');
		expect(wordOfField('<div>一 下</div>')).toBe('一下');
	});
});

describe('note cache', () => {
	it('parses only its own profile', () => {
		const raw = JSON.stringify({ profile: 'A', notes: { '1': ['的', 5] } });
		expect(parseNoteCache(raw, 'A').notes).toEqual({ '1': ['的', 5] });
		expect(parseNoteCache(raw, 'B').notes).toEqual({});
	});

	it('survives junk', () => {
		expect(parseNoteCache(null, 'A').notes).toEqual({});
		expect(parseNoteCache('{nope', 'A').notes).toEqual({});
		expect(parseNoteCache('[1,2]', 'A').notes).toEqual({});
		const mixed = JSON.stringify({ profile: 'A', notes: { '1': ['的', 5], x: ['了', 1], '2': '在', '3': [4, 4] } });
		expect(parseNoteCache(mixed, 'A').notes).toEqual({ '1': ['的', 5] });
	});

	it('reads notes that are missing or changed, and trusts the rest', () => {
		const cache: NoteCache = { profile: 'A', notes: { '1': ['的', 5], '2': ['了', 5] } };
		const mods = [{ noteId: 1, mod: 5 }, { noteId: 2, mod: 9 }, { noteId: 3, mod: 1 }, {}];
		expect(staleNotes([1, 2, 3, 4], mods, cache)).toEqual([2, 3, 4]);
	});

	it('keeps only studied notes and takes fresh reads over old ones', () => {
		const cache: NoteCache = { profile: 'A', notes: { '1': ['的', 5], '2': ['了', 5], '9': ['走', 1] } };
		const next = updateCache(cache, [1, 2, 3], [info(2, '在', 9), info(3, '是'), {}]);
		expect(next.notes).toEqual({ '1': ['的', 5], '2': ['在', 9], '3': ['是', 100] });
		expect(cacheWords(next)).toEqual({ '1': '的', '2': '在', '3': '是' });
	});

	it('noteWordOf rejects notes with no word', () => {
		expect(noteWordOf({})).toBeNull();
		expect(noteWordOf({ noteId: 1, fields: { Hanzi: { value: '的' } } })).toBeNull();
		expect(noteWordOf(info(1, '<br>'))).toBeNull();
		expect(noteWordOf(info(7, '好', 3))).toEqual(['7', '好', 3]);
	});
});

describe('wordStates', () => {
	it('marks studied notes known unless still learning', () => {
		const s = wordStates({ '1': '的', '2': '了' }, [1, 2], [2]);
		expect(s.get('的')).toBe('known');
		expect(s.get('了')).toBe('learning');
		expect(stateOf('在', s)).toBe('new');
	});

	it('learning wins when a word has several notes', () => {
		const words = { '1': '的', '2': '的', '3': '的' };
		expect(wordStates(words, [1, 2, 3], [2]).get('的')).toBe('learning');
		expect(wordStates(words, [2, 1], [2]).get('的')).toBe('learning');
		expect(wordStates(words, [1, 3], []).get('的')).toBe('known');
	});

	it('skips notes it has no word for', () => {
		expect(wordStates({}, [1], []).size).toBe(0);
	});
});

describe('counts', () => {
	const states = new Map([
		['的', 'known'],
		['了', 'learning'],
		['在', 'known']
	] as const);

	it('counts a list, each word once', () => {
		expect(countStates(['的', '了', '是', '是', '我'], states)).toEqual({ total: 4, known: 1, learning: 1, new: 2 });
	});

	it('totals the whole map', () => {
		expect(totals(states)).toEqual({ known: 2, learning: 1 });
	});

	it('floors percentages', () => {
		expect(percent(599, 600)).toBe(99);
		expect(percent(1, 3)).toBe(33);
		expect(percent(0, 0)).toBe(0);
	});
});

describe('levelDone', () => {
	const c = (known: number, total: number) => ({ total, known, learning: 0, new: total - known });
	it('is done at 80% known', () => {
		expect(levelDone(c(120, 150))).toBe(true);
		expect(levelDone(c(119, 150))).toBe(false);
		expect(levelDone(c(0, 0))).toBe(false);
	});
});
