/**
 * Practice sheet: a dense, multi-character-per-page writing drill — rows of
 * guide boxes rather than the study worksheet's one-page character dossier
 * (`worksheetPdf.ts`). Same "own touch, not a direct copy" idea the whole
 * repo applies to borrowed layouts (see CLAUDE.md on the radical deck and the
 * HSK worksheet): the *shape* of a configurable practice-box generator is a
 * well-worn one, but the palette, the vector-stroke rendering and the naming
 * are this app's own.
 *
 * Every hanzi — the row label, the stroke-order preview, every guide box —
 * is drawn as vector strokes (`strokePaths.ts`), never through the embedded
 * CJK font. That font is an HSK-only subset, and `pdf-lib`/`fontkit`'s CID
 * embedder silently drops glyphs once a page has more than a handful of
 * distinct characters anyway (see the file-level note in `worksheetPdf.ts`).
 * A practice sheet is exactly the case that breaks it: one page can carry
 * every character from a whole HSK level.
 */

import { PDFDocument, rgb, type Color, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { lookup, type Reading } from '$lib/dict/cedict';
import { orderReadings } from '$lib/dictionary';
import { toneOfPinyin } from '$lib/tone';
import { A4, LANDSCAPE, INK, MARGIN, TONE, HAIRLINE, loadPdfFonts } from '$lib/hskPdf';
import { drawPracticeCell, type PracticeGridStyle } from './pdfGrid';
import { drawStrokeGlyph, loadStrokePaths } from './strokePaths';

export type PracticeGridSize = 'small' | 'medium' | 'large';
export type PracticeOrientation = 'portrait' | 'landscape';
export type PhoneticsPosition = 'none' | 'above' | 'below';
export type HintStrength = 'solid' | 'light' | 'ghost';
export type StrokeOrderMode = 'off' | 'row' | 'per-box';
export type TraceStrength = 'faded' | 'ghost' | 'color';

export interface PracticeSheetOptions {
	gridSize?: PracticeGridSize;
	orientation?: PracticeOrientation;
	gridStyle?: PracticeGridStyle;
	/** Guide-line colour, as a hex string like "#c9a7ff". */
	gridColor?: string;
	phonetics?: PhoneticsPosition;
	toneColors?: boolean;
	/** Thin rule under the pinyin, like a writing line under the label. */
	pinyinRuled?: boolean;
	hintCount?: number;
	hintStrength?: HintStrength;
	/** Hex override; defaults to the tone colour (or ink, if tone colours are off). */
	hintColor?: string;
	strokeOrder?: StrokeOrderMode;
	traceCount?: number;
	traceStrength?: TraceStrength;
	traceColor?: string;
	blankCount?: number;
}

export interface PracticeSheetResult {
	bytes: Uint8Array;
	unsupported: string[];
}

const GRID_SIZE_PT: Record<PracticeGridSize, number> = { small: 26, medium: 34, large: 46 };
const GAP = 6;
const LABEL_GAP = 10;
const ROW_GAP = 14;
const SO_BOX = 22;
const SO_GAP = 5;
const FAINT = rgb(0.62, 0.62, 0.62);

const hexToColor = (hex: string | undefined, fallback: Color): Color => {
	const m = hex?.match(/^#?([0-9a-f]{6})$/i);
	if (!m) return fallback;
	const n = parseInt(m[1], 16);
	return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

interface RowContent {
	ch: string;
	tone: number;
	pinyin: string;
	strokes: string[];
}

async function buildRowContent(ch: string): Promise<RowContent | null> {
	const strokes = await loadStrokePaths(ch);
	if (!strokes || !strokes.length) return null;
	const entry = await lookup(ch).catch(() => null);
	const reading = orderReadings<Reading>(entry?.readings ?? [])[0];
	const pinyin = reading?.pinyinPlain ?? '';
	const tone = pinyin ? toneOfPinyin(pinyin.split(/\s+/)[0] ?? '') : 5;
	return { ch, tone, pinyin, strokes };
}

function uniqueChars(words: string[]): string[] {
	const seen = new Set<string>();
	for (const word of words) for (const ch of word) if (!/\s/.test(ch)) seen.add(ch);
	return [...seen];
}

export async function buildPracticeSheetPdf(
	words: string[],
	opts: PracticeSheetOptions = {}
): Promise<PracticeSheetResult> {
	const gridSize = opts.gridSize ?? 'medium';
	const boxSize = GRID_SIZE_PT[gridSize];
	const paper = opts.orientation === 'portrait' ? A4 : LANDSCAPE;
	const gridStyle = opts.gridStyle ?? 'mi';
	const guideColor = hexToColor(opts.gridColor, rgb(0.7, 0.7, 0.7));
	const phonetics = opts.phonetics ?? 'above';
	const toneColors = opts.toneColors ?? true;
	const pinyinRuled = opts.pinyinRuled ?? true;
	const hintCount = Math.max(0, opts.hintCount ?? 1);
	const hintStrength = opts.hintStrength ?? 'solid';
	const strokeOrder = opts.strokeOrder ?? 'row';
	const traceCount = Math.max(0, opts.traceCount ?? 4);
	const traceStrength = opts.traceStrength ?? 'faded';
	const blankCount = Math.max(0, opts.blankCount ?? 3);

	const chars = uniqueChars(words);
	if (!chars.length) throw new Error('Add at least one character to practice.');

	const fontBytes = await loadPdfFonts();
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	const latin = await doc.embedFont(fontBytes.latin, { subset: true });

	doc.setTitle('Practice sheet');
	doc.setCreator('Anki-xiehanzi');
	doc.setProducer('Anki-xiehanzi');

	const contentWidth = paper.width - MARGIN.x * 2;
	const labelWidth = boxSize;
	const rowStartX = MARGIN.x + labelWidth + LABEL_GAP;
	const boxesPerRow = Math.max(1, Math.floor((contentWidth - labelWidth - LABEL_GAP + GAP) / (boxSize + GAP)));

	const unsupported: string[] = [];
	const rows: RowContent[] = [];
	for (const ch of chars) {
		const content = await buildRowContent(ch);
		if (content) rows.push(content);
		else unsupported.push(ch);
	}
	if (!rows.length) throw new Error('None of these characters have stroke data available.');

	let page: PDFPage = doc.addPage([paper.width, paper.height]);
	let y = paper.height - MARGIN.top;

	const newPage = () => {
		page = doc.addPage([paper.width, paper.height]);
		y = paper.height - MARGIN.top;
	};

	const hintOpacity = (strength: HintStrength) => (strength === 'solid' ? 1 : strength === 'light' ? 0.35 : 0.15);
	const traceOpacity = (strength: TraceStrength) => (strength === 'ghost' ? 0.08 : strength === 'color' ? 0.28 : 0.16);

	for (const row of rows) {
		const hintColor = hexToColor(opts.hintColor, toneColors ? (TONE[row.tone] ?? INK) : INK);
		const traceColor = traceStrength === 'color' ? hexToColor(opts.traceColor, hintColor) : rgb(0.83, 0.83, 0.83);
		const pinyinColor = toneColors ? (TONE[row.tone] ?? INK) : INK;

		const soLines = strokeOrder === 'row' ? Math.ceil(row.strokes.length / boxesPerRow) : 0;
		const soHeight = soLines ? soLines * (SO_BOX + SO_GAP) + ROW_GAP : 0;
		const totalBoxes = (strokeOrder === 'per-box' ? row.strokes.length : hintCount) + traceCount + blankCount;
		const boxRows = Math.ceil(totalBoxes / boxesPerRow);
		const phoneticsHeight = phonetics === 'none' ? 0 : 16 + (pinyinRuled ? 4 : 0);
		const rowHeight =
			Math.max(labelWidth, boxRows * (boxSize + GAP) - GAP) + soHeight + phoneticsHeight + ROW_GAP;

		if (y - rowHeight < MARGIN.bottom) newPage();

		const rowTop = y;

		// ── Row label: the character on its own, plain ink, no grid ────────
		await drawStrokeGlyph(page, row.strokes, {
			x: MARGIN.x,
			y: rowTop - labelWidth,
			size: labelWidth,
			padding: labelWidth * 0.08,
			color: hintColor
		});
		page.drawLine({
			start: { x: MARGIN.x, y: rowTop - labelWidth - 3 },
			end: { x: MARGIN.x + labelWidth, y: rowTop - labelWidth - 3 },
			thickness: 1,
			color: HAIRLINE
		});

		let by = rowTop;

		if (phonetics === 'above' && row.pinyin) {
			page.drawText(row.pinyin, { x: rowStartX, y: by - 11, size: 11, font: latin, color: pinyinColor });
			if (pinyinRuled) {
				page.drawLine({
					start: { x: rowStartX, y: by - 14 },
					end: { x: rowStartX + latin.widthOfTextAtSize(row.pinyin, 11) + 40, y: by - 14 },
					thickness: 0.75,
					color: HAIRLINE
				});
			}
			by -= phoneticsHeight;
		}

		if (strokeOrder === 'row') {
			for (let i = 0; i < row.strokes.length; i++) {
				const col = i % boxesPerRow;
				const line = Math.floor(i / boxesPerRow);
				const bx = rowStartX + col * (SO_BOX + SO_GAP);
				const byy = by - line * (SO_BOX + SO_GAP) - SO_BOX;
				await drawStrokeGlyph(page, row.strokes.slice(0, i + 1), {
					x: bx,
					y: byy,
					size: SO_BOX,
					padding: 2,
					color: rgb(0.83, 0.83, 0.83),
					highlightLast: INK
				});
			}
			by -= soHeight;
		}

		let cellIndex = 0;
		const drawCell = async (cx: number, cy: number, index: number) => {
			drawPracticeCell(page, cx, cy, boxSize, gridStyle, guideColor);
			if (strokeOrder === 'per-box') {
				if (index < row.strokes.length) {
					await drawStrokeGlyph(page, row.strokes.slice(0, index + 1), {
						x: cx,
						y: cy,
						size: boxSize,
						padding: boxSize * 0.1,
						color: hintColor,
						highlightLast: hintColor
					});
				} else if (index < row.strokes.length + traceCount) {
					await drawStrokeGlyph(page, row.strokes, {
						x: cx,
						y: cy,
						size: boxSize,
						padding: boxSize * 0.1,
						color: traceColor,
						opacity: traceOpacity(traceStrength)
					});
				}
				return;
			}
			if (index < hintCount) {
				await drawStrokeGlyph(page, row.strokes, {
					x: cx,
					y: cy,
					size: boxSize,
					padding: boxSize * 0.1,
					color: hintColor,
					opacity: hintOpacity(hintStrength)
				});
			} else if (index < hintCount + traceCount) {
				await drawStrokeGlyph(page, row.strokes, {
					x: cx,
					y: cy,
					size: boxSize,
					padding: boxSize * 0.1,
					color: traceColor,
					opacity: traceOpacity(traceStrength)
				});
			}
		};

		for (let i = 0; i < totalBoxes; i++, cellIndex++) {
			const col = cellIndex % boxesPerRow;
			const line = Math.floor(cellIndex / boxesPerRow);
			const cx = rowStartX + col * (boxSize + GAP);
			const cy = by - line * (boxSize + GAP) - boxSize;
			await drawCell(cx, cy, i);
		}
		by -= boxRows * (boxSize + GAP) - GAP;

		if (phonetics === 'below' && row.pinyin) {
			by -= 4;
			page.drawText(row.pinyin, { x: rowStartX, y: by - 11, size: 11, font: latin, color: pinyinColor });
			if (pinyinRuled) {
				page.drawLine({
					start: { x: rowStartX, y: by - 14 },
					end: { x: rowStartX + latin.widthOfTextAtSize(row.pinyin, 11) + 40, y: by - 14 },
					thickness: 0.75,
					color: HAIRLINE
				});
			}
			by -= phoneticsHeight;
		}

		y = by - ROW_GAP;
	}

	for (const p of doc.getPages()) {
		const brand = 'ANKI XIEHANZI';
		const bw = latin.widthOfTextAtSize(brand, 7);
		p.drawText(brand, { x: (paper.width - bw) / 2, y: MARGIN.bottom / 2 - 3.5, size: 7, font: latin, color: FAINT });
	}

	const bytes = await doc.save();
	return { bytes, unsupported };
}
