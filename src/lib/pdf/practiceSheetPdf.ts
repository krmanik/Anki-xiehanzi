/**
 * Practice sheet: a dense, multi-character-per-page writing drill — rows of
 * guide boxes rather than the study worksheet's one-page character dossier
 * (`worksheetPdf.ts`). Same "own touch, not a direct copy" idea the whole
 * repo applies to borrowed layouts (see CLAUDE.md on the radical deck and the
 * HSK worksheet): the *shape* of a configurable practice-box generator is a
 * well-worn one, but the palette, the vector-stroke rendering and the naming
 * are this app's own.
 *
 * Two layouts share one drawing engine:
 * - `grid` — one row per unique character, a repeatable hint/trace/blank box
 *   sequence per row (the default).
 * - `sentence` — the input read as one continuous line of text, copied out
 *   box by box in reading order, repeated a few times top to bottom, the way
 *   a copybook repeats a whole phrase rather than one character at a time.
 *
 * Every hanzi — row labels, stroke-order previews, every guide box — is
 * drawn as vector strokes (`strokePaths.ts`), never through the embedded CJK
 * font. That font is an HSK-only subset, and `pdf-lib`/`fontkit`'s CID
 * embedder silently drops glyphs once a page has more than a handful of
 * distinct characters anyway (see the file-level note in `worksheetPdf.ts`).
 * A practice sheet is exactly the case that breaks it: one page can carry
 * every character from a whole HSK level.
 */

import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { lookup, type Reading } from '$lib/dict/cedict';
import { orderReadings, senses } from '$lib/dictionary';
import { toneOfPinyin } from '$lib/tone';
import { A4, LANDSCAPE, INK, MARGIN, TONE, HAIRLINE, loadPdfFonts } from '$lib/hskPdf';
import { drawPracticeCell, hexToColor, type PracticeGridStyle } from './pdfGrid';
import { drawStrokeGlyph, loadStrokePaths } from './strokePaths';

export type PracticeGridSize = 'small' | 'medium' | 'large';
export type PracticeOrientation = 'portrait' | 'landscape';
export type PhoneticsPosition = 'none' | 'above' | 'below';
export type HintStrength = 'solid' | 'light' | 'ghost';
export type StrokeOrderMode = 'off' | 'row' | 'per-box';
export type TraceStrength = 'faded' | 'ghost' | 'color';
export type PracticeLayout = 'grid' | 'sentence';
export type PracticeUnit = 'char' | 'word';

