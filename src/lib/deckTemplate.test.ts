import { describe, it, expect } from 'vitest';
import {
	buildNoteTemplates,
	buildGlobalCss,
	buildCardCss,
	elementOrder,
	formatDefinition,
	DEFAULT_TEMPLATE,
	DEFAULT_BODY_ORDER,
	type TabContent,
	type TemplateOpts,
	type CardElementStyles
} from './deckTemplate';
import CONSTANTS from './dict/contants';

// All display fields (matches the create page's default `fields`, minus the
// writing component which never appears in the apkg field list).
const FIELDS = [
	'Simplified',
	'Traditional',
	'Pinyin',
	'Zhuyin',
	'PartOfSpeech',
	'SimpleMeaning',
	'Definitions'
];

function makeCard(
	front: string[],
	back: string[],
	elementStyles: CardElementStyles = {}
): TabContent[string] {
	return { front, back, additional: [], elementStyles };
}

function tpl(over: Partial<TemplateOpts> = {}): TemplateOpts {
	return { ...DEFAULT_TEMPLATE, elementStyles: {}, ...over };
}

const onlySimplifiedFront = ['frontSimplified'];
const allBack = FIELDS.map((f) => `back${f}`);

// ───────────────────────────── formatDefinition ─────────────────────────────

describe('formatDefinition', () => {
	it('returns a single sense unchanged', () => {
		expect(formatDefinition('China; Middle Kingdom')).toContain('China');
		expect(formatDefinition('China')).toBe('China');
	});

	it('numbers multiple senses', () => {
		const html = formatDefinition('to go; to walk; to leave');
		expect(html).toContain('def-num');
		expect(html).toContain('1.');
		expect(html).toContain('3.');
		expect(html).toContain('<br>');
	});

	it('extracts CL classifiers into measure-word chips', () => {
		const html = formatDefinition('book; CL:本[ben3]');
		expect(html).toContain('cl-chip');
		expect(html).toContain('measure word');
		expect(html).toContain('本');
		expect(html).toContain('ben3');
		// the CL fragment is removed from the sense text
		expect(html).not.toContain('CL:');
	});
});

// ───────────────────────────── elementOrder ─────────────────────────────────

describe('elementOrder', () => {
	it('uses the canonical index*10 by default', () => {
		expect(elementOrder({}, 'controlButtons')).toBe(0);
		expect(elementOrder({}, 'hr')).toBe(10);
		expect(elementOrder({}, 'simplified')).toBe(20);
		expect(DEFAULT_BODY_ORDER[0]).toBe('controlButtons');
	});

	it('honours an explicit order override', () => {
		expect(elementOrder({ hr: { order: 999 } }, 'hr')).toBe(999);
		expect(elementOrder({ controlButtons: { order: 5 } }, 'controlButtons')).toBe(5);
	});
});

// ───────────────────────────── buildGlobalCss ───────────────────────────────

describe('buildGlobalCss', () => {
	it('declares the flex card-body container', () => {
		expect(buildGlobalCss(tpl())).toContain('.card-body{display:flex;flex-direction:column');
	});

	it('adds a global hanzi font stack only for non-default fonts', () => {
		expect(buildGlobalCss(tpl({ font: 'kaiti' }))).toContain('Kaiti SC');
		expect(buildGlobalCss(tpl({ font: 'default' }))).not.toContain('font-family:"');
	});

	it('emits the Standard tone palette by default', () => {
		const css = buildGlobalCss(tpl());
		expect(css).toContain('--tone-1:#f44336;');
		expect(css).toContain('.tone3{color:#4caf50;}');
	});

	it('emits an independent example-sentence tone palette + neutralisers', () => {
		const css = buildGlobalCss(tpl());
		expect(css).toContain('.ex-tone1{color:#f44336;}');
		expect(css).toContain('.no-ex-hanzi-color .example-sim .ex-tone1');
		expect(css).toContain('.no-ex-pinyin-color .example-pinyin .ex-tone1');
	});

	it('emits the custom tone palette when selected', () => {
		const css = buildGlobalCss(
			tpl({
				tonePreset: 'custom',
				toneColors: { '1': '#111111', '2': '#222222', '3': '#333333', '4': '#444444', '5': '#555555' }
			})
		);
		expect(css).toContain('--tone-1:#111111;');
		expect(css).toContain('.tone4{color:#444444;}');
	});
});

