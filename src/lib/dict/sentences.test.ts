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
		expect(ranked).toEqual(['短句', '我很喜欢你']);
	});

	it('lets a clearly easier sentence outrank a slightly shorter, harder one', () => {
		const ranked = rankSentences(
			[
				{ sentence: '我爱你', difficulty: 8 },
				{ sentence: '我很爱你', difficulty: 1 }
			],
			2
		);
		// diff 8 + 3/8 = 8.375 vs diff 1 + 4/8 = 1.5 → easier wins.
		expect(ranked[0]).toBe('我很爱你');
	});

	it('limits the number of results', () => {
		const rows = Array.from({ length: 10 }, (_, i) => ({ sentence: `句子${i}`, difficulty: i }));
		expect(rankSentences(rows, 3)).toHaveLength(3);
	});

	it('de-duplicates and drops blanks', () => {
		const ranked = rankSentences(
			[
				{ sentence: '重复', difficulty: 1 },
				{ sentence: '重复', difficulty: 1 },
				{ sentence: '   ', difficulty: 1 }
			],
			5
		);
		expect(ranked).toEqual(['重复']);
	});
});
