/**
 * `maxPages` is what keeps the tools' live preview from building the whole of
 * a 5,000-word list to show one page. It only earns that if the pages it does
 * build are the full document's pages, byte for byte — so every builder is run
 * both ways on a list long enough to span many pages, and page 1 compared.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { PDFArray, PDFDocument, PDFRawStream, PDFRef, decodePDFRawStream, type PDFPage } from 'pdf-lib';

vi.mock('$lib/hskPdf', async (importOriginal) => {
	const real = await importOriginal<typeof import('$lib/hskPdf')>();
	const read = (name: string) => {
		const buf = readFileSync(`static/fonts/${name}`);
		return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
	};
	const fonts = { cjk: read('hsk-cjk.ttf'), latin: read('hsk-latin.ttf'), latinBold: read('hsk-latin-bold.ttf') };
	return { ...real, loadPdfFonts: async () => fonts };
});

vi.mock('$lib/dict/cedict', () => ({
	lookup: async () => null,
	wordsContaining: async () => [],
	getSmartSentences: async () => [],
	posDisplay: (p: string) => p
}));

vi.mock('./strokePaths', async (importOriginal) => {
	const real = await importOriginal<typeof import('./strokePaths')>();
	// Two strokes in Hanzi Writer's 1024-unit space — enough for every
	// stroke-order mode to have more than one step.
	return { ...real, loadStrokePaths: async () => ['M 200 800 L 800 800', 'M 500 900 L 500 100'] };
});

const { buildPracticeSheetPdf, itemsThatFit } = await import('./practiceSheetPdf');
const { buildWorksheetPdf } = await import('./worksheetPdf');
const { buildFlashcardPdf } = await import('./flashcardPdf');

/** 400 distinct characters, one per "word". */
const WORDS = Array.from({ length: 400 }, (_, i) => String.fromCodePoint(0x4e00 + i));

function contentBytes(page: PDFPage): string {
	const ctx = page.doc.context;
	const contents = page.node.Contents();
	const streams = contents instanceof PDFArray ? contents.asArray() : [contents];
	return streams
		.map((s) => {
			const stream = s instanceof PDFRef ? ctx.lookup(s) : s;
			if (!(stream instanceof PDFRawStream)) throw new Error('unexpected content stream');
			return Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
		})
		.join('\n')
		// pdf-lib names each embedded font with a random tag.
		.replace(/(\/[\w+]+)-\d+ (\S+ Tf)/g, '$1 $2');
}

async function pages(bytes: Uint8Array) {
	return (await PDFDocument.load(bytes)).getPages();
}

async function expectSameLeadingPages(full: Uint8Array, capped: Uint8Array, n: number) {
	const [a, b] = [await pages(full), await pages(capped)];
	expect(a.length).toBeGreaterThan(n);
	expect(b.length).toBe(n);
	for (let i = 0; i < n; i++) expect(contentBytes(b[i])).toBe(contentBytes(a[i]));
}

describe('itemsThatFit', () => {
	it('is unbounded without a page limit', () => {
		expect(itemsThatFit(800, 40)).toBe(Infinity);
		expect(itemsThatFit(800, 40, 0)).toBe(Infinity);
	});
	it('scales with the page count', () => {
		expect(itemsThatFit(800, 40, 2)).toBe(2 * itemsThatFit(800, 40, 1));
	});
});

describe('maxPages keeps the leading pages identical', () => {
	it('practice grid, one row per character', async () => {
		const opts = { layout: 'grid', unit: 'char', gridSize: 'small', strokeOrder: 'row' } as const;
		await expectSameLeadingPages(
			(await buildPracticeSheetPdf(WORDS, opts)).bytes,
			(await buildPracticeSheetPdf(WORDS, { ...opts, maxPages: 1 })).bytes,
			1
		);
	});

	it('practice grid, one row per word, filling the page', async () => {
		const words = WORDS.map((w, i) => w + WORDS[(i + 1) % WORDS.length]);
		const opts = { layout: 'grid', unit: 'word', fillPage: true } as const;
		await expectSameLeadingPages(
			(await buildPracticeSheetPdf(words.slice(0, 40), opts)).bytes,
			(await buildPracticeSheetPdf(words.slice(0, 40), { ...opts, maxPages: 2 })).bytes,
			2
		);
	});

	it('sentence practice', async () => {
		const opts = { layout: 'sentence', gridSize: 'small', repeatCount: 2 } as const;
		await expectSameLeadingPages(
			(await buildPracticeSheetPdf(WORDS, opts)).bytes,
			(await buildPracticeSheetPdf(WORDS, { ...opts, maxPages: 1 })).bytes,
			1
		);
	});

	it('study worksheet, one page per character', async () => {
		const words = WORDS.slice(0, 5);
		await expectSameLeadingPages(
			(await buildWorksheetPdf(words)).bytes,
			(await buildWorksheetPdf(words, { maxPages: 1 })).bytes,
			1
		);
	});

	it('flashcards, one sheet = front + back', async () => {
		const words = WORDS.slice(0, 50);
		const opts = { cols: 4, rows: 5, front: ['hanzi-simplified'], back: ['pinyin', 'meaning'] } as const;
		await expectSameLeadingPages(
			(await buildFlashcardPdf(words, { ...opts, front: [...opts.front], back: [...opts.back] })).bytes,
			(await buildFlashcardPdf(words, { ...opts, front: [...opts.front], back: [...opts.back], maxPages: 2 })).bytes,
			2
		);
	});
});
