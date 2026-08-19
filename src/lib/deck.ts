/**
 * Anki-xiehanzi
 * Copyright (C) 2024 krmanik
 * https://github.com/krmanik/Anki-xiehanzi
 * This code is licensed under the GPL-3.0 License. Full license text is available in the LICENSE file.
 *
 * Framework-agnostic deck-generation logic, extracted verbatim from the original
 * React create.tsx. Keep model IDs, templates and media list identical — the
 * exported .apkg output must not change.
 */

import Chinese from 'chinese-s2t';
import pinyin from 'chinese-to-pinyin';
import { Deck, Model, Package } from 'genanki-js';
import init, { cut } from 'jieba-wasm';
import initSqlJs from 'sql.js';
import EdgeTTSBrowser from '@kingdanx/edge-tts-browser';
import { base } from '$app/paths';

import CONSTANTS from './dict/contants';
import pinzhu from './dict/pinyinzhuyin';
import {
	lookup as cedictLookup,
	loadCedict,
	loadHskMeanings,
	loadYctMeanings,
	simpleMeaningOf,
	posDisplay,
	characterBreakdown,
	wordsByLevel,
	wordsByBct,
	wordsByYct,
	getSmartSentences,
	type Reading,
	type CharInfo,
	type ExampleSentence
} from './dict/cedict';
import { frequencyBand, hskLevelLabel, hskLevels } from './dict/meta';
import { colorizeSentenceHanzi, colorizePinyinString } from './tone';
import {
	buildNoteTemplates,
	fieldUsedByAnyCard,
	formatDefinition,
	CARD_STYLE_LS_KEY,
	CARD_TABS_LS_KEY,
	DEFAULT_TEMPLATE,
	elementOrder,
	DEFAULT_BODY_ORDER,
	type TabContent,
	type TemplateOpts,
	type CardElementId,
	type CardElementStyles,
	type ElementStyle
} from './deckTemplate';

import {
	buildNoteFields,
	commonReadingIndex,
	decodeHtmlEntities,
	displayReadings,
	type Word
} from './noteFields';

// Re-export the template types/helpers so existing `$lib/deck` imports keep working.
export {
	CARD_STYLE_LS_KEY,
	CARD_TABS_LS_KEY,
	DEFAULT_TEMPLATE,
	elementOrder,
	DEFAULT_BODY_ORDER,
	type TabContent,
	type TemplateOpts,
	type CardElementId,
	type CardElementStyles,
	type ElementStyle
};

// Same for the word record + its note-field builder, now in noteFields.ts.
export {
	buildNoteFields,
	commonReadingIndex,
	decodeHtmlEntities,
	displayReadings,
	type Word
};

const host = base;

// ---------------------------------------------------------------------------
// Initialization helpers (were inside the create.tsx useEffect)
// ---------------------------------------------------------------------------

export function loadDict() {
	return Promise.all([loadCedict(), loadHskMeanings(), loadYctMeanings(), loadGtGlosses()]);
}

export function initJieba() {
	return init(`${host}/data/jieba_rs_wasm_bg.wasm`);
}

export async function setupSql() {
	const SQL = await initSqlJs({
		locateFile: () => `${host}/data/sql-wasm.wasm`
	});
	const db = new SQL.Database();
	return db;
}

export async function loadHskWordsDict(): Promise<Set<string>> {
	const wordsSet = new Set<string>();
	try {
		const response = await fetch(`${host}/data/HSK_All_Words.json`);
		if (response.ok) {
			const hskData = await response.json();
			Object.values(hskData).forEach((levelData: any) => {
				if (levelData) {
					levelData.forEach((wordObj: any) => {
						if (wordObj) {
							wordsSet.add(wordObj);
						}
					});
				}
			});
			console.log(`HSK dictionary loaded with ${wordsSet.size} words`);
		}
	} catch (error) {
		console.log('Failed to load HSK words dictionary:', error);
	}
	return wordsSet;
}

