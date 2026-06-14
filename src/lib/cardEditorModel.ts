/**
 * Pure model shared by the create page and its card-type editor: the list of
 * reorderable card items (note fields + the writing component), human labels,
 * the default field order, and the factory for a fresh card type.
 *
 * Kept framework-free so both `+page.svelte` and `CardTypeEditor.svelte` import
 * the same definitions instead of duplicating them.
 */
import CONSTANTS from '$lib/dict/contants';
import { CONTROL_BUTTONS_TOKEN, SEPARATOR_TOKEN } from '$lib/deckTemplate';
import type { CardElementStyles, TabContent } from '$lib/deck';

export const FIELDS = CONSTANTS.FIELDS;

// The synthetic "writing component" item — reorderable like a field but not an
// apkg note field.
export const WRITING = 'writingComponent';

// Display fields shown on the back of a new card type, in order.
export const DISPLAY_FIELDS = [
	FIELDS.SIMPLIFIED,
	FIELDS.TRADITIONAL,
	FIELDS.PINYIN,
	FIELDS.ZHUYIN,
	FIELDS.PART_OF_SPEECH,
	FIELDS.SIMPLE_MEANING,
	FIELDS.DEFINITIONS
];

// One card type's front/back selection plus its per-type element styles.
export type CardItem = TabContent[string];

// Defaults for a new card type: Simplified on front, all display fields on back;
// control bar + separator shown on both sides by default.
export function newCard(): CardItem {
	return {
		front: [`front${FIELDS.SIMPLIFIED}`, `front${CONTROL_BUTTONS_TOKEN}`, `front${SEPARATOR_TOKEN}`],
		back: [
			...DISPLAY_FIELDS.map((f) => `back${f}`),
			`back${CONTROL_BUTTONS_TOKEN}`,
			`back${SEPARATOR_TOKEN}`,
			`back${FIELDS.AUDIO}`
		],
		additional: [] as string[],
		elementStyles: {} as CardElementStyles
	};
}

// Default reorderable item list (note fields + chrome tokens + writing component).
export const DEFAULT_ORDER: string[] = [
	FIELDS.SIMPLIFIED,
	FIELDS.TRADITIONAL,
	FIELDS.PINYIN,
	FIELDS.ZHUYIN,
	FIELDS.PART_OF_SPEECH,
	FIELDS.SIMPLE_MEANING,
	CONTROL_BUTTONS_TOKEN,
	SEPARATOR_TOKEN,
	FIELDS.DEFINITIONS,
	FIELDS.BREAKDOWN,
	FIELDS.RADICAL,
	FIELDS.HSK_LEVEL,
	FIELDS.FREQUENCY,
	FIELDS.EXAMPLES,
	FIELDS.AUDIO,
	WRITING
];

export const fieldLabels: Record<string, string> = Object.fromEntries(
	[
		{ id: WRITING, label: 'Writing Component' },
		{ id: CONTROL_BUTTONS_TOKEN, label: 'Control buttons' },
		{ id: SEPARATOR_TOKEN, label: 'Separator line' },
		{ id: FIELDS.SIMPLIFIED, label: 'Simplified' },
		{ id: FIELDS.TRADITIONAL, label: 'Traditional' },
		{ id: FIELDS.PINYIN, label: 'Pinyin' },
		{ id: FIELDS.ZHUYIN, label: 'Zhuyin' },
		{ id: FIELDS.PART_OF_SPEECH, label: 'Part of Speech' },
		{ id: FIELDS.SIMPLE_MEANING, label: 'Simple Meaning' },
		{ id: FIELDS.DEFINITIONS, label: 'Dictionary Definitions' },
		{ id: FIELDS.BREAKDOWN, label: 'Character Breakdown' },
		{ id: FIELDS.RADICAL, label: 'Radical' },
		{ id: FIELDS.HSK_LEVEL, label: 'HSK Level' },
		{ id: FIELDS.FREQUENCY, label: 'Frequency' },
		{ id: FIELDS.EXAMPLES, label: 'Example Sentences' },
		{ id: FIELDS.AUDIO, label: 'Audio' }
	].map((f) => [f.id, f.label])
);
