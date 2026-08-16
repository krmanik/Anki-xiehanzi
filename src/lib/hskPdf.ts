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
 * Layout maths (run splitting, wrapping, pagination) is pure and unit-tested;
 * only `loadPdfFonts` and `buildHskPdf` touch the network or pdf-lib.
 */

import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { base } from '$app/paths';
import { hanziTones, pinyinTones, type HskEntry } from '$lib/hsk';
import type { ExportContext } from '$lib/hskExport';

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

/** Measures one run's width; injected so wrapping can be tested without fonts. */
export type Measure = (run: Run) => number;

export const runsWidth = (runs: Run[], measure: Measure): number =>
	runs.reduce((sum, r) => sum + measure(r), 0);

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

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = { top: 48, bottom: 44, x: 40 };

const COLUMNS = { num: 22, word: 96, pinyin: 92, zhuyin: 60 };
const CONTENT_WIDTH = A4.width - MARGIN.x * 2;
const MEANING_WIDTH = CONTENT_WIDTH - COLUMNS.num - COLUMNS.word - COLUMNS.pinyin - COLUMNS.zhuyin;

const SIZE = { hanzi: 15, trad: 10.5, pinyin: 10, zhuyin: 8, meaning: 8.8, reading: 7.8, num: 7 };
const ROW_PAD = 7;
const LINE_GAP = 1.25;

const TONE: Record<number, RGB> = {
	1: rgb(0.957, 0.263, 0.212), // #f44336
	2: rgb(1, 0.596, 0), // #ff9800
	3: rgb(0.298, 0.686, 0.314), // #4caf50
	4: rgb(0.129, 0.588, 0.953), // #2196f3
	5: rgb(0.62, 0.62, 0.62) // #9e9e9e
};
const INK = rgb(0.07, 0.07, 0.07);
const MUTED = rgb(0.45, 0.45, 0.45);
const FAINT = rgb(0.62, 0.62, 0.62);
const HAIRLINE = rgb(0.886, 0.886, 0.886);

export interface PdfOptions {
	/** Tone-colour the hanzi and pinyin (default true). */
	colored?: boolean;
	/** Print every pronunciation of a word, not just the one on the list. */
	includeReadings?: boolean;
	/** Show the traditional form beside the simplified one. */
	includeTraditional?: boolean;
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
	const includeReadings = opts.includeReadings ?? true;
	const includeTraditional = opts.includeTraditional ?? true;
	const progress = opts.onProgress ?? (() => {});

	progress(0.02, 'Loading fonts…');
	const bytes = await loadPdfFonts();

	progress(0.2, 'Embedding fonts…');
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	const cjk = await doc.embedFont(bytes.cjk, { subset: true });
	const latin = await doc.embedFont(bytes.latin, { subset: true });
	const latinBold = await doc.embedFont(bytes.latinBold, { subset: true });

	doc.setTitle(`${ctx.listName} · ${ctx.levelLabel}`);
	doc.setSubject(`${entries.length} words`);
	doc.setCreator('Anki-xiehanzi');
	doc.setProducer('Anki-xiehanzi');

	const fontFor = (script: Script, bold = false) =>
		script === 'cjk' ? cjk : bold ? latinBold : latin;
	const measure = (size: number, bold = false): Measure => {
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
	const measureMeaning = measure(SIZE.meaning);
	const measureReading = measure(SIZE.reading);

	const pages: PDFPage[] = [];
	let page!: PDFPage;
	let y = 0;

	const drawRuns = (
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
			page.drawText(run.text, { x: cursor, y: baseline, size, font, color });
			cursor += font.widthOfTextAtSize(run.text, size);
		}
		return cursor;
	};
	const drawText = (text: string, x: number, baseline: number, size: number, color: RGB, bold = false) =>
		drawRuns(splitRuns(text), x, baseline, size, color, bold);

	const tone = (n: number) => (colored ? (TONE[n] ?? TONE[5]) : INK);

	/** Column header band, repeated at the top of every page. */
	const drawTableHead = () => {
		const labels: [string, number][] = [
			['#', MARGIN.x],
			['WORD', MARGIN.x + COLUMNS.num],
			['PINYIN', MARGIN.x + COLUMNS.num + COLUMNS.word],
			['ZHUYIN', MARGIN.x + COLUMNS.num + COLUMNS.word + COLUMNS.pinyin],
			['MEANING', MARGIN.x + COLUMNS.num + COLUMNS.word + COLUMNS.pinyin + COLUMNS.zhuyin]
		];
		for (const [label, x] of labels) {
			page.drawText(label, { x, y, size: 6.6, font: latinBold, color: FAINT });
		}
		y -= 6;
		page.drawLine({
			start: { x: MARGIN.x, y },
			end: { x: A4.width - MARGIN.x, y },
			thickness: 0.9,
			color: INK
		});
		y -= ROW_PAD + 4;
	};

