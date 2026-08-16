import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import type { HskEntry } from './hsk';
import {
	buildRows,
	columnName,
	columnsFor,
	exportFilename,
	toCsv,
	toDocx,
	toJson,
	toTsv,
	toXlsx,
	DEFAULT_COLUMN_KEYS,
	EXPORT_COLUMNS,
	type ExportContext
} from './hskExport';

/** JSZip in Node cannot read a Blob directly — hand it the bytes. */
const openZip = async (blob: Blob) => JSZip.loadAsync(await blob.arrayBuffer());

const ctx: ExportContext = { listName: 'New HSK (2025)', levelLabel: 'HSK 1' };

const entries: HskEntry[] = [
	{
		s: '爱',
		t: '愛',
		p: 'ai4',
		y: 'ài',
		z: 'ㄞˋ',
		m: 'to love; affection',
		o: ['Verb'],
		f: 120,
		r: [{ p: 'ai4', y: 'ài', z: 'ㄞˋ', d: 'to love; to be fond of' }]
	},
	{
		s: '爸爸',
		t: '爸爸',
		p: 'ba4 ba5',
		y: 'bà ba',
		z: 'ㄅㄚˋ ㄅㄚ',
		m: 'father, "dad"',
		c: ['個|个[ge4]']
	}
];

const rows = () => buildRows(entries, columnsFor(DEFAULT_COLUMN_KEYS), ctx);

describe('columnsFor', () => {
	it('keeps the canonical column order regardless of key order', () => {
		expect(columnsFor(['meaning', 'simplified']).map((c) => c.key)).toEqual([
			'simplified',
			'meaning'
		]);
	});

	it('numbers rows from one', () => {
		const r = buildRows(entries, columnsFor(['index']), ctx);
		expect(r.slice(1).map((row) => row[0])).toEqual(['1', '2']);
	});

	it('ignores unknown keys', () => {
		expect(columnsFor(['nope'])).toEqual([]);
	});
});

describe('buildRows', () => {
	it('starts with a header row and fills the context-driven level column', () => {
		const r = rows();
		expect(r[0][0]).toBe('Word');
		expect(r).toHaveLength(entries.length + 1);
		const levelIdx = columnsFor([...DEFAULT_COLUMN_KEYS, 'level']).findIndex(
			(c) => c.key === 'level'
		);
		expect(buildRows(entries, columnsFor([...DEFAULT_COLUMN_KEYS, 'level']), ctx)[1][levelIdx]).toBe(
			'HSK 1'
		);
	});

	it('formats classifiers and joins parts of speech', () => {
		const r = buildRows(entries, columnsFor(['pos', 'classifiers']), ctx);
		expect(r[1]).toEqual(['Verb', '']);
		expect(r[2]).toEqual(['', '个 (ge4)']);
	});

	it('flattens all readings when that column is picked', () => {
		const r = buildRows(entries, columnsFor(['readings']), ctx);
		// 爱's only reading is the primary one, so it has nothing extra to list.
		expect(r[1][0]).toBe('');
		const extra = buildRows(
			[{ ...entries[0], r: [...(entries[0].r ?? []), { p: 'ai1', y: 'āi', z: 'ㄞ', d: 'variant' }] }],
			columnsFor(['readings']),
			ctx
		);
		expect(extra[1][0]).toBe('āi ㄞ — variant');
	});
});

describe('toCsv', () => {
	it('quotes cells containing commas or quotes and uses CRLF', () => {
		const csv = toCsv(buildRows(entries, columnsFor(['simplified', 'meaning']), ctx));
		const lines = csv.split('\r\n');
		expect(lines[0]).toBe('Word,Meaning');
		expect(lines[1]).toBe('爱,to love; affection');
		expect(lines[2]).toBe('爸爸,"father, ""dad"""');
	});
});

describe('toTsv', () => {
	it('collapses embedded tabs and newlines so columns stay aligned', () => {
		const tsv = toTsv([
			['A', 'B'],
			['one\ttwo', 'three\nfour']
		]);
		expect(tsv).toBe('A\tB\none two\tthree four');
	});
});

describe('toJson', () => {
	it('round-trips every entry field', () => {
		expect(JSON.parse(toJson(entries))).toEqual(entries);
	});
});

describe('columnName', () => {
	it('maps indexes to spreadsheet column letters', () => {
		expect(columnName(0)).toBe('A');
		expect(columnName(25)).toBe('Z');
		expect(columnName(26)).toBe('AA');
		expect(columnName(701)).toBe('ZZ');
	});
});

describe('toXlsx', () => {
	it('produces a zip with the parts Excel requires', async () => {
		const zip = await openZip(await toXlsx(rows(), 'HSK 1'));
		for (const part of [
			'[Content_Types].xml',
			'_rels/.rels',
			'xl/workbook.xml',
			'xl/_rels/workbook.xml.rels',
			'xl/styles.xml',
			'xl/worksheets/sheet1.xml'
		]) {
			expect(zip.file(part), part).toBeTruthy();
		}
		const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
		expect(sheet).toContain('<t xml:space="preserve">爱</t>');
		// header row + one row per entry
		expect(sheet.match(/<row /g)).toHaveLength(entries.length + 1);
	});

	it('sanitises sheet names Excel rejects', async () => {
		const zip = await openZip(await toXlsx(rows(), 'a/b:c[d]'.repeat(10)));
		const wb = await zip.file('xl/workbook.xml')!.async('string');
		const name = /name="([^"]*)"/.exec(wb)![1];
		expect(name.length).toBeLessThanOrEqual(31);
		expect(name).not.toMatch(/[:\\/?*[\]]/);
	});

	it('escapes XML-significant characters', async () => {
		const zip = await openZip(await toXlsx([['a & b <c>']], 'S'));
		const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
		expect(sheet).toContain('a &amp; b &lt;c&gt;');
	});
});

describe('toDocx', () => {
	it('produces a zip with a document part containing a row per entry', async () => {
		const zip = await openZip(await toDocx(rows(), 'New HSK · HSK 1'));
		expect(zip.file('[Content_Types].xml')).toBeTruthy();
		expect(zip.file('_rels/.rels')).toBeTruthy();
		const doc = await zip.file('word/document.xml')!.async('string');
		expect(doc).toContain('New HSK · HSK 1');
		expect(doc.match(/<w:tr>/g)).toHaveLength(entries.length + 1);
		expect(doc).toContain('爸爸');
	});
});

describe('exportFilename', () => {
	it('slugifies the list and level', () => {
		expect(exportFilename({ listName: 'New HSK (2025)', levelLabel: 'HSK 7–9' }, 'csv')).toBe(
			'New-HSK-2025-HSK-79.csv'
		);
	});
});

describe('EXPORT_COLUMNS', () => {
	it('has a unique key per column and covers every default', () => {
		const keys = EXPORT_COLUMNS.map((c) => c.key);
		expect(new Set(keys).size).toBe(keys.length);
		for (const k of DEFAULT_COLUMN_KEYS) expect(keys).toContain(k);
	});
});
