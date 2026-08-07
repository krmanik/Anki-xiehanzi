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

	it('writer on both sides: each side keeps its own selection, back stays the review view', () => {
		// Regression: the back used to be {{FrontSide}}, so the two sides collapsed
		// into one and the back's own field selection was dropped.
		const tc = card(
			['frontSimplified', 'frontwritingComponent'],
			['backSimplified', 'backFrequency', 'backwritingComponent']
		);
		const { tmpls } = build(tc);
		expect(tmpls[0].qfmt).toContain('character-target-div');
		expect(tmpls[0].qfmt).not.toContain('{{Frequency}}');
		expect(tmpls[0].afmt).not.toContain('{{FrontSide}}');
		expect(tmpls[0].afmt).toContain('character-target-div');
		expect(tmpls[0].afmt).toContain('{{Frequency}}');
		expect(tmpls[0].afmt).toContain('<div id="back">'); // finished-glyph mode
	});

	it('no side picker anywhere — each sidebar configures its own side', () => {
		const tc = card(
			['frontSimplified', 'frontwritingComponent', 'frontControlButtons'],
			['backSimplified', 'backDefinitions', 'backwritingComponent']
		);
		const { tmpls } = build(tc);
		for (const side of [tmpls[0].qfmt, tmpls[0].afmt]) {
			expect(side).not.toContain('setActive');
			expect(side).not.toContain('id="text-front"');
			expect(side).not.toContain('id="text-back"');
		}
	});

	it('sidebar rows follow the side that owns them', () => {
		const tc = card(
			['frontSimplified', 'frontwritingComponent', 'frontControlButtons'],
			['backSimplified', 'backPinyin', 'backDefinitions', 'backRadical']
		);
		const { tmpls } = build(tc);
		const sections = (t: string) => /var SIDEBAR_SECTIONS = (\[.*?\]);/.exec(t)?.[1] ?? '';
		const front = sections(tmpls[0].qfmt);
		const back = sections(tmpls[0].afmt);
		// Front shows only the hanzi + the writer: no Meaning/Radical/Pinyin rows.
		expect(front).toContain('["toggle","text-sim","Simplified"]');
		expect(front).not.toContain('text-radical');
		expect(front).not.toContain('text-meaning');
		expect(front).toContain('"Writing"'); // writer sits on the front
		// Back shows the dictionary card: its rows, and no writing section.
		expect(back).toContain('["toggle","text-radical","Radical"]');
		expect(back).toContain('["toggle","text-meaning","Meaning"]');
		expect(back).not.toContain('Writing');
		expect(back).not.toContain('practice-select');
	});
});
