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
import { speechTokens, type ClipLength } from './syllables';

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
	/**
	 * The reading the source word list gives this word, as numbered pinyin
	 * ("he2"). CEDICT's `pinyin` array is not ordered by commonness — 和 lists
	 * he4 first, 为 lists wei4 — and the recording says the reading the list
	 * names, so this is what settles which reading the card leads with. Optional:
	 * a word typed into /create has no list behind it and falls back to the
	 * longest-definition heuristic in `commonReadingIndex`.
	 */
	listSyllable?: string;
}

/**
 * Per-sentence TTS button, shared verbatim with premium/template/examples.ts
 * (its "Load more" pagination renders sentences the note itself did not bake
 * in, and must match this exactly or a page loaded live would read differently
 * from the sentences already on the card).
 */
export const EXAMPLE_TTS_BUTTON =
	`<button type="button" class="example-tts-btn tappable" aria-label="Play sentence audio" ` +
	`onclick="window.ttsPlay&&window.ttsPlay(this.parentElement.querySelector('.example-sim,.example-trad').textContent)">` +
	`<i class="material-icons">volume_up</i></button>`;

/**
 * The media name a syllable clip ships under ("hai2" → `_xhz-syl-hai2.mp3`).
 * Underscored because only a button's script names it — Check Media would
 * otherwise call it unused — and `_xhz-` because every deck of this project
 * that ships one ships the same bytes (static/data/audio/syllables/), so one
 * name in a collection is one clip, whichever deck brought it.
 */
export function syllableMediaName(key: string): string {
	return `_xhz-syl-${key}.mp3`;
}

/**
 * The syllable clips that say one reading ("huan2" → [`_xhz-syl-huan2.mp3`]),
 * or null when any syllable of it has no clip — a reading spoken with a hole in
 * it is worse than a reading with no button. `index` is syllables.json's
 * syllable → length map; without one every well-formed syllable counts.
 */
export function readingClips(syllable: string, index?: Record<string, ClipLength>): string[] | null {
	const tokens = speechTokens(syllable);
	if (!tokens.length || tokens.some((t) => t.kind !== 'syllable')) return null;
	if (index && tokens.some((t) => index[t.syllable] === undefined)) return null;
	return tokens.map((t) => syllableMediaName(t.syllable));
}

/**
 * Speaker after a reading's pinyin in the definitions box, so a word with two
 * or three readings can be heard in each (还 hái / huán). The reading the card
 * leads with plays the note's own recording — it clicks the replay button Anki
 * renders into `#audio`, the same one the hero's speaker uses — and falls back
 * to its syllable clips when the note has none; every other reading is said
 * from its syllable clips, back to back.
 *
 * The onclick carries its own code and calls nothing a card script defines, so
 * it works on a card whose scripts never ran (see the radical deck's rules).
 *
 * It sits *beside* `.pinyin` (in a `.reading-line`), never inside it: the card
 * script tone-colours a `.pinyin` by rebuilding it from its text, which turned
 * the icon into the word "volume_up" — and a collection that kept an older
 * template would go on doing that whatever this deck's own script says.
 */
export function readingAudioButton(clips: string[] | null, recording: boolean): string {
	if (!clips && !recording) return '';
	const play =
		`event.stopPropagation();` +
		`var w=this.hasAttribute('data-word')&&document.querySelector('#audio a,#audio audio');` +
		`if(w){w.tagName=='AUDIO'?w.play():w.click();return}` +
		`var f=(this.getAttribute('data-clips')||'').split(' '),i=0;` +
		`(function n(){var s=f[i++];if(!s)return;var a=new Audio(s);a.onended=n;var p=a.play();if(p&&p.catch)p.catch(function(){})})()`;
	return (
		`<button type="button" class="reading-say tappable" aria-label="Play this reading"` +
		(recording ? ' data-word="1"' : '') +
		(clips ? ` data-clips="${clips.join(' ')}"` : '') +
		` onclick="${play}"><i class="material-icons">volume_up</i></button>`
	);
}

