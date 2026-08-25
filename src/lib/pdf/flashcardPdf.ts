/**
 * Two-sided printable flashcard PDF: a fronts page and a matching backs page
 * per sheet of cards, whatever fields the caller puts on each side. The backs
 * page mirrors its column order per row so a long-edge duplex flip lines a
 * card's back up under its front.
 *
 * Every hanzi field on the page — the big front/back glyph fields, the
 * stroke-order strip, the measure-word character — is drawn as vector strokes
 * (`strokePaths.ts`), never through the embedded CJK font: that font is an
 * HSK-only subset (see `hskPdf.ts`), and `pdf-lib`/`fontkit`'s CID embedder
 * silently drops glyphs once a page carries more than a handful of distinct
 * CJK characters (see the note in `worksheetPdf.ts`) — a real risk here,
 * since a single fronts page can hold 20+ distinct characters. The embedded
 * CJK font is only reached for the rare case cedict's own "meaning"/
 * "definitions" text embeds a bare hanzi reference (e.g. "old variant of
 * 他[ta1]") inside otherwise-English text — at most a couple of characters
 * per card, nowhere near the many-distinct-glyphs threshold above.
 */

import { PDFDocument, type Color, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { lookup, type CedictEntry, type Reading } from '$lib/dict/cedict';
import { orderReadings, senses, levelLabels } from '$lib/dictionary';
import { toneOfPinyin } from '$lib/tone';
import {
	A4,
	INK,
	MARGIN,
	TONE,
	loadPdfFonts,
	clampLines,
	truncateRuns,
	splitRuns,
	scriptOf,
	runsWidth,
	type Measure,
	type Run
} from '$lib/hskPdf';
import { drawCardBorder } from './pdfGrid';
import { drawStrokeGlyph, loadStrokePaths } from './strokePaths';

/**
 * cedict's classifier field is occasionally a raw, uncleaned entry like
 * "個|个[ge4]" rather than a plain character (an existing data-quality gap —
 * `WordEntry.svelte` prints it as-is too) — filtered to CJK codepoints so the
 * punctuation/pinyin/digits in that raw form never get treated as characters
 * needing stroke data.
 */
function cjkChars(s: string): string[] {
	return [...s].filter((ch) => scriptOf(ch) === 'cjk');
}

export type FlashcardFieldId =
	| 'hanzi-simplified'
	| 'hanzi-traditional'
	| 'pinyin'
	| 'meaning'
	| 'definitions'
	| 'classifier'
	| 'level'
	| 'stroke-order';

export interface FlashcardFieldDef {
	id: FlashcardFieldId;
	label: string;
}

/** Canonical order — also the order fields are drawn in, top to bottom. */
export const FLASHCARD_FIELDS: FlashcardFieldDef[] = [
	{ id: 'hanzi-simplified', label: 'Hanzi (simplified)' },
	{ id: 'hanzi-traditional', label: 'Hanzi (traditional)' },
	{ id: 'pinyin', label: 'Pinyin' },
	{ id: 'meaning', label: 'Meaning (short)' },
	{ id: 'definitions', label: 'Definitions (full)' },
	{ id: 'classifier', label: 'Measure word' },
	{ id: 'level', label: 'HSK level' },
	{ id: 'stroke-order', label: 'Stroke order' }
];

const BIG_GLYPH_FIELDS: FlashcardFieldId[] = ['hanzi-simplified', 'hanzi-traditional'];
const isBigField = (id: FlashcardFieldId) => BIG_GLYPH_FIELDS.includes(id);

export type CardStyle = 'bordered' | 'tone-tint' | 'minimal';

export interface FlashcardOptions {
	cols?: number;
	rows?: number;
	front?: FlashcardFieldId[];
	back?: FlashcardFieldId[];
	cardStyle?: CardStyle;
	/** Progressive stroke-order boxes for the `stroke-order` field (default 4). */
	strokeOrderSteps?: number;
}

export interface FlashcardResult {
	bytes: Uint8Array;
	/** Characters used by a hanzi/stroke-order/measure-word field with no stroke data — drawn blank. */
	unsupported: string[];
}

interface CardData {
	word: string;
	entry: CedictEntry | null;
	pinyinSyllables: { text: string; tone: number }[];
	meaning: string;
	definitions: string[];
	classifiers: string[];
	level: string;
	tone: number;
	/** Stroke paths for every distinct character the selected fields need, keyed by character. */
	strokes: Map<string, string[] | null>;
}

const PAD = 10;
const MAX_SENSES = 4;
const MAX_MEANING_LINES = 2;

async function loadCardData(words: string[], fields: FlashcardFieldId[]): Promise<CardData[]> {
	const needsSimplified = fields.includes('hanzi-simplified') || fields.includes('stroke-order');
	const needsTraditional = fields.includes('hanzi-traditional');
	const needsClassifier = fields.includes('classifier');

	return Promise.all(
		words.map(async (word) => {
			const entry = await lookup(word).catch(() => null);
			const readings: Reading[] = entry ? orderReadings(entry.readings) : [];
			const reading = readings[0];
			const pinyinSyllables = (reading?.pinyinPlain ?? '')
				.split(/\s+/)
				.filter(Boolean)
				.map((text) => ({ text, tone: toneOfPinyin(text) }));
			// `commonMeaning` (cedict's eng_Tran) is sometimes the literal
			// placeholder "#" (see WordEntry.svelte / CLAUDE.md) — the per-reading
			// definition is the real meaning whenever a reading exists.
			const meaning = reading
				? (senses(reading.definition)[0] ?? '')
				: entry?.commonMeaning && entry.commonMeaning !== '#'
					? entry.commonMeaning
					: '';
			const definitions = reading ? senses(reading.definition).slice(0, MAX_SENSES) : [];
			const classifiers = (entry?.classifiers ?? []).slice(0, 3);
			const level = levelLabels(entry?.level ?? null).join(', ');
			const tone = pinyinSyllables[0]?.tone ?? 5;

			const chars = new Set<string>();
			if (needsSimplified) for (const ch of entry?.simplified ?? word) chars.add(ch);
			if (needsTraditional) for (const ch of entry?.traditional ?? word) chars.add(ch);
			if (needsClassifier) for (const cl of classifiers) for (const ch of cjkChars(cl)) chars.add(ch);

			const strokes = new Map<string, string[] | null>();
			await Promise.all(
				[...chars].map(async (ch) => {
					strokes.set(ch, await loadStrokePaths(ch).catch(() => null));
				})
			);

			return { word, entry, pinyinSyllables, meaning, definitions, classifiers, level, tone, strokes };
		})
	);
}

/** Every character a card's selected fields would need to draw, for the missing-stroke-data report. */
function charsNeeded(card: CardData, fields: FlashcardFieldId[]): string[] {
	const chars: string[] = [];
	if (fields.includes('hanzi-simplified')) chars.push(...(card.entry?.simplified ?? card.word));
	if (fields.includes('hanzi-traditional')) chars.push(...(card.entry?.traditional ?? card.word));
	if (fields.includes('stroke-order')) chars.push(...(card.entry?.simplified ?? card.word).slice(0, 1));
	if (fields.includes('classifier')) for (const cl of card.classifiers) chars.push(...cjkChars(cl));
	return chars;
}

interface DrawCtx {
	x: number;
	cardW: number;
	latin: PDFFont;
	cjk: PDFFont;
	steps: number;
}

/** A `Measure`/font picker that routes each run to whichever embedded font actually has its script. */
function measureAt(ctx: Pick<DrawCtx, 'latin' | 'cjk'>, size: number): Measure {
	return (run) => (run.script === 'cjk' ? ctx.cjk : ctx.latin).widthOfTextAtSize(run.text, size);
}

/** Draw a run list left-to-right, each run in its own script's font. Returns the x position after the last run. */
function drawRuns(
	page: PDFPage,
	runs: Run[],
	x: number,
	y: number,
	size: number,
	color: Color,
	ctx: Pick<DrawCtx, 'latin' | 'cjk'>
): number {
	let cursor = x;
	for (const run of runs) {
		const font = run.script === 'cjk' ? ctx.cjk : ctx.latin;
		page.drawText(run.text, { x: cursor, y, size, font, color });
		cursor += font.widthOfTextAtSize(run.text, size);
	}
	return cursor;
}

/** Fixed (non-big-glyph) height a field needs, given its content — independent of vertical position. */
function fixedFieldHeight(id: FlashcardFieldId, card: CardData, ctx: DrawCtx): number {
	const maxWidth = ctx.cardW - PAD * 2;
	switch (id) {
		case 'pinyin':
			return card.pinyinSyllables.length ? 14 : 0;
		case 'level':
			return card.level ? 12 : 0;
		case 'classifier':
			return card.classifiers.length ? 16 : 0;
		case 'meaning': {
			if (!card.meaning) return 0;
			const lines = clampLines(card.meaning, maxWidth, MAX_MEANING_LINES, measureAt(ctx, 8.5));
			return lines.length * 11;
		}
		case 'definitions':
			return card.definitions.length * 10.5;
		case 'stroke-order': {
			const first = [...(card.entry?.simplified ?? card.word)][0];
			if (!first || !card.strokes.get(first)) return 0;
			const boxSize = (maxWidth - (ctx.steps - 1) * 3) / ctx.steps;
			return Math.max(0, boxSize);
		}
		default:
			return 0;
	}
}

/** Draw one field into the band `[y - height, y]`, left edge `ctx.x + PAD`. */
async function drawField(
	page: PDFPage,
	id: FlashcardFieldId,
	card: CardData,
	ctx: DrawCtx,
	y: number,
	height: number
): Promise<void> {
	const { x, cardW, latin } = ctx;
	const left = x + PAD;
	const maxWidth = cardW - PAD * 2;

	if (isBigField(id)) {
		const text = id === 'hanzi-traditional' ? (card.entry?.traditional ?? '') : (card.entry?.simplified ?? card.word);
		const chars = [...text];
		if (!chars.length || chars.some((ch) => !card.strokes.get(ch))) return;
		const size = Math.min(height, maxWidth / chars.length);
		const gap = (maxWidth - size * chars.length) / (chars.length + 1);
		let cx = x + PAD + gap;
		const cy = y - height / 2 - size / 2;
		const sameCount = card.pinyinSyllables.length === chars.length;
		for (let i = 0; i < chars.length; i++) {
			const tone = sameCount ? card.pinyinSyllables[i].tone : card.tone;
			const paths = card.strokes.get(chars[i]) ?? [];
			await drawStrokeGlyph(page, paths, { x: cx, y: cy, size, color: TONE[tone] ?? INK });
			cx += size + gap;
		}
		return;
	}

	if (id === 'pinyin' && card.pinyinSyllables.length) {
		let tx = left;
		for (const syl of card.pinyinSyllables) {
			page.drawText(syl.text, { x: tx, y: y - 10, size: 10, font: latin, color: TONE[syl.tone] ?? INK });
			tx += latin.widthOfTextAtSize(syl.text + ' ', 10);
		}
	} else if (id === 'level' && card.level) {
		page.drawText(card.level, { x: left, y: y - 8.5, size: 7.5, font: latin, color: INK });
	} else if (id === 'classifier' && card.classifiers.length) {
		let cx = left;
		const size = Math.min(13, height - 2);
		for (const cl of card.classifiers) {
			for (const ch of cjkChars(cl)) {
				const paths = card.strokes.get(ch);
				if (!paths) continue;
				await drawStrokeGlyph(page, paths, { x: cx, y: y - height + 1, size, color: INK });
				cx += size + 2;
			}
			cx += 4;
		}
	} else if (id === 'meaning' && card.meaning) {
		const lines = clampLines(card.meaning, maxWidth, MAX_MEANING_LINES, measureAt(ctx, 8.5));
		let ty = y - 8.5;
		for (const line of lines) {
			drawRuns(page, line, left, ty, 8.5, INK, ctx);
			ty -= 11;
		}
	} else if (id === 'definitions' && card.definitions.length) {
		let ty = y - 8;
		for (let i = 0; i < card.definitions.length; i++) {
			const label = `${i + 1}. `;
			const labelWidth = latin.widthOfTextAtSize(label, 8);
			page.drawText(label, { x: left, y: ty, size: 8, font: latin, color: INK });
			const runs = truncateRuns(splitRuns(card.definitions[i]), maxWidth - labelWidth, measureAt(ctx, 8));
			drawRuns(page, runs, left + labelWidth, ty, 8, INK, ctx);
			ty -= 10.5;
		}
	} else if (id === 'stroke-order') {
		const first = [...(card.entry?.simplified ?? card.word)][0];
		const paths = first ? card.strokes.get(first) : null;
		if (!paths?.length) return;
		const boxSize = height;
		let bx = left;
		for (let i = 1; i <= ctx.steps; i++) {
			const n = Math.max(1, Math.round((paths.length * i) / ctx.steps));
			await drawStrokeGlyph(page, paths.slice(0, n), { x: bx, y: y - boxSize, size: boxSize, color: INK, padding: 2 });
			bx += boxSize + 3;
		}
	}
}

async function drawSide(
	page: PDFPage,
	fields: FlashcardFieldId[],
	card: CardData,
	x: number,
	y: number,
	cardW: number,
	cardH: number,
	style: CardStyle,
	ctx: Omit<DrawCtx, 'x' | 'cardW'>
): Promise<void> {
	if (style === 'tone-tint') {
		page.drawRectangle({ x, y, width: cardW, height: cardH, color: TONE[card.tone] ?? INK, opacity: 0.1 });
	}
	if (style !== 'minimal') drawCardBorder(page, x, y, cardW, cardH);

	const fullCtx: DrawCtx = { ...ctx, x, cardW };
	const bigCount = fields.filter(isBigField).length;
	const fixedTotal = fields
		.filter((f) => !isBigField(f))
		.reduce((sum, f) => sum + fixedFieldHeight(f, card, fullCtx), 0);
	const available = cardH - PAD * 2;
	const bigHeight = bigCount ? Math.max(0, (available - fixedTotal) / bigCount) : 0;

	// A single text-only field (no big glyph on this side, e.g. a "recall" prompt)
	// reads better centered and larger than top-anchored at the small default size.
	const soloText = bigCount === 0 && fields.length === 1;

	let ty = y + cardH - PAD;
	if (soloText) {
		const scale = 1.4;
		const id = fields[0];
		const lines =
			id === 'meaning'
				? clampLines(card.meaning, cardW - PAD * 2, MAX_MEANING_LINES + 1, measureAt(ctx, 12)).length
				: id === 'definitions'
					? card.definitions.length
					: 1;
		const blockHeight = lines * 11 * scale;
		ty = y + cardH / 2 + blockHeight / 2;
		if (id === 'meaning' && card.meaning) {
			const lines2 = clampLines(card.meaning, cardW - PAD * 2, MAX_MEANING_LINES + 1, measureAt(ctx, 12));
			let py = ty - 12;
			for (const line of lines2) {
				const w = runsWidth(line, measureAt(ctx, 12));
				drawRuns(page, line, x + (cardW - w) / 2, py, 12, INK, ctx);
				py -= 15;
			}
			return;
		}
	}

	for (const field of fields) {
		const height = isBigField(field) ? bigHeight : fixedFieldHeight(field, card, fullCtx);
		if (height <= 0) continue;
		await drawField(page, field, card, fullCtx, ty, height);
		ty -= height;
	}
}

export async function buildFlashcardPdf(
	words: string[],
	opts: FlashcardOptions = {}
): Promise<FlashcardResult> {
	const cols = Math.max(1, opts.cols ?? 4);
	const rows = Math.max(1, opts.rows ?? 5);
	const front = opts.front ?? ['hanzi-simplified'];
	const back = opts.back ?? ['pinyin', 'meaning'];
	const cardStyle = opts.cardStyle ?? 'bordered';
	const steps = Math.max(2, Math.min(8, opts.strokeOrderSteps ?? 4));
	if (!words.length) throw new Error('Add at least one word to print.');

	const fontBytes = await loadPdfFonts();
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	const latin = await doc.embedFont(fontBytes.latin, { subset: true });
	const cjk = await doc.embedFont(fontBytes.cjk, { subset: false });

	doc.setTitle('Flashcards');
	doc.setCreator('Anki-xiehanzi');
	doc.setProducer('Anki-xiehanzi');

	const allFields = [...new Set([...front, ...back])];
	const cards = await loadCardData(words, allFields);

	const unsupported = [
		...new Set(cards.flatMap((c) => charsNeeded(c, allFields).filter((ch) => c.strokes.get(ch) === null)))
	];

	const contentWidth = A4.width - MARGIN.x * 2;
	const contentHeight = A4.height - MARGIN.top - MARGIN.bottom;
	const cardW = contentWidth / cols;
	const cardH = contentHeight / rows;

	const baseCtx = { latin, cjk, steps };

	const perSheet = cols * rows;
	for (let start = 0; start < cards.length; start += perSheet) {
		const sheet = cards.slice(start, start + perSheet);

		const frontPage = doc.addPage([A4.width, A4.height]);
		for (let i = 0; i < sheet.length; i++) {
			const row = Math.floor(i / cols);
			const col = i % cols;
			const x = MARGIN.x + col * cardW;
			const y = A4.height - MARGIN.top - (row + 1) * cardH;
			await drawSide(frontPage, front, sheet[i], x, y, cardW, cardH, cardStyle, baseCtx);
		}

		const backPage = doc.addPage([A4.width, A4.height]);
		for (let i = 0; i < sheet.length; i++) {
			const row = Math.floor(i / cols);
			const mirroredCol = cols - 1 - (i % cols);
			const x = MARGIN.x + mirroredCol * cardW;
			const y = A4.height - MARGIN.top - (row + 1) * cardH;
			await drawSide(backPage, back, sheet[i], x, y, cardW, cardH, cardStyle, baseCtx);
		}
	}

	const bytes = await doc.save();
	return { bytes, unsupported };
}
