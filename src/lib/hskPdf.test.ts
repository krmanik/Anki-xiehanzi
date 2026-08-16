import { describe, expect, it } from 'vitest';
import {
	runsWidth,
	scriptOf,
	splitRuns,
	substitute,
	wrapRuns,
	type Measure,
	type Run
} from './hskPdf';

// Latin: 1 unit per character. CJK: 2 units — close enough to real metrics for
// the wrapping rules, and it makes the expected line breaks obvious.
const measure: Measure = (run: Run) =>
	[...run.text].length * (run.script === 'cjk' ? 2 : 1);

const asText = (lines: Run[][]) => lines.map((l) => l.map((r) => r.text).join(''));

describe('scriptOf', () => {
	it('routes hanzi, bopomofo and CJK punctuation to the CJK font', () => {
		for (const ch of ['爱', '丨', 'ㄞ', '，', '・', '　']) {
			expect(scriptOf(ch), ch).toBe('cjk');
		}
	});

	it('routes pinyin, ASCII and tone-marked vowels to the Latin font', () => {
		for (const ch of ['a', 'ǎ', 'ü', '1', ';', ' ', '·']) {
			expect(scriptOf(ch), ch).toBe('latin');
		}
	});
});

describe('splitRuns', () => {
	it('groups adjacent characters of one script into a single run', () => {
		expect(splitRuns('个 (ge4)')).toEqual([
			{ text: '个', script: 'cjk' },
			{ text: ' (ge4)', script: 'latin' }
		]);
	});

	it('keeps run order across repeated switches', () => {
		expect(splitRuns('a爱b爱').map((r) => r.text)).toEqual(['a', '爱', 'b', '爱']);
	});

	it('returns nothing for empty input', () => {
		expect(splitRuns('')).toEqual([]);
	});
});

describe('substitute', () => {
	it('swaps in characters the embedded fonts actually have', () => {
		expect(substitute('ㄉㄜ・')).toBe('ㄉㄜ·');
		expect(substitute('爱 hello')).toBe('爱 hello');
	});

	it('is applied before runs are split, so measuring matches drawing', () => {
		expect(splitRuns('ㄜ・').map((r) => r.text)).toEqual(['ㄜ', '·']);
	});
});

describe('runsWidth', () => {
	it('sums the runs', () => {
		expect(runsWidth(splitRuns('ab爱'), measure)).toBe(4);
	});
});

describe('wrapRuns', () => {
	it('keeps short text on one line', () => {
		expect(asText(wrapRuns('hello', 20, measure))).toEqual(['hello']);
	});

	it('breaks Latin at spaces, never mid-word', () => {
		expect(asText(wrapRuns('alpha beta gamma', 12, measure))).toEqual(['alpha beta ', 'gamma']);
	});

	it('never starts a line with the space it broke on', () => {
		for (const line of wrapRuns('alpha beta gamma delta', 12, measure)) {
			expect(line[0]?.text.startsWith(' ')).toBe(false);
		}
	});

	it('breaks CJK between characters, since it has no spaces', () => {
		expect(asText(wrapRuns('爱八爸杯北', 6, measure))).toEqual(['爱八爸', '杯北']);
	});

	it('wraps mixed text, dropping only the spaces it broke on', () => {
		const text = 'to love 爱 affection; to be fond of';
		const joined = asText(wrapRuns(text, 10, measure)).join('');
		expect(joined.replace(/\s+/g, '')).toBe(text.replace(/\s+/g, ''));
		expect(joined).not.toBe(text); // it really did wrap
	});

	it('narrows only the first line when it starts after a label', () => {
		expect(asText(wrapRuns('alpha beta gamma', 12, measure, 6))).toEqual([
			'alpha ',
			'beta gamma'
		]);
	});

	it('emits a single empty line for empty text, so a row still has height', () => {
		expect(wrapRuns('', 50, measure)).toEqual([[]]);
	});

	it('does not loop forever when one token is wider than the line', () => {
		expect(asText(wrapRuns('supercalifragilistic', 4, measure))).toEqual(['supercalifragilistic']);
	});
});
