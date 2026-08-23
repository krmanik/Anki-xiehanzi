/**
 * Direct PDF generation for an HSK word list — no print dialog involved.
 *
 * A PDF carries its own glyphs, so the exporter embeds the fonts built by
 * `scripts/build_pdf_fonts.py`: a merged simplified+traditional Kai face for
 * hanzi, bopomofo and CJK punctuation, and DejaVu Sans for Latin text (the Kai
 * faces have no macron/caron vowels, which is why tone-marked pinyin came out
 * blank when the browser's own PDF printer was doing the work).
 *
 * Text is drawn run by run: each run is a stretch of characters belonging to one
 * font, so a mixed string like "个 (ge4)" is measured and drawn correctly.
 * Layout maths — run splitting, wrapping, truncation, column widths — is pure
 * and unit-tested; only `loadPdfFonts` and `buildHskPdf` touch the network or
 * pdf-lib.
 *
 * The table is laid out by measuring: every column is sized from the widest
 * value it actually holds (so zhuyin can never spill into the meaning), the
 * leftover width goes to the wrapping columns, and every row is given the same
 * height so the page reads as a grid.
 */

import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { base } from '$app/paths';
import { hanziTones, pinyinTones, type HskEntry } from '$lib/hsk';
import {
	DEFAULT_COLUMN_KEYS,
	EXPORT_COLUMNS,
	type ExportColumn,
	type ExportContext
} from '$lib/hskExport';

// ---------------------------------------------------------------------------
// Pure layout helpers
// ---------------------------------------------------------------------------

export type Script = 'cjk' | 'latin';

export interface Run {
	text: string;
	script: Script;
}

/** Characters that must come from the CJK face. */
export function scriptOf(ch: string): Script {
	const o = ch.codePointAt(0) ?? 0;
	return (o >= 0x2e80 && o <= 0x2eff) ||
		(o >= 0x3000 && o <= 0x303f) ||
		(o >= 0x3100 && o <= 0x312f) ||
		(o >= 0x31a0 && o <= 0x31bf) ||
		(o >= 0x30a0 && o <= 0x30ff) ||
		(o >= 0x3400 && o <= 0x4dbf) ||
		(o >= 0x4e00 && o <= 0x9fff) ||
		(o >= 0xf900 && o <= 0xfaff) ||
		(o >= 0xff00 && o <= 0xffef)
		? 'cjk'
		: 'latin';
}

/**
 * Characters absent from both embedded faces, mapped to the nearest one that is
 * present. `・` is the neutral-tone marker the zhuyin data uses; neither Kai
 * face nor DejaVu has U+30FB, so it would draw as a blank box.
 */
const SUBSTITUTIONS: Record<string, string> = {
	'・': '·',
	'𝜋': 'π'
};

/** Replace characters the embedded fonts cannot draw. */
export function substitute(text: string): string {
	let out = '';
	for (const ch of text ?? '') out += SUBSTITUTIONS[ch] ?? ch;
	return out;
}

/** Split a string into maximal single-font runs, in order. */
export function splitRuns(text: string): Run[] {
	const runs: Run[] = [];
	for (const ch of substitute(text)) {
		const script = scriptOf(ch);
		const last = runs[runs.length - 1];
		if (last && last.script === script) last.text += ch;
		else runs.push({ text: ch, script });
	}
	return runs;
}

/** Measures one run's width; injected so layout can be tested without fonts. */
export type Measure = (run: Run) => number;

export const runsWidth = (runs: Run[], measure: Measure): number =>
	runs.reduce((sum, r) => sum + measure(r), 0);

export const textWidth = (text: string, measure: Measure): number =>
	runsWidth(splitRuns(text), measure);

/**
 * Wrap text to `maxWidth`, breaking at spaces for Latin and between characters
 * for CJK (which has no spaces). Returns one run list per line. `firstIndent`
 * narrows only the first line, for text that starts after a label.
 */
