import { describe, expect, it } from 'vitest';
import {
	componentRole,
	componentsOf,
	describeStructure,
	etymologyTypeLabel,
	frequencyBand,
	hanziOf,
	levelLabels,
	normalizePinyin,
	orderReadings,
	plainZhuyin,
	queryKind,
	scoreEnglish,
	scoreHanzi,
	scorePinyin,
	senses,
	sortHits,
	splitSyllables,
	strokeSequence,
	structureLabel,
	type SearchHit
} from './dictionary';

describe('queryKind', () => {
	it('reads hanzi as hanzi', () => {
		expect(queryKind('好')).toBe('hanzi');
		expect(queryKind('你好吗')).toBe('hanzi');
		// A radical or a stroke is a lookup too, not English.
		expect(queryKind('⺀')).toBe('hanzi');
	});

	it('reads a toned latin query as pinyin', () => {
		expect(queryKind('hao3')).toBe('pinyin');
		expect(queryKind('hǎo')).toBe('pinyin');
		expect(queryKind('ni3 hao3')).toBe('pinyin');
		expect(queryKind('nǚ')).toBe('pinyin');
	});

	it('reads unspellable latin as English', () => {
		expect(queryKind('hello world')).toBe('english');
		expect(queryKind('friend')).toBe('english');
		expect(queryKind('')).toBe('empty');
	});

	it('leaves a toneless spellable run ambiguous, to be searched both ways', () => {
		// "love" splits as lo + ve, "long" and "man" are single syllables — each
		// is a real pinyin reading and a real English word.
		expect(queryKind('nihao')).toBe('both');
		expect(queryKind('zhongguo')).toBe('both');
		expect(queryKind('love')).toBe('both');
		expect(queryKind('long')).toBe('both');
	});
});

describe('splitSyllables', () => {
	it('splits a run typed without spaces', () => {
		expect(splitSyllables('nihao')).toEqual(['ni', 'hao']);
		expect(splitSyllables('zhongguo')).toEqual(['zhong', 'guo']);
	});

	it('returns null for a run that is not pinyin', () => {
		expect(splitSyllables('brdgx')).toBeNull();
	});
});

describe('normalizePinyin', () => {
	it('drops tones, spaces and separators, and folds ü to v', () => {
		expect(normalizePinyin('nǐ hǎo')).toBe('nihao');
		expect(normalizePinyin('ni3 hao3')).toBe('nihao');
		expect(normalizePinyin("ni'hao")).toBe('nihao');
		expect(normalizePinyin('nǚ')).toBe('nv');
	});
});

describe('ranking', () => {
	it('puts the whole word above a prefix above a substring', () => {
		const exact = scoreHanzi('分', '分', 137);
		const prefix = scoreHanzi('分开', '分', 3000);
		const inside = scoreHanzi('十分', '分', 3000);
		expect(exact).toBeGreaterThan(prefix);
		expect(prefix).toBeGreaterThan(inside);
	});

	it('prefers the common word when the match is equally good', () => {
		expect(scoreHanzi('好', '好', 50)).toBeGreaterThan(scoreHanzi('好', '好', 90000));
	});

	it('rewards the tone the reader actually typed', () => {
		const right = scorePinyin('hao3', 'hao', 100, true);
		const wrong = scorePinyin('hao4', 'hao', 100, false);
		expect(right).toBeGreaterThan(wrong);
	});

	it('scores an English gloss that IS the query above one that mentions it', () => {
		const isIt = scoreEnglish('love; to love', 'love', 500);
		const mentions = scoreEnglish('to fall in love with somebody', 'love', 500);
		expect(isIt).toBeGreaterThan(mentions);
	});

	it('sorts by score, then commonness', () => {
		const hit = (simplified: string, score: number, rank: number | null): SearchHit => ({
			simplified,
			traditional: simplified,
			syllables: '',
			pinyin: '',
			meaning: '',
			rank,
			level: null,
			via: 'hanzi',
			score
		});
		const sorted = sortHits([hit('c', 10, 10), hit('a', 90, 900), hit('b', 90, 9)]);
		expect(sorted.map((h) => h.simplified)).toEqual(['b', 'a', 'c']);
	});
});

