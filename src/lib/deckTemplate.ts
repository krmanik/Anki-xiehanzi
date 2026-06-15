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
import { CARD_THEME_MAP, CARD_THEME_GROUP_MAP, mergeElementStyles, resolveTheme } from './cardThemes';

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
		// Optional element groups — styleable row/column containers. Members render
		// inside the container; the export scopes each via a `.gN` class under `.ctN`.
		groups?: CardGroup[];
	};
}

// A styleable container grouping several body elements into one row/column.
export interface CardGroup {
	id: string; // unique within the card, e.g. 'g0' → CSS class .g0
	members: CardElementId[]; // body elements placed inside, in order
	display: 'flex' | 'block'; // flex = members share a line/column; block = stacked
	direction: 'row' | 'column'; // flex-direction when display is 'flex'
	style: ElementStyle; // border / background / padding / margin / radius / shadow
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
	borderColor?: string; // border / hr color
	borderWidth?: string; // border / hr thickness e.g. '1px', '2px'
	borderStyle?: string; // 'solid' | 'dashed' | 'dotted' — box border (group containers)
	boxShadow?: string; // e.g. '0 2px 6px rgba(0,0,0,0.18)'
	backgroundImage?: string; // CSS gradient e.g. 'linear-gradient(…)'
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
	cardTheme: string;      // '' = none, else a CARD_THEME_GROUPS id
	cardThemeMode: 'auto' | 'light' | 'dark';
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
	elementStyles: {},
	cardTheme: '',
	cardThemeMode: 'auto'
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

/**
 * Effective flex `order` for a body block: explicit override, else the position
 * in `bodyOrder` (the user's field sequence) × 10. Falls back to the canonical
 * order when no sequence is supplied.
 */
export function elementOrder(
	es: CardElementStyles,
	id: CardElementId,
	bodyOrder: CardElementId[] = DEFAULT_BODY_ORDER
): number {
	const ov = es[id]?.order;
	if (ov != null) return ov;
	const idx = bodyOrder.indexOf(id);
	return (idx < 0 ? bodyOrder.length : idx) * 10;
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
	if (style.backgroundImage) r.push(`background-image:${style.backgroundImage} !important`);
	if (style.padding) r.push(`padding:${style.padding} !important`);
	if (style.borderRadius) r.push(`border-radius:${style.borderRadius} !important`);
	if (style.letterSpacing) r.push(`letter-spacing:${style.letterSpacing} !important`);
	if (style.lineHeight) r.push(`line-height:${style.lineHeight} !important`);
	if (style.borderColor) r.push(`border-color:${style.borderColor} !important`);
	if (style.borderWidth) r.push(`border-width:${style.borderWidth} !important`);
	if (style.borderStyle) r.push(`border-style:${style.borderStyle} !important`);
	if (style.boxShadow) r.push(`box-shadow:${style.boxShadow} !important`);
	return r.join(';');
}

/** Deck-wide CSS: base cards + global hanzi font + the flex card-body container. */
export function buildGlobalCss(t: TemplateOpts): string {
	let css =
		'\n/* template customization */\n' +
		':root{--card-w:90%;}\n' +
		'.card-body{display:flex;flex-direction:column;align-items:center;width:100%;box-sizing:border-box;}\n' +
		'.simple-content{padding:10px;font-weight:600;}\n' +
		// Panels (definitions / examples / titled info cards) are themable: flat themes
		// drop the box (border:none + a hairline divider), boxed themes keep it.
		'.meaning-card{margin:6px auto;width:var(--card-w);max-width:var(--card-w);box-sizing:border-box;border:var(--panel-border,1.5px solid var(--surface4));border-top:var(--panel-divider,var(--panel-border,1.5px solid var(--surface4)));background:var(--panel-bg,transparent);border-radius:var(--container-radius,16px);padding:0;overflow:hidden;text-align:left;}\n' +
		'.meaning-bar{display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:8px 12px;font-size:var(--section-title-size,0.8em);font-weight:var(--section-title-weight,700);text-transform:var(--section-title-transform,none);letter-spacing:var(--section-title-spacing,normal);color:var(--section-title-color,var(--accent));background:var(--panel-title-bg,var(--surface3));border-bottom:var(--section-title-border,none);-webkit-user-select:none;user-select:none;}\n' +
		'.meaning-arrow{transition:transform 0.2s ease;display:inline-block;}\n' +
		'.meaning-bar.collapsed .meaning-arrow{transform:rotate(-90deg);}\n' +
		'.meaning-content{padding:12px;}\n' +
		// Divider between successive readings (each is one .meaning-container).
		'.meaning-content .meaning-container + .meaning-container{margin-top:10px;padding-top:10px;border-top:1px solid var(--surface4);}\n' +
		// Meta chip row: part-of-speech + HSK + frequency share one wrapping row.
		// `.meta-row` (the synthetic cluster) is laid out by per-card group CSS; the
		// margin lives here so the cluster keeps its vertical breathing room.
		'.meta-row{margin:8px auto;align-items:center;}\n' +
		'.pos-row{display:inline-flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;margin:0;}\n' +
		'.pos-row:empty{display:none;}\n' +
		// POS: soft outline pill; the dominant sense gets a solid accent fill. Chips
		// are inline-flex with line-height:1 so they vertically center against the
		// HSK / frequency badges on the same row.
		'.pos-chip{display:inline-flex;align-items:center;line-height:1;font-size:0.66em;font-weight:600;letter-spacing:0.02em;text-transform:var(--pos-chip-transform,none);padding:var(--pos-chip-pad,5px 11px);margin-left:2px;border-radius:var(--chip-radius,999px);background:var(--pos-chip-bg,var(--surface3));color:var(--pos-chip-fg,var(--text2));border:var(--pos-chip-border,1px solid var(--surface4));}\n' +
		'.pos-chip.pos-dominant{background:var(--chip-bg,var(--text1));color:var(--chip-fg,var(--surface2));border:var(--chip-border,1px solid transparent);border-bottom:var(--pos-dominant-underline,0 solid transparent);}\n' +
		// Metadata badges (HSK level / frequency band) — distinct tinted pills that
		// sit on the same row as the POS chips (matching box model for alignment).
		'.meta-badge{display:inline-flex;align-items:center;line-height:1;font-size:0.66em;font-weight:600;letter-spacing:0.02em;padding:5px 11px;margin:0;border-radius:var(--chip-radius,999px);border:1px solid transparent;}\n' +
		'.meta-badge:empty{display:none;border:0;padding:0;margin:0;}\n' +
		'.meta-hsk{background:var(--hsk-bg,rgba(33,150,243,0.14));color:var(--hsk-fg,#1976d2);border-color:var(--hsk-border,rgba(33,150,243,0.35));}\n' +
		'.meta-freq{background:var(--freq-bg,rgba(255,152,0,0.16));color:var(--freq-fg,#e07b00);border-color:var(--freq-border,rgba(255,152,0,0.38));}\n' +
		'.night_mode .meta-hsk{color:var(--hsk-fg,#7ec1ff);}\n' +
		'.night_mode .meta-freq{color:var(--freq-fg,#ffc266);}\n' +
		// Titled info cards (breakdown / radical): a card-in-card with a header bar.
		// The id wrapper hides itself when its field value is empty.
		'.info-card{margin:8px auto;width:var(--card-w);max-width:var(--card-w);box-sizing:border-box;border:var(--panel-border,1.5px solid var(--surface4));border-top:var(--panel-divider,var(--panel-border,1.5px solid var(--surface4)));background:var(--panel-bg,transparent);border-radius:var(--container-radius,16px);overflow:hidden;}\n' +
		'.info-card:empty{display:none;border:0;}\n' +
		'.info-card-title{padding:8px 12px;font-size:var(--section-title-size,0.8em);font-weight:var(--section-title-weight,700);text-transform:var(--section-title-transform,none);letter-spacing:var(--section-title-spacing,normal);color:var(--section-title-color,var(--accent));background:var(--panel-title-bg,var(--surface3));border-bottom:var(--section-title-border,none);text-align:left;}\n' +
		// Character breakdown: one compact tile per component char (char · pinyin · gloss).
		'.breakdown-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:12px;}\n' +
		'.bd-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 12px;min-width:56px;background:var(--tile-bg,var(--surface3));border:var(--tile-border,1px solid var(--surface4));border-radius:var(--container-radius,10px);}\n' +
		'.bd-char{font-size:1.5em;line-height:1;font-weight:600;}\n' +
		'.bd-py{font-size:0.7em;color:var(--text2);}\n' +
		'.bd-def{font-size:0.66em;color:var(--text2);text-align:center;line-height:1.2;}\n' +
		// Radical chips (国 │ 囗) — component char, a thin divider, then its radical.
		'.radical-row{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:12px;}\n' +
		'.radical-chip{display:inline-flex;align-items:center;gap:6px;font-size:0.72em;padding:4px 10px;border-radius:var(--radical-chip-radius,999px);background:var(--radical-chip-bg,var(--surface3));border:var(--radical-chip-border,1px solid var(--surface4));color:var(--text2);}\n' +
		'.radical-chip .radical-char{font-weight:700;color:var(--text1);}\n' +
		'.radical-chip .radical-rad{padding-left:6px;border-left:1px solid var(--surface4);font-size:1.05em;color:var(--radical-rad-color,inherit);}\n' +
		// Example sentences — each sentence is a mini card (matches reference design)
		'.examples-row{margin:6px auto;width:var(--card-w);max-width:var(--card-w);box-sizing:border-box;text-align:left;display:flex;flex-direction:column;gap:12px;}\n' +
		'.examples-row:empty{display:none;}\n' +
		'.example-item{font-size:0.85em;line-height:1.5;padding:var(--example-item-pad,10px 14px);background:var(--example-item-bg,transparent);border:var(--example-item-border,none);border-left:var(--example-item-left,var(--example-item-border,none));border-radius:var(--container-radius,16px);}\n' +
		'.example-trad,.example-sim{font-size:1em;}\n' +
		'.example-pinyin{font-size:0.85em;color:var(--text2);margin-top:2px;}\n' +
		'.example-translation{font-size:0.85em;color:var(--text2);margin-top:1px;}\n' +
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

	// Card theme: emit CSS vars scoped to `.card`; auto mode also emits `.card.night_mode`.
	if (t.cardTheme) {
		const group = CARD_THEME_GROUP_MAP.get(t.cardTheme);
		if (group) {
			const mode = t.cardThemeMode ?? 'auto';
			const lightTheme = group.lightId ? CARD_THEME_MAP.get(group.lightId) : undefined;
			const darkTheme  = group.darkId  ? CARD_THEME_MAP.get(group.darkId)  : undefined;
			const baseTheme  = mode === 'dark' ? (darkTheme ?? lightTheme) : (lightTheme ?? darkTheme);
			if (baseTheme) {
				const vars = Object.entries(baseTheme.cssVars).map(([k, v]) => `${k}:${v}`).join(';');
				// Define vars on body too so body{background-color:var(...)} can resolve them.
				css += `body,.card{${vars};}\n`;
				css += `body{background-color:var(--body-bg,var(--surface2));background-image:var(--body-bg-image,none);background-attachment:fixed;}\n`;
				// Light-only mode: lock body bg even when Anki flips to night_mode.
				if (mode === 'light') {
					css += `body.night_mode{background-color:var(--body-bg,var(--surface2)) !important;background-image:var(--body-bg-image,none) !important;}\n`;
				}
			}
			// Auto + both variants: dark vars activate under Anki night mode.
			if (mode === 'auto' && lightTheme && darkTheme) {
				const dv = Object.entries(darkTheme.cssVars).map(([k, v]) => `${k}:${v}`).join(';');
				css += `body.night_mode,.card.night_mode{${dv};}\n`;
				css += `body.night_mode{background-color:var(--body-bg,var(--surface2)) !important;background-image:var(--body-bg-image,none) !important;}\n`;
			}
		}
	}

	return css;
}

/** Per-card-type CSS: element style overrides + flex order, scoped to `.ctN`. */
export function buildCardCss(
	es: CardElementStyles,
	ctClass: string,
	groups: CardGroup[] = [],
	bodyOrder: CardElementId[] = DEFAULT_BODY_ORDER
): string {
	let css = '';
	const pre = `.${ctClass}`;

	// Visual style overrides. Strip card box-model and fill from exported CSS — card merges with body
	// (body bg = card bg via CSS vars; no border/radius/shadow avoids a visible floating box).
	for (const [id, style] of Object.entries(es ?? {})) {
		const sel = SCOPED_SELECTORS[id as CardElementId];
		if (sel === undefined || !style) continue;
		const effectiveStyle = id === 'card' ? {
			...style,
			backgroundColor: undefined,
			borderColor: undefined,
			borderWidth: undefined,
			borderStyle: undefined,
			borderRadius: undefined,
			boxShadow: undefined
		} : style;
		const rules = elementStyleToCSS(effectiveStyle, FONT_STACKS);
		if (!rules) continue;
		css += id === 'card' ? `${pre}{${rules};}\n` : `${pre} ${sel}{${rules};}\n`;
	}

	// Flex order for every body block (driven by the user's field sequence).
	for (const id of DEFAULT_BODY_ORDER) {
		const sel = SCOPED_SELECTORS[id];
		css += `${pre} ${sel}{order:${elementOrder(es, id, bodyOrder)};}\n`;
	}

	// Group containers: layout (flex row/column or block) + box style + flex order.
	for (const g of groups) {
		const decls: string[] = [];
		if (g.display === 'flex') {
			decls.push('display:flex', `flex-direction:${g.direction}`);
			decls.push('gap:8px', 'flex-wrap:wrap');
			decls.push(g.direction === 'row' ? 'align-items:center;justify-content:center' : 'align-items:center');
		} else {
			decls.push('display:block');
		}
		decls.push('box-sizing:border-box');
		decls.push(`order:${groupOrder(es, g, bodyOrder)}`);
		const styleRules = elementStyleToCSS(g.style ?? {}, FONT_STACKS);
		const extra = styleRules ? ';' + styleRules : '';
		css += `${pre} .${g.id}{${decls.join(';')}${extra};}\n`;
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
	// Simple meaning, breakdown and radical are titled cards-in-card. The field
	// value carries the header + body markup (or '' when empty), so the id wrapper
	// self-hides via `.info-card:empty`.
	SimpleMeaning: `<div id="char_simple" class="info-card">{{SimpleMeaning}}</div>`,
	Definitions: CONSTANTS.MEANING_CARD,
	Breakdown: `<div id="char_breakdown" class="info-card">{{Breakdown}}</div>`,
	Radical: `<div id="char_radical" class="info-card">{{Radical}}</div>`,
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

// Field name → body element id, for resolving group membership during assembly.
export const FIELD_TO_ELEMENT: Record<string, CardElementId> = {
	Simplified: 'simplified',
	Traditional: 'traditional',
	Pinyin: 'pinyin',
	Zhuyin: 'zhuyin',
	PartOfSpeech: 'partOfSpeech',
	SimpleMeaning: 'simpleMeaning',
	Definitions: 'definitions',
	Breakdown: 'breakdown',
	Radical: 'radical',
	HskLevel: 'hskLevel',
	Frequency: 'frequency',
	Examples: 'examples'
};

// Layout tokens (used in the reorderable field list) → body element id. Includes
// the chrome (control buttons + separator) so they can be reordered like fields.
export const CONTROL_BUTTONS_TOKEN = 'ControlButtons';
export const SEPARATOR_TOKEN = 'Separator';
export const LAYOUT_TO_ELEMENT: Record<string, CardElementId> = {
	[CONTROL_BUTTONS_TOKEN]: 'controlButtons',
	[SEPARATOR_TOKEN]: 'hr',
	...FIELD_TO_ELEMENT
};

/** Body element order from a layout token list, ensuring chrome is always present. */
export function bodyOrderFromLayout(order: string[]): CardElementId[] {
	const out = order.map((o) => LAYOUT_TO_ELEMENT[o]).filter(Boolean) as CardElementId[];
	if (!out.includes('hr')) out.unshift('hr');
	if (!out.includes('controlButtons')) out.unshift('controlButtons');
	return out;
}

/** Effective flex order of a group: the smallest order among its members. */
export function groupOrder(
	es: CardElementStyles,
	group: CardGroup,
	bodyOrder: CardElementId[] = DEFAULT_BODY_ORDER
): number {
	const orders = group.members.map((m) => elementOrder(es, m, bodyOrder));
	return orders.length ? Math.min(...orders) : bodyOrder.length * 10;
}

/**
 * Wrap grouped members of an ordered field list into their container divs. Each
 * field's HTML is keyed by name; grouped fields are collected into a single
 * `<div class="gN">…</div>` emitted where the group's first present member sits.
 */
export function wrapGroups(
	orderedFields: string[],
	htmlByField: Record<string, string>,
	groups: CardGroup[]
): string {
	if (!groups || groups.length === 0) {
		return orderedFields
			.map((f) => htmlByField[f])
			.filter(Boolean)
			.join('\n');
	}
	const groupOf = new Map<CardElementId, string>();
	for (const g of groups) for (const m of g.members) groupOf.set(m, g.id);

	// Collect each group's present member HTML in field order.
	const children = new Map<string, string[]>();
	for (const f of orderedFields) {
		const html = htmlByField[f];
		if (!html) continue;
		const gid = groupOf.get(FIELD_TO_ELEMENT[f]);
		if (gid) {
			if (!children.has(gid)) children.set(gid, []);
			children.get(gid)!.push(html);
		}
	}

	const out: string[] = [];
	const emitted = new Set<string>();
	for (const f of orderedFields) {
		const html = htmlByField[f];
		if (!html) continue;
		const gid = groupOf.get(FIELD_TO_ELEMENT[f]);
		if (gid) {
			if (!emitted.has(gid)) {
				emitted.add(gid);
				out.push(`<div class="${gid}">\n${children.get(gid)!.join('\n')}\n</div>`);
			}
		} else {
			out.push(html);
		}
	}
	return out.join('\n');
}

// Part-of-speech, HSK level and frequency read as one compact meta line, so by
// default they share a single wrapping row. This is purely presentational: when
// the user has not placed these elements in a group of their own, synthesize a
// `meta-row` cluster that flows through the same group machinery (assembly +
// CSS + preview). The cluster renders at the earliest present member's slot.
export const META_CLUSTER_ID = 'meta-row';
const META_CLUSTER_MEMBERS: CardElementId[] = ['partOfSpeech', 'hskLevel', 'frequency'];
// Field name for each meta member (reverse of FIELD_TO_ELEMENT for this trio).
const ELEMENT_TO_FIELD: Partial<Record<CardElementId, string>> = {
	partOfSpeech: FIELDS.PART_OF_SPEECH,
	hskLevel: FIELDS.HSK_LEVEL,
	frequency: FIELDS.FREQUENCY
};

/**
 * User groups plus the synthetic meta cluster. The cluster holds the meta members
 * that are both ungrouped and present (`present` defaults to all three). Limiting
 * it to present members keeps the cluster's flex order anchored to a member that
 * actually renders, so a lone chip is never pulled up into the POS slot.
 */
export function withMetaCluster(
	groups: CardGroup[],
	present: CardElementId[] = META_CLUSTER_MEMBERS
): CardGroup[] {
	const grouped = new Set((groups ?? []).flatMap((g) => g.members));
	const presentSet = new Set(present);
	const members = META_CLUSTER_MEMBERS.filter((m) => !grouped.has(m) && presentSet.has(m));
	// A lone chip needs no row wrapper; only cluster when two or more travel together.
	if (members.length < 2) return groups ?? [];
	return [
		...(groups ?? []),
		{ id: META_CLUSTER_ID, members, display: 'flex', direction: 'row', style: {} }
	];
}

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
	/** Full layout order (incl. ControlButtons/Separator tokens) for flex order. */
	order?: string[];
}): BuildTemplatesResult {
	const { tabContent, includeAudio, template } = opts;

	// The writing component's template hardcodes the sim/trad/pinyin/zhuyin divs and
	// the dictionary (Definitions) card, referencing those fields regardless of the
	// front/back selection. If a card uses the writer, those fields must stay in the
	// model or Anki rejects the template ("there is no field called 'Zhuyin'").
	const WRITER_BUILTIN_FIELDS: string[] = [
		FIELDS.SIMPLIFIED,
		FIELDS.TRADITIONAL,
		FIELDS.PINYIN,
		FIELDS.ZHUYIN,
		FIELDS.DEFINITIONS
	];
	const writerUsed = Object.values(tabContent).some(
		(c) => c.front.includes('frontwritingComponent') || c.back.includes('backwritingComponent')
	);

	// Only ship fields that some card actually uses (front or back). Audio is the
	// play button gated by includeAudio, never a front/back selection — keep it.
	// This keeps unselected fields (e.g. example sentences + their fetched data and
	// sidebar section) out of the deck entirely instead of shipping them hidden.
	const fields = opts.fields.filter(
		(f) =>
			f === FIELDS.AUDIO ||
			fieldUsedByAnyCard(tabContent, f) ||
			(writerUsed && WRITER_BUILTIN_FIELDS.includes(f))
	);

	// A writer-builtin field can be missing from opts.fields entirely (removed from
	// the layout, not just deselected). The hardcoded writer template still emits its
	// `{{Field}}`, so the field must exist in the model — append any that are absent.
	if (writerUsed) {
		for (const f of WRITER_BUILTIN_FIELDS) {
			if (!fields.includes(f)) fields.push(f);
		}
	}

	// Flex order follows the user's layout sequence (chrome + fields, reorderable).
	const bodyOrder: CardElementId[] = opts.order
		? bodyOrderFromLayout(opts.order)
		: ['controlButtons', 'hr', ...opts.fields.map((f) => FIELD_TO_ELEMENT[f]).filter(Boolean)];

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

		// Meta fields present on either side of this card type drive the cluster.
		const backSelEarly = tabContent[card]['back'];
		const metaPresent = META_CLUSTER_MEMBERS.filter((el) => {
			const f = ELEMENT_TO_FIELD[el];
			return frontSel.includes(`front${f}`) || backSelEarly.includes(`back${f}`);
		});
		const groups = withMetaCluster(tabContent[card].groups ?? [], metaPresent);

		// Build the front in the user's field order (Definitions included in place),
		// wrapping any grouped members into their container.
		const frontOrder: string[] = [];
		const frontHtml: Record<string, string> = {};
		for (const f of fields) {
			if (!frontSel.includes(`front${f}`)) continue;
			if (FIELD_DIV[f]) {
				frontOrder.push(f);
				frontHtml[f] = FIELD_DIV[f];
			}
		}
		const addToFront = wrapGroups(frontOrder, frontHtml, groups);

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

		const backSel = tabContent[card]['back'];

		// The control bar (with its play button) + audio data div. Drop the play
		// button + audio data when audio is disabled.
		const playBtn = `    <a class="btn" id='btnPlayAudio'>
        <div class="icon">
            <i class="material-icons">play_arrow</i>
        </div>
    </a>`;
		// The control bar's play button is added/removed per side by the Audio field
		// selection (audio must be enabled deck-wide for the media to exist). The
		// hidden audio data div rides along with the play button so the bar can play it.
		const barFor = (withAudio: boolean) =>
			withAudio ? CONSTANTS.CONTROL_BAR : CONSTANTS.CONTROL_BAR.replace(playBtn, '');
		const audioFor = (withAudio: boolean) => (withAudio ? CONSTANTS.AUDIO_DIV + '\n' : '');

		// Control bar + separator are injected into the card body on whichever side
		// they're selected, positioned by flex order. The control bar is functional
		// on both sides (front gets the same sidebar + handlers as the back).
		const frontControls = frontSel.includes('frontControlButtons');
		const frontSep = frontSel.includes('frontSeparator');
		const frontAudio = includeAudio && frontSel.includes('frontAudio');
		const frontChrome =
			(frontControls ? barFor(frontAudio) + '\n' + audioFor(frontAudio) : '') +
			(frontSep ? '<hr>\n' : '');

		const frontBody = `<div class="${ct} card-body">\n${addToFront}\n${frontChrome}${colorSource}</div>`;
		let QFMT =
			frontBody + hideScript + (frontControls ? CONSTANTS.DECK_HTML_FRONT_CHROME : CONSTANTS.DECK_HTML_FRONT);

		// Build the back's display fields in the user's field order; grouped members
		// are wrapped into their container. The control bar / separator are injected
		// only when selected on the back.
		const backOrder = fields.filter((f) => FIELD_DIV[f]);
		const backHtml: Record<string, string> = {};
		for (const f of backOrder) backHtml[f] = FIELD_DIV[f];
		const backFieldsHtml = wrapGroups(backOrder, backHtml, groups);
		const backControls = backSel.includes('backControlButtons');
		const backSep = backSel.includes('backSeparator');
		const backAudio = includeAudio && backSel.includes('backAudio');
		const backChrome =
			(backControls ? barFor(backAudio) + '\n' + audioFor(backAudio) : '') +
			(backSep ? '<hr>\n' : '');
		const backBody = `<div class="${ct} card-body">\n${backChrome}${backFieldsHtml}\n</div>`;
		let AFMT = CONSTANTS.DECK_HTML_BACK.replace('<!--FIELDS-->', backBody);

		const defaultOff = fields
			.filter((f) => FIELD_DIV[f] && !backSel.includes(`back${f}`))
			.map((f) => FIELD_TOGGLE[f]);
		AFMT = AFMT.replace('var defaultOff = [];', `var defaultOff = ${JSON.stringify(defaultOff)};`);

		// Writing component: independent front and back placement.
		const writingFront = frontSel.includes('frontwritingComponent');
		const writingBack = backSel.includes('backwritingComponent');
		if (writingFront || writingBack) {
			usesWriter = true;
			// The writer page hardcodes sim/trad/pinyin/zhuyin + the dictionary card;
			// every other ticked display field must be injected here or the selection
			// is silently dropped from the export (and the export preview).
			const WRITER_BUILTIN = new Set([
				FIELDS.SIMPLIFIED,
				FIELDS.TRADITIONAL,
				FIELDS.PINYIN,
				FIELDS.ZHUYIN,
				FIELDS.DEFINITIONS,
				FIELDS.AUDIO
			]);
			const writerFor = (sel: string[], prefix: 'front' | 'back') => {
				let tpl = CONSTANTS.DECK_HTML_WITH_HANZI_WRITER;
				if (!includeAudio) {
					tpl = tpl.replace(`<div id='audio' style='display:none'>{{Audio}}</div>`, '');
					tpl = tpl.replace(
						`    <a class="btn" id='btnPlayAudio'>
        <div class="icon"><i class="material-icons">play_arrow</i></div>
    </a>`,
						''
					);
				}
				// Selected extras in field order. The POS/HSK/frequency trio clusters
				// into one meta row (like the non-writer layout); remaining extras stay
				// standalone. Each render unit is placed above or below the dictionary
				// card by its anchor's position relative to Definitions.
				const extras = fields.filter(
					(f) => !WRITER_BUILTIN.has(f) && FIELD_DIV[f] && sel.includes(`${prefix}${f}`)
				);
				const META_FIELDS = [FIELDS.PART_OF_SPEECH, FIELDS.HSK_LEVEL, FIELDS.FREQUENCY];
				const metaPresent = extras.filter((f) => META_FIELDS.includes(f));
				const cluster = metaPresent.length >= 2;
				const defIdx = fields.indexOf(FIELDS.DEFINITIONS);
				const metaAnchor = metaPresent.length ? fields.indexOf(metaPresent[0]) : -1;

				type Unit = { anchor: number; html: string };
				const units: Unit[] = [];
				let metaEmitted = false;
				for (const f of extras) {
					if (cluster && META_FIELDS.includes(f)) {
						if (metaEmitted) continue;
						metaEmitted = true;
						units.push({
							anchor: metaAnchor,
							html: `<div class="${META_CLUSTER_ID}">\n${metaPresent.map((m) => FIELD_DIV[m]).join('\n')}\n</div>`
						});
					} else {
						units.push({ anchor: fields.indexOf(f), html: FIELD_DIV[f] });
					}
				}
				const isAbove = (u: Unit) => (defIdx === -1 ? false : u.anchor < defIdx);
				const above = units.filter(isAbove);
				const below = units.filter((u) => !isAbove(u));
				if (above.length)
					tpl = tpl.replace(
						CONSTANTS.MEANING_CARD,
						above.map((u) => u.html).join('\n') + '\n' + CONSTANTS.MEANING_CARD
					);
				if (below.length)
					tpl = tpl.replace(
						CONSTANTS.MEANING_CARD,
						CONSTANTS.MEANING_CARD + '\n' + below.map((u) => u.html).join('\n')
					);
				// Wrap so per-card element styles still scope to this template.
				return `<div class="${ct}">\n${tpl}\n</div>`;
			};
			if (writingFront) QFMT = writerFor(frontSel, 'front');
			if (writingBack)
				AFMT = writingFront
					? `<div class="${ct}"><div id="back">{{FrontSide}}</div></div>`
					: writerFor(backSel, 'back');
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

		const themeES = template.cardTheme ? (resolveTheme(template.cardTheme, template.cardThemeMode ?? 'auto', false)?.elementStyles ?? {}) : {};
		const mergedES = mergeElementStyles(themeES, tabContent[card].elementStyles ?? {});
		cardCss += buildCardCss(mergedES, ct, groups, bodyOrder);
	}

	const css = buildGlobalCss(template) + cardCss;
	return { flds, req, tmpls, css, usesWriter };
}