	const newPage = (first = false) => {
		page = doc.addPage([A4.width, A4.height]);
		pages.push(page);
		y = A4.height - MARGIN.top;

		if (first) {
			drawText(`${ctx.listName}`, MARGIN.x, y - 16, 17, INK, true);
			y -= 16 + 8;
			const sub = `${ctx.levelLabel} · ${entries.length} word${entries.length === 1 ? '' : 's'}`;
			drawText(sub, MARGIN.x, y - 9, 9.5, MUTED);
			y -= 9 + 18;
		} else {
			drawText(`${ctx.listName} · ${ctx.levelLabel}`, MARGIN.x, y - 7, 7.5, FAINT);
			y -= 7 + 14;
		}
		drawTableHead();
	};

	newPage(true);

	const xNum = MARGIN.x;
	const xWord = MARGIN.x + COLUMNS.num;
	const xPinyin = xWord + COLUMNS.word;
	const xZhuyin = xPinyin + COLUMNS.pinyin;
	const xMeaning = xZhuyin + COLUMNS.zhuyin;

	const total = entries.length || 1;
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		if (i % 200 === 0) progress(0.25 + (0.65 * i) / total, `Laying out ${i + 1} / ${total}…`);

		const meaningLines = wrapRuns(entry.m, MEANING_WIDTH - 4, measureMeaning);

		// Alternate pronunciations, printed under the meaning as their own lines.
		const extras = includeReadings ? (entry.r ?? []).filter((r) => r.p !== entry.p && r.d) : [];
		const extraLines = extras.map((r) => {
			const head = `${r.y} ${r.z}  `;
			return {
				reading: r,
				head,
				// Only the first line starts after the pronunciation label.
				lines: wrapRuns(
					r.d,
					MEANING_WIDTH - 4,
					measureReading,
					runsWidth(splitRuns(head), measureReading)
				)
			};
		});

		const meaningHeight = meaningLines.length * (SIZE.meaning + LINE_GAP);
		const extraHeight = extraLines.reduce(
			(sum, e) => sum + Math.max(1, e.lines.length) * (SIZE.reading + LINE_GAP) + 2,
			0
		);
		const rowHeight = Math.max(SIZE.hanzi + 4, meaningHeight + extraHeight) + ROW_PAD * 2;

		if (y - rowHeight < MARGIN.bottom + 14) newPage();

		const top = y;
		const firstBaseline = top - SIZE.hanzi;

		page.drawText(String(i + 1), {
			x: xNum,
			y: firstBaseline + 3,
			size: SIZE.num,
			font: latin,
			color: FAINT
		});

		let cursor = xWord;
		for (const c of hanziTones(entry.s, entry.p)) {
			page.drawText(c.ch, { x: cursor, y: firstBaseline, size: SIZE.hanzi, font: cjk, color: tone(c.tone) });
			cursor += cjk.widthOfTextAtSize(c.ch, SIZE.hanzi);
		}
		if (includeTraditional && entry.t !== entry.s) {
			drawText(entry.t, cursor + 5, firstBaseline + 1, SIZE.trad, FAINT);
		}

		cursor = xPinyin;
		const syllables = pinyinTones(entry.y, entry.p);
		for (let s = 0; s < syllables.length; s++) {
			const text = s === syllables.length - 1 ? syllables[s].text : `${syllables[s].text} `;
			cursor = drawRuns(splitRuns(text), cursor, firstBaseline + 2, SIZE.pinyin, tone(syllables[s].tone));
		}

		drawText(entry.z, xZhuyin, firstBaseline + 2, SIZE.zhuyin, MUTED);

		let lineY = top - SIZE.meaning - 2;
		for (const line of meaningLines) {
			drawRuns(line, xMeaning, lineY, SIZE.meaning, INK);
			lineY -= SIZE.meaning + LINE_GAP;
		}

		for (const extra of extraLines) {
			lineY -= 2;
			const headEnd = drawText(
				extra.head,
				xMeaning,
				lineY,
				SIZE.reading,
				tone(toneOf(extra.reading.p))
			);
			let first = true;
			for (const line of extra.lines) {
				drawRuns(line, first ? headEnd : xMeaning, lineY, SIZE.reading, MUTED);
				lineY -= SIZE.reading + LINE_GAP;
				first = false;
			}
			if (!extra.lines.length) lineY -= SIZE.reading + LINE_GAP;
		}

		y = top - rowHeight + ROW_PAD;
		page.drawLine({
			start: { x: MARGIN.x, y: y + ROW_PAD / 2 },
			end: { x: A4.width - MARGIN.x, y: y + ROW_PAD / 2 },
			thickness: 0.4,
			color: HAIRLINE
		});
	}

	progress(0.94, 'Writing pages…');
	pages.forEach((p, i) => {
		const label = `${i + 1} / ${pages.length}`;
		const width = latin.widthOfTextAtSize(label, 7.5);
		p.drawText(label, {
			x: A4.width - MARGIN.x - width,
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

/** Tone digit of a numbered-pinyin string's first syllable. */
function toneOf(numbered: string): number {
	const m = /([1-5])\D*/.exec(numbered ?? '');
	return m ? Number(m[1]) : 5;
}
