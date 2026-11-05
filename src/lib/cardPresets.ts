/**
 * One-click card-type presets. Most users don't know which fields they need —
 * a preset drops in a ready-made front/back so they can skip manual setup.
 *
 * Pure data + a tiny builder, so it unit-tests in the fast `node` project and is
 * shared by the create page.
 */

import CONSTANTS from './dict/contants';
import { CONTROL_BUTTONS_TOKEN, SEPARATOR_TOKEN, type CardElementStyles } from './deckTemplate';

const F = CONSTANTS.FIELDS;
const WRITING = 'writingComponent';
// Chrome tokens (control bar + separator line) default to the back/answer side
// of every preset, per Anki convention.
const CHROME = [CONTROL_BUTTONS_TOKEN, SEPARATOR_TOKEN];

export interface CardPreset {
	id: string;
	name: string;
	description: string;
	/** Field ids (un-prefixed) shown on the front. */
	front: string[];
	/** Field ids (un-prefixed) shown on the back. */
	back: string[];
}

export interface PresetCard {
	front: string[];
	back: string[];
	additional: string[];
	elementStyles: CardElementStyles;
}

export const CARD_PRESETS: CardPreset[] = [
	{
		id: 'beginner',
		name: 'Beginner',
		description: 'Recognise the character → pinyin, meaning, audio',
		front: [F.SIMPLIFIED],
		back: [F.SIMPLIFIED, F.PINYIN, F.SIMPLE_MEANING, F.AUDIO, ...CHROME]
	},
	{
		id: 'intermediate',
		name: 'Intermediate',
		description: 'Adds traditional + full dictionary definitions',
		front: [F.SIMPLIFIED],
		back: [F.TRADITIONAL, F.PINYIN, F.SIMPLE_MEANING, F.DEFINITIONS, ...CHROME]
	},
	{
		id: 'reading',
		name: 'Reading',
		description: 'Hanzi + pinyin on the front, meaning on the back',
		front: [F.SIMPLIFIED, F.PINYIN],
		back: [F.SIMPLE_MEANING, ...CHROME]
	},
	{
		id: 'writing',
		name: 'Writing',
		description: 'Meaning prompt → write the character (stroke order)',
		front: [F.SIMPLE_MEANING],
		back: [F.SIMPLIFIED, WRITING, ...CHROME]
	},
	{
		id: 'examples',
		name: 'Example Sentences',
		description: 'Hanzi on the front, meaning + example sentences on the back',
		front: [F.SIMPLIFIED],
		back: [F.SIMPLIFIED, F.PINYIN, F.SIMPLE_MEANING, F.EXAMPLES, F.AUDIO, ...CHROME]
	},
	{
		id: 'hsk',
		name: 'HSK Exam',
		description: 'Everything: hanzi, readings, breakdown, level, frequency',
		front: [F.SIMPLIFIED],
		back: [
			F.SIMPLIFIED,
			F.TRADITIONAL,
			F.PINYIN,
			F.ZHUYIN,
			F.PART_OF_SPEECH,
			F.SIMPLE_MEANING,
			F.DEFINITIONS,
			F.BREAKDOWN,
			F.RADICAL,
			F.HSK_LEVEL,
			F.FREQUENCY,
			F.AUDIO,
			...CHROME
		]
	}
];

/** Build a card-type content object (front/back ids) from a preset. */
export function presetToCard(preset: CardPreset): PresetCard {
	return {
		front: preset.front.map((f) => `front${f}`),
		back: preset.back.map((f) => `back${f}`),
		additional: [],
		elementStyles: {}
	};
}

/** Whether the preset puts the Audio field on either side (so audio is needed). */
export function presetNeedsAudio(preset: CardPreset): boolean {
	return preset.front.includes(F.AUDIO) || preset.back.includes(F.AUDIO);
}

/**
 * The card a new deck starts with (`newCard()` in `cardEditorModel`): the
 * hanzi on the front, every reading and meaning on the back — the same card
 * the HSK decks ship. A tile of its own so the default is a choice the reader
 * can see, not "nothing picked".
 */
export const STANDARD_PRESET: CardPreset = {
	id: 'standard',
	name: 'Standard',
	description: 'Word → every reading and meaning, like the HSK decks',
	front: [F.SIMPLIFIED, ...CHROME],
	back: [
		F.SIMPLIFIED,
		F.TRADITIONAL,
		F.PINYIN,
		F.ZHUYIN,
		F.PART_OF_SPEECH,
		F.SIMPLE_MEANING,
		F.DEFINITIONS,
		...CHROME,
		F.AUDIO
	]
};

const byId = (id: string) => CARD_PRESETS.find((p) => p.id === id)!;

/**
 * The tiles `/create` leads with, in the order a reader weighs them.
 * Intermediate stays in the Advanced picker: it is Standard minus a few fields.
 */
export const STYLE_PRESETS: CardPreset[] = [
	STANDARD_PRESET,
	byId('beginner'),
	byId('writing'),
	byId('reading'),
	byId('examples'),
	byId('hsk')
];

const sameSet = (a: string[], b: string[]) => a.length === b.length && new Set([...a, ...b]).size === a.length;

/**
 * Which preset a deck is, if any: exactly one card type whose front and back
 * hold the preset's fields (order aside — position comes from the field order).
 * `null` once the reader has edited fields or added a second card type.
 */
export function matchPreset(
	cards: { front: string[]; back: string[] }[],
	presets: CardPreset[] = STYLE_PRESETS
): CardPreset | null {
	if (cards.length !== 1) return null;
	const [card] = cards;
	return (
		presets.find((p) => {
			const c = presetToCard(p);
			return sameSet(c.front, card.front) && sameSet(c.back, card.back);
		}) ?? null
	);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A deck title a person would pick ("My words — 6 Nov", "HSK 3 — 6 Nov"),
 * not a timestamp. `source` is the hand-off label ("New HSK (2025) · HSK 3");
 * an HSK list names the deck after its level, anything else is "My words".
 * Deck ids come from the name, so a second export the same day lands in the
 * same deck — and note GUIDs are stable, so it updates rather than duplicates.
 */
export function defaultDeckName(now: Date, source?: string): string {
	const day = `${now.getDate()} ${MONTHS[now.getMonth()]}`;
	const level = source && /HSK/.test(source) ? source.split(' · ').pop()!.trim() : '';
	return `${level || 'My words'} — ${day}`;
}
