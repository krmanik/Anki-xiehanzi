/**
 * Pure helpers for speaking a word out of the syllable sprite.
 *
 * The dictionary knows two spellings of pinyin — cedict's numbered form
 * ("cong2 ling2 kai1 shi3") and the tone-marked form the UI and the sentence
 * corpus print ("cóng líng kāi shǐ") — and the sprite is keyed by the numbered
 * one. Everything that turns the first into the second, or into a playback
 * plan, lives here so it can be tested without an AudioContext.
 */

/** How long a syllable's clip runs, in seconds. */
export type ClipLength = number;

export interface SyllableIndex {
	/** What synthesized the clips, e.g. "qwen3-tts". */
	engine: string;
	rate: number;
	/** Syllables whose recorded tone the contour check could not confirm. */
	unverified: string[];
	/** syllable -> the character it was spoken through. */
	spokenThrough: Record<string, string>;
	/** syllable -> clip length in seconds. */
	syllables: Record<string, ClipLength>;
}

const TONE_MARKS: Record<string, string> = {
	'\u0304': '1', // macron
	'\u0301': '2', // acute
	'\u030c': '3', // caron
	'\u0300': '4' // grave
};

/**
 * One tone-marked syllable to the numbered form the sprite is keyed by:
 * "cóng" → "cong2", "nǚ" → "nv3", "ma" → "ma5".
 *
 * ü is folded to `v` *before* the combining marks are dropped — NFD spells ǚ as
 * u + diaeresis + caron, so stripping first turns 女 nǚ into "nu3", which is a
 * different syllable and not in the sprite.
 */
