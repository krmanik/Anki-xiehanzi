/**
 * Anki-xiehanzi — pure deck-template + CSS generation.
 *
 * Extracted from deck.ts so it can be unit-tested without pulling in genanki-js,
 * sql.js, jieba-wasm, edge-tts or SvelteKit's $app/paths. Everything here is a
 * pure function of its inputs (no network, no DOM), which is exactly what the
 * exporter's correctness depends on.
 */

import CONSTANTS from './dict/contants';
import { resolvePalette, STANDARD_TONES, TONE_KEYS, type TonePalette } from './tonePresets';

const FIELDS = CONSTANTS.FIELDS;

// ---------------------------------------------------------------------------
// Types + shared constants (re-exported from deck.ts for back-compat)
// ---------------------------------------------------------------------------

export const CARD_STYLE_LS_KEY = 'xiehanzi-card-style';
export const CARD_TABS_LS_KEY = 'xiehanzi-card-tabs';

export interface TabContent {
	[card: string]: {
		front: string[];
		back: string[];
		additional: string[];
		// Per-card-type visual overrides. Each card type styles its elements
		// independently; the export scopes them via a `.ctN` wrapper class.
		elementStyles: CardElementStyles;
	};
}

// Per-element style overrides. All fields optional — unset means "use default".
export interface ElementStyle {
	visible?: boolean;
	fontSize?: string; // e.g. '2.5em', '18px'
	fontFamily?: string; // 'default' | 'kaiti' | 'songti'
	fontWeight?: string; // 'normal' | '600' | 'bold'
	color?: string; // hex color
	textAlign?: 'left' | 'center' | 'right';
	marginTop?: string; // e.g. '0', '8px'
	marginBottom?: string;
	backgroundColor?: string;
	padding?: string;
	borderRadius?: string;
	letterSpacing?: string;
	lineHeight?: string;
	borderColor?: string; // hr border color
	borderWidth?: string; // hr thickness e.g. '1px', '2px'
	order?: number; // flex order — vertical position within the card body
}

// Identifies each customizable region of the card.
export type CardElementId =
	| 'card' // whole card container (background, alignment)
	| 'simplified' // main hanzi 大
	| 'traditional' // 〔traditional〕
	| 'pinyin' // Pīnyīn romanization
	| 'zhuyin' // ㄅㄆㄇㄈ phonetics
	| 'partOfSpeech' // noun/verb chips
	| 'simpleMeaning' // short English gloss
	| 'definitions' // full dictionary entry block
	| 'breakdown' // per-character breakdown (中→middle, 国→country)
	| 'radical' // radical chips (国→囗)
	| 'hskLevel' // HSK level badge
	| 'frequency' // frequency-band badge (Top 500)
	| 'examples' // smart example sentences (whole block)
	| 'exampleSimplified' // sentence simplified line
	| 'exampleTraditional' // sentence traditional line
	| 'examplePinyin' // sentence pinyin line
	| 'exampleTranslation' // sentence translation line
	| 'audio' // audio play button
	| 'hr' // horizontal rule separators
	| 'controlButtons'; // sidebar-toggle footer buttons

export type CardElementStyles = Partial<Record<CardElementId, ElementStyle>>;

// Deck-wide example-sentence options (length filter, count, which parts show,
// and whether to tone-color them). Drives both the export and the exporter UI.
export interface ExampleOptions {
	count: number;
	minChars: number;
	maxChars: number;
	showSimplified: boolean;
	showTraditional: boolean;
	showPinyin: boolean;
	showTranslation: boolean;
	colorizeHanzi: boolean;
	colorizePinyin: boolean;
}

export const DEFAULT_EXAMPLE_OPTIONS: ExampleOptions = {
	count: 3,
	minChars: 5,
	maxChars: 20,
	showSimplified: true,
	showTraditional: false,
	showPinyin: true,
	showTranslation: true,
	colorizeHanzi: true,
	colorizePinyin: true
};