export interface PracticeSheetOptions {
	layout?: PracticeLayout;
	/** `grid` layout only: one row per unique character, or one row per unique word (default 'char'). */
	unit?: PracticeUnit;
	gridSize?: PracticeGridSize;
	orientation?: PracticeOrientation;
	gridStyle?: PracticeGridStyle;
	/** Guide-line colour, as a hex string like "#c9a7ff". */
	gridColor?: string;
	phonetics?: PhoneticsPosition;
	toneColors?: boolean;
	/** Thin rule under the pinyin, like a writing line under the label. */
	pinyinRuled?: boolean;
	/** `grid` layout only: a one-line English gloss under each row's pinyin. */
	showMeaning?: boolean;
	hintCount?: number;
	hintStrength?: HintStrength;
	/** Hex override; defaults to the tone colour (or ink, if tone colours are off). */
	hintColor?: string;
	strokeOrder?: StrokeOrderMode;
	traceCount?: number;
	traceStrength?: TraceStrength;
	traceColor?: string;
	blankCount?: number;
	/**
	 * `grid` layout only: how many full rows of boxes each character/word
	 * gets, each auto-filled edge to edge (default 1 — one line of practice
	 * per item). Ignored when `fillPage` is set.
	 */
	rowsPerItem?: number;
	/**
	 * `grid` layout only: instead of a fixed row count, give each item every
	 * row of boxes that fits down to the bottom of the page — "one character,
	 * one full page" — rather than a single line.
	 */
	fillPage?: boolean;
	/** `sentence` layout only: how many times the line repeats down the page. */
	repeatCount?: number;
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

/** One character's own strokes and tone, inside a row that may hold several. */
interface Segment {
	strokes: string[];
	tone: number;
}

/** One practice row — one character, or one whole word made of several. */
interface RowContent {
	/** Strokes for the small identity glyph in the row's label column. */
	label: string[];
	tone: number;
	pinyin: string;
	meaning: string;
	segments: Segment[];
}

async function buildCharRow(ch: string, wantMeaning: boolean): Promise<RowContent | null> {
	const strokes = await loadStrokePaths(ch);
	if (!strokes || !strokes.length) return null;
	const entry = await lookup(ch).catch(() => null);
	const reading = orderReadings<Reading>(entry?.readings ?? [])[0];
	const pinyin = reading?.pinyinPlain ?? '';
	const tone = pinyin ? toneOfPinyin(pinyin.split(/\s+/)[0] ?? '') : 5;
	const meaning = wantMeaning ? (reading ? senses(reading.definition)[0] : (entry?.commonMeaning ?? '')) : '';
	return {
		label: strokes,
		tone,
		pinyin,
		meaning: meaning === '#' ? '' : (meaning ?? ''),
		segments: [{ strokes, tone }]
	};
}

/**
 * A word's row groups its characters into one label/pinyin/meaning, but each
 * character still gets its own hint/trace box sequence — this is the
 * "Word" family a two- or three-character word needs: one line of metadata,
 * then a box for every character in it, not one box standing in for the
 * whole word.
 */
async function buildWordRow(
	word: string,
	wantMeaning: boolean
): Promise<{ row: RowContent; missing: string[] } | null> {
	const chars = [...word].filter((ch) => !/\s/.test(ch));
	if (!chars.length) return null;

	const entry = await lookup(word).catch(() => null);
	const reading = orderReadings<Reading>(entry?.readings ?? [])[0];
	const pinyin = reading?.pinyinPlain ?? '';
	const syllables = pinyin.split(/\s+/).filter(Boolean);
	const rawMeaning = wantMeaning ? (reading ? senses(reading.definition)[0] : (entry?.commonMeaning ?? '')) : '';
	const meaning = rawMeaning === '#' ? '' : (rawMeaning ?? '');

	const strokesList = await Promise.all(chars.map((ch) => loadStrokePaths(ch)));
	const missing: string[] = [];
	const segments: Segment[] = [];
	chars.forEach((ch, i) => {
		const strokes = strokesList[i];
		if (!strokes || !strokes.length) {
			missing.push(ch);
			return;
		}
		segments.push({ strokes, tone: syllables[i] ? toneOfPinyin(syllables[i]) : 5 });
	});
	if (!segments.length) return null;

	const tone = syllables[0] ? toneOfPinyin(syllables[0]) : segments[0].tone;
	return { row: { label: segments[0].strokes, tone, pinyin, meaning, segments }, missing };
}

function uniqueChars(words: string[]): string[] {
	const seen = new Set<string>();
	for (const word of words) for (const ch of word) if (!/\s/.test(ch)) seen.add(ch);
	return [...seen];
}

function uniqueWords(words: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const w of words) {
		const t = w.trim();
		if (t && !seen.has(t)) {
			seen.add(t);
			out.push(t);
		}
	}
	return out;
}

