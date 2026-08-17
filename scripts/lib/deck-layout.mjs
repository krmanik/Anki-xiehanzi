/**
 * Card layout of the prebuilt decks — which fields sit on the front of each
 * card type, and the field order they are drawn in.
 *
 * Its own module so the builder and any preview/verification script describe
 * exactly the same deck.
 */

import CONSTANTS from '../../src/lib/dict/contants.ts';
import { CONTROL_BUTTONS_TOKEN, SEPARATOR_TOKEN } from '../../src/lib/deckTemplate.ts';

const F = CONSTANTS.FIELDS;
export const WRITING = 'writingComponent';

/** Everything the dictionary knows, in reading order — the back of every card. */
export const BACK_FIELDS = [
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
	F.FREQUENCY
];

/**
 * Front side of each card type. Each front asks for what the back reveals,
 * following the released decks' card templates — and none of them is blank,
 * which a bare audio prompt would be.
 */
export const CARD_FRONTS = {
	// What does it mean? — the word and how to say it.
	Meaning: [F.SIMPLIFIED, F.TRADITIONAL, F.PINYIN, F.ZHUYIN, F.AUDIO],
	// How is it read? — the characters alone.
	Pinyin: [F.SIMPLIFIED, F.TRADITIONAL],
	// Which character is it? — reading and meaning, no hanzi.
	Audio: [F.PINYIN, F.ZHUYIN, F.SIMPLE_MEANING, F.AUDIO],
	// Write it — reading and meaning plus the stroke pad.
	Write: [F.PINYIN, F.SIMPLE_MEANING, F.AUDIO, WRITING]
};

/**
 * `tabContent` for the deck: the four card types, or a single recognition card
 * when `single` is set.
 */
export function cardLayout({ audio = true, examples = true, single = false } = {}) {
	const back = [...BACK_FIELDS.map((f) => `back${f}`)];
	if (examples) back.push(`back${F.EXAMPLES}`);
	if (audio) back.push(`back${F.AUDIO}`);
	back.push(`back${CONTROL_BUTTONS_TOKEN}`, `back${SEPARATOR_TOKEN}`);

	const chrome = [`front${CONTROL_BUTTONS_TOKEN}`, `front${SEPARATOR_TOKEN}`];

	if (single) {
		return {
			'Card 1': {
				front: [`front${F.SIMPLIFIED}`, ...chrome],
				back: [...back, `back${WRITING}`],
				additional: [],
				elementStyles: {}
			}
		};
	}

	const layout = {};
	for (const [name, front] of Object.entries(CARD_FRONTS)) {
		layout[name] = {
			// Audio only ever rides along with something visible; drop it when the
			// build has no audio at all.
			front: [...front.filter((f) => f !== F.AUDIO || audio).map((f) => `front${f}`), ...chrome],
			// The writing card practises on the front; the others show the finished
			// character on the back.
			back: name === 'Write' ? back : [...back, `back${WRITING}`],
			additional: [],
			elementStyles: {}
		};
	}
	return layout;
}

/** Full item order (note fields + layout tokens + the writing component). */
export function itemOrder({ audio = true, examples = true } = {}) {
	const order = [
		F.SIMPLIFIED,
		F.TRADITIONAL,
		F.PINYIN,
		F.ZHUYIN,
		F.PART_OF_SPEECH,
		F.SIMPLE_MEANING,
		CONTROL_BUTTONS_TOKEN,
		SEPARATOR_TOKEN,
		F.DEFINITIONS,
		F.BREAKDOWN,
		F.RADICAL,
		F.HSK_LEVEL,
		F.FREQUENCY
	];
	if (examples) order.push(F.EXAMPLES);
	if (audio) order.push(F.AUDIO);
	order.push(WRITING);
	return order;
}

/** Note fields (the item order minus the layout-only items). */
export function noteFields(opts) {
	return itemOrder(opts).filter(
		(o) => o !== WRITING && o !== CONTROL_BUTTONS_TOKEN && o !== SEPARATOR_TOKEN
	);
}