export function toNumberedSyllable(toneMarked: string): string {
	let tone = '';
	let letters = '';
	const decomposed = (toneMarked ?? '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/u\u0308/g, 'v');
	for (const ch of decomposed) {
		if (TONE_MARKS[ch]) tone = TONE_MARKS[ch];
		else if (ch >= '\u0300' && ch <= '\u036f') continue;
		else if (ch >= '0' && ch <= '5') tone = ch === '0' ? '5' : ch;
		else letters += ch;
	}
	letters = letters.replace(/u:/g, 'v').replace(/ü/g, 'v');
	if (!/^[a-z]+$/.test(letters)) return '';
	return `${letters}${tone || '5'}`;
}

/** How each digit is read on its own. */
const DIGITS = ['ling2', 'yi1', 'er4', 'san1', 'si4', 'wu3', 'liu4', 'qi1', 'ba1', 'jiu3'];

/**
 * The syllables of a written number, for the sentence corpus — its pinyin keeps
 * arabic digits ("xiàn zài 7 diǎn 30 fēn"), and a sentence that cannot say
 * "7" is a sentence that falls back to TTS for the sake of one syllable.
 *
 * One and two digits only: 10 is shí, 15 shí wǔ, 30 sān shí, 42 sì shí èr. From
 * three digits up the readings need 零 in the right places and a decision about
 * 一百 vs 百, so those stay unknown and the caller falls back.
 */
export function numberSyllables(digits: string): string[] | null {
	if (!/^\d{1,2}$/.test(digits)) return null;
	const n = Number(digits);
	if (n < 10) return [DIGITS[n]];
	const tens = Math.floor(n / 10);
	const ones = n % 10;
	return [
		...(tens > 1 ? [DIGITS[tens]] : []),
		'shi2',
		...(ones ? [DIGITS[ones]] : [])
	];
}

/** A punctuation mark worth a pause rather than a syllable. */
const PAUSE = /[,，、;；:：.。!！?？…]/;

export interface SpeechToken {
	/** sprite key; '' unless kind is 'syllable' */
	syllable: string;
	/**
	 * `pause` is punctuation, `unknown` is a token that is not pinyin at all.
	 * They are not the same thing: a pause is silence to honour, an unknown
	 * token means this reading cannot be spoken from the sprite and the caller
	 * must fall back — dropping it would speak the word with a hole in it.
	 */
	kind: 'syllable' | 'pause' | 'unknown';
}

/**
 * Split a pinyin string — numbered or tone-marked — into sprite keys, keeping
 * sentence punctuation as pauses. Erhua (`r5`, the standalone "r") carries no
 * syllable of its own and is dropped rather than looked up and missed.
 */
export function speechTokens(pinyin: string): SpeechToken[] {
	const out: SpeechToken[] = [];
	for (const raw of (pinyin ?? '').split(/\s+/)) {
		if (!raw) continue;
		const letters = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
		const bare = raw.replace(new RegExp(PAUSE, 'g'), '');
		const digits = numberSyllables(bare);
		if (digits) {
			for (const syllable of digits) out.push({ syllable, kind: 'syllable' });
			if (PAUSE.test(raw.slice(-1))) out.push({ syllable: '', kind: 'pause' });
			continue;
		}
		if (!/[a-zü]/i.test(letters)) {
			// Punctuation on its own is a pause; anything else with no letters in it
			// (a digit in a sentence, a stray symbol) is not something to say.
			out.push({ syllable: '', kind: PAUSE.test(raw) ? 'pause' : 'unknown' });
			continue;
		}
		const trailingPause = PAUSE.test(raw.slice(-1));
		const key = toNumberedSyllable(raw.replace(new RegExp(PAUSE, 'g'), ''));
		// Erhua carries no syllable of its own — it colours the one before it.
		if (key !== 'r5') out.push({ syllable: key, kind: key ? 'syllable' : 'unknown' });
		if (trailingPause) out.push({ syllable: '', kind: 'pause' });
	}
	return out;
}

/** Is every syllable of this reading available as a clip? */
export function canSpeak(pinyin: string, index: Record<string, ClipLength>): boolean {
	return planSpeech(pinyin, index) !== null;
}

/** One scheduled clip: which syllable to play, and when. */
export interface Segment {
	/** seconds from the start of playback */
	at: number;
	duration: number;
	syllable: string;
}

export interface SpeechPlan {
	segments: Segment[];
	/** total length, seconds */
	duration: number;
}

export interface PlanOptions {
	/** silence between syllables of a word, seconds */
	spacing?: number;
	/** silence at a comma or full stop, seconds */
	pause?: number;
	/** playback rate multiplier (1 = as recorded) */
	rate?: number;
}

/**
 * Lay the syllables out end to end.
 *
 * Each clip is trimmed to its own speech, so a small, even spacing is what
 * makes four separate recordings read as one word rather than four words; the
 * pause at punctuation is what keeps a sentence from running together.
 * Returns null when any syllable is missing — the caller then falls back to a
 * real recording or to TTS rather than speaking a word with a hole in it.
 */
export function planSpeech(
	pinyin: string,
	index: Record<string, ClipLength>,
	opts: PlanOptions = {}
): SpeechPlan | null {
	const spacing = opts.spacing ?? 0.045;
	const pause = opts.pause ?? 0.19;
	const rate = opts.rate ?? 1;
	const tokens = speechTokens(pinyin);
	if (!tokens.some((t) => t.kind === 'syllable')) return null;

	const segments: Segment[] = [];
	let at = 0;
	let spoken = 0;
	for (const token of tokens) {
		if (token.kind === 'pause') {
			if (spoken) at += pause;
			continue;
		}
		if (token.kind === 'unknown') return null;
		const length = index[token.syllable];
		if (length === undefined) return null;
		const duration = length / rate;
		segments.push({ at, duration: length, syllable: token.syllable });
		at += duration + spacing;
		spoken += 1;
	}
	return { segments, duration: Math.max(at - spacing, 0) };
}

/** The clips a plan needs, each once — what the player has to fetch. */
export function clipsFor(plan: SpeechPlan): string[] {
	return [...new Set(plan.segments.map((s) => s.syllable))];
}