describe('frequency and level labels', () => {
	it('bands a rank', () => {
		expect(frequencyBand(42)).toBe('Top 100');
		expect(frequencyBand(4200)).toBe('Top 10000');
		expect(frequencyBand(null)).toBe('');
	});

	it('reads only the new-HSK tokens', () => {
		expect(levelLabels('new-3,old-2')).toEqual(['HSK 3']);
		expect(levelLabels(null)).toEqual([]);
	});
});

describe('decomposition', () => {
	it('names the arrangement', () => {
		expect(structureLabel('⿱八刀')).toBe('top to bottom');
		expect(structureLabel('⿰女子')).toBe('left to right');
		expect(structureLabel('一')).toBe('');
	});

	it('keeps only real components', () => {
		expect(componentsOf('⿱八刀')).toEqual(['八', '刀']);
		// makemeahanzi writes an unnamed part as ？, and an atomic glyph
		// decomposes to itself — neither is a component to show.
		expect(componentsOf('⿰丨？')).toEqual(['丨']);
		expect(componentsOf('一', '一')).toEqual([]);
	});

	it('describes the structure in one line', () => {
		expect(describeStructure('⿱八刀')).toBe('Written top to bottom: 八 + 刀.');
		expect(describeStructure('一', '一')).toBe('');
	});
});

describe('etymology', () => {
	it('labels the formation type in plain words', () => {
		expect(etymologyTypeLabel('pictophonetic')).toBe('Semantic-phonetic');
		expect(etymologyTypeLabel(undefined)).toBe('');
	});

	it('tells the sound part from the meaning part', () => {
		const ety = { t: 'pictophonetic', s: '女', p: '马' };
		expect(componentRole('女', ety)).toBe('semantic');
		expect(componentRole('马', ety)).toBe('phonetic');
		expect(componentRole('口', ety)).toBeNull();
		expect(componentRole('女', null)).toBeNull();
	});
});

describe('strokeSequence', () => {
	const types = {
		横: { glyph: '㇐', abbr: 'H', romanization: 'Héng', unicode: 'U+31D0' }
	};

	it('pairs each name with its type', () => {
		expect(strokeSequence(['横'], types)[0].type?.glyph).toBe('㇐');
	});

	it('keeps a stroke whose name has no type entry', () => {
		const seq = strokeSequence(['横', '竖折折钩'], types);
		expect(seq).toHaveLength(2);
		expect(seq[1].type).toBeNull();
	});

	it('is empty for a character with no stroke names', () => {
		expect(strokeSequence(undefined, types)).toEqual([]);
	});
});

describe('hanziOf', () => {
	it('keeps CJK only, in order', () => {
		expect(hanziOf('我 like 好!')).toEqual(['我', '好']);
	});
});

describe('orderReadings', () => {
	it('puts the reading with the fullest sense list first', () => {
		// cedict really does list 分 as fèn before fēn.
		const readings = [
			{ syllable: 'fen4', definition: 'part; share' },
			{ syllable: 'fen1', definition: 'to divide; to separate; to allocate; minute' }
		];
		expect(orderReadings(readings).map((r) => r.syllable)).toEqual(['fen1', 'fen4']);
	});

	it('keeps cedict order when the senses are equally long', () => {
		const readings = [
			{ syllable: 'a1', definition: 'aaa' },
			{ syllable: 'a2', definition: 'bbb' }
		];
		expect(orderReadings(readings).map((r) => r.syllable)).toEqual(['a1', 'a2']);
	});
});

describe('reading text', () => {
	it('turns the zhuyin separator entity back into a space', () => {
		expect(plainZhuyin('ㄇㄚ&nbsp;ㄇㄚ')).toBe('ㄇㄚ ㄇㄚ');
	});

	it('drops the measure word from the sense list', () => {
		// The entry prints classifiers on their own row.
		expect(senses('mama; mommy; CL:個|个[ge4],位[wei4]')).toEqual(['mama', 'mommy']);
	});
});
