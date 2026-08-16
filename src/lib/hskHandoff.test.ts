import { beforeEach, describe, expect, it } from 'vitest';
import { PENDING_WORDS_KEY, peekPendingWords, takePendingWords } from './hskHandoff';

// The module only ever touches sessionStorage, so a Map-backed stub keeps these
// tests in the fast `node` project.
const store = new Map<string, string>();
const stub = {
	getItem: (k: string) => store.get(k) ?? null,
	setItem: (k: string, v: string) => void store.set(k, v),
	removeItem: (k: string) => void store.delete(k)
};
Object.defineProperty(globalThis, 'sessionStorage', { value: stub, writable: true });

const put = (value: unknown) =>
	store.set(PENDING_WORDS_KEY, typeof value === 'string' ? value : JSON.stringify(value));

describe('hskHandoff', () => {
	beforeEach(() => store.clear());

	it('returns null when nothing is pending', () => {
		expect(peekPendingWords()).toBeNull();
		expect(takePendingWords()).toBeNull();
	});

	it('round-trips a list with its deck options', () => {
		put({ label: 'New HSK (2025) · HSK 1', words: ['爱', '八'], options: { audio: true, examples: true } });
		expect(takePendingWords()).toEqual({
			label: 'New HSK (2025) · HSK 1',
			words: ['爱', '八'],
			options: { audio: true, examples: true }
		});
	});

	it('peeking leaves the entry in place, taking clears it', () => {
		put({ label: 'x', words: ['爱'], options: { audio: false, examples: false } });
		expect(peekPendingWords()?.words).toEqual(['爱']);
		expect(peekPendingWords()?.words).toEqual(['爱']);
		expect(takePendingWords()?.words).toEqual(['爱']);
		expect(peekPendingWords()).toBeNull();
	});

	it('defaults missing options to off rather than throwing', () => {
		put({ label: 'x', words: ['爱'] });
		expect(takePendingWords()?.options).toEqual({ audio: false, examples: false });
	});

	it('ignores an empty or malformed payload', () => {
		put({ label: 'x', words: [], options: { audio: true, examples: true } });
		expect(peekPendingWords()).toBeNull();

		put('not json');
		expect(peekPendingWords()).toBeNull();

		put({ words: 'nope' });
		expect(peekPendingWords()).toBeNull();
	});

	it('clears a malformed entry so it cannot wedge the next visit', () => {
		put('not json');
		expect(takePendingWords()).toBeNull();
		expect(store.has(PENDING_WORDS_KEY)).toBe(false);
	});
});