export interface TemplateOpts {
	mono: boolean;
	colorHanzi: boolean;
	colorPinyin: boolean;
	font: string; // global hanzi font: 'default' | 'kaiti' | 'songti'
	collapseDict: boolean;
	commonPinyinOnly: boolean; // show only the most common reading (longest definition)
	tonePreset: string; // 'standard' | 'pleco' | 'blueprint' | 'mdbg' | 'custom'
	toneColors: TonePalette; // used when tonePreset === 'custom'
	exampleOptions: ExampleOptions;
	elementStyles: CardElementStyles; // default per-element overrides for new cards
}

export const DEFAULT_TEMPLATE: TemplateOpts = {
	mono: false,
	colorHanzi: true,
	colorPinyin: true,
	font: 'default',
	collapseDict: false,
	commonPinyinOnly: true,
	tonePreset: 'standard',
	toneColors: { ...STANDARD_TONES },
	exampleOptions: { ...DEFAULT_EXAMPLE_OPTIONS },
	elementStyles: {}
};

// ---------------------------------------------------------------------------
// Element ordering + per-element CSS
// ---------------------------------------------------------------------------

// CSS selectors RELATIVE to the per-card `.ctN` wrapper. '' = the wrapper itself.
const SCOPED_SELECTORS: Record<CardElementId, string> = {
	card: '',
	simplified: '#char_sim',
	traditional: '#char_trad',
	pinyin: '#char_pinyin',
	zhuyin: '#char_zhuyin',
	partOfSpeech: '#char_pos',
	simpleMeaning: '#char_simple',
	definitions: '#char_meaning',
	breakdown: '#char_breakdown',
	radical: '#char_radical',
	hskLevel: '#char_hsk',
	frequency: '#char_freq',
	examples: '#char_examples',
	exampleSimplified: '.example-sim',
	exampleTraditional: '.example-trad',
	examplePinyin: '.example-pinyin',
	exampleTranslation: '.example-translation',
	audio: '#btnPlayAudio',
	hr: 'hr',
	controlButtons: '.modal-footer1'
};

// Canonical top-to-bottom order of the card body blocks. The customiser's
// move up/down stores an explicit `order` override; otherwise the index here
// (×10) is the default flex order. 'card' is excluded (it is the container).
export const DEFAULT_BODY_ORDER: CardElementId[] = [
	'controlButtons',
	'hr',
	'simplified',
	'traditional',
	'pinyin',
	'zhuyin',
	'partOfSpeech',
	'simpleMeaning',
	'definitions',
	'breakdown',
	'radical',
	'hskLevel',
	'frequency',
	'examples',
	'audio'
];

/** True when any card type shows `field` on its front or back. */
export function fieldUsedByAnyCard(tabContent: TabContent, field: string): boolean {
	return Object.values(tabContent).some(
		(c) => c.front.includes(`front${field}`) || c.back.includes(`back${field}`)
	);
}

/** Effective flex `order` for a body block: explicit override or canonical default. */
export function elementOrder(es: CardElementStyles, id: CardElementId): number {
	const ov = es[id]?.order;
	if (ov != null) return ov;
	const idx = DEFAULT_BODY_ORDER.indexOf(id);
	return (idx < 0 ? DEFAULT_BODY_ORDER.length : idx) * 10;
}

export const FONT_STACKS: Record<string, string> = {
	default: '',
	kaiti: '"Kaiti SC", "STKaiti", "KaiTi", "楷体", serif',
	songti: '"Songti SC", "STSong", "SimSun", "宋体", serif'
};

/** Per-element style → CSS declarations (no `order`; that is emitted separately). */
export function elementStyleToCSS(style: ElementStyle, fontStacks: Record<string, string>): string {
	const r: string[] = [];
	if (style.visible === false) r.push('display:none !important');
	if (style.fontSize) r.push(`font-size:${style.fontSize} !important`);
	if (style.fontFamily && style.fontFamily !== 'default') {
		const stack = fontStacks[style.fontFamily] ?? style.fontFamily;
		r.push(`font-family:${stack} !important`);
	}
	if (style.fontWeight) r.push(`font-weight:${style.fontWeight} !important`);
	if (style.color) r.push(`color:${style.color} !important`);
	if (style.textAlign) {
		// Position the block within the card window (card body is a flex column),
		// and align its inner text the same way.
		const as =
			style.textAlign === 'left' ? 'flex-start' : style.textAlign === 'right' ? 'flex-end' : 'center';
		r.push(`text-align:${style.textAlign} !important`);
		r.push(`align-self:${as} !important`);
	}
	if (style.marginTop) r.push(`margin-top:${style.marginTop} !important`);
	if (style.marginBottom) r.push(`margin-bottom:${style.marginBottom} !important`);
	if (style.backgroundColor) r.push(`background-color:${style.backgroundColor} !important`);
	if (style.padding) r.push(`padding:${style.padding} !important`);
	if (style.borderRadius) r.push(`border-radius:${style.borderRadius} !important`);
	if (style.letterSpacing) r.push(`letter-spacing:${style.letterSpacing} !important`);
	if (style.lineHeight) r.push(`line-height:${style.lineHeight} !important`);
	if (style.borderColor) r.push(`border-color:${style.borderColor} !important`);
	if (style.borderWidth) r.push(`border-width:${style.borderWidth} !important`);
	return r.join(';');
}

