import { describe, it, expect } from 'vitest';
import { toneDigits, colorizeHanzi } from './tone';

describe('toneDigits', () => {
	it('reads the tone digit at the end of each syllable', () => {
		expect(toneDigits('Zhong1 guo2')).toEqual([1, 2]);
		expect(toneDigits('ni3 hao3')).toEqual([3, 3]);
	});

	it('defaults to neutral tone 5 when no digit', () => {
		expect(toneDigits('de')).toEqual([5]);
		expect(toneDigits('ni3 de')).toEqual([3, 5]);
	});

	it('handles digit followed by non-digits (e.g. r5)', () => {
		expect(toneDigits('hua1r')).toEqual([1]);
	});
});

describe('colorizeHanzi', () => {
	it('pairs each character with its syllable tone', () => {
		expect(colorizeHanzi('中国', 'Zhong1 guo2')).toEqual([
			{ ch: '中', tone: 1 },
			{ ch: '国', tone: 2 }
		]);
	});

	it('reuses the last tone when there are more chars than syllables', () => {
		const out = colorizeHanzi('中国人', 'Zhong1 guo2');
		expect(out.map((c) => c.tone)).toEqual([1, 2, 2]);
	});
});
