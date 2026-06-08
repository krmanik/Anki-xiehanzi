import { describe, it, expect } from 'vitest';
import {
	toneDigits,
	colorizeHanzi,
	toneOfPinyin,
	colorizeSentenceHanzi,
	colorizePinyinString
} from './tone';

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

describe('toneOfPinyin', () => {
	it('reads the tone from the diacritic', () => {
		expect(toneOfPinyin('mā')).toBe(1);
		expect(toneOfPinyin('má')).toBe(2);
		expect(toneOfPinyin('mǎ')).toBe(3);
		expect(toneOfPinyin('mà')).toBe(4);
		expect(toneOfPinyin('ma')).toBe(5);
	});
});

describe('colorizeSentenceHanzi', () => {
	it('assigns syllable tones to CJK chars and passes punctuation through', () => {
		const html = colorizeSentenceHanzi('是我的。', 'shì wǒ de 。');
		expect(html).toBe(
			'<span class="char-tone4">是</span>' +
				'<span class="char-tone3">我</span>' +
				'<span class="char-tone5">的</span>。'
		);
	});

	it('leaves trailing chars neutral when syllables run out', () => {
		const html = colorizeSentenceHanzi('你好吗', 'nǐ hǎo');
		expect(html).toContain('<span class="char-tone3">你</span>');
		expect(html).toContain('<span class="char-tone3">好</span>');
		expect(html).toContain('<span class="char-tone5">吗</span>');
	});
});

describe('colorizePinyinString', () => {
	it('wraps each syllable in a tone span and keeps spacing + punctuation', () => {
		const html = colorizePinyinString('shì wǒ de 。');
		expect(html).toBe('<span class="tone4">shì</span> <span class="tone3">wǒ</span> <span class="tone5">de</span> 。');
	});
});
