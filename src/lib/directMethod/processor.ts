/**
 * Step 2: Processing & Tagging Logic - Chinese Text Processor
 * 
 * Implements sentence segmentation, Part-of-Speech tagging using jieba-wasm,
 * and CSS class assignment based on the 12-color Direct Method PoS system.
 */

import jieba from 'jieba-wasm';

// Initialize jieba-wasm (lazy loading)
let jiebaInitialized = false;

async function ensureJiebaLoaded() {
	if (!jiebaInitialized) {
		await jieba.loadDict();
		jiebaInitialized = true;
	}
}

/**
 * 12-color PoS mapping for Direct Method immersion
 * Maps ICTCLAS-style tags to our color categories
 */
export interface PosColorMapping {
	colorClass: string;      // CSS class name
	colorName: string;       // Human-readable color name
	posTags: string[];       // ICTCLAS tags that map to this color
	chineseLabel: string;    // Chinese label (for reference, not displayed)
}

export const POS_COLOR_MAP: Record<string, PosColorMapping> = {
	// Blue - 名词 (Nouns)
	noun: {
		colorClass: 'pos-noun',
		colorName: 'Blue',
		posTags: ['n', 'nr', 'ns', 'nt', 'nz'],
		chineseLabel: '名词'
	},
	
	// Sky Blue - 代词 (Pronouns)
	pronoun: {
		colorClass: 'pos-pronoun',
		colorName: 'Sky Blue',
		posTags: ['r', 'rg'],
		chineseLabel: '代词'
	},
	
	// Dark Green - 动词 (Verbs)
	verb: {
		colorClass: 'pos-verb',
		colorName: 'Dark Green',
		posTags: ['v', 'vn'],
		chineseLabel: '动词'
	},
	
	// Mint - 助动词 (Auxiliary Verbs)
	auxiliary: {
		colorClass: 'pos-auxiliary',
		colorName: 'Mint',
		posTags: ['v'], // Will need context-based detection for 会，能，可以
		chineseLabel: '助动词'
	},
	
	// Red - 数词 (Numerals)
	numeral: {
		colorClass: 'pos-numeral',
		colorName: 'Red',
		posTags: ['m', 'mq', 'mg'],
		chineseLabel: '数词'
	},
	
	// Yellow - 形容词 (Adjectives)
	adjective: {
		colorClass: 'pos-adjective',
		colorName: 'Yellow',
		posTags: ['a', 'ad', 'an'],
		chineseLabel: '形容词'
	},
	
	// Purple - 量词 (Measure Words)
	measureWord: {
		colorClass: 'pos-measure',
		colorName: 'Purple',
		posTags: ['q', 'qt', 'qv'],
		chineseLabel: '量词'
	},
	
	// Lime - 副词 (Adverbs)
	adverb: {
		colorClass: 'pos-adverb',
		colorName: 'Lime',
		posTags: ['d'],
		chineseLabel: '副词'
	},
	
	// Teal - 介词 (Prepositions)
	preposition: {
		colorClass: 'pos-preposition',
		colorName: 'Teal',
		posTags: ['p'],
		chineseLabel: '介词'
	},
	
	// Orange - 连词 (Conjunctions)
	conjunction: {
		colorClass: 'pos-conjunction',
		colorName: 'Orange',
		posTags: ['c', 'cc'],
		chineseLabel: '连词'
	},
	
	// Grey - 助词 (Particles)
	particle: {
		colorClass: 'pos-particle',
		colorName: 'Grey',
		posTags: ['u', 'y'],
		chineseLabel: '助词'
	},
	
	// Pink - 叹词 (Interjections/Onomatopoeia)
	interjection: {
		colorClass: 'pos-interjection',
		colorName: 'Pink',
		posTags: ['e', 'o'],
		chineseLabel: '叹词'
	}
};

/**
 * Segment a Chinese sentence and return tokens with PoS tags
 */
export interface SegmentedToken {
	word: string;
	pos: string;           // Raw ICTCLAS tag
	posCategory: string;   // Mapped category (noun, verb, etc.)
	colorClass: string;    // CSS class for coloring
	startOffset: number;   // Position in original sentence
	endOffset: number;
}

export async function segmentAndTag(sentence: string): Promise<SegmentedToken[]> {
	await ensureJiebaLoaded();
	
	const tokens = jieba.tokenize(sentence);
	const result: SegmentedToken[] = [];
	
	let currentOffset = 0;
	
	for (const token of tokens) {
		const word = token.word;
		const pos = token.pos || 'n'; // Default to noun if unknown
		
		// Map raw PoS tag to our color category
		const posCategory = mapPosToCategory(pos, word);
		const colorClass = POS_COLOR_MAP[posCategory]?.colorClass || 'pos-default';
		
		result.push({
			word,
			pos,
			posCategory,
			colorClass,
			startOffset: currentOffset,
			endOffset: currentOffset + word.length
		});
		
		currentOffset += word.length;
	}
	
	return result;
}

/**
 * Map raw ICTCLAS PoS tag to our 12-color categories
 * Includes special handling for context-dependent words
 */
function mapPosToCategory(rawPos: string, word: string): string {
	// Special auxiliary verb detection (会，能，可以，etc.)
	const auxiliaryVerbs = ['会', '能', '可以', '可能', '应该', '必须', '得', '要'];
	if (auxiliaryVerbs.includes(word) && rawPos === 'v') {
		return 'auxiliary';
	}
	
	// Find matching category by checking if rawPos is in the tag list
	for (const [category, mapping] of Object.entries(POS_COLOR_MAP)) {
		if (mapping.posTags.includes(rawPos.toLowerCase())) {
			return category;
		}
	}
	
	// Default to noun for unknown tags
	return 'noun';
}

