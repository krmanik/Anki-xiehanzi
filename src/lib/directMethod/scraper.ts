/**
 * Direct Method Scraper
 * Fetches Zh-Zh definitions, example sentences, and multi-modal media from Chinese-only sources
 * Sources: Zdic.net, Tatoeba (CN-CN), Unsplash API, Giphy API, Pixabay API, Pexels API
 */

import { 
  DirectMethodCard, 
  ZdicDefinition, 
  TatoebaSentence, 
  ScrapeResult,
  PosCategory 
} from './types';

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Free API endpoints (no key required for basic usage)
const UNSPLASH_SOURCE_URL = 'https://image.pollinations.ai/prompt/';
const GIPHY_TRENDING_URL = 'https://giphy.com/api/v1/gifs/trending';
const PIXABAY_BASE_URL = 'https://pixabay.com/api/';

/**
 * Generate Unsplash image URL for static visual using Pollinations AI (free, no API key)
 */
export function generateUnsplashUrl(keyword: string): string {
  const encodedKeyword = encodeURIComponent(`${keyword} chinese character meaning`);
  // Pollinations AI provides free AI-generated images without API key
  return `${UNSPLASH_SOURCE_URL}${encodedKeyword}?width=400&height=300&nologo=true`;
}

/**
 * Generate Pexels image URL for alternative static visual
 */
export function generatePexelsUrl(keyword: string): string {
  const encodedKeyword = encodeURIComponent(keyword);
  // Pexels requires API key for direct access, use placeholder for now
  // In production: https://api.pexels.com/v1/search?query=${encodedKeyword}
  return `https://www.pexels.com/search/${encodedKeyword}/`;
}

/**
 * Fetch GIF from Giphy API (free tier available)
 */
export async function fetchGiphyGif(keyword: string): Promise<string | undefined> {
  try {
    // Giphy requires API key - using a demo/public key approach or fallback
    // In production, you would use your own API key from environment variables
    const apiKey = 'your_giphy_api_key'; // Replace with actual key or use env var
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://api.giphy.com/v1/gifs/search?q=${encodedKeyword}&limit=1&rating=g`;
    
    console.log(`[Giphy] Fetching: ${url}`);
    
    // For demo purposes, return a placeholder
    // In production: const response = await fetch(url); const data = await response.json();
    return `https://media.giphy.com/media/l3q2LWjSxXJzYbWKQ/giphy.gif`;
  } catch (error) {
    console.error('[Giphy] Error fetching GIF:', error);
    return undefined;
  }
}

/**
 * Generate Tenor GIF URL as alternative for actions
 */
export function generateTenorUrl(keyword: string): string {
  const encodedKeyword = encodeURIComponent(keyword);
  // Tenor requires API key, using placeholder
  return `https://tenor.com/search/${encodedKeyword}-gifs`;
}

/**
 * Fetch video from Pixabay API (free, no attribution required)
 */
export async function fetchPixabayVideo(keyword: string): Promise<string | undefined> {
  try {
    // Pixabay requires API key but offers free tier
    const apiKey = 'your_pixabay_api_key'; // Replace with actual key or use env var
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `${PIXABAY_BASE_URL}videos/?q=${encodedKeyword}&key=${apiKey}&per_page=1`;
    
    console.log(`[Pixabay] Fetching: ${url}`);
    
    // For demo purposes, return undefined
    // In production: const response = await fetch(url); const data = await response.json();
    return undefined;
  } catch (error) {
    console.error('[Pixabay] Error fetching video:', error);
    return undefined;
  }
}

/**
 * Fetch sentence video from free sources (Forvo, YouGlish, or generated)
 */
export async function fetchSentenceVideo(sentence: string): Promise<string | undefined> {
  // For now, return undefined - in production this would:
  // 1. Check if we have a pre-recorded video for this sentence
  // 2. Query APIs like YouGlish for contextual video clips
  // 3. Fall back to TTS + avatar animation if needed
  console.log(`[Video] Would fetch video for: ${sentence}`);
  return undefined;
}

/**
 * Fetch Zh-Zh definition from Zdic.net
 */
