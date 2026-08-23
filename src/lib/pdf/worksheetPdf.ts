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
 * Every single hanzi anywhere on the page — the character card, the
 * vocabulary words, the example sentences, the stroke-order row, the
 * practice grid — is drawn as vector strokes (`strokePaths.ts`), never font
 * text. This isn't just about the embedded CJK font being an HSK-only
 * subset (see `hskPdf.ts`): `pdf-lib`/`fontkit`'s CID font embedder has a
 * real bug where a page drawing more than a handful of distinct CJK glyphs
 * via that font silently drops some of them, no error, and *neither*
 * `subset: true` nor `subset: false` reliably avoids it once a page has
 * enough distinct characters (confirmed with bare pdf-lib scripts, no app
 * code — see the same fix's note in `hskPdf.ts`, which still needs the font
 * because zhuyin isn't hanzi and has no stroke data to draw as vectors).
 * Only the Latin text (pinyin, English, numbers) uses the embedded font
 * here — that path has never shown any issue in testing.
 */

import { PDFDocument, rgb, type Color, type PDFPage } from 'pdf-lib';
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
import { drawPracticeCell, hexToColor, type PracticeGridStyle } from './pdfGrid';
import { drawStrokeGlyph, loadStrokePaths } from './strokePaths';

export interface WorksheetOptions {
	/** Practice boxes per row (default 10). */
	boxesPerRow?: number;
	/** How many of the practice boxes get a faint trace-over glyph (default 5). */
	traceCount?: number;
	/** Guide style for the practice-grid boxes (default 'mi', mi-zi-ge). */
	gridStyle?: PracticeGridStyle;
	/** Guide-line colour for the practice grid, as a hex string. */
	gridColor?: string;
	/** Draw the cumulative stroke-order row above the practice grid (default true). */
	showStrokeOrder?: boolean;
	/** Show the pinyin line on the character card (default true). */
	showPinyin?: boolean;
	/** Show the part-of-speech + meaning text on the character card (default true). */
	showDefinition?: boolean;
	/** Show the "words that use this character" column (default true). */
	showVocabulary?: boolean;
	/** How many vocabulary words to list, 0-10 (default 5). */
	vocabCount?: number;
	/** Show the example-sentences column (default true). */
	showExamples?: boolean;
	/** How many example sentences to list, 0-8 (default 4). */
	exampleCount?: number;
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
const MAX_VOCAB = 10;
const MAX_SENTENCES = 8;

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

async function buildCharacterContent(
	ch: string,
	vocabCount: number,
	exampleCount: number
): Promise<CharacterContent | null> {
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
		vocabCount > 0 ? wordsContaining(ch, vocabCount).catch(() => []) : Promise.resolve([]),
		exampleCount > 0 ? getSmartSentences(ch, { limit: exampleCount }).catch(() => []) : Promise.resolve([])
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
	const gridStyle = opts.gridStyle ?? 'mi';
	const guideColor = hexToColor(opts.gridColor, rgb(0.945, 0.945, 0.945));
	const showStrokeOrder = opts.showStrokeOrder ?? true;
	const showPinyin = opts.showPinyin ?? true;
	const showDefinition = opts.showDefinition ?? true;
	const showVocabulary = opts.showVocabulary ?? true;
	const vocabCount = Math.min(MAX_VOCAB, Math.max(0, opts.vocabCount ?? 5));
	const showExamples = opts.showExamples ?? true;
	const exampleCount = Math.min(MAX_SENTENCES, Math.max(0, opts.exampleCount ?? 4));

	const allChars = uniqueChars(words);
	const chars = allChars.slice(0, MAX_CHARACTERS);
	const truncated = allChars.length - chars.length;
	if (!chars.length) throw new Error('Add at least one character to study.');

	const fontBytes = await loadPdfFonts();
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	// No CJK font embedded at all — see the file-level comment. Everything
	// drawn through `latin` here is genuinely Latin (pinyin, English, digits).
	const latin = await doc.embedFont(fontBytes.latin, { subset: true });

	doc.setTitle('Character study worksheet');
	doc.setCreator('Anki-xiehanzi');
	doc.setProducer('Anki-xiehanzi');

	// Every string that reaches `drawLine`/`drawRuns` in this file is Latin —
	// `splitRuns`/`wrapRuns` still tag it 'latin', so this always resolves.
	const fontFor = (_script: Script) => latin;
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

	/**
	 * Hanzi are monospace by design, so a word's width is just
	 * `chars.length * size` — no font measurement needed since there's no
	 * font. `boxBottomY` matches where a font's text baseline would have
	 * landed at this `size`, which keeps every call site's existing baseline
	 * arithmetic valid without a separate "box" coordinate concept.
	 */
	const drawVectorWord = async (
		page: PDFPage,
		text: string,
		x: number,
		boxBottomY: number,
		size: number,
		colorAt: (i: number) => Color
	): Promise<void> => {
		let cx = x;
		const chars = [...text];
		for (let i = 0; i < chars.length; i++) {
			const paths = await loadStrokePaths(chars[i]);
			if (paths && paths.length) {
				await drawStrokeGlyph(page, paths, {
					x: cx,
					y: boxBottomY,
					size,
					padding: size * 0.08,
					color: colorAt(i)
				});
			}
			cx += size;
		}
	};
	const vectorWordWidth = (text: string, size: number): number => [...text].length * size;

	const unsupported: string[] = [];
	const contents: CharacterContent[] = [];
	for (const ch of chars) {
		const content = await buildCharacterContent(
			ch,
			showVocabulary ? vocabCount : 0,
			showExamples ? exampleCount : 0
		);
		if (content) contents.push(content);
		else unsupported.push(ch);
	}
	if (!contents.length) {
		throw new Error('None of these characters have stroke data available.');
	}

	// Each side column only takes page space if its section is actually
	// showing content — a reader who turns vocabulary off gets that width
	// back for examples (or the character card), not a blank box.
	const hasVocabCol = showVocabulary && vocabCount > 0;
	const hasExamplesCol = showExamples && exampleCount > 0;
	const sideCols = (hasVocabCol ? 1 : 0) + (hasExamplesCol ? 1 : 0);

	const contentWidth = A4.width - MARGIN.x * 2;
	const colGap = 16;
	const halfGap = 14;
	const leftColWidth = sideCols === 0 ? contentWidth - PAD * 2 : 150;
	const rightWidth = contentWidth - leftColWidth - colGap;
	const colWidth = sideCols === 2 ? (rightWidth - halfGap) / 2 : rightWidth;
	const vocabX = hasVocabCol ? MARGIN.x + leftColWidth + colGap : 0;
	const examplesX = hasExamplesCol
		? MARGIN.x + leftColWidth + colGap + (hasVocabCol ? colWidth + halfGap : 0)
		: 0;

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
			const w = vectorWordWidth(content.traditional, 13);
			await drawVectorWord(page, content.traditional, MARGIN.x + PAD + (leftInner - w) / 2, ly, 13, () => FAINT);
			ly -= 19;
		}
		if (showPinyin) {
			const w = latin.widthOfTextAtSize(content.pinyin, 18);
			drawLine(page, content.pinyin, MARGIN.x + PAD + (leftInner - w) / 2, ly, 18, TONE[content.tone] ?? INK);
			ly -= 18;
		}
		if (showDefinition) {
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
		}
		const leftColHeight = headerTop - ly + PAD;

		// ── Vocabulary column ───────────────────────────────────────────────
		let vocabHeight = 0;
		if (hasVocabCol) {
			const vocabInnerX = vocabX + PAD;
			const vocabInnerWidth = colWidth - PAD * 2;
			let vy = headerTop - PAD;
			drawLine(page, 'VOCABULARY', vocabInnerX, vy, 7.5, ACCENT_VOCAB);
			vy -= LABEL_GAP;
			for (const v of content.vocab) {
				const wordColor = TONE[v.tone] ?? INK;
				await drawVectorWord(page, v.word, vocabInnerX, vy - 13, 15, () => wordColor);
				const wx = vectorWordWidth(v.word, 15);
				drawLine(page, v.pinyin, vocabInnerX + wx + 7, vy - 12, 10, wordColor, vocabInnerWidth - wx - 7);
				vy -= 19;
				drawLine(page, v.meaning, vocabInnerX, vy - 8, 8, MUTED, vocabInnerWidth);
				vy -= 20;
			}
			vocabHeight = headerTop - vy + PAD;
		}

		// ── Example sentences column ────────────────────────────────────────
		let examplesHeight = 0;
		if (hasExamplesCol) {
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
				const sentenceSize = 12;
				let cx = textX;
				for (const { ch, tone } of ex.chars) {
					if (/\s/.test(ch)) {
						cx += sentenceSize * 0.4;
						continue;
					}
					const paths = await loadStrokePaths(ch);
					if (paths && paths.length) {
						await drawStrokeGlyph(page, paths, {
							x: cx,
							y: ey - 12,
							size: sentenceSize,
							padding: sentenceSize * 0.08,
							color: tone === null ? INK : (TONE[tone] ?? INK)
						});
					}
					cx += sentenceSize;
				}
				ey -= 25;
				const lines = clampLines(ex.translation, textWidth, 2, measureAt(8));
				for (const line of lines) {
					drawRuns(page, line, textX, ey, 8, MUTED);
					ey -= 11;
				}
				ey -= 10;
			}
			examplesHeight = headerTop - ey + PAD;
		}

		const headerHeight = Math.max(leftColHeight, vocabHeight, examplesHeight);

		// Panel border + column dividers around the whole header-grid area —
		// one divider per active column boundary, so a hidden column doesn't
		// leave a rule floating over nothing.
		page.drawRectangle({
			x: MARGIN.x,
			y: headerTop - headerHeight,
			width: contentWidth,
			height: headerHeight,
			borderColor: HAIRLINE,
			borderWidth: 1
		});
		if (sideCols > 0) {
			page.drawLine({
				start: { x: MARGIN.x + leftColWidth + colGap / 2, y: headerTop },
				end: { x: MARGIN.x + leftColWidth + colGap / 2, y: headerTop - headerHeight },
				thickness: 1,
				color: HAIRLINE
			});
		}
		if (sideCols === 2) {
			page.drawLine({
				start: { x: examplesX - halfGap / 2, y: headerTop },
				end: { x: examplesX - halfGap / 2, y: headerTop - headerHeight },
				thickness: 1,
				color: HAIRLINE
			});
		}

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
				drawPracticeCell(page, x, rowY, boxSize, gridStyle, guideColor);
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

		// ── Footer branding ──────────────────────────────────────────────────
		const brand = 'ANKI XIEHANZI';
		const brandWidth = latin.widthOfTextAtSize(brand, 7);
		page.drawText(brand, {
			x: (A4.width - brandWidth) / 2,
			y: MARGIN.bottom / 2 - 3.5,
			size: 7,
			font: latin,
			color: FAINT
		});
	}

	const bytes = await doc.save();
	return { bytes, unsupported, truncated };
}