/**
 * Generate HTML with PoS-colored spans for a sentence
 */
export async function colorizeSentence(sentence: string): Promise<string> {
	const tokens = await segmentAndTag(sentence);
	
	return tokens
		.map(token => `<span class="${token.colorClass}" data-pos="${token.pos}" title="${token.posCategory}">${token.word}</span>`)
		.join('');
}

/**
 * Wrap a specific target word in a sentence with its PoS color class
 * Used for highlighting the vocabulary word being studied
 */
export async function highlightTargetInSentence(
	sentence: string,
	targetWord: string,
	targetPos?: string
): Promise<string> {
	const tokens = await segmentAndTag(sentence);
	
	return tokens
		.map(token => {
			if (token.word === targetWord) {
				// This is our target word - apply the color class
				return `<span class="${token.colorClass} target-word" data-pos="${token.pos}">${token.word}</span>`;
			}
			// Other words get a neutral styling or remain uncolored
			return `<span class="context-word">${token.word}</span>`;
		})
		.join('');
}

/**
 * Extract all unique PoS categories used in a sentence
 */
export async function extractPosCategories(sentence: string): Promise<string[]> {
	const tokens = await segmentAndTag(sentence);
	const categories = new Set<string>();
	
	tokens.forEach(token => {
		categories.add(token.posCategory);
	});
	
	return Array.from(categories);
}

/**
 * Get CSS rules for all 12 PoS colors
 * Returns a CSS string that can be injected into card templates
 */
export function getPosColorCss(): string {
	return `
/* Direct Method PoS Color System - 12 Colors */
.pos-noun { color: #2E86DE; }           /* Blue - 名词 */
.pos-pronoun { color: #54A0FF; }        /* Sky Blue - 代词 */
.pos-verb { color: #10AC84; }           /* Dark Green - 动词 */
.pos-auxiliary { color: #7BED9F; }      /* Mint - 助动词 */
.pos-numeral { color: #EB4D4B; }        /* Red - 数词 */
.pos-adjective { color: #FDCB6E; }      /* Yellow - 形容词 */
.pos-measure { color: #A55EEA; }        /* Purple - 量词 */
.pos-adverb { color: #B8E932; }         /* Lime - 副词 */
.pos-preposition { color: #22A6B3; }    /* Teal - 介词 */
.pos-conjunction { color: #FA8231; }    /* Orange - 连词 */
.pos-particle { color: #95A5A6; }       /* Grey - 助词 */
.pos-interjection { color: #FD79A8; }   /* Pink - 叹词 */

/* Target word emphasis */
.target-word { 
	font-weight: bold;
	text-decoration: underline;
}

/* Context words (non-target) */
.context-word {
	opacity: 0.9;
}

/* Optional: hover effects for learning */
.pos-noun:hover, .pos-verb:hover, .pos-adjective:hover {
	background-color: rgba(0,0,0,0.05);
	border-radius: 2px;
	cursor: help;
}
`;
}

/**
 * Sense Splitter: Create separate cards for words with multiple meanings
 * Groups definitions by HSK level and PoS to ensure 1:1 meaning mapping
 */
export interface SenseGroup {
	hskLevel: string;
	posCategory: string;
	definitions: string[];
	exampleSentences: string[];
	cardId: string;  // Unique identifier for this sense
}

export function splitWordSenses(
	word: string,
	allDefinitions: Array<{
		definition: string;
		pos: string;
		hskLevel?: string;
		examples?: string[];
	}>
): SenseGroup[] {
	const groups = new Map<string, SenseGroup>();
	
	allDefinitions.forEach((def, index) => {
		const posCategory = mapPosToCategory(def.pos, word);
		const hskLevel = def.hskLevel || 'unknown';
		const key = `${hskLevel}-${posCategory}-${index}`;
		
		if (!groups.has(key)) {
			groups.set(key, {
				hskLevel,
				posCategory,
				definitions: [],
				exampleSentences: [],
				cardId: `${word}-${key}`
			});
		}
		
		const group = groups.get(key)!;
		group.definitions.push(def.definition);
		if (def.examples) {
			group.exampleSentences.push(...def.examples);
		}
	});
	
	return Array.from(groups.values());
}

/**
 * Validate that a sentence is suitable for immersion learning
 * Checks length, character complexity, and presence of target word
 */
export function validateSentenceForImmersion(
	sentence: string,
	targetWord: string,
	options: {
		minChars?: number;
		maxChars?: number;
		requireTarget?: boolean;
	} = {}
): { valid: boolean; reason?: string } {
	const { minChars = 5, maxChars = 25, requireTarget = true } = options;
	
	// Check length
	if (sentence.length < minChars) {
		return { valid: false, reason: 'Sentence too short' };
	}
	if (sentence.length > maxChars) {
		return { valid: false, reason: 'Sentence too long' };
	}
	
	// Check for target word presence
	if (requireTarget && !sentence.includes(targetWord)) {
		return { valid: false, reason: 'Target word not found' };
	}
	
	// Check for excessive difficulty (too many unique characters)
	const uniqueChars = new Set(sentence.replace(/[^\u4e00-\u9fff]/g, '')).size;
	if (uniqueChars > 15) {
		return { valid: false, reason: 'Too many unique characters' };
	}
	
	return { valid: true };
}