/** Deck-wide CSS: base cards + global hanzi font + the flex card-body container. */
export function buildGlobalCss(t: TemplateOpts): string {
	let css =
		'\n/* template customization */\n' +
		':root{--card-w:90%;}\n' +
		'.card-body{display:flex;flex-direction:column;align-items:center;width:100%;box-sizing:border-box;}\n' +
		'.simple-card{font-weight:600;padding:10px;margin:6px auto;width:var(--card-w);max-width:var(--card-w);box-sizing:border-box;border:1px solid var(--surface4);border-radius:8px;}\n' +
		'.simple-card:empty{display:none;border:0;}\n' +
		'.meaning-card{margin:6px auto;width:var(--card-w);max-width:var(--card-w);box-sizing:border-box;border:1px solid var(--surface4);border-radius:8px;padding:0;overflow:hidden;text-align:left;}\n' +
		'.meaning-bar{display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:6px 10px;font-size:0.8em;font-weight:600;color:var(--text2);background:var(--surface3);-webkit-user-select:none;user-select:none;}\n' +
		'.meaning-arrow{transition:transform 0.2s ease;display:inline-block;}\n' +
		'.meaning-bar.collapsed .meaning-arrow{transform:rotate(-90deg);}\n' +
		'.meaning-content{padding:10px;}\n' +
		'.pos-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:6px 0;}\n' +
		'.pos-row:empty{display:none;}\n' +
		'.pos-chip{font-size:11px;padding:3px 10px;border-radius:999px;border:1px solid #ccc;color:#666;}\n' +
		'.pos-chip.pos-dominant{background:#111;color:#fff;border-color:#111;}\n' +
		// Metadata badges (HSK level / frequency band)
		'.meta-badge{display:inline-block;font-size:0.66em;font-weight:600;letter-spacing:0.02em;padding:3px 10px;margin:4px auto;border-radius:999px;border:1px solid var(--surface4);color:var(--text2);}\n' +
		'.meta-badge:empty{display:none;border:0;padding:0;margin:0;}\n' +
		// Character breakdown (一 char per row: char · pinyin · gloss)
		'.breakdown-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:6px auto;width:var(--card-w);max-width:var(--card-w);box-sizing:border-box;}\n' +
		'.breakdown-row:empty{display:none;}\n' +
		'.bd-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 10px;border:1px solid var(--surface4);border-radius:8px;min-width:48px;}\n' +
		'.bd-char{font-size:1.4em;line-height:1;}\n' +
		'.bd-py{font-size:0.7em;color:var(--text2);}\n' +
		'.bd-def{font-size:0.68em;color:var(--text2);text-align:center;}\n' +
		// Radical chips (国 → 囗)
		'.radical-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:6px auto;}\n' +
		'.radical-row:empty{display:none;}\n' +
		'.radical-chip{display:inline-flex;align-items:center;gap:5px;font-size:0.8em;padding:3px 10px;border-radius:999px;border:1px solid var(--surface4);color:var(--text2);}\n' +
		'.radical-chip .radical-char{font-weight:600;color:var(--text1);}\n' +
		// Example sentences
		'.examples-row{margin:6px auto;width:var(--card-w);max-width:var(--card-w);box-sizing:border-box;text-align:left;}\n' +
		'.examples-row:empty{display:none;}\n' +
		'.example-item{font-size:0.85em;line-height:1.5;padding:6px 0;border-bottom:1px solid var(--surface4);}\n' +
		'.example-item:last-child{border-bottom:0;}\n' +
		'.example-trad,.example-sim{font-size:1em;}\n' +
		'.example-pinyin{font-size:0.85em;color:var(--text2);}\n' +
		'.example-translation{font-size:0.85em;color:var(--text2);}\n' +
		// Example hanzi/pinyin are tone-colored with their OWN `ex-tone*` classes so
		// the "Example sentences" sidebar section can turn them on/off independently
		// of the main card. `no-ex-hanzi-color` / `no-ex-pinyin-color` neutralise them.
		'.no-ex-hanzi-color .example-sim .ex-tone1,.no-ex-hanzi-color .example-sim .ex-tone2,.no-ex-hanzi-color .example-sim .ex-tone3,.no-ex-hanzi-color .example-sim .ex-tone4,.no-ex-hanzi-color .example-sim .ex-tone5,.no-ex-hanzi-color .example-trad .ex-tone1,.no-ex-hanzi-color .example-trad .ex-tone2,.no-ex-hanzi-color .example-trad .ex-tone3,.no-ex-hanzi-color .example-trad .ex-tone4,.no-ex-hanzi-color .example-trad .ex-tone5{color:inherit !important;}\n' +
		'.no-ex-pinyin-color .example-pinyin .ex-tone1,.no-ex-pinyin-color .example-pinyin .ex-tone2,.no-ex-pinyin-color .example-pinyin .ex-tone3,.no-ex-pinyin-color .example-pinyin .ex-tone4,.no-ex-pinyin-color .example-pinyin .ex-tone5{color:inherit !important;}\n';

	const globalStack = FONT_STACKS[t.font];
	if (globalStack) {
		css += `.char-card,.char,#char-sim-id,#char-trad-id{font-family:${globalStack} !important;}\n`;
	}

	// Tone palette override. Re-points the --tone-N vars (drive .char-toneN /
	// writer strokes) and the flat .toneN pinyin classes. Lower specificity than
	// the no-hanzi-color / no-pinyin-color "inherit" rules, so the colour toggles
	// still win.
	const palette = resolvePalette(t.tonePreset, t.toneColors ?? STANDARD_TONES);
	const rootVars = TONE_KEYS.map((k) => `--tone-${k}:${palette[k]};`).join('');
	css += `:root{${rootVars}}\n`;
	css += TONE_KEYS.map((k) => `.tone${k}{color:${palette[k]};}`).join('') + '\n';
	// Example-sentence tone palette (independent of the main card colors).
	css += TONE_KEYS.map((k) => `.ex-tone${k}{color:${palette[k]};}`).join('') + '\n';

	return css;
}