export function wrapRuns(
	text: string,
	maxWidth: number,
	measure: Measure,
	firstIndent = 0
): Run[][] {
	const lines: Run[][] = [];
	let line: Run[] = [];
	let width = 0;
	let limit = maxWidth - firstIndent;

	const push = () => {
		if (line.length) lines.push(line);
		line = [];
		width = 0;
		limit = maxWidth;
	};
	const append = (piece: Run) => {
		const last = line[line.length - 1];
		if (last && last.script === piece.script) last.text += piece.text;
		else line.push({ ...piece });
	};

	// Latin breaks on spaces, CJK breaks anywhere — tokenising both ways keeps a
	// single pass over the string.
	const tokens: Run[] = [];
	for (const run of splitRuns(text)) {
		if (run.script === 'cjk') {
			for (const ch of run.text) tokens.push({ text: ch, script: 'cjk' });
		} else {
			for (const word of run.text.split(/(\s+)/)) {
				if (word) tokens.push({ text: word, script: 'latin' });
			}
		}
	}

	for (const token of tokens) {
		const w = measure(token);
		const isSpace = token.script === 'latin' && /^\s+$/.test(token.text);
		if (width + w > limit && width > 0) {
			push();
			if (isSpace) continue; // never start a line with a space
		}
		append(token);
		width += w;
	}
	push();
	return lines.length ? lines : [[]];
}

/**
 * Cut a line of runs down to `maxWidth`, appending an ellipsis when anything was
 * dropped. Used for single-line columns and for the last line of a clamped cell,
 * so nothing can ever overrun into the next column.
 */
export function truncateRuns(runs: Run[], maxWidth: number, measure: Measure): Run[] {
	if (runsWidth(runs, measure) <= maxWidth) return runs;
	const ellipsis: Run = { text: '…', script: 'latin' };
	const budget = maxWidth - measure(ellipsis);
	const out: Run[] = [];
	let width = 0;
	for (const run of runs) {
		let kept = '';
		for (const ch of run.text) {
			const w = measure({ text: ch, script: run.script });
			if (width + w > budget) break;
			kept += ch;
			width += w;
		}
		if (kept) out.push({ text: kept, script: run.script });
		if (kept.length !== [...run.text].length) break;
	}
	out.push(ellipsis);
	return out;
}

/** Wrap to at most `maxLines`, truncating the last line if the text runs on. */
export function clampLines(
	text: string,
	maxWidth: number,
	maxLines: number,
	measure: Measure
): Run[][] {
	const lines = wrapRuns(text, maxWidth, measure);
	if (lines.length <= maxLines) return lines;
	const kept = lines.slice(0, maxLines);
	// Re-join what is left onto the last kept line so the ellipsis lands there.
	const tail = lines
		.slice(maxLines - 1)
		.flat()
		.map((r) => r.text)
		.join('');
	kept[maxLines - 1] = truncateRuns(splitRuns(tail), maxWidth, measure);
	return kept;
}

/**
 * How many text lines every row should be given, from the line counts each row
 * would need. Uses a high percentile rather than the maximum so one rambling
 * definition cannot leave every other row three-quarters empty.
 */
export function rowLineCount(needed: number[], max: number, fit = 0.85): number {
	if (!needed.length) return 1;
	const sorted = [...needed].sort((a, b) => a - b);
	const at = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fit))];
	return Math.min(max, Math.max(1, at));
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

/** How a column's value is drawn. */
export type CellKind = 'index' | 'hanzi' | 'pinyin' | 'text';

/** Per-column drawing rules, layered onto the shared field registry. */
interface RenderSpec {
	kind: CellKind;
	size: number;
	/** Wrapping columns share whatever width is left, by this weight. */
	flex?: number;
	/** Upper bound for a measured column, so one freak entry cannot dominate. */
	max?: number;
	/** Lower bound for a wrapping column. */
	min?: number;
	/**
	 * Measured column that wraps onto further lines instead of being cut short —
	 * a list like "Preposition, Verb, Conjunction" reads far better broken over
	 * two lines than truncated to "Preposition, Verb,…".
	 */
	wrap?: boolean;
	/**
	 * Header text for narrow columns. Column widths follow the data, so a long
	 * heading like "Traditional" over one hanzi would only be cut short.
	 */
	short?: string;
}

export type PdfField = ExportColumn & RenderSpec;

