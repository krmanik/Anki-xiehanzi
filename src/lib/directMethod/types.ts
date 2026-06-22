/**
 * Direct Method Types
 * Type definitions for the Chinese-only immersion data pipeline
 */

export interface DirectMethodCard {
  // Core vocabulary
  hanzi: string;
  pinyin: string;
  
  // Zh-Zh Definition (no English)
  definition_ZH: string;
  
  // Part of Speech (for 12-color system)
  pos: PosCategory;
  pos_tag_raw?: string; // Original ICTCLAS tag from segmenter
  
  // HSK level for sense splitting
  hsk_level?: number;
  
  // Example sentence (Chinese only)
  example_sentence: string;
  example_pinyin?: string;
  example_audio_url?: string;
  
  // Media for immersion
  media_url?: string; // Image or GIF URL
  media_type?: 'image' | 'gif';
  
  // Radical information for scaffolding
  radical_info?: {
    radical: string;
    meaning_ZH: string;
    strokes: number;
  };
  
  // Synonyms/Antonyms (Chinese only)
  synonyms?: string[];
  antonyms?: string[];
  
  // Friction control
  friction_level: 0 | 1 | 2 | 3; // 0 = no help, 3 = full dictionary link
  
  // Metadata
  source: 'zdic' | 'tatoeba' | 'unsplash' | 'manual';
  created_at: string;
}

export type PosCategory = 
  | 'noun'           // Blue
  | 'pronoun'        // Sky Blue
  | 'verb'           // Dark Green
  | 'auxiliary_verb' // Mint
  | 'numeral'        // Red
  | 'adjective'      // Yellow
  | 'measure_word'   // Purple
  | 'adverb'         // Lime
  | 'preposition'    // Teal
  | 'conjunction'    // Orange
  | 'particle'       // Grey
  | 'interjection'   // Pink
  | 'unknown';       // Fallback

export interface ZdicDefinition {
  hanzi: string;
  pinyin: string;
  definitions_ZH: string[];
  radicals?: {
    radical: string;
    meaning_ZH: string;
    strokes: number;
  };
  synonyms?: string[];
  antonyms?: string[];
  hsk_level?: number;
}

export interface TatoebaSentence {
  text: string;
  pinyin?: string;
  audio_url?: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: Partial<DirectMethodCard>;
  error?: string;
  source: 'zdic' | 'tatoeba' | 'unsplash';
}