/** Per-card-type CSS: element style overrides + flex order, scoped to `.ctN`. */
export function buildCardCss(es: CardElementStyles, ctClass: string): string {
	let css = '';
	const pre = `.${ctClass}`;

	// Visual style overrides.
	for (const [id, style] of Object.entries(es ?? {})) {
		const sel = SCOPED_SELECTORS[id as CardElementId];
		if (sel === undefined || !style) continue;
		const rules = elementStyleToCSS(style, FONT_STACKS);
		if (!rules) continue;
		css += id === 'card' ? `${pre}{${rules};}\n` : `${pre} ${sel}{${rules};}\n`;
	}

	// Flex order for every body block (so a moved element interleaves correctly).
	for (const id of DEFAULT_BODY_ORDER) {
		const sel = SCOPED_SELECTORS[id];
		css += `${pre} ${sel}{order:${elementOrder(es, id)};}\n`;
	}

	return css;
}

// ---------------------------------------------------------------------------
// Definition formatting (pure)
// ---------------------------------------------------------------------------

// Formats a raw CEDICT definition string for card display:
//   - Extracts CL: classifier lists → rendered as measure-word chips
//   - Splits semicolon-separated senses → numbered when multiple
export function formatDefinition(raw: string): string {
	const classifiers: Array<{ chars: string; pin: string }> = [];

	const cleaned = raw
		.replace(/\bCL:([^;)]+)/g, (_match, list) => {
			for (const item of list.split(',')) {
				const t = item.trim();
				if (!t) continue;
				const pinMatch = t.match(/\[([^\]]+)\]/);
				classifiers.push({
					chars: t.replace(/\[[^\]]+\]/, '').trim(),
					pin: pinMatch ? pinMatch[1] : ''
				});
			}
			return '';
		})
		.replace(/\(\s*\)/g, '')
		.replace(/;\s*;/g, ';')
		.replace(/^[;\s,]+|[;\s,]+$/g, '')
		.trim();

	const defs = cleaned.split(/\s*;\s*/).filter(Boolean);
	let html =
		defs.length <= 1
			? (defs[0] ?? '')
			: defs.map((d, i) => `<span class="def-num">${i + 1}.</span> ${d}`).join('<br>');

	if (classifiers.length > 0) {
		const chips = classifiers
			.map(({ chars, pin }) => {
				const parts = chars.split('|');
				const display =
					parts.length > 1 ? `${parts[0]}<span class="cl-simp">/${parts[1]}</span>` : parts[0];
				return `<span class="cl-chip">${display}<span class="cl-pin">${pin}</span></span>`;
			})
			.join('');
		html += `<div class="cl-row"><span class="cl-label">measure word</span>${chips}</div>`;
	}

	return html;
}

