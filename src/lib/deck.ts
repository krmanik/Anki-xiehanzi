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
	type Reading
} from './dict/cedict';

const host = base;
const FIELDS = CONSTANTS.FIELDS;

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
	classifiers: string[];
	level: string | null;
	rank: number | null;
	readings: Reading[];
}

export interface TabContent {
	[card: string]: { front: string[]; back: string[]; additional: string[] };
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
 * Look up a single word and build its Word record from cedict.db. Words not in
 * the dictionary fall back to Google Translate. Dedup is the caller's job.
 */
export async function lookupWord(word: string): Promise<Word> {
	const entry = await cedictLookup(word);

	if (!entry) {
		// Fallback: word not in cedict.db
		const fetched = await fetchMeaningGoogleTranslate(word.trim());
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
			classifiers: [],
			level: null,
			rank: null,
			readings
		};
	}

	const readings = entry.readings;
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
		classifiers: entry.classifiers,
		level: entry.level,
		rank: entry.rank,
		readings
	};
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

export interface TemplateOpts {
	mono: boolean;
	colorHanzi: boolean;
	colorPinyin: boolean;
	font: string; // 'default' | 'kaiti' | 'songti'
	collapseDict: boolean; // show dictionary definitions inside a collapsed <details>
}

export const DEFAULT_TEMPLATE: TemplateOpts = {
	mono: false,
	colorHanzi: true,
	colorPinyin: true,
	font: 'default',
	collapseDict: false
};

const FONT_STACKS: Record<string, string> = {
	default: '',
	kaiti: '"Kaiti SC", "STKaiti", "KaiTi", "楷体", serif',
	songti: '"Songti SC", "STSong", "SimSun", "宋体", serif'
};

/** Build CSS appended to DECK_CSS. */
function buildCssOverride(t: TemplateOpts): string {
	// Base styles for the simple-meaning card and collapsible dictionary.
	let css =
		'\n/* template customization */\n' +
		'.simple-card{font-weight:600;padding:10px;}\n' +
		'.simple-card:empty{display:none;}\n' +
		'.dict-details{text-align:left;margin:6px auto;max-width:90%;}\n' +
		'.dict-details>summary{cursor:pointer;color:#888;font-size:0.85em;list-style:none;}\n';
	if (t.mono || !t.colorHanzi) {
		css += '.char-tone1,.char-tone2,.char-tone3,.char-tone4,.char-tone5{color:inherit !important;}\n';
	}
	if (t.mono || !t.colorPinyin) {
		css += '.tone1,.tone2,.tone3,.tone4,.tone5{color:inherit !important;}\n';
	}
	const stack = FONT_STACKS[t.font];
	if (stack) {
		css += `.char-card,.char,#char-sim-id,#char-trad-id{font-family:${stack} !important;}\n`;
	}
	return css;
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
}