/**
 * Play audio for a single word: HSK CDN recording first, then Edge TTS
 * (Edge browser only). Returns true if something played.
 */
export async function playWordAudio(word: string, hskWordsDict: Set<string>): Promise<boolean> {
	const play = (blob: Blob) => {
		const url = URL.createObjectURL(blob);
		const audio = new Audio(url);
		audio.onended = () => URL.revokeObjectURL(url);
		void audio.play();
	};

	if (hskWordsDict.has(word)) {
		try {
			const encoded = encodeURIComponent(word);
			const res = await fetch(
				`https://cdn.jsdelivr.net/gh/krmanik/HSK-3.0/New%20HSK%20(2025)/Audio/cmn-${encoded}.mp3`
			);
			if (res.ok) {
				play(await res.blob());
				return true;
			}
		} catch (e) {
			console.log('HSK audio fetch failed', e);
		}
	}

	try {
		const tts = new EdgeTTSBrowser();
		tts.tts.setVoiceParams({ text: word, voice: 'zh-CN-XiaoxiaoNeural' });
		const blob = await tts.ttsToFile(`cmn-${word}.mp3`);
		play(blob);
		return true;
	} catch (e) {
		console.log('TTS failed', e);
		return false;
	}
}

// ---------------------------------------------------------------------------
// Word lookup
// ---------------------------------------------------------------------------

// Cache for Google Translate fallback lookups. Words missing from cedict.db get
// translated via the network; without this, regenerating decks (e.g. HSK 1 then
// HSK 7-9) refetches the same words every time.
//
// Three layers, cheapest first:
//   1. seed JSON (static/data/gt_glosses.json) — committed {word: text} map,
//      collected from prior runs so they never hit the network at all.
//   2. localStorage — survives reloads within a browser.
//   3. network — last resort; result is written back to the in-memory map and
//      localStorage. Words collected this way can be promoted into the seed file.
const GT_CACHE_PREFIX = 'gt:zh-en:';
const gtInflight = new Map<string, Promise<string>>();
let gtGlosses: Map<string, string> | null = null;

/** Load the committed seed glosses ({word: text}) into memory. Idempotent. */
export async function loadGtGlosses(): Promise<void> {
	if (gtGlosses) return;
	gtGlosses = new Map();
	try {
		const res = await fetch(`${base}/data/gt_glosses.json`);
		if (res.ok) {
			const data: Record<string, string> = await res.json();
			for (const [word, text] of Object.entries(data)) {
				if (text) gtGlosses.set(word, text);
			}
		}
	} catch {
		// non-fatal — seed file may not exist yet
	}
}

function gtCacheGet(word: string): string | null {
	const seed = gtGlosses?.get(word);
	if (seed !== undefined) return seed;
	try {
		return globalThis.localStorage?.getItem(GT_CACHE_PREFIX + word) ?? null;
	} catch {
		return null;
	}
}

function gtCacheSet(word: string, text: string) {
	(gtGlosses ??= new Map()).set(word, text);
	try {
		globalThis.localStorage?.setItem(GT_CACHE_PREFIX + word, text);
	} catch {
		/* quota / unavailable — fall through, cache is best-effort */
	}
}

