/**
 * Card layout of the prebuilt HSK decks — what sits on the front of the card,
 * and the field order everything is drawn in.
 *
 * These decks are the app's own card design (`deckTemplate.ts` +
 * `CONSTANTS.DECK_CSS`), the same one `/create` exports and the same one the
 * released v2.x decks shipped: `char-card` hanzi, the `modal-footer1` control
 * bar, the sidebar of field switches. The premium line's panel design is a
 * separate product and is not used here.
 *
 * One note per word, one card per note: hanzi on the front, everything the
 * dictionary knows on the back, with the stroke-practice component last. The
 * four-card-types-in-four-subdecks shape of the released decks is gone — it
 * quadrupled the notes and the deck tree for the same words.
 *
 * Its own module so the builder and any preview/verification script describe
 * exactly the same deck.
 */

import CONSTANTS from '../../src/lib/dict/contants.ts';
import { CONTROL_BUTTONS_TOKEN, SEPARATOR_TOKEN } from '../../src/lib/deckTemplate.ts';

const F = CONSTANTS.FIELDS;
export const WRITING = 'writingComponent';

/** Everything the dictionary knows, in reading order — the back of the card. */
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

/** `tabContent` for the deck: one recognition card. */
export function cardLayout({ audio = true, examples = true } = {}) {
	const back = [...BACK_FIELDS.map((f) => `back${f}`)];
	if (examples) back.push(`back${F.EXAMPLES}`);
	if (audio) back.push(`back${F.AUDIO}`);
	back.push(`back${CONTROL_BUTTONS_TOKEN}`, `back${SEPARATOR_TOKEN}`, `back${WRITING}`);

	// Audio on the front too: the recording is part of "what is this word", and
	// the control bar's play button needs the field on the side it sits on.
	const front = [`front${F.SIMPLIFIED}`];
	if (audio) front.push(`front${F.AUDIO}`);
	front.push(`front${CONTROL_BUTTONS_TOKEN}`, `front${SEPARATOR_TOKEN}`);

	return {
		'Card 1': {
			front,
			back,
			additional: [],
			elementStyles: {}
		}
	};
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