// Display-field markup, shared by front and back so both honor the user's order.
export const FIELD_DIV: Record<string, string> = {
	Simplified: `<div id="char_sim" class="char-card">{{Simplified}}</div>`,
	Traditional: `<div id="char_trad" class="char-card">{{Traditional}}</div>`,
	Pinyin: `<div id="char_pinyin">{{Pinyin}}</div>`,
	Zhuyin: `<div id="char_zhuyin">{{Zhuyin}}</div>`,
	PartOfSpeech: `<div id="char_pos" class="pos-row">{{PartOfSpeech}}</div>`,
	SimpleMeaning: `<div id="char_simple" class="simple-card">{{SimpleMeaning}}</div>`,
	Definitions: CONSTANTS.MEANING_CARD,
	Breakdown: `<div id="char_breakdown" class="breakdown-row">{{Breakdown}}</div>`,
	Radical: `<div id="char_radical" class="radical-row">{{Radical}}</div>`,
	HskLevel: `<div id="char_hsk" class="meta-badge meta-hsk">{{HskLevel}}</div>`,
	Frequency: `<div id="char_freq" class="meta-badge meta-freq">{{Frequency}}</div>`,
	// Examples is always a collapsible card (same chrome as Definitions).
	Examples: CONSTANTS.EXAMPLES_CARD
};

// Toggle id (sidebar checkbox) for each display field, used to seed default-off.
export const FIELD_TOGGLE: Record<string, string> = {
	Simplified: 'text-sim',
	Traditional: 'text-trad',
	Pinyin: 'text-pinyin',
	Zhuyin: 'text-zhuyin',
	PartOfSpeech: 'text-pos',
	SimpleMeaning: 'text-simple',
	Definitions: 'text-meaning',
	Breakdown: 'text-breakdown',
	Radical: 'text-radical',
	HskLevel: 'text-hsk',
	Frequency: 'text-freq',
	Examples: 'text-examples'
};

// ---------------------------------------------------------------------------
// Note-template (qfmt/afmt) + CSS builder — the heart of the exporter
// ---------------------------------------------------------------------------

export interface BuildTemplatesResult {
	flds: { name: string }[];
	req: any[];
	tmpls: { name: string; qfmt: string; afmt: string }[];
	css: string;
	usesWriter: boolean;
}