// ───────────────────────────── buildCardCss ─────────────────────────────────

describe('buildCardCss', () => {
	it('scopes every rule to the .ctN wrapper', () => {
		const css = buildCardCss({ simplified: { color: '#ff0000' } }, 'ct0');
		expect(css).toContain('.ct0 #char_sim{color:#ff0000 !important;}');
	});

	it('applies card background to the wrapper itself (no descendant selector)', () => {
		const css = buildCardCss({ card: { backgroundColor: '#000000' } }, 'ct1');
		expect(css).toContain('.ct1{background-color:#000000 !important;}');
	});

	it('emits display:none for hidden elements', () => {
		const css = buildCardCss({ audio: { visible: false } }, 'ct0');
		expect(css).toContain('.ct0 #btnPlayAudio{display:none !important;}');
	});

	it('styles the hr separator (color + thickness)', () => {
		const css = buildCardCss({ hr: { borderColor: '#123456', borderWidth: '4px' } }, 'ct0');
		expect(css).toContain('.ct0 hr{');
		expect(css).toContain('border-color:#123456 !important');
		expect(css).toContain('border-width:4px !important');
	});

	it('maps alignment to align-self (position in card window) + text-align', () => {
		const css = buildCardCss({ pinyin: { textAlign: 'left' } }, 'ct0');
		expect(css).toContain('.ct0 #char_pinyin{');
		expect(css).toContain('align-self:flex-start !important');
		expect(css).toContain('text-align:left !important');

		const right = buildCardCss({ simpleMeaning: { textAlign: 'right' } }, 'ct0');
		expect(right).toContain('align-self:flex-end !important');
	});

	it('emits flex order for control buttons and hr (default + override)', () => {
		const css = buildCardCss({}, 'ct0');
		expect(css).toContain('.ct0 .modal-footer1{order:0;}');
		expect(css).toContain('.ct0 hr{order:10;}');

		const moved = buildCardCss({ controlButtons: { order: 95 }, hr: { order: 96 } }, 'ct0');
		expect(moved).toContain('.ct0 .modal-footer1{order:95;}');
		expect(moved).toContain('.ct0 hr{order:96;}');
	});
});

// ───────────────────────────── buildNoteTemplates ───────────────────────────

describe('deck CSS — separator + measure word', () => {
	it('renders the hr with a visible (theme) border, not white-on-white', () => {
		expect(CONSTANTS.DECK_CSS).toContain('border-bottom: 1px solid var(--surface4)');
		expect(CONSTANTS.DECK_CSS).not.toContain('border-bottom: 1px solid rgba(255, 255, 255, 0.3)');
	});

	it('gives the measure-word row pill chips and no divider line', () => {
		expect(CONSTANTS.DECK_CSS).toContain('.cl-row');
		expect(CONSTANTS.DECK_CSS).not.toContain('border-top: 1px dashed');
		expect(CONSTANTS.DECK_CSS).toContain('.cl-chip');
		expect(CONSTANTS.DECK_CSS).toContain('border-radius: 999px');
	});

	it('spaces the part-of-speech chips apart', () => {
		expect(buildGlobalCss(tpl())).toContain('.pos-row{display:flex;flex-wrap:wrap;gap:8px');
	});
});