export async function generateDeck(opts: GenerateDeckOptions): Promise<void> {
	const { words, deckName, includeAudio, fields, tabContent, hskWordsDict, db } = opts;
	const template = opts.template ?? DEFAULT_TEMPLATE;
	const onProgress = opts.onProgress ?? (() => {});

	onProgress(0);

	const flds: { name: string }[] = [];
	const req: any[] = [];
	const tmpls: { name: string; qfmt: string; afmt: string }[] = [];

	// Filter out Audio field if includeAudio is false
	const filteredFields = includeAudio ? fields : fields.filter((f) => f !== FIELDS.AUDIO);

	filteredFields.forEach((f) => {
		flds.push({ name: f });
	});

	let ri = 0;
	for (const card in tabContent) {
		req.push([ri, 'any', [ri]]);
		ri++;

		let hideSimp = true;
		let hideTrad = true;
		let hidePin = true;
		let hideZhu = true;
		let hideDef = true;
		let hideSimpleMeaning = true;

		const addToFront: string[] = [];

		for (const front of tabContent[card]['front']) {
			if (front.includes('Simplified')) hideSimp = false;
			if (front.includes('Traditional')) hideTrad = false;
			if (front.includes('Pinyin')) hidePin = false;
			if (front.includes('Zhuyin')) hideZhu = false;
			if (front.includes('SimpleMeaning')) hideSimpleMeaning = false;
			else if (front.includes('Definitions')) hideDef = false;
		}

		// TODO-remove redundant code, used for creating in order
		if (!hideSimp) {
			addToFront.push(`<div id="char_sim" class="char-card">{{Simplified}}</div>`);
		}
		if (!hideTrad) {
			addToFront.push(`<div id="char_trad" class="char-card">{{Traditional}}</div>`);
		}
		if (!hidePin) {
			addToFront.push(`<div id="char_pinyin">{{Pinyin}}</div>`);
		}
		if (!hideZhu) {
			addToFront.push(`<div id="char_zhuyin">{{Zhuyin}}</div>`);
		}
		// Simple meaning sits above the dictionary definitions.
		if (!hideSimpleMeaning) {
			addToFront.push(`<div id="char_simple" class="simple-card">{{SimpleMeaning}}</div>`);
		}

		const hides: string[] = [];
		if (!hideDef) {
			if (hideSimp) hides.push('char_sim');
			if (hideTrad) hides.push('char_trad');
			if (hidePin) hides.push('char_pinyin');
			if (hideZhu) hides.push('char_zhuyin');

			addToFront.push(`<div id="char_meaning" class="meaning-card">{{Definitions}}</div>`);
		}

		let hideScript = `
<script>
var hideList = ['${hides.join("', '")}'];

function showHide(type, isShow, style = "inline") {
    if (isShow) {
        document.querySelectorAll(type).forEach(function (val) {
            val.style.display = style;
        });
    } else {
        document.querySelectorAll(type).forEach(function (val) {
            val.style.display = 'none';
        });
    }
}

for (var _hide of hideList) {
    var el = document.getElementById(_hide);
    if (el) {
        el.style.display = "none";
    }

    if (_hide == "char_pinyin") {
        showHide(".pinyin", false);
    }
    if (_hide == "char_zhuyin") {
        showHide(".zhuyin", false);
    }
    if (_hide == "char_sim") {
        showHide("#char-sim-id", false);
    }
    if (_hide == "char_trad") {
        showHide("#char-trad-id", false);
        showHide(".sep", false);
    }
}
</script>`;

		hideScript = hideDef ? '' : hideScript;

		let QFMT = addToFront.join('\n') + hideScript + CONSTANTS.DECK_HTML_FRONT;

		// Create dynamic back template based on includeAudio setting
		let AFMT = CONSTANTS.DECK_HTML_BACK;
		if (!includeAudio) {
			// Remove audio div and play button if audio is not included
			AFMT = AFMT.replace(`<div id='audio' style='display:none'>{{Audio}}</div>`, '');
			AFMT = AFMT.replace(
				`    <a class="btn" id='btnPlayAudio'>
        <div class="icon">
            <i class="material-icons">play_arrow</i>
        </div>
    </a>`,
				''
			);
		}

		const backSel = tabContent[card]['back'];

		// Inject the simple-meaning div (above the dictionary block) when selected.
		const dictDiv = `<div id="char_meaning" class="meaning-card">{{Definitions}}</div>`;
		if (backSel.includes('backSimpleMeaning')) {
			AFMT = AFMT.replace(
				dictDiv,
				`<div id="char_simple" class="simple-card">{{SimpleMeaning}}</div>\n${dictDiv}`
			);
		}

		// Collapse the dictionary definitions inside a <details> when requested.
		if (template.collapseDict) {
			AFMT = AFMT.replace(
				dictDiv,
				`<details class="dict-details"><summary>Dictionary</summary>${dictDiv}</details>`
			);
		}

		// Back-side show/hide: drop the div for any display field deselected for the
		// back. Default keeps every field, so the output is unchanged unless edited.
		const backFieldDivs: Record<string, string> = {
			Simplified: `<div id="char_sim" class="char-card">{{Simplified}}</div>`,
			Traditional: `<div id="char_trad" class="char-card">{{Traditional}}</div>`,
			Pinyin: `<div id="char_pinyin">{{Pinyin}}</div>`,
			Zhuyin: `<div id="char_zhuyin">{{Zhuyin}}</div>`,
			Definitions: dictDiv
		};
		for (const [f, div] of Object.entries(backFieldDivs)) {
			if (!backSel.includes(`back${f}`)) AFMT = AFMT.replace(div, '');
		}

		// Writing component: independent front and back placement.
		const writingFront = tabContent[card]['front'].includes('frontwritingComponent');
		const writingBack = tabContent[card]['back'].includes('backwritingComponent');
		if (writingFront || writingBack) {
			let writerTpl = CONSTANTS.DECK_HTML_WITH_HANZI_WRITER;
			if (!includeAudio) {
				writerTpl = writerTpl.replace(`<div id='audio' style='display:none'>{{Audio}}</div>`, '');
				writerTpl = writerTpl.replace(
					`    <a class="btn" id='btnPlayAudio'>
        <div class="icon"><i class="material-icons">play_arrow</i></div>
    </a>`,
					''
				);
			}
			if (writingFront) QFMT = writerTpl;
			if (writingBack) AFMT = writingFront ? `<div id="back">{{FrontSide}}</div>` : writerTpl;
		}

		tmpls.push({
			name: card,
			qfmt: QFMT,
			afmt: AFMT
		});
	}

	const m = new Model({
		name: includeAudio ? 'Basic - (Anki-xiehanzi)' : 'Basic - (Anki-xiehanzi) - No Audio',
		id: includeAudio ? '1969669503' : '1969669504',
		flds: flds,
		css: CONSTANTS.DECK_CSS + buildCssOverride(template),
		req: req,
		tmpls: tmpls
	});

	const deckId = Math.floor(Math.random() * (1 << 30) + (1 << 30));
	const d = new Deck(deckId, deckName);

	words.forEach((word) => {
		const Simplified = word.Simplified;
		const Traditional = word.Traditional;
		const Pinyin = word.Pinyin;
		const Zhuyin = word.Zhuyin;
		const Definitions = word.Definitions;

		const note: string[] = [];

		flds.some(function (obj) {
			if (JSON.stringify(obj) === JSON.stringify({ name: 'Simplified' })) {
				note.push(Simplified);
			}
			if (JSON.stringify(obj) === JSON.stringify({ name: 'Traditional' })) {
				note.push(`〔${Traditional}〕`);
			}
			if (JSON.stringify(obj) === JSON.stringify({ name: 'Pinyin' })) {
				note.push(Pinyin);
			}
			if (JSON.stringify(obj) === JSON.stringify({ name: 'Zhuyin' })) {
				note.push(Zhuyin);
			}
			if (JSON.stringify(obj) === JSON.stringify({ name: 'SimpleMeaning' })) {
				// Dedupe: if the simple meaning matches the dictionary text, leave it
				// blank (the .simple-card:empty rule hides it) so only one is shown.
				const norm = (s: string) => s.toLowerCase().replace(/[\s;,│/]+/g, ' ').trim();
				const dup = norm(word.SimpleMeaning) === norm(Definitions) || norm(word.SimpleMeaning) === norm(word.commonMeaning);
				note.push(dup ? '' : word.SimpleMeaning || '');
			}
			if (JSON.stringify(obj) === JSON.stringify({ name: 'Definitions' })) {
				const pin = Pinyin.split(', ');
				const zhu = Zhuyin.split(', ');
				const def = Definitions.split(' │ ');
				const definition: string[] = [];

				const syllable = word.Syllable;
				const syllableSp = syllable.split(', ');

				for (let i = 0; i < pin.length; i++) {
					const sp = syllableSp[i].split(' ');
					let simp = '';
					let trad = '';
					const simpSp = Simplified.split('');
					const tradSp = Traditional.split('');

					sp.forEach((k, j) => {
						simp += `<span class="char-tone${k[k.length - 1]}">${simpSp[j]}</span>`;
						trad += `<span class="char-tone${k[k.length - 1]}">${tradSp[j]}</span>`;
					});

					const html = `<div class="meaning-container">
    <div class="char">
        <span id="char-sim-id">${simp}</span>
        <span class="sep">〔</span>
            <span id="char-trad-id">${trad}</span>
        <span class="sep">〕</span>
        </span>
    </div>
    <div class="pinyin">${pin[i]}</div>
    <div class="zhuyin">${zhu[i]}</div>
    <div class="meaning">${def[i]}</div>
</div>`;
					definition.push(html);
				}

				note.push(definition.join('\n'));
			}
			if (JSON.stringify(obj) === JSON.stringify({ name: 'Audio' })) {
				note.push(`[sound:cmn-${Simplified}.mp3]`);
			}
			return false;
		});

		d.addNote(m.note(note));
	});

	const p = new Package();
	p.setSqlJs(db);
	p.addDeck(d);

	const mediaFiles = [
		'_MaterialIcons-Regular.woff2',
		'_characterpop.svg',
		'_hanzicraft.png',
		'_pleco.png',
		'_rtega.png',
		'_youdao.png',
		'_tatoeba.png'
	];

	let progress = 0;
	const wordFiles = words.map((word) => word.Simplified);
	const total = mediaFiles.length + (includeAudio ? wordFiles.length : 0);

	const fetchFile = async (file: string) => {
		const response = await fetch(`${host}/img/${file}`);
		if (!response.ok) {
			return null;
		}
		progress += 1;
		onProgress((progress / total) * 100);
		return response.blob();
	};

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

	// sidebar icons
	return Promise.all(mediaFiles.map(fetchFile))
		.then((blobs) => {
			blobs.forEach((blob, index) => {
				if (blob) {
					p.addMedia(blob, mediaFiles[index]);
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