export async function fetchZdicDefinition(hanzi: string): Promise<ScrapeResult> {
  try {
    // In production, this would make actual HTTP requests
    // For now, we simulate the response structure
    const url = `https://www.zdic.net/hans/${encodeURIComponent(hanzi)}`;
    
    console.log(`[Zdic] Fetching: ${url}`);
    
    // Simulated response - replace with actual fetch in production
    // const response = await fetch(url);
    // const html = await response.text();
    // return parseZdicHtml(html, hanzi);
    
    return {
      success: true,
      source: 'zdic',
      data: {
        definition_ZH: `[Simulated] ${hanzi} 的中文解释`,
        radical_info: {
          radical: '示例部首',
          meaning_ZH: '示例含义',
          strokes: 3
        },
        synonyms: ['同义词1', '同义词2'],
        hsk_level: 3
      }
    };
  } catch (error) {
    return {
      success: false,
      source: 'zdic',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Parse Zdic HTML to extract Zh-Zh definitions
 */
function parseZdicHtml(html: string, hanzi: string): ScrapeResult {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract definition (adjust selectors based on actual Zdic structure)
    const definitionEl = doc.querySelector('.jieshi') || doc.querySelector('[id*="jieshi"]');
    const definition_ZH = definitionEl?.textContent?.trim() || '';
    
    // Extract radical info
    const radicalEl = doc.querySelector('.bufang') || doc.querySelector('[id*="bufang"]');
    const radicalText = radicalEl?.textContent?.trim() || '';
    const radicalMatch = radicalText.match(/部首：(\w+)/);
    
    // Extract synonyms/antonyms if available
    const synonyms: string[] = [];
    const antonyms: string[] = [];
    
    return {
      success: true,
      source: 'zdic',
      data: {
        definition_ZH,
        radical_info: radicalMatch ? {
          radical: radicalMatch[1],
          meaning_ZH: '',
          strokes: 0
        } : undefined,
        synonyms: synonyms.length > 0 ? synonyms : undefined,
        antonyms: antonyms.length > 0 ? antonyms : undefined
      }
    };
  } catch (error) {
    return {
      success: false,
      source: 'zdic',
      error: error instanceof Error ? error.message : 'Parse error'
    };
  }
}

/**
 * Fetch Chinese-only example sentence from Tatoeba
 */
export async function fetchTatoebaSentence(hanzi: string): Promise<ScrapeResult> {
  try {
    // Tatoeba API endpoint for Chinese sentences
    const url = `https://tatoeba.org/api/v0/sentences?for=${encodeURIComponent(hanzi)}&to=cmn`;
    
    console.log(`[Tatoeba] Fetching: ${url}`);
    
    await delay(500); // Rate limiting
    
    // Simulated response
    return {
      success: true,
      source: 'tatoeba',
      data: {
        example_sentence: `[Simulated] 这是一个包含${hanzi}的例句`,
        example_pinyin: `Zhè shì yí gè bāohán ${hanzi} de lìjù`
      }
    };
  } catch (error) {
    return {
      success: false,
      source: 'tatoeba',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate Unsplash image URL for immersion visual
 */
export function generateUnsplashUrl(keyword: string): string {
  // Use Unsplash source URL for dynamic images
  const encodedKeyword = encodeURIComponent(keyword);
  return `https://source.unsplash.com/400x300/?${encodedKeyword},chinese,culture`;
  
  // Alternative: Use specific image IDs if needed
  // return `https://images.unsplash.com/photo-XXXXX?w=400&h=300&fit=crop`;
}

/**
 * Map raw ICTCLAS POS tags to our 12-color categories
 */
export function mapPosTagToCategory(rawTag: string): PosCategory {
  const tagMap: Record<string, PosCategory> = {
    // Nouns
    'n': 'noun',
    'nr': 'noun',      // Proper noun
    'ns': 'noun',      // Place name
    'nt': 'noun',      // Organization
    'nz': 'noun',      // Other proper noun
    
    // Pronouns
    'r': 'pronoun',
    'rr': 'pronoun',   // Personal pronoun
    'rz': 'pronoun',   // Demonstrative pronoun
    
    // Verbs
    'v': 'verb',
    'vd': 'verb',      // Auxiliary verb (will handle separately)
    'vn': 'verb',      // Nominalized verb
    
    // Auxiliary verbs (special handling)
    'aux': 'auxiliary_verb',
    
    // Numerals
    'm': 'numeral',
    'mq': 'numeral',   // Numeral + measure word
    
    // Adjectives
    'a': 'adjective',
    'ad': 'adjective', // Adnominal adjective
    'an': 'adjective', // Nominal adjective
    
    // Measure words
    'q': 'measure_word',
    
    // Adverbs
    'd': 'adverb',
    
    // Prepositions
    'p': 'preposition',
    
    // Conjunctions
    'c': 'conjunction',
    
    // Particles
    'u': 'particle',
    'y': 'particle',   // Modal particle
    'e': 'interjection', // Actually interjection in some tagsets
    
    // Interjections
    'o': 'interjection',
    'h': 'interjection' // Onomatopoeia
  };
  
  return tagMap[rawTag.toLowerCase()] || 'unknown';
}

/**
 * Check if a word is an auxiliary verb (for special Mint coloring)
 */
export function isAuxiliaryVerb(hanzi: string): boolean {
  const auxiliaryVerbs = ['会', '能', '可以', '可能', '应该', '必须', '得', '要'];
  return auxiliaryVerbs.includes(hanzi);
}

/**
 * Main scraper function: orchestrates all sources
 */
export async function scrapeDirectMethodCard(
  hanzi: string,
  pos_tag?: string
): Promise<Partial<DirectMethodCard>> {
  console.log(`[Scraper] Starting scrape for: ${hanzi}`);
  
  // Fetch Zh-Zh definition
  const zdicResult = await fetchZdicDefinition(hanzi);
  await delay(300); // Rate limiting
  
  // Fetch example sentence
  const tatoebaResult = await fetchTatoebaSentence(hanzi);
  await delay(300);
  
  // Generate/fetch multi-modal media URLs (one of each type)
  const imageUrl = generateUnsplashUrl(hanzi);
  const gifUrl = await fetchGiphyGif(hanzi);
  const videoUrl = await fetchPixabayVideo(hanzi);
  
  // Fetch sentence-level video
  const sentenceVideoUrl = tatoebaResult.data?.example_sentence 
    ? await fetchSentenceVideo(tatoebaResult.data.example_sentence)
    : undefined;
  
  // Determine POS category
  const posCategory: PosCategory = pos_tag 
    ? mapPosTagToCategory(pos_tag)
    : isAuxiliaryVerb(hanzi)
      ? 'auxiliary_verb'
      : 'unknown';
  
  // Assemble card with all media types
  const card: Partial<DirectMethodCard> = {
    hanzi,
    definition_ZH: zdicResult.data?.definition_ZH || '暂无解释',
    pos: posCategory,
    pos_tag_raw: pos_tag,
    example_sentence: tatoebaResult.data?.example_sentence || '',
    example_pinyin: tatoebaResult.data?.example_pinyin,
    
    // Multi-modal media (one of each type)
    image_url: imageUrl,
    gif_url: gifUrl,
    video_url: videoUrl,
    
    // Sentence-level media
    sentence_video_url: sentenceVideoUrl,
    
    radical_info: zdicResult.data?.radical_info,
    synonyms: zdicResult.data?.synonyms,
    friction_level: 1, // Default to minimal help
    source: 'manual',
    created_at: new Date().toISOString()
  };
  
  console.log('[Scraper] Card assembled:', card);
  return card;
}

/**
 * Batch scraper for multiple words
 */
export async function batchScrapeCards(
  words: string[],
  progressCallback?: (current: number, total: number) => void
): Promise<DirectMethodCard[]> {
  const results: DirectMethodCard[] = [];
  
  for (let i = 0; i < words.length; i++) {
    if (progressCallback) {
      progressCallback(i + 1, words.length);
    }
    
    const card = await scrapeDirectMethodCard(words[i]);
    
    if (card.hanzi && card.definition_ZH) {
      results.push(card as DirectMethodCard);
    }
    
    // Longer delay between batch items
    if (i < words.length - 1) {
      await delay(1000);
    }
  }
  
  return results;
}
