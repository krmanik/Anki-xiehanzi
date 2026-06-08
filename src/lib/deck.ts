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
	simpleMeaningOf,
	posDisplay,
	characterBreakdown,
	wordsByLevel,
	getSmartSentences,
	type Reading,
	type CharInfo,
	type ExampleSentence
} from './dict/cedict';
import { frequencyBand, hskLevelLabel } from './dict/meta';
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

const host = base;

export interface Word {
	Simplified: string;
	Traditional: string;
	Pinyin: string;
	Zhuyin: string;
	Definitions: string;
	Syllable: string;
	SimpleMeaning: string;
	// Rich metadata from cedict.db (used by the UI; not part of the apkg fields)
	commonMeaning: string;
	pos: string[];
	dominantPos: string;
	classifiers: string[];
	level: string | null;
	rank: number | null;
	readings: Reading[];
	breakdown: CharInfo[];
}

// ---------------------------------------------------------------------------
// Initialization helpers (were inside the create.tsx useEffect)
// ---------------------------------------------------------------------------

export function loadDict() {
	return Promise.all([loadCedict(), loadHskMeanings()]);
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

export function decodeHtmlEntities(input: string): string {
	const htmlEntityRegex = /&#(\d+);|&([^;]+);/g;
	const entityMappings: Record<string, string> = {
		772: '̄',
		769: '́',
		780: '̌',
		768: '̀',
		nbsp: ' ',
		uuml: 'ü'
	};

	function replaceEntity(match: string, decimal: string, named: string) {
		if (decimal) {
			if (Object.prototype.hasOwnProperty.call(entityMappings, decimal)) {
				return entityMappings[decimal];
			} else {
				return match;
			}
		} else if (named) {
			if (Object.prototype.hasOwnProperty.call(entityMappings, named)) {
				return entityMappings[named];
			} else {
				return match;
			}
		}
		return match;
	}

	return input.replace(htmlEntityRegex, replaceEntity as any);
}

export async function fetchMeaningGoogleTranslate(word: string) {
	const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en-US&dt=t&q=${word.trim()}`;
	const response = await fetch(url);
	const data = await response.json();

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
	const definitions1 = [data[0][0][0]];

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
 * Index of a word's "most common" reading — the one whose definition text is
 * longest (ties resolve to the first). Used by the "show most common pinyin"
 * option to collapse a multi-reading character down to a single reading.
 */
export function commonReadingIndex(readings: Reading[]): number {
	if (!readings || readings.length <= 1) return 0;
	let best = 0;
	let bestLen = -1;
	readings.forEach((r, i) => {
		const len = (r.definition ?? '').trim().length;
		if (len > bestLen) {
			bestLen = len;
			best = i;
		}
	});
	return best;
}

/**
 * Effective Pinyin / Zhuyin / Definitions / Syllable strings for display. When
 * `commonOnly` is set and the word has multiple readings, only the most common
 * reading is used; otherwise the full joined strings carried on the Word.
 */
export function displayReadings(
	word: Word,
	commonOnly: boolean
): { Pinyin: string; Zhuyin: string; Definitions: string; Syllable: string } {
	if (!commonOnly || !word.readings || word.readings.length <= 1) {
		return {
			Pinyin: word.Pinyin,
			Zhuyin: word.Zhuyin,
			Definitions: word.Definitions,
			Syllable: word.Syllable
		};
	}
	const r = word.readings[commonReadingIndex(word.readings)];
	return {
		Pinyin: decodeHtmlEntities(r.pinyin),
		Zhuyin: decodeHtmlEntities(r.zhuyin),
		Definitions: r.definition,
		Syllable: r.syllable
	};
}

/**
 * Look up a single word and build its Word record from cedict.db. Words not in
 * the dictionary fall back to Google Translate. Dedup is the caller's job.
 */
export async function lookupWord(word: string): Promise<Word> {
	const entry = await cedictLookup(word);

	if (!entry) {
		// Fallback: word not in cedict.db
		const fetched = await fetchMeaningGoogleTranslate(word.trim());
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

export { wordsByLevel, getSmartSentences };
export type { ExampleSentence };

// ---------------------------------------------------------------------------
// Per-note field HTML (shared by the .apkg export and the exact-match preview)
// ---------------------------------------------------------------------------

/**
 * Build the HTML value of every display field for one word, exactly as the
 * exporter writes it into the note. Single source of truth so the preview can
 * substitute the same values into the real card template (no drift).
 */
export function buildNoteFields(
	word: Word,
	template: TemplateOpts,
	examples: ExampleSentence[]
): Record<string, string> {
	const Simplified = word.Simplified;
	const Traditional = word.Traditional;
	const Pinyin = word.Pinyin;
	const Zhuyin = word.Zhuyin;
	const Definitions = word.Definitions;
	// "Most common pinyin only" affects ONLY the standalone Pinyin/Zhuyin fields.
	const top = displayReadings(word, template.commonPinyinOnly);
	const exOpts = template.exampleOptions ?? DEFAULT_TEMPLATE.exampleOptions;

	const posChips = word.pos
		.map((c) => {
			const dom = c === word.dominantPos ? ' pos-dominant' : '';
			return `<span class="pos-chip${dom}">${posDisplay(c)}</span>`;
		})
		.join('');

	// Dedupe: blank the simple meaning when it matches the dictionary text.
	const norm = (s: string) => s.toLowerCase().replace(/[\s;,│/]+/g, ' ').trim();
	const dupSimple =
		norm(word.SimpleMeaning) === norm(Definitions) ||
		norm(word.SimpleMeaning) === norm(word.commonMeaning);
	const simpleMeaning = dupSimple ? '' : word.SimpleMeaning || '';

	// Definitions: one meaning-container per reading (always every reading).
	const pin = Pinyin.split(', ');
	const zhu = Zhuyin.split(', ');
	const def = Definitions.split(' │ ');
	const syllableSp = word.Syllable.split(', ');
	const definition: string[] = [];
	for (let i = 0; i < pin.length; i++) {
		const sp = (syllableSp[i] ?? '').split(' ');
		let simp = '';
		let trad = '';
		const simpSp = Simplified.split('');
		const tradSp = Traditional.split('');
		sp.forEach((k, j) => {
			simp += `<span class="char-tone${k[k.length - 1]}">${simpSp[j]}</span>`;
			trad += `<span class="char-tone${k[k.length - 1]}">${tradSp[j]}</span>`;
		});
		definition.push(`<div class="meaning-container">
    <div class="char">
        <span id="char-sim-id">${simp}</span>
        <span class="sep">〔</span>
        <span id="char-trad-id">${trad}</span>
        <span class="sep">〕</span>
    </div>
    <div class="pinyin">${pin[i]}</div>
    <div class="zhuyin">${zhu[i]}</div>
    <div class="meaning">${formatDefinition(def[i] ?? '')}</div>
</div>`);
	}

	// Breakdown: single-char words break down to themselves — leave blank.
	const bd = word.breakdown.length > 1 ? word.breakdown : [];
	const breakdownHtml = bd
		.map(
			(c) =>
				`<div class="bd-item"><span class="bd-char">${c.character}</span><span class="bd-py">${c.pinyin}</span><span class="bd-def">${c.definition}</span></div>`
		)
		.join('');

	const seen = new Set<string>();
	const radicalHtml = word.breakdown
		.filter((c) => c.radical && !seen.has(c.character) && seen.add(c.character))
		.map(
			(c) =>
				`<span class="radical-chip"><span class="radical-char">${c.character}</span><span class="radical-rad">${c.radical}</span></span>`
		)
		.join('');

	const examplesHtml = examples
		.map((s) => {
			const parts: string[] = [];
			if (exOpts.showTraditional)
				parts.push(`<div class="example-trad">${colorizeSentenceHanzi(s.traditional, s.pinyin)}</div>`);
			if (exOpts.showSimplified)
				parts.push(`<div class="example-sim">${colorizeSentenceHanzi(s.simplified, s.pinyin)}</div>`);
			if (exOpts.showPinyin)
				parts.push(`<div class="example-pinyin">${colorizePinyinString(s.pinyin)}</div>`);
			if (exOpts.showTranslation)
				parts.push(`<div class="example-translation">${s.translation}</div>`);
			return `<div class="example-item">${parts.join('')}</div>`;
		})
		.join('');

	return {
		Simplified,
		Traditional: `〔${Traditional}〕`,
		Pinyin: top.Pinyin,
		Zhuyin: top.Zhuyin,
		PartOfSpeech: posChips,
		SimpleMeaning: simpleMeaning,
		Definitions: definition.join('\n'),
		Breakdown: breakdownHtml,
		Radical: radicalHtml,
		HskLevel: hskLevelLabel(word.level) || '',
		Frequency: frequencyBand(word.rank) || '',
		Examples: examplesHtml,
		Audio: `[sound:cmn-${Simplified}.mp3]`
	};
}

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
	tabContent: TabContent;
	template: TemplateOpts;
	includeAudio: boolean;
	examples: ExampleSentence[];
}): string {
	const { side, tab, word, fields, tabContent, template, includeAudio, examples } = opts;
	const { tmpls, css } = buildNoteTemplates({ fields, tabContent, includeAudio, template });
	const idx = Object.keys(tabContent).indexOf(tab);
	const tmpl = tmpls[idx] ?? tmpls[0];
	if (!tmpl) return '';

	const fmap = buildNoteFields(word, template, examples);
	const front = fillTemplate(tmpl.qfmt, fmap);
	let body =
		side === 'front'
			? front
			: fillTemplate(tmpl.afmt, { ...fmap, FrontSide: front });

	// Point bundled `_media` (icons font, sidebar images) at the served static
	// files, and drop the offline loaders the preview doesn't need (persistence is
	// shimmed; the writer engine/stroke data + audio won't run in the iframe).
	const asset = `${base}/img/`;
	body = body
		.replace(/<script src="_anki-persistence\.js"><\/script>/g, '')
		.replace(/<script src="_hanzi-writer\.min\.js"><\/script>/g, '')
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
	let cutWords = cut(text, true);
	cutWords = filterChineseWords(cutWords);
	return [...new Set(cutWords)];
}

// ---------------------------------------------------------------------------
// Deck generation
// ---------------------------------------------------------------------------

async function buildHanziDataSubset(_words: Word[]): Promise<string> {
	const res = await fetch(`${host}/data/hanzi-writer-data.json`);
	return res.text();
}


export interface GenerateDeckOptions {
	words: Word[];
	deckName: string;
	includeAudio: boolean;
	fields: string[];
	tabContent: TabContent;
	hskWordsDict: Set<string>;
	db: any;
	template?: TemplateOpts;
	onProgress?: (value: number) => void;
	// Smart example-sentence fetcher (injectable for tests). Defaults to the
	// hsk_sentences.db lookup, loaded lazily only when the Examples field is used.
	getExamples?: (word: string) => Promise<ExampleSentence[]>;
}

export async function generateDeck(opts: GenerateDeckOptions): Promise<void> {
	const { words, deckName, includeAudio, fields, tabContent, hskWordsDict, db } = opts;
	const template = opts.template ?? DEFAULT_TEMPLATE;
	const onProgress = opts.onProgress ?? (() => {});

	onProgress(0);

	const { flds, req, tmpls, css: modelCss, usesWriter } = buildNoteTemplates({
		fields,
		tabContent,
		includeAudio,
		template
	});

	const m = new Model({
		name: includeAudio ? 'Basic - (Anki-xiehanzi)' : 'Basic - (Anki-xiehanzi) - No Audio',
		id: includeAudio ? '1969669503' : '1969669504',
		flds: flds,
		css: CONSTANTS.DECK_CSS + modelCss,
		req: req,
		tmpls: tmpls
	});

	const deckId = Math.floor(Math.random() * (1 << 30) + (1 << 30));
	const d = new Deck(deckId, deckName);

	// Smart example sentences are only fetched when the Examples field is used
	// (the sentences db is a separate ~5MB download), keyed by Simplified word.
	const exOpts = template.exampleOptions ?? DEFAULT_TEMPLATE.exampleOptions;
	const examplesMap = new Map<string, ExampleSentence[]>();
	if (fields.includes('Examples') && fieldUsedByAnyCard(tabContent, 'Examples')) {
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
		const note = flds.map((f) => fmap[f.name] ?? '');
		d.addNote(m.note(note));
	});

	const p = new Package();
	p.setSqlJs(db);
	p.addDeck(d);

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
	const dataFiles = ['_anki-persistence.js'];
	if (usesWriter) {
		dataFiles.push('_hanzi-writer.min.js');
		try {
			const dataJson = await buildHanziDataSubset(words);
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
		// Check if word exists in HSK dictionary first
		if (hskWordsDict.has(word)) {
			console.log(`Fetching audio for HSK word: ${word}`);
			const encodedWord = encodeURIComponent(word);
			const jsdelivrUrl = `https://cdn.jsdelivr.net/gh/krmanik/HSK-3.0/New%20HSK%20(2025)/Audio/cmn-${encodedWord}.mp3`;

			try {
				const response = await fetch(jsdelivrUrl);
				if (response.ok) {
					const blob = await response.blob();
					progress += 1;
					onProgress((progress / total) * 100);
					return blob;
				}
			} catch (error) {
				console.log(`Audio fetch failed for ${word} from jsdelivr:`, error);
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

	const batchSize = 4;
	const fetchBatch = async (batch: string[]) => {
		const blobs = await Promise.all(batch.map(fetchAudio));
		blobs.forEach((blob, index) => {
			if (blob) {
				p.addMedia(blob, `cmn-${batch[index]}.mp3`);
			}
		});
	};

	const processWordsSequentially = async (files: string[]) => {
		const totalBatches = Math.ceil(files.length / batchSize);
		for (let i = 0; i < totalBatches; i++) {
			const start = i * batchSize;
			const end = start + batchSize;
			const currentBatch = files.slice(start, end);
			await fetchBatch(currentBatch);
		}
	};

	// Only process audio if includeAudio is true
	if (includeAudio) {
		await processWordsSequentially(wordFiles);
	}

	// sidebar icons (/img) + scripts (/data)
	return Promise.all([
		...mediaFiles.map((f) => fetchFile(f).then((blob) => ({ blob, name: f }))),
		...dataFiles.map((f) => fetchDataFile(f).then((blob) => ({ blob, name: f })))
	])
		.then((items) => {
			items.forEach(({ blob, name }) => {
				if (blob) {
					p.addMedia(blob, name);
				}
			});
		})
		.catch((error) => {
			console.error('Error fetching or adding media:', error);
		})
		.finally(async () => {
			p.writeToFile(`${deckName}.apkg`);
			onProgress(100);
			setTimeout(() => onProgress(0), 2000);
		});
}
