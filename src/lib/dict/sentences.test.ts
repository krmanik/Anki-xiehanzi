import { describe, it, expect } from 'vitest';
import { rankSentences } from './sentences';

describe('rankSentences', () => {
	it('prefers shorter length at equal difficulty', () => {
		const ranked = rankSentences(
			[
				{ sentence: '我很喜欢你', difficulty: 1 },
				{ sentence: '短句', difficulty: 1 }
			],
			2
		);
		expect(ranked.map((r) => r.sentence)).toEqual(['短句', '我很喜欢你']);
	});

	it('lets a clearly easier sentence outrank a slightly shorter, harder one', () => {
		const ranked = rankSentences(
			[
				{ sentence: '我爱你', difficulty: 8 },
				{ sentence: '我很爱你', difficulty: 1 }
			],
			2
		);
		expect(ranked[0].sentence).toBe('我很爱你');
	});

	it('preserves extra columns on each row', () => {
		const ranked = rankSentences(
			[{ sentence: '短句', difficulty: 1, pinyin: 'duǎn jù', translation: 'short' }],
			1
		);
		expect(ranked[0]).toMatchObject({ pinyin: 'duǎn jù', translation: 'short' });
	});

	it('limits results and de-duplicates / drops blanks', () => {
		const rows = Array.from({ length: 10 }, (_, i) => ({ sentence: `句子${i}`, difficulty: i }));
		expect(rankSentences(rows, 3)).toHaveLength(3);

		const dedup = rankSentences(
			[
				{ sentence: '重复', difficulty: 1 },
				{ sentence: '重复', difficulty: 1 },
				{ sentence: '   ', difficulty: 1 }
			],
			5
		);
		expect(dedup.map((r) => r.sentence)).toEqual(['重复']);
	});
});
