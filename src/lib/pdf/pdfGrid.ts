/**
 * Drawing primitives shared by the worksheet and flashcard PDF builders.
 * `hskPdf.ts` is purely tabular; this is the grid/box side of things.
 */

import { rgb, type Color, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { HAIRLINE } from '$lib/hskPdf';

const DIAGONAL = rgb(0.945, 0.945, 0.945);
const CROSS = rgb(0.898, 0.898, 0.898);

/**
 * A mi-zi-ge (米字格) practice box: a square border, two solid corner-to-corner
 * diagonals and two dashed lines through the center. Ported from the same grid
 * `StrokeAnimation.svelte` draws in SVG (2 diagonals + 2 dashed cross lines).
 */
export function drawMiZiGe(page: PDFPage, x: number, y: number, size: number): void {
	page.drawRectangle({ x, y, width: size, height: size, borderColor: HAIRLINE, borderWidth: 1 });
	page.drawLine({ start: { x, y: y + size }, end: { x: x + size, y }, thickness: 1, color: DIAGONAL });
	page.drawLine({ start: { x, y }, end: { x: x + size, y: y + size }, thickness: 1, color: DIAGONAL });
	page.drawLine({
		start: { x: x + size / 2, y },
		end: { x: x + size / 2, y: y + size },
		thickness: 1,
		color: CROSS,
		dashArray: [5, 4]
	});
	page.drawLine({
		start: { x, y: y + size / 2 },
		end: { x: x + size, y: y + size / 2 },
		thickness: 1,
		color: CROSS,
		dashArray: [5, 4]
	});
}

/** A plain bordered cell, for flashcards. */
export function drawCardBorder(page: PDFPage, x: number, y: number, w: number, h: number): void {
	page.drawRectangle({ x, y, width: w, height: h, borderColor: HAIRLINE, borderWidth: 1 });
}

/** The five box guides the practice-sheet template can draw a cell as. */
export type PracticeGridStyle = 'mi' | 'tian' | 'hui' | 'dotted' | 'blank';

/**
 * One practice cell in a chosen guide style, in a caller-supplied colour
 * (the practice sheet lets a reader pick this; every other grid in the app
 * stays fixed to `HAIRLINE`/`DIAGONAL`).
 */
export function drawPracticeCell(
	page: PDFPage,
	x: number,
	y: number,
	size: number,
	style: PracticeGridStyle,
	guideColor: Color = DIAGONAL
): void {
	page.drawRectangle({ x, y, width: size, height: size, borderColor: HAIRLINE, borderWidth: 1 });
	if (style === 'blank') return;

	if (style === 'mi') {
		page.drawLine({ start: { x, y: y + size }, end: { x: x + size, y }, thickness: 1, color: guideColor });
		page.drawLine({ start: { x, y }, end: { x: x + size, y: y + size }, thickness: 1, color: guideColor });
	}
	if (style === 'mi' || style === 'tian') {
		page.drawLine({
			start: { x: x + size / 2, y },
			end: { x: x + size / 2, y: y + size },
			thickness: 1,
			color: guideColor,
			dashArray: [5, 4]
		});
		page.drawLine({
			start: { x, y: y + size / 2 },
			end: { x: x + size, y: y + size / 2 },
			thickness: 1,
			color: guideColor,
			dashArray: [5, 4]
		});
	}
	if (style === 'hui') {
		const inset = size * 0.16;
		page.drawRectangle({
			x: x + inset,
			y: y + inset,
			width: size - inset * 2,
			height: size - inset * 2,
			borderColor: guideColor,
			borderWidth: 1
		});
	}
	if (style === 'dotted') {
		page.drawLine({
			start: { x: x + size / 2, y },
			end: { x: x + size / 2, y: y + size },
			thickness: 1,
			color: guideColor,
			dashArray: [1.5, 3]
		});
		page.drawLine({
			start: { x, y: y + size / 2 },
			end: { x: x + size, y: y + size / 2 },
			thickness: 1,
			color: guideColor,
			dashArray: [1.5, 3]
		});
	}
}

/**
 * Characters in `text` the CJK font has no glyph for. pdf-lib's own
 * `widthOfTextAtSize`/`drawText` never throw on a missing glyph — fontkit
 * silently substitutes `.notdef` (usually a blank box) — so coverage has to
 * be checked against the raw fontkit font's `characterSet`, not pdf-lib's
 * `PDFFont` wrapper. The CJK subset only covers the current HSK word lists
 * (see `hskPdf.ts`), and these tools accept arbitrary word lists.
 */
export async function unrenderableChars(cjkFontBytes: ArrayBuffer, text: string): Promise<string[]> {
	const font = fontkit.create(new Uint8Array(cjkFontBytes));
	const bad = new Set<string>();
	for (const ch of text) {
		if (/\s/.test(ch)) continue;
		if (!font.hasGlyphForCodePoint(ch.codePointAt(0) ?? 0)) bad.add(ch);
	}
	return [...bad];
}
