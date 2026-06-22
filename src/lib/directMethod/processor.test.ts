/**
 * Tests for Direct Method Chinese Text Processor
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
	segmentAndTag,
	colorizeSentence,
	highlightTargetInSentence,
	extractPosCategories,
	getPosColorCss,
	splitWordSenses,
	validateSentenceForImmersion,
	POS_COLOR_MAP
} from './processor';

describe('Direct Method Processor', () => {
	beforeAll(async () => {
		// Ensure jieba is loaded for all tests
		await segmentAndTag('测试');
	});

	describe('POS_COLOR_MAP', () => {
		it('should have all 12 color categories', () => {
			const categories = Object.keys(POS_COLOR_MAP);
			expect(categories.length).toBe(12);
			
			expect(categories).toContain('noun');
			expect(categories).toContain('verb');
			expect(categories).toContain('adjective');
			expect(categories).toContain('adverb');
			expect(categories).toContain('pronoun');
			expect(categories).toContain('numeral');
			expect(categories).toContain('measureWord');
			expect(categories).toContain('preposition');
			expect(categories).toContain('conjunction');
			expect(categories).toContain('particle');
			expect(categories).toContain('interjection');
			expect(categories).toContain('auxiliary');
		});

		it('should have required properties for each category', () => {
			for (const [category, mapping] of Object.entries(POS_COLOR_MAP)) {
				expect(mapping.colorClass).toBeDefined();
				expect(mapping.colorName).toBeDefined();
				expect(mapping.posTags).toBeInstanceOf(Array);
				expect(mapping.posTags.length).toBeGreaterThan(0);
				expect(mapping.chineseLabel).toBeDefined();
			}
		});
	});

	describe('segmentAndTag', () => {
		it('should segment a simple sentence', async () => {
			const sentence = '我是学生';
			const tokens = await segmentAndTag(sentence);
			
			expect(tokens.length).toBeGreaterThan(0);
			expect(tokens.map(t => t.word).join('')).toBe(sentence);
			
			// Each token should have required properties
			tokens.forEach(token => {
				expect(token.word).toBeDefined();
				expect(token.pos).toBeDefined();
				expect(token.posCategory).toBeDefined();
				expect(token.colorClass).toBeDefined();
				expect(token.startOffset).toBeGreaterThanOrEqual(0);
				expect(token.endOffset).toBeGreaterThan(token.startOffset);
			});
		});

		it('should identify nouns correctly', async () => {
			const sentence = '书很好';
			const tokens = await segmentAndTag(sentence);
			
			// '书' (book) should be tagged as a noun
			const shuToken = tokens.find(t => t.word === '书');
			expect(shuToken).toBeDefined();
			expect(shuToken?.posCategory).toBe('noun');
			expect(shuToken?.colorClass).toBe('pos-noun');
		});

		it('should identify verbs correctly', async () => {
			const sentence = '我学习';
			const tokens = await segmentAndTag(sentence);
			
			// '学习' (study) should be tagged as a verb
			const studyToken = tokens.find(t => t.word === '学习');
			expect(studyToken).toBeDefined();
			expect(studyToken?.posCategory).toBe('verb');
			expect(studyToken?.colorClass).toBe('pos-verb');
		});

		it('should handle auxiliary verbs specially', async () => {
			const sentence = '我会去';
			const tokens = await segmentAndTag(sentence);
			
			// '会' should be tagged as auxiliary, not regular verb
			const huiToken = tokens.find(t => t.word === '会');
			expect(huiToken).toBeDefined();
			expect(huiToken?.posCategory).toBe('auxiliary');
			expect(huiToken?.colorClass).toBe('pos-auxiliary');
		});
	});

	describe('colorizeSentence', () => {
		it('should return HTML with color classes', async () => {
			const sentence = '你好';
			const html = await colorizeSentence(sentence);
			
			expect(html).toContain('<span');
			expect(html).toContain('class="');
			expect(html).toContain('pos-');
		});

		it('should include data-pos attribute', async () => {
			const sentence = '中国';
			const html = await colorizeSentence(sentence);
			
			expect(html).toContain('data-pos="');
		});
	});

	describe('highlightTargetInSentence', () => {
		it('should highlight target word with target-word class', async () => {
			const sentence = '我喜欢学习中文';
			const targetWord = '学习';
			const html = await highlightTargetInSentence(sentence, targetWord);
			
			expect(html).toContain('target-word');
			expect(html).toContain('>学习<');
		});

		it('should wrap non-target words in context-word class', async () => {
			const sentence = '我喜欢学习';
			const targetWord = '学习';
			const html = await highlightTargetInSentence(sentence, targetWord);
			
			expect(html).toContain('context-word');
		});
	});

	describe('extractPosCategories', () => {
		it('should extract unique POS categories from sentence', async () => {
			const sentence = '我学习'; // pronoun + verb
			const categories = await extractPosCategories(sentence);
			
			expect(categories.length).toBeGreaterThan(0);
			expect(categories).toContain('pronoun');
			expect(categories).toContain('verb');
		});

		it('should return empty array for empty sentence', async () => {
			const categories = await extractPosCategories('');
			expect(categories).toEqual([]);
		});
	});

	describe('getPosColorCss', () => {
		it('should return CSS string', () => {
			const css = getPosColorCss();
			expect(typeof css).toBe('string');
			expect(css.length).toBeGreaterThan(0);
		});

		it('should include all 12 color classes', () => {
			const css = getPosColorCss();
			
			expect(css).toContain('.pos-noun');
			expect(css).toContain('.pos-verb');
			expect(css).toContain('.pos-adjective');
			expect(css).toContain('.pos-adverb');
			expect(css).toContain('.pos-pronoun');
			expect(css).toContain('.pos-numeral');
			expect(css).toContain('.pos-measure');
			expect(css).toContain('.pos-preposition');
			expect(css).toContain('.pos-conjunction');
			expect(css).toContain('.pos-particle');
			expect(css).toContain('.pos-interjection');
			expect(css).toContain('.pos-auxiliary');
		});

		it('should include hex color codes', () => {
			const css = getPosColorCss();
			expect(css).toMatch(/#[0-9A-F]{6}/i);
		});
	});

	describe('splitWordSenses', () => {
		it('should group definitions by HSK level and PoS', () => {
			const word = '打';
			const definitions = [
				{ definition: 'to hit', pos: 'v', hskLevel: '3' },
				{ definition: 'to play', pos: 'v', hskLevel: '3' },
				{ definition: 'dozen', pos: 'm', hskLevel: '5' }
			];
			
			const groups = splitWordSenses(word, definitions);
			
			expect(groups.length).toBeGreaterThan(0);
			
			// Should have separate groups for different PoS or levels
			groups.forEach(group => {
				expect(group.hskLevel).toBeDefined();
				expect(group.posCategory).toBeDefined();
				expect(group.definitions.length).toBeGreaterThan(0);
				expect(group.cardId).toContain(word);
			});
		});

		it('should handle definitions without HSK level', () => {
			const word = '测试';
			const definitions = [
				{ definition: 'test', pos: 'v' }
			];
			
			const groups = splitWordSenses(word, definitions);
			
			expect(groups.length).toBe(1);
			expect(groups[0].hskLevel).toBe('unknown');
		});
	});

	describe('validateSentenceForImmersion', () => {
		it('should validate good sentences', () => {
			const result = validateSentenceForImmersion('我喜欢学习中文', '学习');
			expect(result.valid).toBe(true);
		});

		it('should reject sentences that are too short', () => {
			const result = validateSentenceForImmersion('学习', '学习', { minChars: 5 });
			expect(result.valid).toBe(false);
			expect(result.reason).toBe('Sentence too short');
		});

		it('should reject sentences that are too long', () => {
			const longSentence = '这是一个非常非常非常非常非常非常非常长的句子而且还有很多很多很多字';
			const result = validateSentenceForImmersion(longSentence, '非常', { maxChars: 20 });
			expect(result.valid).toBe(false);
			expect(result.reason).toBe('Sentence too long');
		});

		it('should reject sentences missing target word', () => {
			const result = validateSentenceForImmersion('今天天气很好', '学习', { requireTarget: true });
			expect(result.valid).toBe(false);
			expect(result.reason).toBe('Target word not found');
		});

		it('should accept sentences without target when requireTarget is false', () => {
			const result = validateSentenceForImmersion('今天天气很好', '学习', { requireTarget: false });
			expect(result.valid).toBe(true);
		});

		it('should reject sentences with too many unique characters', () => {
			const complexSentence = '齉龘䶛靐麤爩癵驫麣纞虋讟钃鸜麷鞻韽顟顳饙饳騳龘';
			const result = validateSentenceForImmersion(complexSentence, '龘');
			expect(result.valid).toBe(false);
			expect(result.reason).toBe('Too many unique characters');
		});
	});
});