/** Options for `buildNoteFields` that depend on what the deck ships. */
export interface NoteFieldOptions {
	/**
	 * Put a speaker after each reading's pinyin (words with more than one
	 * reading only). Needs the syllable clips in the package — the builder adds
	 * every name `readingClipMedia` returns.
	 */
	readingAudio?: boolean;
	/** syllables.json's index, to leave out readings no clip can say. */
	syllables?: Record<string, ClipLength>;
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
export function commonReadingIndex(readings: Reading[], listSyllable?: string): number {
	if (!readings || readings.length <= 1) return 0;
	// The word list's own reading wins whenever it names one of these readings.
	// The lists carry it either numbered ("he2", HSK 2012) or tone-marked ("hé",
	// HSK 2025), so both spellings are compared. CEDICT capitalises proper-noun
	// readings ("He2" for 和 as a surname), so a reading that matches in both
	// cases resolves to the lowercase, general one.
	const want = (listSyllable ?? '').trim();
	if (want) {
		const numWant = numberedKey(want);
		const markWant = markedKey(want);
		const hits = readings
			.map((r, i) => ({ r, i }))
			.filter(
				({ r }) =>
					numberedKey(r.syllable) === numWant ||
					markedKey(decodeHtmlEntities(r.pinyin ?? '')) === markWant
			);
		const hit = hits.find(({ r }) => r.syllable === r.syllable.toLowerCase()) ?? hits[0];
		if (hit) return hit.i;
	}
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

/** Comparable form of a numbered reading ("Zhong1 guo2"): no case/space, u:→v. */
function numberedKey(syllable: string): string {
	return syllable.trim().toLowerCase().replace(/u:/g, 'v').replace(/0/g, '5').replace(/\s+/g, '');
}

/**
 * Comparable form of a tone-marked reading ("hé"): no case, no spaces, accents
 * composed. The word lists ship precomposed (NFC) while pinyinzhuyin builds its
 * output by combining, so "hé" and "he\u0301" have to normalize to one string.
 */
function markedKey(pinyin: string): string {
	return pinyin.trim().toLowerCase().replace(/\s+/g, '').normalize('NFC');
}

/**
 * The parallel per-reading arrays with the common reading moved to the front.
 *
 * Every one of the four note strings is a join over `word.readings` in CEDICT's
 * order, and the card leans on index 0 twice over: the hero's hanzi is coloured
 * by copying the tone spans out of the FIRST `.meaning-container`, while the
 * hero's pinyin comes from `commonReadingIndex`. When those disagree — 和 lists
 * he4 first but is spoken hé — the word came up blue for the fourth tone above a
 * hé the recording says in the second. Ordering the arrays once puts the same
 * reading at index 0 everywhere: hanzi colour, pinyin, zhuyin and audio agree.
 */
function commonFirst<T>(items: T[], idx: number): T[] {
	if (idx <= 0 || idx >= items.length) return items;
	return [items[idx], ...items.slice(0, idx), ...items.slice(idx + 1)];
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
	const r = word.readings[commonReadingIndex(word.readings, word.listSyllable)];
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
	examples: ExampleSentence[],
	opts: NoteFieldOptions = {}
): Record<string, string> {
	const Simplified = word.Simplified;
	const Traditional = word.Traditional;
	const Pinyin = word.Pinyin;
	const Zhuyin = word.Zhuyin;
	const Definitions = word.Definitions;
	const common = commonReadingIndex(word.readings ?? [], word.listSyllable);
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

	// Definitions: one meaning-container per reading (always every reading), the
	// common one first — see commonFirst().
	const pin = commonFirst(Pinyin.split(', '), common);
	const zhu = commonFirst(Zhuyin.split(', '), common);
	const def = commonFirst(Definitions.split(' │ '), common);
	const syllableSp = commonFirst(word.Syllable.split(', '), common);
	// "Most common pinyin only" affects ONLY the standalone Pinyin/Zhuyin fields;
	// with it off they list every reading, still common-first so the hero's first
	// syllable is the one the hanzi is coloured by.
	const top = template.commonPinyinOnly
		? displayReadings(word, true)
		: { Pinyin: pin.join(', '), Zhuyin: zhu.join(', ') };
	const definition: string[] = [];
	const sayReadings = !!opts.readingAudio && pin.length > 1;
	for (let i = 0; i < pin.length; i++) {
		const say = sayReadings
			? readingAudioButton(readingClips(syllableSp[i] ?? '', opts.syllables), i === 0)
			: '';
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
    ${say ? `<div class="reading-line"><div class="pinyin">${pin[i]}</div>${say}</div>` : `<div class="pinyin">${pin[i]}</div>`}
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
		.map((c) => {
			// The radical's reading and meaning ride beside the glyph: a bare 辶 tells
			// a learner nothing they can say or remember.
			const name =
				c.radicalPinyin || c.radicalMeaning
					? `<span class="radical-name"><span class="radical-py">${c.radicalPinyin ?? ''}</span><span class="radical-mean">${c.radicalMeaning ?? ''}</span></span>`
					: '';
			return `<span class="radical-chip"><span class="radical-char">${c.character}</span><span class="radical-rad">${c.radical}</span>${name}</span>`;
		})
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
			// Sentence audio via anki-tts (window.ttsPlay, gated in deckTemplate.ts on
			// the Examples field being shown). Reads the sentence back off the DOM
			// instead of carrying its own copy of the text, so it always speaks
			// whichever script (simplified/traditional) the reader has on.
			const speak = exOpts.showSimplified || exOpts.showTraditional ? EXAMPLE_TTS_BUTTON : '';
			return `<div class="example-item">${speak}${parts.join('')}</div>`;
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

/**
 * Every syllable clip a word's reading buttons name — what a builder has to
 * pack for `readingAudio`. Mirrors the loop in `buildNoteFields`: words with a
 * single reading get no buttons and need nothing.
 */
export function readingClipMedia(word: Word, syllables?: Record<string, ClipLength>): string[] {
	const keys = (word.Syllable ?? '').split(', ');
	if (keys.length <= 1) return [];
	return [...new Set(keys.flatMap((k) => readingClips(k, syllables) ?? []))];
}
