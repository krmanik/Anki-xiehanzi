/**
 * Character study worksheet PDF: one page per character, in the app's own
 * Material-panel language (see the radicals card in CLAUDE.md — a raised
 * panel per section, one accent colour on its left edge) rather than a
 * plain black-and-white sheet. The page shape is the idea behind
 * hanzi-slides-svelte's `generate_worksheet.py` (character card + vocabulary
 * + example sentences, then a stroke-order row, then practice boxes), redone
 * with this app's own data (`wordsContaining`, `getSmartSentences`) and its
 * tone-colour convention instead of plain black text.
 *
 * Every hanzi in the character card, the stroke-order row and the practice
 * grid is drawn as vector strokes (`strokePaths.ts`), not font text — the
 * point of the whole rewrite, since the embedded CJK font is only a subset
 * of the current HSK word lists (see `hskPdf.ts`). Vocabulary and example
 * sentences are still short font-drawn text, same as any other PDF table
 * this app builds.
 */

import { PDFDocument, rgb, type Color, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { lookup, wordsContaining, getSmartSentences, posDisplay, type Reading } from '$lib/dict/cedict';
import { orderReadings, senses } from '$lib/dictionary';
import { pairSentenceTones, toneOfPinyin } from '$lib/tone';
import {
	A4,
	INK,
	MARGIN,
	TONE,
	HAIRLINE,
	loadPdfFonts,
	splitRuns,
	truncateRuns,
	clampLines,
	type Measure,
	type Script
} from '$lib/hskPdf';
import { drawMiZiGe } from './pdfGrid';
import { drawStrokeGlyph, loadStrokePaths } from './strokePaths';

export interface WorksheetOptions {
	/** Practice boxes per row (default 10). */
	boxesPerRow?: number;
	/** How many of the practice boxes get a faint trace-over glyph (default 5). */
	traceCount?: number;
	/** Draw the cumulative stroke-order row above the practice grid (default true). */
	showStrokeOrder?: boolean;
}

export interface WorksheetResult {
	bytes: Uint8Array;
	/** Characters Hanzi Writer has no stroke data for — skipped entirely. */
	unsupported: string[];
	/** Characters dropped past `MAX_CHARACTERS`, a full page each being heavy. */
	truncated: number;
}

/** One rich page per character is a lot of page — cap a bulk fill from HSK. */
const MAX_CHARACTERS = 40;
const VOCAB_COUNT = 5;
const SENTENCE_COUNT = 4;

const MUTED = rgb(0.55, 0.55, 0.55);
const FAINT = rgb(0.68, 0.68, 0.68);
const ACCENT_VOCAB = rgb(0, 0.588, 0.533); // teal
const ACCENT_EXAMPLES = rgb(0.914, 0.118, 0.388); // pink
const ACCENT_STROKES = TONE[4]; // blue — reuses the tone palette's own blue

const GAP = 8;
const SO_BOX = 30;
const SO_GAP = 6;
const SO_NUMBER_HEIGHT = 11;
const TRACE_GREY = rgb(0.83, 0.83, 0.83);
const TRACE_OPACITY = 0.16;
/** Inner padding inside the character-card panel, on every side. */
const PAD = 14;
/** Gap between a section's uppercase label and its content. */
const LABEL_GAP = 14;
/** Gap between the character-card panel and the sections below it. */
const SECTION_GAP = 24;

interface VocabItem {
	word: string;
	tone: number;
	pinyin: string;
	meaning: string;
}

interface ExampleItem {
	chars: { ch: string; tone: number | null }[];
	translation: string;
}

interface CharacterContent {
	ch: string;
	traditional: string;
	tone: number;
	pinyin: string;
	pos: string;
	meaning: string;
	strokes: string[];
	vocab: VocabItem[];
	examples: ExampleItem[];
}

/** Unique characters across `words`, in first-seen order. */
function uniqueChars(words: string[]): string[] {
	const seen = new Set<string>();
	for (const word of words) {
		for (const ch of word) {
			if (/\s/.test(ch)) continue;
			seen.add(ch);
		}
	}
	return [...seen];
}

async function buildCharacterContent(ch: string): Promise<CharacterContent | null> {
	const strokes = await loadStrokePaths(ch);
	if (!strokes || !strokes.length) return null;

	const entry = await lookup(ch).catch(() => null);
	// cedict's own reading order is not by commonness (的 lists "dí" before the
	// far more common "de") — `orderReadings` is the same fix `WordEntry.svelte`
	// applies, picking the reading with the fullest sense list for display.
	const reading = orderReadings<Reading>(entry?.readings ?? [])[0];
	const tone = reading ? toneOfPinyin(reading.pinyinPlain.split(/\s+/)[0] ?? '') : 5;
	const meaning = reading
		? senses(reading.definition).slice(0, 3).join('; ')
		: (entry?.commonMeaning ?? '');

	const [vocabHits, sentences] = await Promise.all([
		wordsContaining(ch, VOCAB_COUNT).catch(() => []),
		getSmartSentences(ch, { limit: SENTENCE_COUNT }).catch(() => [])
	]);

	return {
		ch,
		traditional: entry?.traditional && entry.traditional !== ch ? entry.traditional : '',
		tone,
		pinyin: reading?.pinyinPlain ?? '',
		pos: entry?.dominantPos ? posDisplay(entry.dominantPos) : '',
		meaning,
		strokes,
		vocab: vocabHits.map((v) => {
			// `SearchHit.pinyin` can hold several readings joined with " / " and
			// `.meaning` several senses joined with "; " — a compact vocab line
			// wants the one reading and one sense that actually apply here, not
			// every alternate reading a whole different word might use.
			const firstPinyin = v.pinyin.split(' / ')[0] ?? v.pinyin;
			const firstSense = v.meaning.split(';')[0]?.trim() || v.meaning;
			return {
				word: v.simplified,
				tone: toneOfPinyin(firstPinyin.split(/\s+/)[0] ?? ''),
				pinyin: firstPinyin,
				meaning: firstSense
			};
		}),
		examples: sentences.map((s) => ({
			chars: pairSentenceTones(s.simplified, s.pinyin),
			translation: s.translation
		}))
	};
}

export async function buildWorksheetPdf(
	words: string[],
	opts: WorksheetOptions = {}
): Promise<WorksheetResult> {
	const boxesPerRow = Math.max(1, opts.boxesPerRow ?? 10);
	const traceCount = Math.max(0, opts.traceCount ?? 5);
	const showStrokeOrder = opts.showStrokeOrder ?? true;

	const allChars = uniqueChars(words);
	const chars = allChars.slice(0, MAX_CHARACTERS);
	const truncated = allChars.length - chars.length;
	if (!chars.length) throw new Error('Add at least one character to study.');

	const fontBytes = await loadPdfFonts();
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	// `subset: true` silently drops glyphs for this font once several distinct
	// CJK characters are drawn — a pdf-lib/fontkit bug confirmed in isolation
	// (bare pdf-lib script, no app code): some `drawText` calls with a *subset*
	// CJK CID font render nothing at all, with no error, while `subset: false`
	// renders every character correctly. Latin text isn't affected.
	const cjk = await doc.embedFont(fontBytes.cjk, { subset: false });
	const latin = await doc.embedFont(fontBytes.latin, { subset: true });

	doc.setTitle('Character study worksheet');
	doc.setCreator('Anki-xiehanzi');
	doc.setProducer('Anki-xiehanzi');

	const fontFor = (script: Script): PDFFont => (script === 'cjk' ? cjk : latin);
	const measureAt = (size: number): Measure => (run) => fontFor(run.script).widthOfTextAtSize(run.text, size);

	const drawRuns = (
		page: PDFPage,
		runs: { text: string; script: Script }[],
		x: number,
		y: number,
		size: number,
		color: Color
	) => {
		let cursor = x;
		for (const run of runs) {
			page.drawText(run.text, { x: cursor, y, size, font: fontFor(run.script), color });
			cursor += fontFor(run.script).widthOfTextAtSize(run.text, size);
		}
		return cursor;
	};
	const drawLine = (page: PDFPage, text: string, x: number, y: number, size: number, color: Color, maxWidth?: number) => {
		const runs = maxWidth ? truncateRuns(splitRuns(text), maxWidth, measureAt(size)) : splitRuns(text);
		drawRuns(page, runs, x, y, size, color);
	};

	const unsupported: string[] = [];
	const contents: CharacterContent[] = [];
	for (const ch of chars) {
		const content = await buildCharacterContent(ch);
		if (content) contents.push(content);
		else unsupported.push(ch);
	}
	if (!contents.length) {
		throw new Error('None of these characters have stroke data available.');
	}

	const contentWidth = A4.width - MARGIN.x * 2;
	const leftColWidth = 150;
	const colGap = 16;
	const rightWidth = contentWidth - leftColWidth - colGap;
	const halfGap = 14;
	const colWidth = (rightWidth - halfGap) / 2;
	const vocabX = MARGIN.x + leftColWidth + colGap;
	const examplesX = vocabX + colWidth + halfGap;

	const soPerLine = Math.max(1, Math.floor((contentWidth + SO_GAP) / (SO_BOX + SO_GAP)));
	const soLineHeight = SO_BOX + SO_NUMBER_HEIGHT + SO_GAP;

	for (const content of contents) {
		const page = doc.addPage([A4.width, A4.height]);
		let y = A4.height - MARGIN.top;
		const headerTop = y;

		// ── Left column: the character itself ──────────────────────────────
		const leftInner = leftColWidth - PAD * 2;
		const glyphSize = 80;
		const glyphX = MARGIN.x + PAD + (leftInner - glyphSize) / 2;
		await drawStrokeGlyph(page, content.strokes, {
			x: glyphX,
			y: y - PAD - glyphSize,
			size: glyphSize,
			padding: 3,
			color: TONE[content.tone] ?? INK
		});
		let ly = y - PAD - glyphSize - 20;
		if (content.traditional) {
			const w = cjk.widthOfTextAtSize(content.traditional, 13);
			drawLine(page, content.traditional, MARGIN.x + PAD + (leftInner - w) / 2, ly, 13, FAINT);
			ly -= 19;
		}
		{
			const w = latin.widthOfTextAtSize(content.pinyin, 18);
			drawLine(page, content.pinyin, MARGIN.x + PAD + (leftInner - w) / 2, ly, 18, TONE[content.tone] ?? INK);
			ly -= 18;
		}
		if (content.pos) {
			const label = content.pos.toUpperCase();
			const w = latin.widthOfTextAtSize(label, 8);
			drawLine(page, label, MARGIN.x + PAD + (leftInner - w) / 2, ly, 8, FAINT);
			ly -= 16;
		}
		const meaningLines = clampLines(content.meaning, leftInner, 4, measureAt(8.5));
		for (const line of meaningLines) {
			drawRuns(page, line, MARGIN.x + PAD, ly, 8.5, MUTED);
			ly -= 12.5;
		}
		const leftColHeight = headerTop - ly + PAD;

		// ── Vocabulary column ───────────────────────────────────────────────
		const vocabInnerX = vocabX + PAD;
		const vocabInnerWidth = colWidth - PAD * 2;
		let vy = headerTop - PAD;
		drawLine(page, 'VOCABULARY', vocabInnerX, vy, 7.5, ACCENT_VOCAB);
		vy -= LABEL_GAP;
		for (const v of content.vocab) {
			drawLine(page, v.word, vocabInnerX, vy - 13, 15, TONE[v.tone] ?? INK);
			const wx = cjk.widthOfTextAtSize(v.word, 15);
			drawLine(page, v.pinyin, vocabInnerX + wx + 7, vy - 12, 10, TONE[v.tone] ?? INK, vocabInnerWidth - wx - 7);
			vy -= 19;
			drawLine(page, v.meaning, vocabInnerX, vy - 8, 8, MUTED, vocabInnerWidth);
			vy -= 20;
		}
		const vocabHeight = headerTop - vy + PAD;

		// ── Example sentences column ────────────────────────────────────────
		const exInnerX = examplesX + PAD;
		const exInnerWidth = colWidth - PAD * 2;
		let ey = headerTop - PAD;
		drawLine(page, 'EXAMPLE SENTENCES', exInnerX, ey, 7.5, ACCENT_EXAMPLES);
		ey -= LABEL_GAP + 2;
		let num = 1;
		for (const ex of content.examples) {
			const badgeR = 6.5;
			page.drawEllipse({
				x: exInnerX + badgeR,
				y: ey - 5,
				xScale: badgeR,
				yScale: badgeR,
				color: INK
			});
			const numText = String(num++);
			const nw = latin.widthOfTextAtSize(numText, 7);
			page.drawText(numText, {
				x: exInnerX + badgeR - nw / 2,
				y: ey - 8,
				size: 7,
				font: latin,
				color: rgb(1, 1, 1)
			});
			const textX = exInnerX + badgeR * 2 + 6;
			const textWidth = exInnerWidth - badgeR * 2 - 6;
			let cx = textX;
			for (const { ch, tone } of ex.chars) {
				page.drawText(ch, { x: cx, y: ey - 12, size: 12, font: cjk, color: tone === null ? INK : (TONE[tone] ?? INK) });
				cx += cjk.widthOfTextAtSize(ch, 12);
			}
			ey -= 25;
			const lines = clampLines(ex.translation, textWidth, 2, measureAt(8));
			for (const line of lines) {
				drawRuns(page, line, textX, ey, 8, MUTED);
				ey -= 11;
			}
			ey -= 10;
		}
		const examplesHeight = headerTop - ey + PAD;

		const headerHeight = Math.max(leftColHeight, vocabHeight, examplesHeight);

		// Panel border + column dividers around the whole header-grid area.
		page.drawRectangle({
			x: MARGIN.x,
			y: headerTop - headerHeight,
			width: contentWidth,
			height: headerHeight,
			borderColor: HAIRLINE,
			borderWidth: 1
		});
		page.drawLine({
			start: { x: MARGIN.x + leftColWidth + colGap / 2, y: headerTop },
			end: { x: MARGIN.x + leftColWidth + colGap / 2, y: headerTop - headerHeight },
			thickness: 1,
			color: HAIRLINE
		});
		page.drawLine({
			start: { x: examplesX - halfGap / 2, y: headerTop },
			end: { x: examplesX - halfGap / 2, y: headerTop - headerHeight },
			thickness: 1,
			color: HAIRLINE
		});

		y = headerTop - headerHeight - SECTION_GAP;

		// ── Stroke order ─────────────────────────────────────────────────────
		if (showStrokeOrder) {
			drawLine(page, 'STROKE ORDER', MARGIN.x, y, 7.5, ACCENT_STROKES);
			y -= LABEL_GAP;
			const soLines = Math.ceil(content.strokes.length / soPerLine);
			for (let i = 0; i < content.strokes.length; i++) {
				const col = i % soPerLine;
				const line = Math.floor(i / soPerLine);
				const bx = MARGIN.x + col * (SO_BOX + SO_GAP);
				const by = y - line * soLineHeight - SO_BOX;
				await drawStrokeGlyph(page, content.strokes.slice(0, i + 1), {
					x: bx,
					y: by,
					size: SO_BOX,
					padding: 2,
					color: TRACE_GREY,
					highlightLast: INK
				});
				const numText = String(i + 1);
				page.drawText(numText, {
					x: bx + SO_BOX - latin.widthOfTextAtSize(numText, 6) - 1,
					y: by - SO_NUMBER_HEIGHT + 3,
					size: 6,
					font: latin,
					color: TRACE_GREY
				});
			}
			y -= soLines * soLineHeight + SECTION_GAP;
		}

		// ── Practice grid: fills the rest of the page ───────────────────────
		drawLine(page, 'PRACTICE WRITING', MARGIN.x, y, 7.5, MUTED);
		y -= LABEL_GAP;
		const boxSize = (contentWidth - GAP * (boxesPerRow - 1)) / boxesPerRow;
		const rows = Math.max(1, Math.floor((y - MARGIN.bottom + GAP) / (boxSize + GAP)));
		let cellIndex = 0;
		for (let row = 0; row < rows; row++) {
			const rowY = y - boxSize;
			for (let col = 0; col < boxesPerRow; col++, cellIndex++) {
				const x = MARGIN.x + col * (boxSize + GAP);
				drawMiZiGe(page, x, rowY, boxSize);
				if (cellIndex < traceCount) {
					await drawStrokeGlyph(page, content.strokes, {
						x,
						y: rowY,
						size: boxSize,
						padding: boxSize * 0.1,
						color: TRACE_GREY,
						opacity: TRACE_OPACITY
					});
				}
			}
			y = rowY - GAP;
		}
	}

	const bytes = await doc.save();
	return { bytes, unsupported, truncated };
}
