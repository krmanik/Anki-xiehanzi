import { describe, it, expect } from 'vitest';
import { CARD_PRESETS, presetToCard, presetNeedsAudio } from './cardPresets';

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
		expect(card.back).toEqual(['backSimplified', 'backPinyin', 'backSimpleMeaning', 'backAudio']);
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