const RENDER: Record<string, RenderSpec> = {
	index: { kind: 'index', size: 7, max: 26, short: '#' },
	simplified: { kind: 'hanzi', size: 15, max: 110 },
	traditional: { kind: 'text', size: 10.5, max: 80, short: 'Trad.' },
	pinyin: { kind: 'pinyin', size: 10, max: 100 },
	numbered: { kind: 'text', size: 8.5, max: 80, short: 'Numbered' },
	zhuyin: { kind: 'text', size: 8, max: 95 },
	meaning: { kind: 'text', size: 8.8, flex: 3, min: 120 },
	pos: { kind: 'text', size: 7.8, max: 74, wrap: true, short: 'Part of sp.' },
	classifiers: { kind: 'text', size: 8, max: 70, wrap: true, short: 'Classifier' },
	level: { kind: 'text', size: 8, max: 52 },
	frequency: { kind: 'text', size: 7.8, max: 46, short: 'Freq.' },
	readings: { kind: 'text', size: 7.8, flex: 2, min: 90 }
};

/** Column heading: the short form when the field has one. */
export const headingOf = (f: PdfField) => (f.short ?? f.label).toUpperCase();

/** The shared field registry, in order, with its PDF drawing rules attached. */
export const PDF_FIELDS: PdfField[] = EXPORT_COLUMNS.map((column) => ({
	...column,
	...(RENDER[column.key] ?? { kind: 'text' as CellKind, size: 8, max: 90, wrap: true })
}));

export const DEFAULT_PDF_FIELDS = DEFAULT_COLUMN_KEYS;

/** Selected fields, in the canonical column order. */
export function pdfFieldsFor(keys: string[]): PdfField[] {
	return PDF_FIELDS.filter((f) => keys.includes(f.key));
}

/** Columns whose text may run onto further lines. */
const wraps = (f: PdfField) => Boolean(f.flex || f.wrap);

const COLUMN_GAP = 10;

/**
 * Give every column a width: measured columns take what their widest value
 * needs (capped), wrapping columns split the remainder by weight. When the
 * measured columns alone would not leave the wrapping ones their minimum, the
 * measured ones are scaled down together rather than any single column
 * overflowing into its neighbour.
 */
export function computeColumnWidths(
	fields: PdfField[],
	natural: Record<string, number>,
	available: number
): Record<string, number> {
	const out: Record<string, number> = {};
	if (!fields.length) return out;

	const gaps = COLUMN_GAP * Math.max(0, fields.length - 1);
	const usable = Math.max(0, available - gaps);
	const flexFields = fields.filter((f) => f.flex);
	const fixedFields = fields.filter((f) => !f.flex);

	for (const f of fixedFields) {
		out[f.key] = Math.min(natural[f.key] ?? 0, f.max ?? Infinity);
	}
	let fixedTotal = fixedFields.reduce((sum, f) => sum + out[f.key], 0);

	if (!flexFields.length) {
		// Nothing wraps: spread any slack evenly so the table still fills the page.
		const slack = Math.max(0, usable - fixedTotal) / fixedFields.length;
		const shrink = fixedTotal > usable ? usable / fixedTotal : 1;
		for (const f of fixedFields) out[f.key] = out[f.key] * shrink + (shrink === 1 ? slack : 0);
		return out;
	}

	const minFlex = flexFields.reduce((sum, f) => sum + (f.min ?? 60), 0);
	if (fixedTotal > usable - minFlex) {
		const shrink = Math.max(0, usable - minFlex) / (fixedTotal || 1);
		for (const f of fixedFields) out[f.key] *= shrink;
		fixedTotal = fixedFields.reduce((sum, f) => sum + out[f.key], 0);
	}

	const remaining = Math.max(0, usable - fixedTotal);
	const weight = flexFields.reduce((sum, f) => sum + (f.flex ?? 1), 0);
	for (const f of flexFields) out[f.key] = (remaining * (f.flex ?? 1)) / weight;
	return out;
}

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

export interface PdfFontBytes {
	cjk: ArrayBuffer;
	latin: ArrayBuffer;
	latinBold: ArrayBuffer;
}

let fontCache: Promise<PdfFontBytes> | null = null;

