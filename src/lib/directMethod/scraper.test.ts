/**
 * Tests for Direct Method Scraper
 */

import { 
  fetchZdicDefinition, 
  fetchTatoebaSentence, 
  generateUnsplashUrl,
  mapPosTagToCategory,
  isAuxiliaryVerb,
  scrapeDirectMethodCard
} from './scraper';

describe('Direct Method Scraper', () => {
  
  describe('fetchZdicDefinition', () => {
    it('should return simulated Zh-Zh definition', async () => {
      const result = await fetchZdicDefinition('学');
      
      expect(result.success).toBe(true);
      expect(result.source).toBe('zdic');
      expect(result.data?.definition_ZH).toContain('学');
      expect(result.data?.radical_info).toBeDefined();
    });
    
    it('should handle errors gracefully', async () => {
      // In production, this would test actual network failures
      const result = await fetchZdicDefinition('');
      expect(result).toBeDefined();
    });
  });
  
  describe('fetchTatoebaSentence', () => {
    it('should return simulated Chinese example sentence', async () => {
      const result = await fetchTatoebaSentence('好');
      
      expect(result.success).toBe(true);
      expect(result.source).toBe('tatoeba');
      expect(result.data?.example_sentence).toBeDefined();
    });
  });
  
  describe('generateUnsplashUrl', () => {
    it('should generate valid Unsplash URL', () => {
      const url = generateUnsplashUrl('猫');
      
      expect(url).toContain('unsplash.com');
      expect(url).toContain('%E7%8C%AB'); // URL-encoded '猫'
      expect(url).toContain('chinese,culture');
    });
    
    it('should handle special characters', () => {
      const url = generateUnsplashUrl('你好，世界');
      expect(url).toContain('unsplash.com');
    });
  });
  
  describe('mapPosTagToCategory', () => {
    it('should map noun tags correctly', () => {
      expect(mapPosTagToCategory('n')).toBe('noun');
      expect(mapPosTagToCategory('nr')).toBe('noun');
      expect(mapPosTagToCategory('ns')).toBe('noun');
    });
    
    it('should map pronoun tags correctly', () => {
      expect(mapPosTagToCategory('r')).toBe('pronoun');
      expect(mapPosTagToCategory('rr')).toBe('pronoun');
    });
    
    it('should map verb tags correctly', () => {
      expect(mapPosTagToCategory('v')).toBe('verb');
      expect(mapPosTagToCategory('vn')).toBe('verb');
    });
    
    it('should map auxiliary verb tag', () => {
      expect(mapPosTagToCategory('aux')).toBe('auxiliary_verb');
    });
    
    it('should map other POS categories', () => {
      expect(mapPosTagToCategory('m')).toBe('numeral');
      expect(mapPosTagToCategory('a')).toBe('adjective');
      expect(mapPosTagToCategory('q')).toBe('measure_word');
      expect(mapPosTagToCategory('d')).toBe('adverb');
      expect(mapPosTagToCategory('p')).toBe('preposition');
      expect(mapPosTagToCategory('c')).toBe('conjunction');
      expect(mapPosTagToCategory('u')).toBe('particle');
      expect(mapPosTagToCategory('o')).toBe('interjection');
    });
    
    it('should return unknown for unmapped tags', () => {
      expect(mapPosTagToCategory('xyz')).toBe('unknown');
      expect(mapPosTagToCategory('')).toBe('unknown');
    });
    
    it('should handle case-insensitive input', () => {
      expect(mapPosTagToCategory('N')).toBe('noun');
      expect(mapPosTagToCategory('V')).toBe('verb');
    });
  });
  
  describe('isAuxiliaryVerb', () => {
    it('should identify common auxiliary verbs', () => {
      expect(isAuxiliaryVerb('会')).toBe(true);
      expect(isAuxiliaryVerb('能')).toBe(true);
      expect(isAuxiliaryVerb('可以')).toBe(true);
      expect(isAuxiliaryVerb('应该')).toBe(true);
      expect(isAuxiliaryVerb('必须')).toBe(true);
    });
    
    it('should return false for non-auxiliary verbs', () => {
      expect(isAuxiliaryVerb('吃')).toBe(false);
      expect(isAuxiliaryVerb('学习')).toBe(false);
      expect(isAuxiliaryVerb('是')).toBe(false);
    });
  });
  
  describe('scrapeDirectMethodCard', () => {
    it('should assemble complete card with all sources', async () => {
      const card = await scrapeDirectMethodCard('爱', 'v');
      
      expect(card.hanzi).toBe('爱');
      expect(card.definition_ZH).toBeDefined();
      expect(card.pos).toBe('verb');
      expect(card.example_sentence).toBeDefined();
      expect(card.media_url).toContain('unsplash.com');
      expect(card.friction_level).toBe(1);
      expect(card.created_at).toBeDefined();
    });
    
    it('should detect auxiliary verb automatically', async () => {
      const card = await scrapeDirectMethodCard('会');
      
      expect(card.pos).toBe('auxiliary_verb');
    });
    
    it('should handle missing POS tag', async () => {
      const card = await scrapeDirectMethodCard('的');
      
      expect(card.pos).toBe('particle'); // '的' should map to particle
    });
    
    it('should include radical info from Zdic', async () => {
      const card = await scrapeDirectMethodCard('水');
      
      expect(card.radical_info).toBeDefined();
      expect(card.radical_info?.radical).toBeDefined();
    });
    
    it('should include synonyms if available', async () => {
      const card = await scrapeDirectMethodCard('大');
      
      expect(card.synonyms).toBeDefined();
    });
  });
  
  describe('batchScrapeCards', () => {
    it('should process multiple words with progress callback', async () => {
      const words = ['好', '坏', '大'];
      const progressCalls: [number, number][] = [];
      
      const results = await import('./scraper').then(m => 
        m.batchScrapeCards(words, (current, total) => {
          progressCalls.push([current, total]);
        })
      );
      
      expect(results.length).toBeGreaterThan(0);
      expect(progressCalls.length).toBe(3);
      expect(progressCalls[2]).toEqual([3, 3]);
    });
  });
});