describe('buildNoteTemplates — fields', () => {
	it('drops the Audio field when audio is disabled and keeps it when enabled', () => {
		const tabContent: TabContent = { 'Card 1': makeCard(onlySimplifiedFront, allBack) };
		const noAudio = buildNoteTemplates({
			fields: [...FIELDS, 'Audio'],
			tabContent,
			includeAudio: false,
			template: tpl()
		});
		expect(noAudio.flds.map((f) => f.name)).not.toContain('Audio');

		const withAudio = buildNoteTemplates({
			fields: [...FIELDS, 'Audio'],
			tabContent,
			includeAudio: true,
			template: tpl()
		});
		expect(withAudio.flds.map((f) => f.name)).toContain('Audio');
	});
});

describe('buildNoteTemplates — per card type', () => {
	it('produces one template per card and scopes each with its own .ctN wrapper', () => {
		const tabContent: TabContent = {
			'Card 1': makeCard(onlySimplifiedFront, allBack, { simplified: { color: '#aa0000' } }),
			'Card 2': makeCard(['frontPinyin'], allBack, { pinyin: { color: '#00aa00' } })
		};
		const { tmpls, css } = buildNoteTemplates({
			fields: FIELDS,
			tabContent,
			includeAudio: false,
			template: tpl()
		});
		expect(tmpls).toHaveLength(2);
		expect(tmpls[0].name).toBe('Card 1');
		expect(tmpls[1].name).toBe('Card 2');
		// each card body carries a distinct wrapper class
		expect(tmpls[0].qfmt).toContain('class="ct0 card-body"');
		expect(tmpls[1].qfmt).toContain('class="ct1 card-body"');
		// per-card styles are scoped independently
		expect(css).toContain('.ct0 #char_sim{color:#aa0000 !important;}');
		expect(css).toContain('.ct1 #char_pinyin{color:#00aa00 !important;}');
	});

	it('wraps the back body in a ct card-body and closes it after the fields', () => {
		const tabContent: TabContent = { 'Card 1': makeCard(onlySimplifiedFront, allBack) };
		const { tmpls } = buildNoteTemplates({
			fields: FIELDS,
			tabContent,
			includeAudio: false,
			template: tpl()
		});
		expect(tmpls[0].afmt).toContain('<div class="ct0 card-body"><div class="modal-footer1">');
	});
});

describe('buildNoteTemplates — colorized hanzi source fix', () => {
	it('injects a hidden Definitions colour source when the front shows hanzi but not Definitions', () => {
		const tabContent: TabContent = { 'Card 1': makeCard(['frontSimplified'], allBack) };
		const { tmpls } = buildNoteTemplates({
			fields: FIELDS,
			tabContent,
			includeAudio: false,
			template: tpl()
		});
		expect(tmpls[0].qfmt).toContain('char-color-src');
		expect(tmpls[0].qfmt).toContain('{{Definitions}}');
	});

	it('does NOT inject the colour source when Definitions is already on the front', () => {
		const tabContent: TabContent = {
			'Card 1': makeCard(['frontSimplified', 'frontDefinitions'], allBack)
		};
		const { tmpls } = buildNoteTemplates({
			fields: FIELDS,
			tabContent,
			includeAudio: false,
			template: tpl()
		});
		expect(tmpls[0].qfmt).not.toContain('char-color-src');
	});

	it('does NOT inject the colour source when the front has no hanzi', () => {
		const tabContent: TabContent = { 'Card 1': makeCard(['frontPinyin'], allBack) };
		const { tmpls } = buildNoteTemplates({
			fields: FIELDS,
			tabContent,
			includeAudio: false,
			template: tpl()
		});
		expect(tmpls[0].qfmt).not.toContain('char-color-src');
	});
});

