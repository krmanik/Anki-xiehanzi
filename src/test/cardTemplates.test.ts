import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Reference Anki card designs live in the repo's "card templates" folder. Some
// fronts are huge (Card 5 is ~80 KB), so we don't snapshot them — we assert the
// per-field markers ({{Field}} placeholders + element ids) each design must
// carry. That catches a field being dropped/renamed in a redesign.
const DIR = path.resolve('card templates');

function readFronts(card: string): string {
	const d = path.join(DIR, card);
	return fs
		.readdirSync(d)
		.filter((f) => /^front.*\.html$/.test(f))
		.map((f) => fs.readFileSync(path.join(d, f), 'utf8'))
		.join('\n');
}

function readBack(card: string): string {
	return fs.readFileSync(path.join(DIR, card, 'back.html'), 'utf8');
}

type Spec = { fields: string[]; ids: string[]; markers?: string[] };

const FRONT: Record<string, Spec> = {
	'Card 1': {
		fields: ['Simplified', 'Traditional', 'Pinyin', 'Zhuyin'],
		ids: ['char_sim', 'char_trad', 'char_pinyin', 'char_zhuyin']
	},
	'Card 2': {
		fields: ['Simplified', 'Traditional'],
		ids: ['char_sim', 'char_trad']
	},
	'Card 3': {
		fields: ['Simplified', 'Traditional', 'Pinyin', 'Zhuyin'],
		ids: ['char_sim', 'char_trad', 'char_pinyin', 'char_zhuyin']
	},
	'Card 4': {
		// Meaning-first card: no big hanzi on the front.
		fields: ['Meaning', 'Pinyin', 'Zhuyin', 'Audio'],
		ids: ['char_meaning', 'char_pinyin', 'char_zhuyin']
	},
	'Card 5': {
		// Writing/quiz card.
		fields: ['Simplified', 'Traditional', 'Pinyin', 'Meaning', 'Audio'],
		ids: ['char_sim', 'char_trad', 'char_pinyin', 'char_meaning'],
		markers: ['character-target-div', 'practice-select', 'draw-size']
	}
};

describe('reference card templates — front designs', () => {
	for (const [card, spec] of Object.entries(FRONT)) {
		it(`${card} front carries its fields + element ids`, () => {
			const html = readFronts(card);
			for (const f of spec.fields) expect(html, `${card} {{${f}}}`).toContain(`{{${f}}}`);
			for (const id of spec.ids) expect(html, `${card} #${id}`).toContain(`id="${id}"`);
			for (const m of spec.markers ?? []) expect(html, `${card} ${m}`).toContain(m);
		});
	}

	it('Card 4 front omits the big hanzi (meaning-first design)', () => {
		const html = readFronts('Card 4');
		expect(html).not.toContain('{{Simplified}}');
	});
});

describe('reference card templates — back designs', () => {
	const SHARED_FIELDS = ['Simplified', 'Traditional', 'Pinyin', 'Zhuyin', 'Meaning', 'Audio'];
	const SHARED_IDS = ['char_sim', 'char_trad', 'char_pinyin', 'char_zhuyin', 'char_meaning', 'btnShowMenu'];

	for (const card of ['Card 1', 'Card 2', 'Card 3', 'Card 4']) {
		it(`${card} back carries every field + the sidebar`, () => {
			const html = readBack(card);
			for (const f of SHARED_FIELDS) expect(html, `${card} {{${f}}}`).toContain(`{{${f}}}`);
			for (const id of SHARED_IDS) expect(html, `${card} #${id}`).toContain(`id="${id}"`);
		});
	}

	it('Card 5 back simply re-shows the front (FrontSide)', () => {
		expect(readBack('Card 5')).toContain('{{FrontSide}}');
	});
});
