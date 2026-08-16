import { describe, expect, it } from 'vitest';
import {
	clampLines,
	computeColumnWidths,
	pdfFieldsFor,
	runsWidth,
	scriptOf,
	splitRuns,
	substitute,
	truncateRuns,
	wrapRuns,
	DEFAULT_PDF_FIELDS,
	PDF_FIELDS,
	type Measure,
	type PdfField,
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

describe('truncateRuns', () => {
	it('leaves text that already fits alone', () => {
		const runs = splitRuns('short');
		expect(truncateRuns(runs, 50, measure)).toBe(runs);
	});

	it('cuts to the budget and marks the cut with an ellipsis', () => {
		const out = truncateRuns(splitRuns('abcdefghij'), 5, measure);
		expect(out.map((r) => r.text).join('')).toBe('abcd…');
	});

	it('never exceeds the width it was given', () => {
		const out = truncateRuns(splitRuns('爱八爸杯北京本'), 7, measure);
		expect(runsWidth(out, measure)).toBeLessThanOrEqual(7);
	});

	it('truncates across a script boundary', () => {
		const out = truncateRuns(splitRuns('ab爱爱爱'), 6, measure);
		expect(out.map((r) => r.text).join('')).toBe('ab爱…');
	});
});

describe('clampLines', () => {
	it('returns the natural wrap when it is short enough', () => {
		expect(asText(clampLines('alpha beta', 12, 3, measure))).toEqual(['alpha beta']);
	});

	it('keeps at most maxLines and ellipsises the last one', () => {
		const lines = clampLines('alpha beta gamma delta epsilon', 12, 2, measure);
		expect(lines).toHaveLength(2);
		expect(asText(lines)[1].endsWith('…')).toBe(true);
	});

	it('does not exceed the column width on any line', () => {
		for (const line of clampLines('alpha beta gamma delta epsilon', 12, 2, measure)) {
			expect(runsWidth(line, measure)).toBeLessThanOrEqual(12);
		}
	});
});

describe('pdfFieldsFor', () => {
	it('keeps the canonical column order whatever order keys arrive in', () => {
		expect(pdfFieldsFor(['meaning', 'index']).map((f) => f.key)).toEqual(['index', 'meaning']);
	});

	it('every default key exists and keys are unique', () => {
		const keys = PDF_FIELDS.map((f) => f.key);
		expect(new Set(keys).size).toBe(keys.length);
		for (const k of DEFAULT_PDF_FIELDS) expect(keys).toContain(k);
	});
});

describe('computeColumnWidths', () => {
	const fixed = (key: string, max: number): PdfField => ({
		key,
		label: key,
		kind: 'text',
		size: 8,
		max,
		get: () => ''
	});
	const flex = (key: string, weight: number, min = 60): PdfField => ({
		key,
		label: key,
		kind: 'text',
		size: 8,
		flex: weight,
		min,
		get: () => ''
	});

	it('gives a measured column exactly what it needs, up to its cap', () => {
		const fields = [fixed('a', 100), flex('m', 1)];
		const w = computeColumnWidths(fields, { a: 40 }, 400);
		expect(w.a).toBe(40);
	});

	it('caps a runaway column instead of letting it eat the row', () => {
		const w = computeColumnWidths([fixed('a', 60), flex('m', 1)], { a: 900 }, 400);
		expect(w.a).toBe(60);
	});

	it('hands the leftover to the wrapping columns by weight', () => {
		const fields = [fixed('a', 100), flex('m', 3), flex('r', 1)];
		const w = computeColumnWidths(fields, { a: 50 }, 400);
		const gaps = 10 * 2;
		expect(w.a + w.m + w.r + gaps).toBeCloseTo(400, 5);
		expect(w.m / w.r).toBeCloseTo(3, 5);
	});

	it('shrinks the measured columns rather than starving a wrapping one', () => {
		const fields = [fixed('a', 500), fixed('b', 500), flex('m', 1, 120)];
		const w = computeColumnWidths(fields, { a: 300, b: 300 }, 400);
		expect(w.m).toBeGreaterThanOrEqual(119);
		expect(w.a + w.b + w.m + 20).toBeCloseTo(400, 5);
	});

	it('fills the page when nothing wraps', () => {
		const fields = [fixed('a', 100), fixed('b', 100)];
		const w = computeColumnWidths(fields, { a: 40, b: 40 }, 200);
		expect(w.a + w.b + 10).toBeCloseTo(200, 5);
	});

	it('returns nothing for no fields', () => {
		expect(computeColumnWidths([], {}, 400)).toEqual({});
	});
});
