/**
 * Pure model behind the Front | Back columns on /create's Card style step.
 *
 * A card type stores two id lists (`front: ['frontPinyin', …]`, `back: […]`);
 * where an item sits on the card comes from the one shared `order`, not from
 * those lists. So a column is `order` filtered to its side, and reordering a
 * column moves the item in `order` — which moves it on the other side too.
 * Everything here returns new values and never mutates its input.
 */
import CONSTANTS from './dict/contants';
import { CONTROL_BUTTONS_TOKEN, SEPARATOR_TOKEN } from './deckTemplate';
import { WRITING } from './cardEditorModel';

const F = CONSTANTS.FIELDS;

export type Side = 'front' | 'back';
export const SIDES: Side[] = ['front', 'back'];

/** The slice of a card type this module reads and writes. */
export interface SideCard {
	front: string[];
	back: string[];
}

export type ItemKind = 'field' | 'chrome' | 'writing';

/** Short chip label + a glyph that shows what the item looks like on a card. */
export const ITEM_META: Record<string, { label: string; glyph: string; kind: ItemKind }> = {
	[F.SIMPLIFIED]: { label: 'Hanzi', glyph: '汉', kind: 'field' },
	[F.TRADITIONAL]: { label: 'Traditional', glyph: '漢', kind: 'field' },
	[F.PINYIN]: { label: 'Pinyin', glyph: 'pīn', kind: 'field' },
	[F.ZHUYIN]: { label: 'Zhuyin', glyph: 'ㄅ', kind: 'field' },
	[F.PART_OF_SPEECH]: { label: 'Part of speech', glyph: 'n.', kind: 'field' },
	[F.SIMPLE_MEANING]: { label: 'Meaning', glyph: 'Aa', kind: 'field' },
	[F.DEFINITIONS]: { label: 'Definitions', glyph: '1.', kind: 'field' },
	[F.BREAKDOWN]: { label: 'Breakdown', glyph: '⿰', kind: 'field' },
	[F.RADICAL]: { label: 'Radical', glyph: '氵', kind: 'field' },
	[F.HSK_LEVEL]: { label: 'HSK level', glyph: 'H3', kind: 'field' },
	[F.FREQUENCY]: { label: 'Frequency', glyph: '#', kind: 'field' },
	[F.EXAMPLES]: { label: 'Sentences', glyph: '“”', kind: 'field' },
	[F.AUDIO]: { label: 'Audio', glyph: '♪', kind: 'field' },
	[WRITING]: { label: 'Writing grid', glyph: '田', kind: 'writing' },
	[CONTROL_BUTTONS_TOKEN]: { label: 'Buttons', glyph: '⋯', kind: 'chrome' },
	[SEPARATOR_TOKEN]: { label: 'Line', glyph: '—', kind: 'chrome' }
};

export const itemLabel = (item: string) => ITEM_META[item]?.label ?? item;

const idOf = (side: Side, item: string) => `${side}${item}`;

export function onSide(card: SideCard, side: Side, item: string): boolean {
	return card[side].includes(idOf(side, item));
}

/** The items on one side, top to bottom as the card prints them. */
export function sideItems(order: string[], card: SideCard, side: Side): string[] {
	return order.filter((item) => onSide(card, side, item));
}

/**
 * What can still go on a side: every item in `order` not on it yet. Audio
 * leaves `order` while the audio switch is off, so it is offered anyway —
 * adding it is how a reader turns audio on from here.
 */
export function addable(order: string[], card: SideCard, side: Side): string[] {
	const out = order.filter((item) => !onSide(card, side, item));
	if (!order.includes(F.AUDIO) && !onSide(card, side, F.AUDIO)) out.push(F.AUDIO);
	return out;
}

export function addToSide<C extends SideCard>(card: C, side: Side, item: string): C {
	if (onSide(card, side, item)) return card;
	return { ...card, [side]: [...card[side], idOf(side, item)] };
}

export function removeFromSide<C extends SideCard>(card: C, side: Side, item: string): C {
	const id = idOf(side, item);
	return { ...card, [side]: card[side].filter((x) => x !== id) };
}

/** Take an item off one side and put it on the other (kept once if already there). */
export function moveToSide<C extends SideCard>(card: C, from: Side, to: Side, item: string): C {
	if (from === to) return card;
	return addToSide(removeFromSide(card, from, item), to, item);
}

/**
 * Reorder within a side: put `item` at position `to` among that side's items,
 * by moving it in the shared `order`. It lands just before the item it should
 * precede on this side (or just after the side's last item), so everything
 * not on this side keeps its place relative to its neighbours.
 */
export function moveInSide(order: string[], card: SideCard, side: Side, item: string, to: number): string[] {
	const items = sideItems(order, card, side);
	const from = items.indexOf(item);
	if (from === -1) return order;
	const others = items.filter((x) => x !== item);
	const target = Math.max(0, Math.min(to, others.length));
	if (target === from) return order;
	const rest = order.filter((x) => x !== item);
	const at = target < others.length ? rest.indexOf(others[target]) : rest.indexOf(others[others.length - 1]) + 1;
	return [...rest.slice(0, at), item, ...rest.slice(at)];
}