export function buildNoteTemplates(opts: {
	fields: string[];
	tabContent: TabContent;
	includeAudio: boolean;
	template: TemplateOpts;
}): BuildTemplatesResult {
	const { tabContent, includeAudio, template } = opts;

	// Only ship fields that some card actually uses (front or back). Audio is the
	// play button gated by includeAudio, never a front/back selection — keep it.
	// This keeps unselected fields (e.g. example sentences + their fetched data and
	// sidebar section) out of the deck entirely instead of shipping them hidden.
	const fields = opts.fields.filter(
		(f) => f === FIELDS.AUDIO || fieldUsedByAnyCard(tabContent, f)
	);

	// Seed runtime defaults (body classes + collapse default) before each template.
	const noHanziColor = template.mono || !template.colorHanzi;
	const noPinyinColor = template.mono || !template.colorPinyin;
	const ex = template.exampleOptions ?? DEFAULT_EXAMPLE_OPTIONS;
	const noExHanziColor = template.mono || !ex.colorizeHanzi;
	const noExPinyinColor = template.mono || !ex.colorizePinyin;
	const colorDefaultScript =
		`<script>(function(){var b=document.body;${noHanziColor ? 'b.classList.add("no-hanzi-color");' : ''}${
			noPinyinColor ? 'b.classList.add("no-pinyin-color");' : ''
		}${noExHanziColor ? 'b.classList.add("no-ex-hanzi-color");' : ''}${
			noExPinyinColor ? 'b.classList.add("no-ex-pinyin-color");' : ''
		}window.MEANING_COLLAPSE_DEFAULT=${template.collapseDict ? 'true' : 'false'};})();</script>\n`;

	const flds: { name: string }[] = [];
	const req: any[] = [];
	const tmpls: { name: string; qfmt: string; afmt: string }[] = [];

	const filteredFields = includeAudio ? fields : fields.filter((f) => f !== FIELDS.AUDIO);
	filteredFields.forEach((f) => flds.push({ name: f }));

	let usesWriter = false;
	let cardCss = '';
	let ri = 0;
	let ci = 0;
	for (const card in tabContent) {
		req.push([ri, 'any', [ri]]);
		ri++;
		const ct = `ct${ci}`;
		ci++;

		const frontSel = tabContent[card]['front'];

		let hideSimp = true;
		let hideTrad = true;
		let hidePin = true;
		let hideZhu = true;
		let hideDef = true;

		for (const front of frontSel) {
			if (front.includes('Simplified')) hideSimp = false;
			if (front.includes('Traditional')) hideTrad = false;
			if (front.includes('Pinyin')) hidePin = false;
			if (front.includes('Zhuyin')) hideZhu = false;
			if (front.includes('Definitions') && !front.includes('SimpleMeaning')) hideDef = false;
		}

		// Build the front in the user's field order (Definitions included in place).
		const addToFront: string[] = [];
		for (const f of fields) {
			if (!frontSel.includes(`front${f}`)) continue;
			if (FIELD_DIV[f]) addToFront.push(FIELD_DIV[f]);
		}

		// When Definitions is shown, hide the dictionary's internal sim/pinyin/etc
		// for fields the user did not also select on the front.
		const hides: string[] = [];
		if (!hideDef) {
			if (hideSimp) hides.push('char_sim');
			if (hideTrad) hides.push('char_trad');
			if (hidePin) hides.push('char_pinyin');
			if (hideZhu) hides.push('char_zhuyin');
		}

		let hideScript = `
<script>
var hideList = ['${hides.join("', '")}'];

function showHide(type, isShow, style = "inline") {
    if (isShow) {
        document.querySelectorAll(type).forEach(function (val) {
            val.style.display = style;
        });
    } else {
        document.querySelectorAll(type).forEach(function (val) {
            val.style.display = 'none';
        });
    }
}

for (var _hide of hideList) {
    var el = document.getElementById(_hide);
    if (el) {
        el.style.display = "none";
    }

    if (_hide == "char_pinyin") {
        showHide(".pinyin", false);
    }
    if (_hide == "char_zhuyin") {
        showHide(".zhuyin", false);
    }
    if (_hide == "char_sim") {
        showHide("#char-sim-id", false);
    }
    if (_hide == "char_trad") {
        showHide("#char-trad-id", false);
        showHide(".sep", false);
    }
}
</script>`;

		hideScript = hideDef ? '' : hideScript;

		// Front colored-hanzi source: colorChars() copies tone spans from
		// #char-sim-id, which lives inside the Definitions markup. If the user
		// shows Simplified/Traditional on the front but NOT Definitions, include
		// the Definitions value hidden so the big hanzi still gets tone-colored.
		const frontHasHanzi =
			frontSel.includes('frontSimplified') || frontSel.includes('frontTraditional');
		const frontHasDef = frontSel.includes('frontDefinitions');
		const colorSource =
			frontHasHanzi && !frontHasDef && fields.includes('Definitions')
				? `<div class="char-color-src" style="display:none">{{Definitions}}</div>\n`
				: '';

		const frontBody = `<div class="${ct} card-body">\n${addToFront.join('\n')}\n${colorSource}</div>`;
		let QFMT = frontBody + hideScript + CONSTANTS.DECK_HTML_FRONT;

		// Create dynamic back template based on includeAudio setting
		let AFMT = CONSTANTS.DECK_HTML_BACK;
		if (!includeAudio) {
			// Remove audio div and play button if audio is not included
			AFMT = AFMT.replace(`<div id='audio' style='display:none'>{{Audio}}</div>`, '');
			AFMT = AFMT.replace(
				`    <a class="btn" id='btnPlayAudio'>
        <div class="icon">
            <i class="material-icons">play_arrow</i>
        </div>
    </a>`,
				''
			);
		}

		// Wrap the visible back body (controls → audio → hr → fields) in a flex
		// card-body so per-card `order` can reposition the hr / control buttons.
		AFMT = AFMT.replace(
			'<div class="modal-footer1">',
			`<div class="${ct} card-body"><div class="modal-footer1">`
		);

		const backSel = tabContent[card]['back'];

		// Build the back's display fields in the user's field order; every field is
		// present so the sidebar can toggle it, but fields not selected for the back
		// start hidden (seeded into defaultOff, below). Close the card-body wrapper.
		const backFieldsHtml = fields
			.filter((f) => FIELD_DIV[f])
			.map((f) => FIELD_DIV[f])
			.join('\n');
		AFMT = AFMT.replace('<!--FIELDS-->', backFieldsHtml + '\n</div>');

		const defaultOff = fields
			.filter((f) => FIELD_DIV[f] && !backSel.includes(`back${f}`))
			.map((f) => FIELD_TOGGLE[f]);
		AFMT = AFMT.replace('var defaultOff = [];', `var defaultOff = ${JSON.stringify(defaultOff)};`);

		// Writing component: independent front and back placement.
		const writingFront = frontSel.includes('frontwritingComponent');
		const writingBack = backSel.includes('backwritingComponent');
		if (writingFront || writingBack) {
			usesWriter = true;
			let writerTpl = CONSTANTS.DECK_HTML_WITH_HANZI_WRITER;
			if (!includeAudio) {
				writerTpl = writerTpl.replace(`<div id='audio' style='display:none'>{{Audio}}</div>`, '');
				writerTpl = writerTpl.replace(
					`    <a class="btn" id='btnPlayAudio'>
        <div class="icon"><i class="material-icons">play_arrow</i></div>
    </a>`,
					''
				);
			}
			// Simple meaning sits below the writer controls and above the dictionary.
			if (flds.some((x) => x.name === 'SimpleMeaning')) {
				writerTpl = writerTpl.replace(
					CONSTANTS.MEANING_CARD,
					`<div id="char_simple" class="simple-card">{{SimpleMeaning}}</div>\n${CONSTANTS.MEANING_CARD}`
				);
			}
			// Wrap so per-card element styles still scope to this template.
			writerTpl = `<div class="${ct}">\n${writerTpl}\n</div>`;
			if (writingFront) QFMT = writerTpl;
			if (writingBack)
				AFMT = writingFront ? `<div class="${ct}"><div id="back">{{FrontSide}}</div></div>` : writerTpl;
		}

		// When Simplified and Traditional are identical, hide the redundant
		// traditional display so the card shows a single hanzi (runtime check).
		const dedupeScript = `
<script>
(function () {
    var s = document.getElementById('char_sim');
    var t = document.getElementById('char_trad');
    if (s && t) {
        var a = s.textContent.trim();
        var b = t.textContent.replace(/[〔〕\\s]/g, '');
        if (a && a === b) { t.style.display = 'none'; }
    }
})();
</script>`;
		QFMT = colorDefaultScript + QFMT + dedupeScript;
		AFMT = colorDefaultScript + AFMT + dedupeScript;

		tmpls.push({ name: card, qfmt: QFMT, afmt: AFMT });

		cardCss += buildCardCss(tabContent[card].elementStyles ?? {}, ct);
	}

	const css = buildGlobalCss(template) + cardCss;
	return { flds, req, tmpls, css, usesWriter };
}
