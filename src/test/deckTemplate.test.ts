import { describe, it, expect } from 'vitest';
import { buildNoteTemplates, DEFAULT_TEMPLATE, type TabContent } from '$lib/deckTemplate';

// All note fields in the page's default order (matches create/+page.svelte).
const ALL_FIELDS = [
	'Simplified',
	'Traditional',
	'Pinyin',
	'Zhuyin',
	'PartOfSpeech',
	'SimpleMeaning',
	'Definitions',
	'Breakdown',
	'Radical',
	'HskLevel',
	'Frequency',
	'Examples',
	'Audio'
];

// Display fields that resolve to a {{Field}} placeholder in the card body.
const DISPLAY_FIELDS = ALL_FIELDS.filter((f) => f !== 'Audio');

function card(front: string[], back: string[]): TabContent {
	return { 'Card 1': { front, back, additional: [], elementStyles: {} } };
}

function build(tabContent: TabContent, includeAudio = false) {
	return buildNoteTemplates({
		fields: ALL_FIELDS,
		tabContent,
		includeAudio,
		template: DEFAULT_TEMPLATE
	});
}

describe('buildNoteTemplates — field selection', () => {
	it('plain card: every selected field reaches the back template', () => {
		const tc = card(
			['frontSimplified'],
			DISPLAY_FIELDS.map((f) => `back${f}`)
		);
		const { tmpls } = build(tc);
		for (const f of DISPLAY_FIELDS) {
			expect(tmpls[0].afmt, `{{${f}}} missing from back`).toContain(`{{${f}}}`);
		}
	});

	it('writer card: every selected field reaches the back template', () => {
		// Regression: with the writing component on the back, ticked fields the
		// writer page does not hardcode (PoS, simple meaning, breakdown, radical,
		// HSK, frequency, examples) were silently dropped from the export.
		const tc = card(
			['frontSimplified'],
			[...DISPLAY_FIELDS.map((f) => `back${f}`), 'backwritingComponent']
		);
		const { tmpls, usesWriter } = build(tc);
		expect(usesWriter).toBe(true);
		expect(tmpls[0].afmt).toContain('character-target-div'); // writer markup present
		for (const f of DISPLAY_FIELDS) {
			expect(tmpls[0].afmt, `{{${f}}} missing from writer back`).toContain(`{{${f}}}`);
		}
	});

	it('writer card: extras keep their order around the dictionary card', () => {
		const tc = card(
			['frontSimplified'],
			[...DISPLAY_FIELDS.map((f) => `back${f}`), 'backwritingComponent']
		);
		const { tmpls } = build(tc);
		const afmt = tmpls[0].afmt;
		// SimpleMeaning precedes Definitions in field order → sits above the
		// dictionary card; Breakdown follows it → sits below.
		expect(afmt.indexOf('{{SimpleMeaning}}')).toBeLessThan(afmt.indexOf('{{Definitions}}'));
		expect(afmt.indexOf('{{Definitions}}')).toBeLessThan(afmt.indexOf('{{Breakdown}}'));
	});

	it('writer card: unticked extras stay out of the back template', () => {
		const tc = card(
			['frontSimplified'],
			['backSimplified', 'backPinyin', 'backBreakdown', 'backwritingComponent']
		);
		const { tmpls } = build(tc);
		expect(tmpls[0].afmt).toContain('{{Breakdown}}');
		for (const f of ['PartOfSpeech', 'SimpleMeaning', 'Radical', 'HskLevel', 'Frequency', 'Examples']) {
			expect(tmpls[0].afmt, `{{${f}}} should not be on writer back`).not.toContain(`{{${f}}}`);
		}
	});

	it('writer card on the front: extras follow the front selection, back re-shows it', () => {
		const tc = card(
			['frontSimplified', 'frontHskLevel', 'frontwritingComponent'],
			['backSimplified', 'backwritingComponent']
		);
		const { tmpls } = build(tc);
		expect(tmpls[0].qfmt).toContain('character-target-div');
		expect(tmpls[0].qfmt).toContain('{{HskLevel}}');
		expect(tmpls[0].qfmt).not.toContain('{{Frequency}}');
		expect(tmpls[0].afmt).toContain('{{FrontSide}}');
	});
});