describe('buildNoteTemplates — colour defaults', () => {
	it('seeds no-hanzi-color / no-pinyin-color body classes from the template', () => {
		const tabContent: TabContent = { 'Card 1': makeCard(onlySimplifiedFront, allBack) };
		const mono = buildNoteTemplates({
			fields: FIELDS,
			tabContent,
			includeAudio: false,
			template: tpl({ mono: true })
		});
		expect(mono.tmpls[0].qfmt).toContain('no-hanzi-color');
		expect(mono.tmpls[0].qfmt).toContain('no-pinyin-color');

		const colored = buildNoteTemplates({
			fields: FIELDS,
			tabContent,
			includeAudio: false,
			template: tpl({ mono: false, colorHanzi: true, colorPinyin: true })
		});
		expect(colored.tmpls[0].qfmt).not.toContain('no-hanzi-color');
	});

	it('sets the collapse-dictionary default flag', () => {
		const tabContent: TabContent = { 'Card 1': makeCard(onlySimplifiedFront, allBack) };
		const collapsed = buildNoteTemplates({
			fields: FIELDS,
			tabContent,
			includeAudio: false,
			template: tpl({ collapseDict: true })
		});
		expect(collapsed.tmpls[0].qfmt).toContain('MEANING_COLLAPSE_DEFAULT=true');
	});

	it('always renders Examples as a collapsible card (bar + toggle)', () => {
		const fields = [...FIELDS, 'Examples'];
		const tabContent: TabContent = {
			'Card 1': makeCard(onlySimplifiedFront, [...allBack, 'backExamples'])
		};
		const { tmpls } = buildNoteTemplates({ fields, tabContent, includeAudio: false, template: tpl() });
		expect(tmpls[0].afmt).toContain('id="char_examples"');
		expect(tmpls[0].afmt).toContain('examples-card');
		expect(tmpls[0].afmt).toContain('onclick="toggleMeaning(this)"');
	});

	it('adds an "Example sentences" sidebar section with separate colour toggles', () => {
		const fields = [...FIELDS, 'Examples'];
		const tabContent: TabContent = {
			'Card 1': makeCard(onlySimplifiedFront, [...allBack, 'backExamples'])
		};
		const { tmpls } = buildNoteTemplates({ fields, tabContent, includeAudio: false, template: tpl() });
		const afmt = tmpls[0].afmt;
		expect(afmt).toContain('"Example sentences"');
		expect(afmt).toContain('text-ex-color-hanzi');
		expect(afmt).toContain('text-ex-color-pinyin');
		expect(afmt).toContain('no-ex-hanzi-color');
		expect(afmt).toContain('no-ex-pinyin-color');
	});

	it('seeds example colour body classes from the example options', () => {
		const tabContent: TabContent = { 'Card 1': makeCard(onlySimplifiedFront, allBack) };
		const off = buildNoteTemplates({
			fields: [...FIELDS, 'Examples'],
			tabContent,
			includeAudio: false,
			template: tpl({ exampleOptions: { ...DEFAULT_TEMPLATE.exampleOptions, colorizeHanzi: false } })
		});
		expect(off.tmpls[0].qfmt).toContain('no-ex-hanzi-color');
	});
});

describe('buildNoteTemplates — writing component', () => {
	it('uses the Hanzi Writer template on the front when selected and reports usesWriter', () => {
		const tabContent: TabContent = {
			'Card 1': makeCard(['frontwritingComponent'], allBack)
		};
		const { tmpls, usesWriter } = buildNoteTemplates({
			fields: FIELDS,
			tabContent,
			includeAudio: false,
			template: tpl()
		});
		expect(usesWriter).toBe(true);
		expect(tmpls[0].qfmt).toContain('character-target-div');
		expect(tmpls[0].qfmt).toContain('class="ct0"');
	});

	it('does not use the writer when no card selects it', () => {
		const tabContent: TabContent = { 'Card 1': makeCard(onlySimplifiedFront, allBack) };
		const { usesWriter } = buildNoteTemplates({
			fields: FIELDS,
			tabContent,
			includeAudio: false,
			template: tpl()
		});
		expect(usesWriter).toBe(false);
	});
});