async function buildSentencePracticeSheet(
	words: string[],
	opts: PracticeSheetOptions
): Promise<PracticeSheetResult> {
	const gridSize = opts.gridSize ?? 'medium';
	const boxSize = GRID_SIZE_PT[gridSize];
	const paper = opts.orientation === 'portrait' ? A4 : LANDSCAPE;
	const gridStyle = opts.gridStyle ?? 'mi';
	const guideColor = hexToColor(opts.gridColor, rgb(0.85, 0.85, 0.85));
	const phonetics = opts.phonetics ?? 'above';
	const toneColors = opts.toneColors ?? true;
	const repeatCount = Math.max(1, opts.repeatCount ?? 3);

	const text = words.join('');
	const chars = [...text].filter((ch) => !/\s/.test(ch));
	if (!chars.length) throw new Error('Add some text to practice.');

	const fontBytes = await loadPdfFonts();
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	const latin = await doc.embedFont(fontBytes.latin, { subset: true });
	doc.setTitle('Sentence practice sheet');
	doc.setCreator('Anki-xiehanzi');
	doc.setProducer('Anki-xiehanzi');

	const contentWidth = paper.width - MARGIN.x * 2;
	const boxesPerRow = Math.max(1, Math.floor((contentWidth + GAP) / (boxSize + GAP)));
	const phoneticsHeight = phonetics === 'none' ? 0 : 13;
	const rowHeight = boxSize + phoneticsHeight;

	const unsupported: string[] = [];
	const glyphs: { ch: string; strokes: string[] | null; pinyin: string; tone: number }[] = [];
	const seen = new Map<string, { pinyin: string; tone: number; strokes: string[] | null }>();
	for (const ch of chars) {
		if (!seen.has(ch)) {
			const strokes = await loadStrokePaths(ch);
			if (!strokes || !strokes.length) unsupported.push(ch);
			const entry = await lookup(ch).catch(() => null);
			const reading = orderReadings<Reading>(entry?.readings ?? [])[0];
			const pinyin = reading?.pinyinPlain ?? '';
			const tone = pinyin ? toneOfPinyin(pinyin.split(/\s+/)[0] ?? '') : 5;
			seen.set(ch, { pinyin, tone, strokes });
		}
		const c = seen.get(ch)!;
		glyphs.push({ ch, ...c });
	}
	if (glyphs.every((g) => !g.strokes)) throw new Error('None of these characters have stroke data available.');

	let page: PDFPage = doc.addPage([paper.width, paper.height]);
	let y = paper.height - MARGIN.top;
	const newPage = () => {
		page = doc.addPage([paper.width, paper.height]);
		y = paper.height - MARGIN.top;
	};

	for (let rep = 0; rep < repeatCount; rep++) {
		const isModel = rep === 0;
		for (let i = 0; i < glyphs.length; i += boxesPerRow) {
			if (y - rowHeight < MARGIN.bottom) newPage();
			const rowGlyphs = glyphs.slice(i, i + boxesPerRow);
			let by = y;
			if (phonetics === 'above') {
				let tx = MARGIN.x;
				for (const g of rowGlyphs) {
					if (g.pinyin) {
						const w = latin.widthOfTextAtSize(g.pinyin, 8);
						page.drawText(g.pinyin, {
							x: tx + (boxSize - w) / 2,
							y: by - 9,
							size: 8,
							font: latin,
							color: toneColors ? (TONE[g.tone] ?? INK) : INK
						});
					}
					tx += boxSize + GAP;
				}
				by -= phoneticsHeight;
			}
			let bx = MARGIN.x;
			// Every row always spans the full page width — a short last line
			// (or a text shorter than one row) still gets blank boxes out to
			// the right margin instead of stopping dead after the last glyph.
			for (let col = 0; col < boxesPerRow; col++) {
				const g = rowGlyphs[col];
				const cy = by - boxSize;
				drawPracticeCell(page, bx, cy, boxSize, gridStyle, guideColor);
				if (g?.strokes) {
					await drawStrokeGlyph(page, g.strokes, {
						x: bx,
						y: cy,
						size: boxSize,
						padding: boxSize * 0.1,
						color: toneColors ? (TONE[g.tone] ?? INK) : INK,
						opacity: isModel ? 1 : 0.18
					});
				}
				bx += boxSize + GAP;
			}
			by -= boxSize;
			if (phonetics === 'below') {
				let tx = MARGIN.x;
				for (const g of rowGlyphs) {
					if (g.pinyin) {
						const w = latin.widthOfTextAtSize(g.pinyin, 8);
						page.drawText(g.pinyin, {
							x: tx + (boxSize - w) / 2,
							y: by - 9,
							size: 8,
							font: latin,
							color: toneColors ? (TONE[g.tone] ?? INK) : INK
						});
					}
					tx += boxSize + GAP;
				}
				by -= phoneticsHeight;
			}
			y = by - GAP;
		}
		y -= ROW_GAP - GAP;
	}

	for (const p of doc.getPages()) {
		const brand = 'ANKI XIEHANZI';
		const bw = latin.widthOfTextAtSize(brand, 7);
		p.drawText(brand, { x: (paper.width - bw) / 2, y: MARGIN.bottom / 2 - 3.5, size: 7, font: latin, color: FAINT });
	}

	const bytes = await doc.save();
	return { bytes, unsupported: [...new Set(unsupported)] };
}

