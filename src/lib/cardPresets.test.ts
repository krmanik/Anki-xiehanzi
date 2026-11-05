import { describe, it, expect } from 'vitest';
import {
	CARD_PRESETS,
	defaultDeckName,
	matchPreset,
	presetNeedsAudio,
	presetToCard,
	STANDARD_PRESET,
	STYLE_PRESETS
} from './cardPresets';
import { newCard } from './cardEditorModel';

describe('card presets', () => {
	it('exposes the six named presets', () => {
		expect(CARD_PRESETS.map((p) => p.name)).toEqual([
			'Beginner',
			'Intermediate',
			'Reading',
			'Writing',
			'Example Sentences',
			'HSK Exam'
		]);
	});

	it('every preset has a non-empty front and back', () => {
		for (const p of CARD_PRESETS) {
			expect(p.front.length, p.name).toBeGreaterThan(0);
			expect(p.back.length, p.name).toBeGreaterThan(0);
		}
	});

	it('presetToCard prefixes field ids with front/back', () => {
		const beginner = CARD_PRESETS.find((p) => p.id === 'beginner')!;
		const card = presetToCard(beginner);
		expect(card.front).toEqual(['frontSimplified']);
		expect(card.back).toEqual([
			'backSimplified',
			'backPinyin',
			'backSimpleMeaning',
			'backAudio',
			'backControlButtons',
			'backSeparator'
		]);
		expect(card.additional).toEqual([]);
		expect(card.elementStyles).toEqual({});
	});

	it('writing preset puts the writing component on the back', () => {
		const writing = CARD_PRESETS.find((p) => p.id === 'writing')!;
		const card = presetToCard(writing);
		expect(card.front).toEqual(['frontSimpleMeaning']);
		expect(card.back).toContain('backwritingComponent');
	});

	it('flags presets that include the Audio field', () => {
		expect(presetNeedsAudio(CARD_PRESETS.find((p) => p.id === 'beginner')!)).toBe(true);
		expect(presetNeedsAudio(CARD_PRESETS.find((p) => p.id === 'reading')!)).toBe(false);
	});
});


describe('style tiles', () => {
	it('Standard is the card a new deck starts with', () => {
		expect(matchPreset([newCard()])).toBe(STANDARD_PRESET);
	});

	it('leads with Standard and keeps Intermediate for the advanced picker', () => {
		expect(STYLE_PRESETS.map((p) => p.id)).toEqual(['standard', 'beginner', 'writing', 'reading', 'examples', 'hsk']);
	});

	it('matches a preset whatever order its fields were ticked in', () => {
		const writing = presetToCard(STYLE_PRESETS.find((p) => p.id === 'writing')!);
		expect(matchPreset([{ front: writing.front, back: [...writing.back].reverse() }])?.id).toBe('writing');
	});

	it('is no preset once a field changes or a second card type exists', () => {
		const card = newCard();
		expect(matchPreset([{ ...card, back: card.back.slice(1) }])).toBeNull();
		expect(matchPreset([card, card])).toBeNull();
		expect(matchPreset([])).toBeNull();
	});
});

describe('defaultDeckName', () => {
	const nov6 = new Date(2026, 10, 6);
	it('names the deck after the day, not a timestamp', () => {
		expect(defaultDeckName(nov6)).toBe('My words — 6 Nov');
		expect(defaultDeckName(nov6, 'Dictionary · 3 words')).toBe('My words — 6 Nov');
	});
	it('names an HSK hand-off after its level', () => {
		expect(defaultDeckName(nov6, 'New HSK (2025) · HSK 3')).toBe('HSK 3 — 6 Nov');
	});
});
