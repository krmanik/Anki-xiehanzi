/**
 * Vector hanzi glyphs for the worksheet PDF, from the same committed
 * `static/data/hanzi-writer-data.json` the deck creator embeds whole into
 * every export (`buildHanziData` in `deck.ts`) — not Hanzi Writer's CDN, so
 * the worksheet works offline and doesn't fire one request per character.
 * Drawing strokes as filled vector paths instead of font text also
 * sidesteps the embedded CJK font's subset entirely (it only covers the
 * current HSK word lists — see `hskPdf.ts`), and gives the worksheet the
 * same progressive stroke-order teaching hanzi-slides-svelte's
 * `generate_worksheet.py` draws (strokes 1, 1-2, 1-3, … up to all) instead
 * of just a single static guide glyph.
 */

import svgpath from 'svgpath';
import { type Color, type PDFPage } from 'pdf-lib';
import { base } from '$app/paths';

let hanziWriterPromise: Promise<typeof import('hanzi-writer').default> | null = null;

function loadHanziWriter() {
	hanziWriterPromise ??= import('hanzi-writer').then((m) => m.default);
	return hanziWriterPromise;
}

type StrokeDataMap = Record<string, { strokes: string[] }>;

let dataPromise: Promise<StrokeDataMap> | null = null;

/** The full 9,500-character stroke set, fetched (and cached) once per session. */
function loadHanziWriterData(): Promise<StrokeDataMap> {
	dataPromise ??= fetch(`${base}/data/hanzi-writer-data.json`).then((r) => {
		if (!r.ok) throw new Error(`hanzi-writer-data.json unavailable (${r.status})`);
		return r.json() as Promise<StrokeDataMap>;
	});
	return dataPromise;
}

/** Raw stroke path `d` strings for one character, or null if unavailable. */
export async function loadStrokePaths(char: string): Promise<string[] | null> {
	const data = await loadHanziWriterData();
	return data[char]?.strokes ?? null;
}

export interface StrokeGlyphOptions {
	/** Bottom-left corner of the target square, in PDF page coordinates. */
	x: number;
	y: number;
	size: number;
	padding?: number;
	color: Color;
	opacity?: number;
	/** Color for the last path drawn (for a progressive stroke-order cell). */
	highlightLast?: Color;
}

/**
 * Draw `paths` (already sliced to however many strokes should show) into a
 * `size`×`size` box. Hanzi Writer's raw path data is in its own Y-up
 * coordinate space; `getScalingTransform` gives the exact offset/scale to
 * place it in a `size`×`size` box, and `svgpath` applies that as a literal
 * matrix on the path string — pdf-lib's own `drawSvgPath` always flips Y
 * once more (it assumes standard Y-down SVG input), so negating Y here is
 * what makes the two flips cancel out and the glyph land right-side up.
 */
export async function drawStrokeGlyph(
	page: PDFPage,
	paths: string[],
	opts: StrokeGlyphOptions
): Promise<void> {
	if (!paths.length) return;
	const HanziWriter = await loadHanziWriter();
	const { x, y, size, padding = 4, color, opacity, highlightLast } = opts;
	const t = HanziWriter.getScalingTransform(size, size, padding);

	paths.forEach((d, i) => {
		const isLast = i === paths.length - 1;
		const transformed = svgpath(d)
			.matrix([t.scale, 0, 0, -t.scale, 0, 0])
			.toString();
		page.drawSvgPath(transformed, {
			x: x + t.x,
			y: y + t.y,
			color: isLast && highlightLast ? highlightLast : color,
			opacity
		});
	});
}