describe('buildNoteTemplates — back field visibility', () => {
	it('seeds defaultOff for fields used elsewhere but not on this card back', () => {
		// Card 1 back shows only Simplified; Card 2 uses pinyin + definitions. Those
		// two are "used" so they ship (hideable) but start off on Card 1.
		const tabContent: TabContent = {
			'Card 1': makeCard(onlySimplifiedFront, ['backSimplified']),
			'Card 2': makeCard(onlySimplifiedFront, ['backSimplified', 'backPinyin', 'backDefinitions'])
		};
		const { tmpls } = buildNoteTemplates({
			fields: FIELDS,
			tabContent,
			includeAudio: false,
			template: tpl()
		});
		expect(tmpls[0].afmt).toContain('var defaultOff = ["text-pinyin","text-meaning"]');
	});

	it('drops fields that no card uses (e.g. unselected examples) from note + template', () => {
		const tabContent: TabContent = {
			'Card 1': makeCard(onlySimplifiedFront, ['backSimplified', 'backDefinitions'])
		};
		const { flds, tmpls } = buildNoteTemplates({
			fields: [...FIELDS, 'Examples'],
			tabContent,
			includeAudio: false,
			template: tpl()
		});
		const names = flds.map((f) => f.name);
		expect(names).not.toContain('Examples'); // unselected → not shipped
		expect(names).not.toContain('Traditional'); // unused → not shipped
		// No examples field markup → the sidebar section is gated out at runtime too.
		expect(tmpls[0].afmt).not.toContain('examples-card');
		expect(names).toContain('Simplified');
		expect(names).toContain('Definitions');
	});
});

describe('buildNoteTemplates — breakdown / radical / HSK / frequency fields', () => {
	const META = ['Breakdown', 'Radical', 'HskLevel', 'Frequency'];

	it('emits the new field divs on the back when included', () => {
		const tabContent: TabContent = {
			'Card 1': makeCard(onlySimplifiedFront, META.map((f) => `back${f}`))
		};
		const { tmpls } = buildNoteTemplates({
			fields: [...FIELDS, ...META],
			tabContent,
			includeAudio: false,
			template: tpl()
		});
		const afmt = tmpls[0].afmt;
		expect(afmt).toContain('id="char_breakdown"');
		expect(afmt).toContain('id="char_radical"');
		expect(afmt).toContain('id="char_hsk"');
		expect(afmt).toContain('id="char_freq"');
		expect(afmt).toContain('{{Breakdown}}');
		expect(afmt).toContain('{{HskLevel}}');
	});

	it('places a new field on the front when selected there', () => {
		const tabContent: TabContent = {
			'Card 1': makeCard(['frontSimplified', 'frontHskLevel'], onlySimplifiedFront)
		};
		const { tmpls } = buildNoteTemplates({
			fields: [...FIELDS, ...META],
			tabContent,
			includeAudio: false,
			template: tpl()
		});
		expect(tmpls[0].qfmt).toContain('id="char_hsk"');
	});

	it('ships CSS for the badges, breakdown and radical chips', () => {
		const css = buildGlobalCss(tpl());
		expect(css).toContain('.meta-badge');
		expect(css).toContain('.breakdown-row');
		expect(css).toContain('.bd-char');
		expect(css).toContain('.radical-chip');
	});

	it('orders the new blocks after definitions in the body order', () => {
		expect(elementOrder({}, 'definitions')).toBeLessThan(elementOrder({}, 'breakdown'));
		expect(elementOrder({}, 'breakdown')).toBeLessThan(elementOrder({}, 'audio'));
	});
});

describe('buildNoteTemplates — position move mirrored in CSS', () => {
	it('emits the moved control/hr order into the per-card CSS', () => {
		const tabContent: TabContent = {
			'Card 1': makeCard(onlySimplifiedFront, allBack, {
				controlButtons: { order: 95 },
				hr: { order: 96 }
			})
		};
		const { css } = buildNoteTemplates({
			fields: FIELDS,
			tabContent,
			includeAudio: false,
			template: tpl()
		});
		expect(css).toContain('.ct0 .modal-footer1{order:95;}');
		expect(css).toContain('.ct0 hr{order:96;}');
	});
});
