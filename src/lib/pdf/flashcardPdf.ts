/**
 * Two-sided printable flashcard PDF: a fronts page (hanzi) and a matching
 * backs page (pinyin + meaning) per sheet of cards. The backs page mirrors
 * its column order per row so a long-edge duplex flip lines a card's back up
 * under its front.
 */

import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { lookup } from '$lib/dict/cedict';
import { senses } from '$lib/dictionary';
import { toneOfPinyin } from '$lib/tone';
import { buildHskLookup } from '$lib/hskCoverage';
import { A4, INK, MARGIN, TONE, loadPdfFonts, truncateRuns, wrapRuns, type Measure } from '$lib/hskPdf';
import { drawCardBorder, unrenderableChars } from './pdfGrid';

export type FlashcardField = 'pinyin' | 'meaning' | 'level';

export interface FlashcardOptions {
	cols?: number;
	rows?: number;
	fields?: FlashcardField[];
}

export interface FlashcardResult {
	bytes: Uint8Array;
	unsupported: string[];
}

interface CardData {
	word: string;
	pinyinSyllables: { text: string; tone: number }[];
	meaning: string;
	level: string;
}

const CARD_PAD = 10;

async function loadCardData(words: string[], fields: FlashcardField[]): Promise<CardData[]> {
	const wantLevel = fields.includes('level');
	const levelLookup = wantLevel ? await buildHskLookup('new') : null;

	return Promise.all(
		words.map(async (word) => {
			const entry = await lookup(word).catch(() => null);
			const reading = entry?.readings[0];
			const pinyinSyllables = (reading?.pinyinPlain ?? '')
				.split(/\s+/)
				.filter(Boolean)
				.map((text) => ({ text, tone: toneOfPinyin(text) }));
			// `commonMeaning` (cedict's eng_Tran) is sometimes the literal
			// placeholder "#" (see WordEntry.svelte / CLAUDE.md) — the per-reading
			// definition is the real meaning whenever a reading exists.
			const meaning = reading
				? senses(reading.definition).join('; ')
				: (entry?.commonMeaning ?? '');
			return {
				word,
				pinyinSyllables,
				meaning,
				level: levelLookup?.get(word)?.level ?? ''
			};
		})
	);
}

export async function buildFlashcardPdf(
	words: string[],
	opts: FlashcardOptions = {}
): Promise<FlashcardResult> {
	const cols = Math.max(1, opts.cols ?? 4);
	const rows = Math.max(1, opts.rows ?? 5);
	const fields = opts.fields ?? ['pinyin', 'meaning'];
	if (!words.length) throw new Error('Add at least one word to print.');

	const fontBytes = await loadPdfFonts();
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	// `subset: true` silently drops glyphs for this font once several distinct
	// CJK characters are drawn — see the note in worksheetPdf.ts. `subset: false`
	// is the reliable choice for any page with more than a couple of hanzi.
	const cjk = await doc.embedFont(fontBytes.cjk, { subset: false });
	const latin = await doc.embedFont(fontBytes.latin, { subset: true });

	doc.setTitle('Flashcards');
	doc.setCreator('Anki-xiehanzi');
	doc.setProducer('Anki-xiehanzi');

	const unsupported = await unrenderableChars(fontBytes.cjk, words.join(''));
	const cards = await loadCardData(words, fields);

	const contentWidth = A4.width - MARGIN.x * 2;
	const contentHeight = A4.height - MARGIN.top - MARGIN.bottom;
	const cardW = contentWidth / cols;
	const cardH = contentHeight / rows;

	const measure: Measure = (run) =>
		(run.script === 'cjk' ? cjk : latin).widthOfTextAtSize(run.text, 9);

	const perSheet = cols * rows;
	for (let start = 0; start < cards.length; start += perSheet) {
		const sheet = cards.slice(start, start + perSheet);

		const front = doc.addPage([A4.width, A4.height]);
		sheet.forEach((card, i) => {
			const row = Math.floor(i / cols);
			const col = i % cols;
			const x = MARGIN.x + col * cardW;
			const y = A4.height - MARGIN.top - (row + 1) * cardH;
			drawCardBorder(front, x, y, cardW, cardH);
			if (unsupported.some((ch) => card.word.includes(ch))) return;
			const chars = [...card.word];
			const size = Math.min(28, (cardH - CARD_PAD * 2) * 0.5, (cardW - CARD_PAD * 2) / chars.length);
			let cx = x + (cardW - cjk.widthOfTextAtSize(card.word, size)) / 2;
			const sameCount = card.pinyinSyllables.length === chars.length;
			chars.forEach((ch, i) => {
				const tone = sameCount ? card.pinyinSyllables[i].tone : 5;
				front.drawText(ch, { x: cx, y: y + cardH / 2 - size / 2.6, size, font: cjk, color: TONE[tone] ?? INK });
				cx += cjk.widthOfTextAtSize(ch, size);
			});
		});

		const back = doc.addPage([A4.width, A4.height]);
		sheet.forEach((card, i) => {
			const row = Math.floor(i / cols);
			const mirroredCol = cols - 1 - (i % cols);
			const x = MARGIN.x + mirroredCol * cardW;
			const y = A4.height - MARGIN.top - (row + 1) * cardH;
			drawCardBorder(back, x, y, cardW, cardH);

			let ty = y + cardH - CARD_PAD - 9;
			if (fields.includes('pinyin') && card.pinyinSyllables.length) {
				let tx = x + CARD_PAD;
				for (const syl of card.pinyinSyllables) {
					back.drawText(syl.text, {
						x: tx,
						y: ty,
						size: 10,
						font: latin,
						color: TONE[syl.tone] ?? INK
					});
					tx += latin.widthOfTextAtSize(syl.text + ' ', 10);
				}
				ty -= 14;
			}
			if (fields.includes('level') && card.level) {
				back.drawText(`HSK ${card.level}`, { x: x + CARD_PAD, y: ty, size: 7.5, font: latin, color: INK });
				ty -= 12;
			}
			if (fields.includes('meaning') && card.meaning) {
				const maxWidth = cardW - CARD_PAD * 2;
				const maxLines = Math.max(1, Math.floor((ty - (y + CARD_PAD)) / 11));
				const lines = wrapRuns(card.meaning, maxWidth, measure).slice(0, maxLines);
				for (const line of lines) {
					const runs = truncateRuns(line, maxWidth, measure);
					back.drawText(
						runs.map((r) => r.text).join(''),
						{ x: x + CARD_PAD, y: ty, size: 8.5, font: latin, color: INK }
					);
					ty -= 11;
				}
			}
		});
	}

	const bytes = await doc.save();
	return { bytes, unsupported };
}