/** Fetch (once per session) the three subset fonts the PDF embeds. */
export function loadPdfFonts(): Promise<PdfFontBytes> {
	fontCache ??= (async () => {
		const files = ['hsk-cjk.ttf', 'hsk-latin.ttf', 'hsk-latin-bold.ttf'];
		const [cjk, latin, latinBold] = await Promise.all(
			files.map(async (name) => {
				const res = await fetch(`${base}/fonts/${name}`);
				if (!res.ok) throw new Error(`Font ${name} unavailable (${res.status})`);
				return res.arrayBuffer();
			})
		);
		return { cjk, latin, latinBold };
	})().catch((e) => {
		fontCache = null; // allow a retry
		throw e;
	});
	return fontCache;
}

// ---------------------------------------------------------------------------
// Page geometry and palette
// ---------------------------------------------------------------------------

export const A4 = { width: 595.28, height: 841.89 };
export const LANDSCAPE = { width: A4.height, height: A4.width };
export const MARGIN = { top: 48, bottom: 44, x: 40 };

const ROW_PAD = 6;
const LINE_GAP = 1.6;
/** Hard ceiling on how tall one row may grow; longer text is clamped. */
const MAX_ROW_LINES = 4;
/** Share of rows whose text must fit whole; the rest are clamped. */
const ROW_FIT = 0.85;
/** Descender allowance below the last baseline, as a fraction of type size. */
const DESCENDER = 0.28;

export const TONE: Record<number, RGB> = {
	1: rgb(0.957, 0.263, 0.212), // #f44336
	2: rgb(1, 0.596, 0), // #ff9800
	3: rgb(0.298, 0.686, 0.314), // #4caf50
	4: rgb(0.129, 0.588, 0.953), // #2196f3
	5: rgb(0.62, 0.62, 0.62) // #9e9e9e
};
export const INK = rgb(0.07, 0.07, 0.07);
const MUTED = rgb(0.45, 0.45, 0.45);
const FAINT = rgb(0.62, 0.62, 0.62);
export const HAIRLINE = rgb(0.886, 0.886, 0.886);
const ZEBRA = rgb(0.976, 0.976, 0.976);