async function fetchTranslation(word: string): Promise<string> {
	const cached = gtCacheGet(word);
	if (cached !== null) return cached;

	const existing = gtInflight.get(word);
	if (existing) return existing;

	const p = (async () => {
		const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en-US&dt=t&q=${word}`;
		const response = await fetch(url);
		const data = await response.json();
		const text = data[0][0][0];
		gtCacheSet(word, text);
		return text;
	})();

	gtInflight.set(word, p);
	try {
		return await p;
	} finally {
		gtInflight.delete(word);
	}
}

export async function fetchMeaningGoogleTranslate(word: string) {
	const definition = await fetchTranslation(word.trim());

	const simplified = word.trim();
	const traditional = Chinese.s2t(word.trim());

	let pin = pinyin(word.trim(), { toneToNumber: true });
	pin = pin.replace(/0/g, '5');
	// replace v3 with u:3
	pin = pin.replace(/v/g, 'u:');

	const pizh = await pinzhu.pinyinAndZhuyin(pin, '', '');

	const pinyin1 = [decodeHtmlEntities(pizh[1])];
	const zhuyin1 = [decodeHtmlEntities(pizh[2])];
	const syllable1 = [pin];
	const definitions1 = [definition];

	return {
		Simplified: simplified,
		Traditional: traditional,
		Pinyin: pinyin1,
		Zhuyin: zhuyin1,
		Definitions: definitions1,
		Syllable: syllable1
	};
}

/**
 * Look up a single word and build its Word record from cedict.db. Words not in
 * the dictionary fall back to Google Translate. Dedup is the caller's job.
 */
export async function lookupWord(word: string): Promise<Word> {
	const normalized = Chinese.t2s(word.trim());
	const entry = await cedictLookup(normalized);

	if (!entry) {
		// Fallback: word not in cedict.db
		const fetched = await fetchMeaningGoogleTranslate(normalized);
		const breakdown = await characterBreakdown(fetched.Simplified);
		const readings: Reading[] = fetched.Syllable.map((syl, i) => ({
			syllable: syl,
			pinyin: fetched.Pinyin[i],
			pinyinPlain: fetched.Pinyin[i],
			zhuyin: fetched.Zhuyin[i],
			definition: fetched.Definitions[i]
		}));
		return {
			Simplified: fetched.Simplified,
			Traditional: fetched.Traditional,
			Pinyin: fetched.Pinyin.join(', '),
			Zhuyin: fetched.Zhuyin.join(', '),
			Definitions: fetched.Definitions.join(' │ '),
			Syllable: fetched.Syllable.join(', '),
			SimpleMeaning: simpleMeaningOf(fetched.Simplified) || fetched.Definitions.join('; '),
			commonMeaning: fetched.Definitions.join('; '),
			pos: [],
			dominantPos: '',
			classifiers: [],
			level: null,
			rank: null,
			readings,
			breakdown
		};
	}

	const readings = entry.readings;
	const breakdown = await characterBreakdown(entry.simplified);
	return {
		Simplified: entry.simplified,
		Traditional: entry.traditional,
		Pinyin: readings.map((r) => decodeHtmlEntities(r.pinyin)).join(', '),
		Zhuyin: readings.map((r) => decodeHtmlEntities(r.zhuyin)).join(', '),
		Definitions: readings.map((r) => r.definition).join(' │ '),
		Syllable: readings.map((r) => r.syllable).join(', '),
		SimpleMeaning: simpleMeaningOf(entry.simplified) || entry.commonMeaning,
		commonMeaning: entry.commonMeaning,
		pos: entry.pos,
		dominantPos: entry.dominantPos,
		classifiers: entry.classifiers,
		level: entry.level,
		rank: entry.rank,
		readings,
		breakdown
	};
}

/** CEDICT-only lookup — never calls Google Translate. Returns null when not found. */
export async function lookupWordCedictOnly(word: string): Promise<Word | null> {
	const entry = await cedictLookup(Chinese.t2s(word.trim()));
	if (!entry) return null;
	const readings = entry.readings;
	const breakdown = await characterBreakdown(entry.simplified);
	return {
		Simplified: entry.simplified,
		Traditional: entry.traditional,
		Pinyin: readings.map((r) => decodeHtmlEntities(r.pinyin)).join(', '),
		Zhuyin: readings.map((r) => decodeHtmlEntities(r.zhuyin)).join(', '),
		Definitions: readings.map((r) => r.definition).join(' │ '),
		Syllable: readings.map((r) => r.syllable).join(', '),
		SimpleMeaning: simpleMeaningOf(entry.simplified) || entry.commonMeaning,
		commonMeaning: entry.commonMeaning,
		pos: entry.pos,
		dominantPos: entry.dominantPos,
		classifiers: entry.classifiers,
		level: entry.level,
		rank: entry.rank,
		readings,
		breakdown
	};
}

/**
 * CEDICT lookup with a caller-supplied meaning fallback — never calls Google
 * Translate. Used for word sources (e.g. YCT) that already carry meanings.
 */
export async function lookupWordWithFallback(
	word: string,
	fallbackMeaning: string
): Promise<Word> {
	const normalized = Chinese.t2s(word.trim());
	const entry = await cedictLookup(normalized);
	if (entry) {
		const readings = entry.readings;
		const breakdown = await characterBreakdown(entry.simplified);
		return {
			Simplified: entry.simplified,
			Traditional: entry.traditional,
			Pinyin: readings.map((r) => decodeHtmlEntities(r.pinyin)).join(', '),
			Zhuyin: readings.map((r) => decodeHtmlEntities(r.zhuyin)).join(', '),
			Definitions: readings.map((r) => r.definition).join(' │ '),
			Syllable: readings.map((r) => r.syllable).join(', '),
			SimpleMeaning: simpleMeaningOf(entry.simplified) || entry.commonMeaning,
			commonMeaning: entry.commonMeaning,
			pos: entry.pos,
			dominantPos: entry.dominantPos,
			classifiers: entry.classifiers,
			level: entry.level,
			rank: entry.rank,
			readings,
			breakdown
		};
	}
	const breakdown = await characterBreakdown(normalized);
	return {
		Simplified: normalized,
		Traditional: normalized,
		Pinyin: '',
		Zhuyin: '',
		Definitions: fallbackMeaning,
		Syllable: '',
		SimpleMeaning: simpleMeaningOf(normalized) || fallbackMeaning,
		commonMeaning: fallbackMeaning,
		pos: [],
		dominantPos: '',
		classifiers: [],
		level: null,
		rank: null,
		readings: [],
		breakdown
	};
}

/**
 * Forward maximum matching (FMM) against CEDICT for a word that failed
 * Google Translate. Tries the longest possible substring from each position;
 * advances past single characters without adding them (no noise).
 */
export async function resolveWithSegmentation(word: string): Promise<Word[]> {
	const chars = [...Chinese.t2s(word)];
	const results: Word[] = [];
	const seen = new Set<string>();
	let pos = 0;

	while (pos < chars.length) {
		let matched = false;
		for (let len = chars.length - pos; len >= 2; len--) {
			const substr = chars.slice(pos, pos + len).join('');
			if (seen.has(substr)) {
				pos += len;
				matched = true;
				break;
			}
			const w = await lookupWordCedictOnly(substr);
			if (w) {
				seen.add(substr);
				results.push(w);
				pos += len;
				matched = true;
				break;
			}
		}
		if (!matched) pos++; // skip single char silently
	}
	return results;
}

export { wordsByLevel, wordsByBct, wordsByYct, getSmartSentences };
export type { ExampleSentence };

// Minimal Persistence shim so the real card template's init code runs in the
// preview iframe (no bundled _anki-persistence.js there). getItem returns null,
// so every toggle uses its seeded default.
const PREVIEW_PERSISTENCE_SHIM =
	`<script>window.Persistence={isAvailable:function(){return true;},getItem:function(){return null;},setItem:function(){},removeItem:function(){},clear:function(){}};window.ankiPlatform="desktop";</script>`;

/** Substitute {{Field}} placeholders (and leftover ones → '') from a value map. */
function fillTemplate(tpl: string, fields: Record<string, string>): string {
	let out = tpl;
	for (const [k, v] of Object.entries(fields)) {
		out = out.split(`{{${k}}}`).join(v);
	}
	return out.replace(/\{\{[^}]+\}\}/g, '');
}

/**
 * Render one side of a real card (front/back) to a standalone HTML document for
 * an exact-match preview iframe. Reuses the same template + CSS + field values
 * the .apkg export uses, so what you see is what Anki shows.
 */
export function renderCardHtml(opts: {
	side: 'front' | 'back';
	tab: string;
	word: Word;
	fields: string[];
	order?: string[];
	tabContent: TabContent;
	template: TemplateOpts;
	includeAudio: boolean;
	examples: ExampleSentence[];
}): string {
	const { side, tab, word, fields, order, tabContent, template, includeAudio, examples } = opts;
	const { tmpls, css } = buildNoteTemplates({ fields, order, tabContent, includeAudio, template });
	const idx = Object.keys(tabContent).indexOf(tab);
	const tmpl = tmpls[idx] ?? tmpls[0];
	if (!tmpl) return '';

	const fmap = buildNoteFields(word, template, examples);
	const front = fillTemplate(tmpl.qfmt, fmap);
	let body =
		side === 'front'
			? front
			: fillTemplate(tmpl.afmt, { ...fmap, FrontSide: front });

	// Point bundled `_media` (icons font, sidebar images, writer engine + stroke
	// data) at the served static files; persistence is shimmed, audio won't play.
	// srcdoc iframes resolve relative URLs against the parent page, so every
	// bundled path must be rewritten to an absolute app path or it 404s.
	const asset = `${base}/img/`;
	const data = `${base}/data/`;
	body = body
		.replace(/<script src="_anki-persistence\.js"><\/script>/g, '')
		.replace(
			/<script src="_hanzi-writer\.min\.js"><\/script>/g,
			`<script src="${data}_hanzi-writer.min.js"><\/script>`
		)
		.replace(/fetch\("_hanzi-writer-data\.json"\)/g, `fetch("${data}hanzi-writer-data.json")`)
		.replace(/src="_/g, `src="${asset}_`);

	const styles = (CONSTANTS.DECK_CSS + css).replace(
		'url(_MaterialIcons-Regular.woff2)',
		`url(${asset}_MaterialIcons-Regular.woff2)`
	);
	return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;}${styles}</style></head>
<body class="card">${PREVIEW_PERSISTENCE_SHIM}${body}</body></html>`;
}

export function filterChineseWords(array: string[]): string[] {
	const chineseRegex = /[一-龥]/;
	return array.filter((word) => chineseRegex.test(word));
}

/** Segment a paragraph into unique Chinese words via jieba. */
export function cutParagraph(text: string): string[] {
	let cutWords = cut(Chinese.t2s(text), true);
	cutWords = filterChineseWords(cutWords);
	return [...new Set(cutWords)];
}

// ---------------------------------------------------------------------------
// Deck generation
// ---------------------------------------------------------------------------

/**
 * Stroke data: every character Hanzi Writer knows, not this deck's subset.
 *
 * Slicing the 32 MB file down to the exported words is far smaller, and
 * tempting. It is also only correct for the deck as it left here. The first note
 * a user adds or edits in Anki can carry a character the subset never covered,
 * and that character then has no strokes — a grid that renders, a red loader
 * dot, and nothing in the console, because hanzi-writer reports a missing
 * character through `onLoadCharDataError` and the template only uses that to
 * recolour the dot. Two decks built here would also both claim the media name
 * `_hanzi-writer-data.json` with different contents, and Anki keys media by name
 * across the whole collection, so the later import silently replaces the first.
 *
 * The complete file has neither failure: one name, one content, stored once
 * however many decks a collection holds.
 */
async function buildHanziData(): Promise<string> {
	const res = await fetch(`${host}/data/hanzi-writer-data.json`);
	return res.text();
}


/**
 * Hierarchical Anki tags for a word, so users can filter / build custom study
 * by HSK level, part of speech and frequency band inside Anki. Tags can't
 * contain spaces, so labels are underscore-joined.
 *   中国 → ['Xiehanzi', 'HSK::1', 'POS::Noun', 'Frequency::Top_100']
 */
export function noteTags(word: Word): string[] {
	const tags = ['Xiehanzi'];
	for (const lvl of hskLevels(word.level)) tags.push(`HSK::${lvl}`);
	const pos = word.dominantPos ? posDisplay(word.dominantPos) : '';
	if (pos) tags.push(`POS::${pos.replace(/\s+/g, '_')}`);
	const band = frequencyBand(word.rank);
	if (band) tags.push(`Frequency::${band.replace(/\s+/g, '_')}`);
	return tags;
}

/**
 * Stable note GUID seeded on the word's identity (not its field HTML). genanki
 * defaults the guid to a hash of every field, so any styling/preset tweak would
 * shift the guid and re-importing an updated deck would duplicate every note.
 * Seeding on Simplified+Traditional+model keeps the guid constant across
 * re-exports, so Anki updates the existing note instead. FNV-1a → base36.
 */
export function stableNoteGuid(word: Word, modelId: string): string {
	const seed = `xiehanzi:${modelId}:${word.Simplified}:${word.Traditional}`;
	let h1 = 0x811c9dc5;
	let h2 = 0x811c9dc5 ^ 0x9e3779b9;
	for (let i = 0; i < seed.length; i++) {
		const c = seed.charCodeAt(i);
		h1 = Math.imul(h1 ^ c, 0x01000193);
		h2 = Math.imul(h2 ^ c, 0x01000193);
	}
	return (h1 >>> 0).toString(36).padStart(7, '0') + (h2 >>> 0).toString(36).padStart(7, '0');
}

/**
 * Audio clips fetched at once. The CDN is HTTP/2, so the browser is not capped
 * at six connections and a dozen in flight is roughly three times faster than
 * the four-at-a-time this used to do. The offline builder raises it much
 * further (see scripts/build-hsk-decks.mjs).
 */
export const DEFAULT_AUDIO_CONCURRENCY = 12;

/**
 * Deck id seeded on the deck's name (FNV-1a), in Anki's [2^30, 2^31) range.
 * Deterministic so rebuilding a deck re-imports onto the same deck instead of
 * creating a second one next to it.
 */
export function stableDeckId(name: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < name.length; i++) {
		h = Math.imul(h ^ name.charCodeAt(i), 0x01000193);
	}
	return (h >>> 0) % (1 << 30) + (1 << 30);
}

export interface GenerateDeckOptions {
	words: Word[];
	deckName: string;
	includeAudio: boolean;
	fields: string[];
	/** Full layout order (incl. ControlButtons/Separator tokens) for flex order. */
	order?: string[];
	tabContent: TabContent;
	hskWordsDict: Set<string>;
	db: any;
	template?: TemplateOpts;
	/**
	 * Which (sub)deck a word belongs in — return `"Parent::Child"` for subdecks.
	 * Defaults to `deckName` for every word.
	 */
	deckFor?: (word: Word) => string;
	/** How many audio clips to fetch at once (default DEFAULT_AUDIO_CONCURRENCY). */
	audioConcurrency?: number;
	/**
	 * Where a word's clip comes from. The default — CDN recording, then Edge TTS
	 * — is a browser path: Edge TTS is a browser API and fails under Node with
	 * "the file buffer is empty" on every word, so the offline builder injects its
	 * own resolver (disk cache → the HSK submodule's own recordings → CDN → macOS
	 * `say`) instead.
	 */
	getAudio?: (word: string) => Promise<Blob | null>;
	onProgress?: (value: number) => void;
	// Smart example-sentence fetcher (injectable for tests). Defaults to the
	// hsk_sentences.db lookup, loaded lazily only when the Examples field is used.
	getExamples?: (word: string) => Promise<ExampleSentence[]>;
}

/**
 * Build the .apkg package in memory — notes, media, audio — without writing it.
 *
 * Split out of `generateDeck` so the offline deck builder
 * (`scripts/build-hsk-decks.mjs`) can zip the same package to disk in Node,
 * where `writeToFile`'s browser download does not exist. The package contents
 * must stay identical to what the browser exports.
 */
export async function buildDeckPackage(opts: GenerateDeckOptions): Promise<any> {
	const { words, deckName, includeAudio, fields, tabContent, hskWordsDict, db } = opts;
	const template = opts.template ?? DEFAULT_TEMPLATE;
	const onProgress = opts.onProgress ?? (() => {});

	onProgress(0);

	// One note type carrying every card type. Its two ids are what every existing
	// deck was built with, so a rebuild re-imports onto the same note type.
	const name = includeAudio ? 'Basic - (Anki-xiehanzi)' : 'Basic - (Anki-xiehanzi) - No Audio';
	const built = buildNoteTemplates({
		fields,
		order: opts.order,
		tabContent,
		includeAudio,
		template
	});
	const model = new Model({
		name,
		id: includeAudio ? '1969669503' : '1969669504',
		flds: built.flds,
		css: CONSTANTS.DECK_CSS + built.css,
		req: built.req,
		tmpls: built.tmpls
	});

	const usesWriter = built.usesWriter;

	// One deck unless the caller splits the words up (the offline builder puts a
	// whole word list in one .apkg, one subdeck per HSK level).
	const deckOf = opts.deckFor ?? (() => deckName);
	const decks = new Map<string, any>();
	const deckFor = (name: string) => {
		let deck = decks.get(name);
		if (!deck) {
			deck = new Deck(stableDeckId(name), name);
			decks.set(name, deck);
		}
		return deck;
	};

	// Smart example sentences are only fetched when the Examples field is used
	// (the sentences db is a separate ~5MB download), keyed by Simplified word.
	const exOpts = template.exampleOptions ?? DEFAULT_TEMPLATE.exampleOptions;
	const examplesMap = new Map<string, ExampleSentence[]>();
	const usesExamples = fields.includes('Examples') && fieldUsedByAnyCard(tabContent, 'Examples');
	if (usesExamples) {
		const fetchExamples =
			opts.getExamples ??
			((w: string) =>
				getSmartSentences(w, {
					limit: exOpts.count,
					minChars: exOpts.minChars,
					maxChars: exOpts.maxChars
				}));
		for (const word of words) {
			try {
				examplesMap.set(word.Simplified, await fetchExamples(word.Simplified));
			} catch (e) {
				examplesMap.set(word.Simplified, []);
			}
		}
	}

	words.forEach((word) => {
		const fmap = buildNoteFields(word, template, examplesMap.get(word.Simplified) ?? []);
		const note = built.flds.map((f) => fmap[f.name] ?? '');
		deckFor(deckOf(word)).addNote(
			model.note(note, noteTags(word), stableNoteGuid(word, String(model.props.id)))
		);
	});

	const p = new Package();
	p.setSqlJs(db);
	// Anki keeps the deck that has notes; an empty package still needs one.
	if (decks.size === 0) deckFor(deckName);
	for (const deck of decks.values()) p.addDeck(deck);

	// Image/font media live in /img.
	const mediaFiles = [
		'_MaterialIcons-Regular.woff2',
		'_characterpop.svg',
		'_hanzicraft.png',
		'_pleco.png',
		'_rtega.png',
		'_youdao.png',
		'_tatoeba.png'
	];

	// Script media live in /data. Persistence ships with every deck; the writer
	// engine + its stroke data only when a card uses the writing component.
	// anki-tts (sentence audio) is loaded from its own CDN instead — see
	// ANKI_TTS_SCRIPT in dict/contants.ts.
	const dataFiles = ['_anki-persistence.js'];
	if (usesWriter) {
		dataFiles.push('_hanzi-writer.min.js');
		try {
			const dataJson = await buildHanziData();
			p.addMedia(dataJson, '_hanzi-writer-data.json');
		} catch (error) {
			console.error('Failed to build offline Hanzi Writer data:', error);
		}
	}

	let progress = 0;
	const wordFiles = words.map((word) => word.Simplified);
	const total = mediaFiles.length + dataFiles.length + (includeAudio ? wordFiles.length : 0);

	const fetchFrom = (dir: string) => async (file: string) => {
		const response = await fetch(`${host}/${dir}/${file}`);
		if (!response.ok) {
			return null;
		}
		progress += 1;
		onProgress((progress / total) * 100);
		return response.blob();
	};
	const fetchFile = fetchFrom('img');
	const fetchDataFile = fetchFrom('data');

	const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	const fetchAudio = async (word: string): Promise<Blob | null> => {
		// An injected resolver owns the whole clip: the offline builder's reaches
		// local files and macOS `say`, neither of which exists in a browser.
		if (opts.getAudio) {
			const blob = await opts.getAudio(word).catch(() => null);
			progress += 1;
			onProgress((progress / total) * 100);
			return blob;
		}

		// Check if word exists in HSK dictionary first
		if (hskWordsDict.has(word)) {
			console.log(`Fetching audio for HSK word: ${word}`);
			const encodedWord = encodeURIComponent(word);
			const jsdelivrUrl = `https://cdn.jsdelivr.net/gh/krmanik/HSK-3.0/New%20HSK%20(2025)/Audio/cmn-${encodedWord}.mp3`;

			// One retry: with many requests in flight a few drop, and falling
			// straight through to TTS for those is both slow and worse audio.
			for (let attempt = 0; attempt < 2; attempt++) {
				try {
					const response = await fetch(jsdelivrUrl);
					if (response.ok) {
						const blob = await response.blob();
						progress += 1;
						onProgress((progress / total) * 100);
						return blob;
					}
					// The CDN says it has no clip for this word — retrying won't help.
					if (response.status === 404) break;
				} catch (error) {
					console.log(`Audio fetch failed for ${word} from jsdelivr:`, error);
				}
				await delay(250);
			}
		}

		try {
			const tts = new EdgeTTSBrowser();
			tts.tts.setVoiceParams({
				text: word,
				voice: 'zh-CN-XiaoxiaoNeural'
			});

			const fileName = `cmn-${word}.mp3`;
			const blob = await tts.ttsToFile(fileName);
			progress += 1;
			onProgress((progress / total) * 100);
			const randomDelay = Math.floor(Math.random() * 1000) + 500;
			await delay(randomDelay);
			return blob;
		} catch (error) {
			console.log(`TTS failed for ${word}:`, error);
			progress += 1;
			onProgress((progress / total) * 100);
			return null;
		}
	};

	/**
	 * Audio is fetched by a pool of workers rather than fixed batches: a batch
	 * only moves on once its slowest member lands, so one stalled clip used to
	 * idle the other three. Clips are collected first and added in word order
	 * afterwards, keeping the media list byte-identical whatever order they
	 * arrive in.
	 */
	const fetchAllAudio = async (words: string[], concurrency: number) => {
		const files = [...new Set(words)];
		const clips = new Map<string, Blob>();
		const queue = files.slice();
		const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
			for (;;) {
				const word = queue.shift();
				if (word === undefined) return;
				const blob = await fetchAudio(word);
				if (blob) clips.set(word, blob);
			}
		});
		await Promise.all(workers);
		for (const word of files) {
			const blob = clips.get(word);
			if (blob) p.addMedia(blob, `cmn-${word}.mp3`);
		}
	};

	// Only process audio if includeAudio is true
	if (includeAudio) {
		await fetchAllAudio(wordFiles, opts.audioConcurrency ?? DEFAULT_AUDIO_CONCURRENCY);
	}

	// sidebar icons (/img) + scripts (/data)
	try {
		const items = await Promise.all([
			...mediaFiles.map((f) => fetchFile(f).then((blob) => ({ blob, name: f }))),
			...dataFiles.map((f) => fetchDataFile(f).then((blob) => ({ blob, name: f })))
		]);
		items.forEach(({ blob, name }) => {
			if (blob) {
				p.addMedia(blob, name);
			}
		});
	} catch (error) {
		console.error('Error fetching or adding media:', error);
	}

	return p;
}

export async function generateDeck(opts: GenerateDeckOptions): Promise<void> {
	const onProgress = opts.onProgress ?? (() => {});
	const p = await buildDeckPackage(opts);
	p.writeToFile(`${opts.deckName}.apkg`);
	onProgress(100);
	setTimeout(() => onProgress(0), 2000);
}
