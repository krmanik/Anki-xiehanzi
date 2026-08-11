/**
 * Anki-xiehanzi — the `Word` record and the per-note field HTML built from it.
 *
 * Split out of deck.ts so the note values can be produced without pulling in
 * genanki-js, jieba-wasm or edge-tts: deck.ts owns packaging and the browser
 * pipeline, this module owns "one word → the HTML that goes in each field".
 * deck.ts re-exports everything here, so existing `$lib/deck` imports still work.
 */

import { posDisplay, type Reading, type CharInfo, type ExampleSentence } from './dict/cedict';
import { frequencyBand, hskLevelLabel } from './dict/meta';
import { colorizeSentenceHanzi, colorizePinyinString } from './tone';
import { formatDefinition, DEFAULT_TEMPLATE, type TemplateOpts } from './deckTemplate';

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
	const simpleText = dupSimple ? '' : word.SimpleMeaning || '';
	const simpleMeaning = simpleText
		? `<div class="info-card-title">Common Meaning</div><div class="simple-content">${simpleText}</div>`
		: '';

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

	// Breakdown: single-char words break down to themselves — leave blank. The
	// titled card chrome lives in the value so the wrapper self-hides when empty.
	const bd = word.breakdown.length > 1 ? word.breakdown : [];
	const breakdownTiles = bd
		.map(
			(c) =>
				`<div class="bd-item"><span class="bd-char">${c.character}</span><span class="bd-py">${c.pinyin}</span><span class="bd-def">${c.definition}</span></div>`
		)
		.join('');
	const breakdownHtml = breakdownTiles
		? `<div class="info-card-title">Character Breakdown</div><div class="breakdown-row">${breakdownTiles}</div>`
		: '';

	const seen = new Set<string>();
	const radicalChips = word.breakdown
		.filter((c) => c.radical && !seen.has(c.character) && seen.add(c.character))
		.map(
			(c) =>
				`<span class="radical-chip"><span class="radical-char">${c.character}</span><span class="radical-rad">${c.radical}</span></span>`
		)
		.join('');
	const radicalHtml = radicalChips
		? `<div class="info-card-title">Radical</div><div class="radical-row">${radicalChips}</div>`
		: '';

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