export interface PdfOptions {
	/** Column keys to print, defaults to `DEFAULT_PDF_FIELDS`. */
	fields?: string[];
	/** Tone-colour the hanzi and pinyin (default true). */
	colored?: boolean;
	/** Landscape paper — worth it once several columns are selected. */
	landscape?: boolean;
	onProgress?: (fraction: number, label: string) => void;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export async function buildHskPdf(
	entries: HskEntry[],
	ctx: ExportContext,
	opts: PdfOptions = {}
): Promise<Uint8Array> {
	const colored = opts.colored ?? true;
	const progress = opts.onProgress ?? (() => {});
	const fields = pdfFieldsFor(opts.fields?.length ? opts.fields : DEFAULT_PDF_FIELDS);
	if (!fields.length) throw new Error('Pick at least one column for the PDF.');

	const paper = opts.landscape ? LANDSCAPE : A4;
	const contentWidth = paper.width - MARGIN.x * 2;

	progress(0.02, 'Loading fonts…');
	const bytes = await loadPdfFonts();

	progress(0.2, 'Embedding fonts…');
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	// `subset: true` silently drops glyphs for this font once a page draws more
	// than a handful of distinct CJK characters — confirmed in isolation with a
	// bare pdf-lib script (no app code involved): some `drawText` calls render
	// nothing at all, with no error, and it gets worse as the word count grows
	// (30 distinct words → 13 rendered). `subset: false` renders every
	// character correctly; Latin text isn't affected either way.
	const cjk = await doc.embedFont(bytes.cjk, { subset: false });
	const latin = await doc.embedFont(bytes.latin, { subset: true });
	const latinBold = await doc.embedFont(bytes.latinBold, { subset: true });

	doc.setTitle(`${ctx.listName} · ${ctx.levelLabel}`);
	doc.setSubject(`${entries.length} words`);
	doc.setCreator('Anki-xiehanzi');
	doc.setProducer('Anki-xiehanzi');

	const fontFor = (script: Script, bold = false): PDFFont =>
		script === 'cjk' ? cjk : bold ? latinBold : latin;
	const measurer = (size: number, bold = false): Measure => {
		const cache = new Map<string, number>();
		return (run) => {
			const key = `${run.script} ${run.text}`;
			let w = cache.get(key);
			if (w === undefined) {
				w = fontFor(run.script, bold).widthOfTextAtSize(run.text, size);
				cache.set(key, w);
			}
			return w;
		};
	};
	// One measurer per distinct font size in the table.
	const measures = new Map<number, Measure>();
	const measureAt = (size: number) => {
		let m = measures.get(size);
		if (!m) {
			m = measurer(size);
			measures.set(size, m);
		}
		return m;
	};

	progress(0.25, 'Measuring columns…');
	const values = entries.map((entry, i) => {
		const row: Record<string, string> = {};
		for (const f of fields) row[f.key] = f.get(entry, ctx, i);
		return row;
	});

	// Widest value per measured column. The index column is sized from the last
	// row number rather than its (empty) values.
	const natural: Record<string, number> = {};
	for (const f of fields) {
		if (f.flex) continue;
		const measure = measureAt(f.size);
		let widest = textWidth(headingOf(f), measureAt(6.6));
		if (f.kind === 'index') {
			widest = Math.max(widest, textWidth(String(entries.length), measure));
		} else {
			for (const row of values) widest = Math.max(widest, textWidth(row[f.key], measure));
		}
		natural[f.key] = widest + 2;
	}
	const widths = computeColumnWidths(fields, natural, contentWidth);

	// Column x positions, left to right.
	const xs: Record<string, number> = {};
	let cursorX = MARGIN.x;
	for (const f of fields) {
		xs[f.key] = cursorX;
		cursorX += widths[f.key] + COLUMN_GAP;
	}

	// Every row gets the same height. Sizing it to the longest definition would
	// leave most rows mostly empty, so it is sized to cover the great majority
	// (ROW_FIT) and the rare rambling entry is clamped with an ellipsis instead.
	const wrapFields = fields.filter(wraps);
	const lineHeightOf = (f: PdfField) => f.size + LINE_GAP;
	const needed = values.map((row) =>
		wrapFields.reduce(
			(most, f) => Math.max(most, wrapRuns(row[f.key], widths[f.key], measureAt(f.size)).length),
			1
		)
	);
	const rowLines = rowLineCount(needed, MAX_ROW_LINES, ROW_FIT);
	// Row height follows from where the text actually sits: the shared first
	// baseline hangs `tallestSize` below the row top, each further wrapped line
	// adds one line height, and the last line still needs room for descenders.
	const tallestSize = Math.max(...fields.map((f) => f.size));
	const wrapLine = wrapFields.length ? Math.max(...wrapFields.map(lineHeightOf)) : 0;
	const wrapSize = wrapFields.length ? Math.max(...wrapFields.map((f) => f.size)) : tallestSize;
	const rowHeight =
		ROW_PAD * 2 + tallestSize + Math.max(0, rowLines - 1) * wrapLine + wrapSize * DESCENDER;

	const pages: PDFPage[] = [];
	let page!: PDFPage;
	let y = 0;

	const drawRuns = (
		target: PDFPage,
		runs: Run[],
		x: number,
		baseline: number,
		size: number,
		color: RGB,
		bold = false
	) => {
		let cursor = x;
		for (const run of runs) {
			const font = fontFor(run.script, bold);
			target.drawText(run.text, { x: cursor, y: baseline, size, font, color });
			cursor += font.widthOfTextAtSize(run.text, size);
		}
		return cursor;
	};
	const drawText = (text: string, x: number, baseline: number, size: number, color: RGB, bold = false) =>
		drawRuns(page, splitRuns(text), x, baseline, size, color, bold);

	const tone = (n: number) => (colored ? (TONE[n] ?? TONE[5]) : INK);

	/** Column header band, repeated at the top of every page. */
	const drawTableHead = () => {
		for (const f of fields) {
			const label = truncateRuns(splitRuns(headingOf(f)), widths[f.key], measureAt(6.6));
			drawRuns(page, label, xs[f.key], y, 6.6, FAINT, true);
		}
		y -= 6;
		page.drawLine({
			start: { x: MARGIN.x, y },
			end: { x: paper.width - MARGIN.x, y },
			thickness: 0.9,
			color: INK
		});
		y -= 4;
	};

	const newPage = (first = false) => {
		page = doc.addPage([paper.width, paper.height]);
		pages.push(page);
		y = paper.height - MARGIN.top;

		if (first) {
			drawText(ctx.listName, MARGIN.x, y - 16, 17, INK, true);
			y -= 24;
			drawText(
				`${ctx.levelLabel} · ${entries.length} word${entries.length === 1 ? '' : 's'}`,
				MARGIN.x,
				y - 9,
				9.5,
				MUTED
			);
			y -= 27;
		} else {
			drawText(`${ctx.listName} · ${ctx.levelLabel}`, MARGIN.x, y - 7, 7.5, FAINT);
			y -= 21;
		}
		drawTableHead();
	};

	progress(0.32, 'Laying out pages…');
	newPage(true);

	const total = entries.length || 1;
	for (let i = 0; i < entries.length; i++) {
		if (i % 200 === 0) progress(0.32 + (0.58 * i) / total, `Laying out ${i + 1} / ${total}…`);

		if (y - rowHeight < MARGIN.bottom + 12) newPage();

		const top = y;
		if (i % 2 === 1) {
			page.drawRectangle({
				x: MARGIN.x - 4,
				y: top - rowHeight + 2,
				width: contentWidth + 8,
				height: rowHeight - 1,
				color: ZEBRA
			});
		}

		const row = values[i];
		for (const f of fields) {
			const x = xs[f.key];
			const width = widths[f.key];
			const measure = measureAt(f.size);
			// Every column shares the first baseline — set by the largest type in the
			// row — so hanzi, pinyin and meaning line up instead of stair-stepping.
			const baseline = top - ROW_PAD - tallestSize;

			if (f.kind === 'index') {
				drawText(String(i + 1), x, baseline + 3, f.size, FAINT);
				continue;
			}
			const value = row[f.key];
			if (!value) continue;

			if (wraps(f)) {
				let lineY = baseline;
				for (const line of clampLines(value, width, rowLines, measure)) {
					drawRuns(page, line, x, lineY, f.size, f.key === 'meaning' ? INK : MUTED);
					lineY -= lineHeightOf(f);
				}
				continue;
			}

			if (f.kind === 'hanzi') {
				let cursor = x;
				for (const c of hanziTones(value, entries[i].p)) {
					const w = cjk.widthOfTextAtSize(c.ch, f.size);
					if (cursor + w > x + width) break;
					page.drawText(c.ch, { x: cursor, y: baseline, size: f.size, font: cjk, color: tone(c.tone) });
					cursor += w;
				}
			} else if (f.kind === 'pinyin') {
				let cursor = x;
				const syllables = pinyinTones(value, entries[i].p);
				for (let s = 0; s < syllables.length; s++) {
					const text = s === syllables.length - 1 ? syllables[s].text : `${syllables[s].text} `;
					const runs = splitRuns(text);
					if (cursor + runsWidth(runs, measure) > x + width) {
						drawRuns(page, truncateRuns(runs, x + width - cursor, measure), cursor, baseline, f.size, tone(syllables[s].tone));
						break;
					}
					cursor = drawRuns(page, runs, cursor, baseline, f.size, tone(syllables[s].tone));
				}
			} else {
				const color = f.key === 'traditional' ? FAINT : MUTED;
				drawRuns(page, truncateRuns(splitRuns(value), width, measure), x, baseline, f.size, color);
			}
		}

		y = top - rowHeight;
		page.drawLine({
			start: { x: MARGIN.x, y: y + 1 },
			end: { x: paper.width - MARGIN.x, y: y + 1 },
			thickness: 0.4,
			color: HAIRLINE
		});
	}

	progress(0.94, 'Writing pages…');
	pages.forEach((p, i) => {
		const label = `${i + 1} / ${pages.length}`;
		const width = latin.widthOfTextAtSize(label, 7.5);
		p.drawText(label, {
			x: paper.width - MARGIN.x - width,
			y: MARGIN.bottom - 12,
			size: 7.5,
			font: latin,
			color: FAINT
		});
		p.drawText('Anki-xiehanzi', {
			x: MARGIN.x,
			y: MARGIN.bottom - 12,
			size: 7.5,
			font: latin,
			color: FAINT
		});
	});

	progress(0.98, 'Saving…');
	const out = await doc.save();
	progress(1, 'Done');
	return out;
}
