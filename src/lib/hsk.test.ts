import { describe, expect, it } from 'vitest';
import {
	filterEntries,
	formatClassifier,
	frequencyBand,
	hanziTones,
	levelLabel,
	pinyinTones,
	sortEntries,
	stripTones,
	type HskEntry
} from './hsk';

const entry = (over: Partial<HskEntry> & Pick<HskEntry, 's'>): HskEntry => ({
	t: over.s,
	p: '',
	y: '',
	z: '',
	m: '',
	...over
});

const NI_HAO = entry({ s: '你好', t: '你好', p: 'ni3 hao3', y: 'nǐ hǎo', z: 'ㄋㄧˇ ㄏㄠˇ', m: 'hello', f: 500 });
const BABA = entry({ s: '爸爸', t: '爸爸', p: 'ba4 ba5', y: 'bà ba', z: 'ㄅㄚˋ ㄅㄚ', m: 'father', f: 1586 });
const AI = entry({ s: '爱', t: '愛', p: 'ai4', y: 'ài', z: 'ㄞˋ', m: 'to love', f: 120 });

describe('levelLabel', () => {
	it('renders single levels and the 7-9 band', () => {
		expect(levelLabel('3')).toBe('HSK 3');
		expect(levelLabel('7-9')).toBe('HSK 7–9');
	});
});

describe('stripTones', () => {
	it('removes diacritics and lowercases', () => {
		expect(stripTones('Nǐ Hǎo')).toBe('ni hao');
		expect(stripTones('lǜ')).toBe('lu');
	});
});

describe('filterEntries', () => {
	const all = [NI_HAO, BABA, AI];

	it('returns everything for a blank query', () => {
		expect(filterEntries(all, '   ')).toHaveLength(3);
	});

	it('matches simplified and traditional hanzi', () => {
		expect(filterEntries(all, '你')).toEqual([NI_HAO]);
		expect(filterEntries(all, '愛')).toEqual([AI]);
	});

	it('matches pinyin with or without tone marks and spaces', () => {
		expect(filterEntries(all, 'nǐ hǎo')).toEqual([NI_HAO]);
		expect(filterEntries(all, 'nihao')).toEqual([NI_HAO]);
		expect(filterEntries(all, 'ni hao')).toEqual([NI_HAO]);
	});

	it('matches numbered pinyin and zhuyin', () => {
		expect(filterEntries(all, 'ba4')).toEqual([BABA]);
		expect(filterEntries(all, 'ㄞˋ')).toEqual([AI]);
	});

	it('matches meaning text case-insensitively', () => {
		expect(filterEntries(all, 'LOVE')).toEqual([AI]);
	});
});

describe('sortEntries', () => {
	const all = [NI_HAO, BABA, AI];

	it('leaves official order alone', () => {
		expect(sortEntries(all, 'list')).toEqual(all);
	});

	it('does not mutate the input', () => {
		sortEntries(all, 'frequency');
		expect(all[0]).toBe(NI_HAO);
	});

	it('sorts by frequency with unranked words last', () => {
		const noRank = entry({ s: '囧', p: 'jiong3', y: 'jiǒng' });
		expect(sortEntries([...all, noRank], 'frequency').map((e) => e.s)).toEqual([
			'爱',
			'你好',
			'爸爸',
			'囧'
		]);
	});

	it('sorts by toneless pinyin', () => {
		expect(sortEntries(all, 'pinyin').map((e) => e.s)).toEqual(['爱', '爸爸', '你好']);
	});

	it('sorts by character count', () => {
		expect(sortEntries(all, 'length').map((e) => e.s)).toEqual(['爱', '你好', '爸爸']);
	});
});

describe('hanziTones', () => {
	it('pairs each character with its syllable tone', () => {
		expect(hanziTones('你好', 'ni3 hao3')).toEqual([
			{ ch: '你', tone: 3 },
			{ ch: '好', tone: 3 }
		]);
	});

	it('reuses the last tone when a word has more characters than syllables', () => {
		expect(hanziTones('好好好', 'hao3').map((c) => c.tone)).toEqual([3, 3, 3]);
	});
});

describe('pinyinTones', () => {
	it('takes tones from the numbered pinyin, including neutral', () => {
		expect(pinyinTones('bà ba', 'ba4 ba5')).toEqual([
			{ text: 'bà', tone: 4 },
			{ text: 'ba', tone: 5 }
		]);
	});

	it('falls back to the tone marks when syllable counts disagree', () => {
		expect(pinyinTones('nǐ hǎo', 'ni3')).toEqual([
			{ text: 'nǐ', tone: 3 },
			{ text: 'hǎo', tone: 3 }
		]);
	});
});

describe('frequencyBand', () => {
	it('bands ranks and ignores missing ones', () => {
		expect(frequencyBand(undefined)).toBe('');
		expect(frequencyBand(120)).toBe('Top 500');
		expect(frequencyBand(1400)).toBe('Top 1.5k');
		expect(frequencyBand(4000)).toBe('Top 5k');
		expect(frequencyBand(9000)).toBe('Top 10k');
		expect(frequencyBand(50000)).toBe('Rare');
	});
});

describe('formatClassifier', () => {
	it('keeps the simplified form and the reading', () => {
		expect(formatClassifier('個|个[ge4]')).toBe('个 (ge4)');
		expect(formatClassifier('位[wei4]')).toBe('位 (wei4)');
		expect(formatClassifier('个')).toBe('个');
	});
});
