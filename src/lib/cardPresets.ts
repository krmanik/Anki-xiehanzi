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
