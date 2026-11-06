import { describe, it, expect } from 'vitest';
import { addable, addToSide, moveInSide, moveToSide, removeFromSide, sideItems, ITEM_META } from './cardSides';
import { DEFAULT_ORDER, newCard } from './cardEditorModel';

const card = (front: string[], back: string[]) => ({
	front: front.map((f) => `front${f}`),
	back: back.map((f) => `back${f}`)
});

describe('sideItems', () => {
	it('lists a side in the shared order, not in the order the ids were added', () => {
		const c = card([], ['Pinyin', 'Simplified', 'Definitions']);
		expect(sideItems(['Simplified', 'Traditional', 'Pinyin', 'Definitions'], c, 'back')).toEqual([
			'Simplified',
			'Pinyin',
			'Definitions'
		]);
	});
});

describe('addable', () => {
	it('offers what the side lacks, including items on the other side', () => {
		const c = card(['Simplified'], ['Pinyin']);
		const order = ['Simplified', 'Pinyin', 'Radical', 'Audio'];
		expect(addable(order, c, 'back')).toEqual(['Simplified', 'Radical', 'Audio']);
	});

	it('offers Audio while the audio switch has taken it out of the order', () => {
		expect(addable(['Simplified'], card([], []), 'back')).toEqual(['Simplified', 'Audio']);
		expect(addable(['Simplified'], card([], ['Audio']), 'back')).toEqual(['Simplified']);
	});
});

describe('add / remove / move between sides', () => {
	it('adds once and removes', () => {
		const c = addToSide(card([], []), 'front', 'Pinyin');
		expect(c.front).toEqual(['frontPinyin']);
		expect(addToSide(c, 'front', 'Pinyin')).toBe(c);
		expect(removeFromSide(c, 'front', 'Pinyin').front).toEqual([]);
	});

	it('keeps the other card-type fields (styles, groups) untouched', () => {
		const full = { ...newCard(), groups: [] };
		const out = addToSide(full, 'front', 'Radical');
		expect(out.elementStyles).toBe(full.elementStyles);
		expect(out.groups).toBe(full.groups);
	});

	it('moves to the other side, once even if it was on both', () => {
		const c = card(['Pinyin'], ['Simplified']);
		expect(moveToSide(c, 'front', 'back', 'Pinyin')).toEqual(card([], ['Simplified', 'Pinyin']));
		const both = card(['Pinyin'], ['Pinyin']);
		expect(moveToSide(both, 'front', 'back', 'Pinyin')).toEqual(card([], ['Pinyin']));
	});
});

describe('moveInSide', () => {
	const order = ['A', 'x', 'B', 'y', 'C'];
	const c = card([], ['A', 'B', 'C']);

	it('moves down past the next item on the side, leaving off-side items in place', () => {
		const out = moveInSide(order, c, 'back', 'A', 1);
		expect(sideItems(out, c, 'back')).toEqual(['B', 'A', 'C']);
		expect(out.filter((x) => x === 'x' || x === 'y')).toEqual(['x', 'y']);
	});

	it('moves to the end and to the top', () => {
		expect(sideItems(moveInSide(order, c, 'back', 'A', 2), c, 'back')).toEqual(['B', 'C', 'A']);
		expect(sideItems(moveInSide(order, c, 'back', 'C', 0), c, 'back')).toEqual(['C', 'A', 'B']);
	});

	it('clamps and ignores items not on the side', () => {
		expect(sideItems(moveInSide(order, c, 'back', 'A', 99), c, 'back')).toEqual(['B', 'C', 'A']);
		expect(moveInSide(order, c, 'back', 'x', 0)).toBe(order);
		expect(moveInSide(order, c, 'back', 'B', 1)).toBe(order);
	});

	it('never drops or duplicates an item', () => {
		const out = moveInSide(order, c, 'back', 'B', 0);
		expect([...out].sort()).toEqual([...order].sort());
	});
});

it('has a chip label for every item a deck can order', () => {
	for (const item of DEFAULT_ORDER) expect(ITEM_META[item]?.label, item).toBeTruthy();
});