export async function buildPracticeSheetPdf(
	words: string[],
	opts: PracticeSheetOptions = {}
): Promise<PracticeSheetResult> {
	if (opts.layout === 'sentence') return buildSentencePracticeSheet(words, opts);

	const unit = opts.unit ?? 'char';
	const gridSize = opts.gridSize ?? 'medium';
	const boxSize = GRID_SIZE_PT[gridSize];
	const paper = opts.orientation === 'portrait' ? A4 : LANDSCAPE;
	const gridStyle = opts.gridStyle ?? 'mi';
	const guideColor = hexToColor(opts.gridColor, rgb(0.85, 0.85, 0.85));
	const phonetics = opts.phonetics ?? 'above';
	const toneColors = opts.toneColors ?? true;
	const pinyinRuled = opts.pinyinRuled ?? true;
	const showMeaning = opts.showMeaning ?? false;
	const hintCount = Math.max(0, opts.hintCount ?? 1);
	const hintStrength = opts.hintStrength ?? 'solid';
	const strokeOrder = opts.strokeOrder ?? 'row';
	const traceCount = Math.max(0, opts.traceCount ?? 4);
	const traceStrength = opts.traceStrength ?? 'faded';
	const blankCount = Math.max(0, opts.blankCount ?? 3);
	const rowsPerItem = Math.max(1, Math.floor(opts.rowsPerItem ?? 1));
	const fillPage = opts.fillPage ?? false;

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
	if (unit === 'word') {
		for (const word of uniqueWords(words)) {
			const result = await buildWordRow(word, showMeaning);
			if (result) {
				rows.push(result.row);
				unsupported.push(...result.missing);
			} else {
				unsupported.push(...[...word].filter((ch) => !/\s/.test(ch)));
			}
		}
	} else {
		for (const ch of uniqueChars(words)) {
			const content = await buildCharRow(ch, showMeaning);
			if (content) rows.push(content);
			else unsupported.push(ch);
		}
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

	interface BoxSpec {
		kind: 'hint' | 'trace' | 'blank';
		strokes?: string[];
		tone?: number;
	}

	for (const row of rows) {
		const rowHintColor = hexToColor(opts.hintColor, toneColors ? (TONE[row.tone] ?? INK) : INK);
		const pinyinColor = toneColors ? (TONE[row.tone] ?? INK) : INK;
		const colorFor = (tone: number | undefined, base: 'hint' | 'trace') => {
			if (base === 'trace') return traceStrength === 'color' ? hexToColor(opts.traceColor, rowHintColor) : rgb(0.83, 0.83, 0.83);
			if (opts.hintColor) return rowHintColor;
			return toneColors && tone !== undefined ? (TONE[tone] ?? INK) : toneColors ? rowHintColor : INK;
		};

		// One flat cumulative stroke-reveal step per character, concatenated —
		// a two-character word gets its first character's strokes revealed
		// one at a time, then its second's, not one shared count for both.
		const soSteps: { strokes: string[]; tone: number }[] =
			strokeOrder === 'row'
				? row.segments.flatMap((seg) => seg.strokes.map((_, i) => ({ strokes: seg.strokes.slice(0, i + 1), tone: seg.tone })))
				: [];
		const soLines = soSteps.length ? Math.ceil(soSteps.length / boxesPerRow) : 0;
		const soHeight = soLines ? soLines * (SO_BOX + SO_GAP) + ROW_GAP : 0;

		// The natural sequence: every segment's hint (or per-box reveal) and
		// trace boxes, back to back, then its share of the explicit blank-box
		// count. A word's segments never share a row — each character's own
		// boxes are padded out to the row's right edge, so the next character
		// always starts a fresh line instead of picking up mid-row.
		const baseSpecs: BoxSpec[] = [];
		row.segments.forEach((seg, segIndex) => {
			const segStart = baseSpecs.length;
			if (strokeOrder === 'per-box') {
				for (let i = 0; i < seg.strokes.length; i++) {
					baseSpecs.push({ kind: 'hint', strokes: seg.strokes.slice(0, i + 1), tone: seg.tone });
				}
			} else {
				for (let i = 0; i < hintCount; i++) baseSpecs.push({ kind: 'hint', strokes: seg.strokes, tone: seg.tone });
			}
			for (let i = 0; i < traceCount; i++) baseSpecs.push({ kind: 'trace', strokes: seg.strokes, tone: seg.tone });
			if (row.segments.length > 1) {
				for (let i = 0; i < blankCount; i++) baseSpecs.push({ kind: 'blank' });
				const segLen = baseSpecs.length - segStart;
				const isLastSegment = segIndex === row.segments.length - 1;
				const remainder = segLen % boxesPerRow;
				if (remainder !== 0 && !isLastSegment) {
					for (let i = 0; i < boxesPerRow - remainder; i++) baseSpecs.push({ kind: 'blank' });
				}
			}
		});
		if (row.segments.length <= 1) {
			for (let i = 0; i < blankCount; i++) baseSpecs.push({ kind: 'blank' });
		}

		const naturalBoxRows = Math.ceil(baseSpecs.length / boxesPerRow);
		const meaningHeight = showMeaning && row.meaning ? 11 : 0;
		const phoneticsHeight = phonetics === 'none' ? 0 : 16 + (pinyinRuled ? 4 : 0) + meaningHeight;
		const naturalRowHeight =
			Math.max(labelWidth, naturalBoxRows * (boxSize + GAP) - GAP) + soHeight + phoneticsHeight + ROW_GAP;

		if (y - naturalRowHeight < MARGIN.bottom) newPage();

		const rowTop = y;

		// `rowsPerItem`/`fillPage` only ever add trailing blanks — they never
		// cut the natural hint/trace sequence short.
		const specs = baseSpecs.slice();
		if (fillPage) {
			const roomRows = Math.max(
				naturalBoxRows,
				Math.floor((rowTop - soHeight - phoneticsHeight - MARGIN.bottom + GAP) / (boxSize + GAP))
			);
			while (specs.length < roomRows * boxesPerRow) specs.push({ kind: 'blank' });
		} else {
			const targetRows = Math.max(naturalBoxRows, rowsPerItem);
			while (specs.length < targetRows * boxesPerRow) specs.push({ kind: 'blank' });
		}
		const boxRows = Math.ceil(specs.length / boxesPerRow);

		// ── Row label: the first character on its own, plain ink, no grid ──
		await drawStrokeGlyph(page, row.label, {
			x: MARGIN.x,
			y: rowTop - labelWidth,
			size: labelWidth,
			padding: labelWidth * 0.08,
			color: rowHintColor
		});
		page.drawLine({
			start: { x: MARGIN.x, y: rowTop - labelWidth - 3 },
			end: { x: MARGIN.x + labelWidth, y: rowTop - labelWidth - 3 },
			thickness: 1,
			color: HAIRLINE
		});

		let by = rowTop;

		const drawPinyinLine = () => {
			if (!row.pinyin) return;
			page.drawText(row.pinyin, { x: rowStartX, y: by - 11, size: 11, font: latin, color: pinyinColor });
			if (pinyinRuled) {
				page.drawLine({
					start: { x: rowStartX, y: by - 14 },
					end: { x: rowStartX + latin.widthOfTextAtSize(row.pinyin, 11) + 40, y: by - 14 },
					thickness: 0.75,
					color: HAIRLINE
				});
			}
			by -= 16 + (pinyinRuled ? 4 : 0);
			if (showMeaning && row.meaning) {
				page.drawText(row.meaning, { x: rowStartX, y: by - 8, size: 8, font: latin, color: FAINT });
				by -= meaningHeight;
			}
		};

		if (phonetics === 'above') drawPinyinLine();

		if (soSteps.length) {
			for (let i = 0; i < soSteps.length; i++) {
				const col = i % boxesPerRow;
				const line = Math.floor(i / boxesPerRow);
				const bx = rowStartX + col * (SO_BOX + SO_GAP);
				const byy = by - line * (SO_BOX + SO_GAP) - SO_BOX;
				await drawStrokeGlyph(page, soSteps[i].strokes, {
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

		for (let i = 0; i < specs.length; i++) {
			const col = i % boxesPerRow;
			const line = Math.floor(i / boxesPerRow);
			const cx = rowStartX + col * (boxSize + GAP);
			const cy = by - line * (boxSize + GAP) - boxSize;
			const spec = specs[i];
			drawPracticeCell(page, cx, cy, boxSize, gridStyle, guideColor);
			if (spec.kind === 'blank' || !spec.strokes) continue;
			if (spec.kind === 'hint') {
				await drawStrokeGlyph(page, spec.strokes, {
					x: cx,
					y: cy,
					size: boxSize,
					padding: boxSize * 0.1,
					color: colorFor(spec.tone, 'hint'),
					opacity: strokeOrder === 'per-box' ? undefined : hintOpacity(hintStrength),
					highlightLast: strokeOrder === 'per-box' ? colorFor(spec.tone, 'hint') : undefined
				});
			} else {
				await drawStrokeGlyph(page, spec.strokes, {
					x: cx,
					y: cy,
					size: boxSize,
					padding: boxSize * 0.1,
					color: colorFor(spec.tone, 'trace'),
					opacity: traceOpacity(traceStrength)
				});
			}
		}
		by -= boxRows * (boxSize + GAP) - GAP;

		if (phonetics === 'below') drawPinyinLine();

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
