/**
 * Export builders for the HSK word browser.
 *
 * Pure string/blob construction — no DOM, no fetch — so every format is unit
 * testable. `.xlsx` and `.docx` are real OOXML packages (zipped with JSZip,
 * already a genanki-js dependency). PDF lives in `hskPdf.ts`, which writes the
 * file directly with embedded fonts.
 */

import JSZip from 'jszip';
import type { HskEntry } from '$lib/hsk';
import { formatClassifier } from '$lib/hsk';

export interface ExportContext {
	/** e.g. "New HSK (2025)" */
	listName: string;
	/** e.g. "HSK 3" */
	levelLabel: string;
}

export interface ExportColumn {
	key: string;
	label: string;
	/** `index` is the word's 1-based position in the list being exported. */
	get: (e: HskEntry, ctx: ExportContext, index: number) => string;
}

/**
 * The one field registry. Every format picks from this list — the delimited
 * formats and the OOXML ones use `get` directly, and `hskPdf.ts` layers its
 * drawing metadata (type size, wrapping, colouring) on top of the same keys, so
 * the picker in the UI means the same thing whatever format is selected.
 */
export const EXPORT_COLUMNS: ExportColumn[] = [
	{ key: 'index', label: 'Row number', get: (_e, _ctx, i) => String(i + 1) },
	{ key: 'simplified', label: 'Word', get: (e) => e.s },
	{ key: 'traditional', label: 'Traditional', get: (e) => e.t },
	{ key: 'pinyin', label: 'Pinyin', get: (e) => e.y },
	{ key: 'numbered', label: 'Pinyin (numbered)', get: (e) => e.p },
	{ key: 'zhuyin', label: 'Zhuyin', get: (e) => e.z },
	{ key: 'meaning', label: 'Meaning', get: (e) => e.m },
	{ key: 'pos', label: 'Part of speech', get: (e) => (e.o ?? []).join(', ') },
	{
		key: 'classifiers',
		label: 'Classifiers',
		get: (e) => (e.c ?? []).map(formatClassifier).join(', ')
	},
	{ key: 'level', label: 'Level', get: (_e, ctx) => ctx.levelLabel },
	{ key: 'frequency', label: 'Frequency rank', get: (e) => (e.f ? String(e.f) : '') },
	{
		key: 'readings',
		label: 'Other readings',
		get: (e) =>
			(e.r ?? [])
				.filter((r) => r.p !== e.p && r.d)
				.map((r) => `${r.y} ${r.z} — ${r.d}`)
				.join('; ')
	}
];

export const DEFAULT_COLUMN_KEYS = [
	'simplified',
	'traditional',
	'pinyin',
	'zhuyin',
	'meaning',
	'pos'
];

export function columnsFor(keys: string[]): ExportColumn[] {
	// Keep EXPORT_COLUMNS order regardless of the order keys were toggled in.
	return EXPORT_COLUMNS.filter((c) => keys.includes(c.key));
}

/** Header row followed by one row per entry. */
export function buildRows(
	entries: HskEntry[],
	columns: ExportColumn[],
	ctx: ExportContext
): string[][] {
	return [
		columns.map((c) => c.label),
		...entries.map((e, i) => columns.map((c) => c.get(e, ctx, i)))
	];
}

// ---------------------------------------------------------------------------
// Plain text formats
// ---------------------------------------------------------------------------

function csvCell(value: string): string {
	return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: string[][]): string {
	return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

/** Tab separated — also what Anki's own "Import file" dialog expects. */
export function toTsv(rows: string[][]): string {
	return rows
		.map((r) => r.map((c) => c.replace(/[\t\r\n]+/g, ' ')).join('\t'))
		.join('\n');
}

export function toJson(entries: HskEntry[]): string {
	return JSON.stringify(entries, null, '\t');
}

// ---------------------------------------------------------------------------
// OOXML (.xlsx / .docx)
// ---------------------------------------------------------------------------

function xmlEscape(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		// Control characters are illegal in XML 1.0 and make Excel/Word refuse the file.
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/** 0 -> A, 25 -> Z, 26 -> AA */
export function columnName(index: number): string {
	let n = index + 1;
	let out = '';
	while (n > 0) {
		const rem = (n - 1) % 26;
		out = String.fromCharCode(65 + rem) + out;
		n = Math.floor((n - 1) / 26);
	}
	return out;
}

function sheetXml(rows: string[][]): string {
	const body = rows
		.map((row, r) => {
			const cells = row
				.map(
					(cell, c) =>
						`<c r="${columnName(c)}${r + 1}" t="inlineStr"${r === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${xmlEscape(cell)}</t></is></c>`
				)
				.join('');
			return `<row r="${r + 1}">${cells}</row>`;
		})
		.join('');
	const lastCol = columnName(Math.max(0, (rows[0]?.length ?? 1) - 1));
	const cols = (rows[0] ?? [])
		.map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="22" customWidth="1"/>`)
		.join('');
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastCol}${rows.length || 1}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`;
}

/** Minimal but valid .xlsx package with a single frozen-header sheet. */
export async function toXlsx(rows: string[][], sheetName: string): Promise<Blob> {
	const zip = new JSZip();
	// Excel rejects sheet names over 31 chars or containing : \ / ? * [ ]
	const safeName = xmlEscape(sheetName.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31)) || 'Sheet1';

	zip.file(
		'[Content_Types].xml',
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
	);
	zip.file(
		'_rels/.rels',
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
	);
	zip.file(
		'xl/workbook.xml',
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeName}" sheetId="1" r:id="rId1"/></sheets></workbook>`
	);
	zip.file(
		'xl/_rels/workbook.xml.rels',
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
	);
	zip.file(
		'xl/styles.xml',
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`
	);
	zip.file('xl/worksheets/sheet1.xml', sheetXml(rows));

	return zip.generateAsync({
		type: 'blob',
		mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		compression: 'DEFLATE'
	});
}

function docCell(text: string, bold: boolean, width: number): string {
	return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr>${bold ? '<w:b/>' : ''}<w:rFonts w:eastAsia="SimSun"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p></w:tc>`;
}

/** Minimal but valid .docx: a title paragraph followed by a bordered table. */
export async function toDocx(rows: string[][], title: string): Promise<Blob> {
	const cols = rows[0]?.length || 1;
	const width = Math.floor(9360 / cols);
	const table = rows
		.map(
			(row, r) =>
				`<w:tr>${row.map((cell) => docCell(cell, r === 0, width)).join('')}</w:tr>`
		)
		.join('');

	const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:spacing w:after="200"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t xml:space="preserve">${xmlEscape(title)}</w:t></w:r></w:p><w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="BBBBBB"/><w:left w:val="single" w:sz="4" w:color="BBBBBB"/><w:bottom w:val="single" w:sz="4" w:color="BBBBBB"/><w:right w:val="single" w:sz="4" w:color="BBBBBB"/><w:insideH w:val="single" w:sz="4" w:color="DDDDDD"/><w:insideV w:val="single" w:sz="4" w:color="DDDDDD"/></w:tblBorders></w:tblPr>${table}</w:tbl><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;

	const zip = new JSZip();
	zip.file(
		'[Content_Types].xml',
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
	);
	zip.file(
		'_rels/.rels',
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
	);
	zip.file('word/document.xml', document);

	return zip.generateAsync({
		type: 'blob',
		mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		compression: 'DEFLATE'
	});
}

// ---------------------------------------------------------------------------
// Format registry + download helper
// ---------------------------------------------------------------------------

export type ExportFormat = 'csv' | 'txt' | 'xlsx' | 'docx' | 'pdf' | 'json' | 'anki';

export interface FormatMeta {
	id: ExportFormat;
	label: string;
	ext: string;
	hint: string;
}

export const EXPORT_FORMATS: FormatMeta[] = [
	{ id: 'csv', label: 'CSV', ext: 'csv', hint: 'Spreadsheets, Anki import' },
	{ id: 'xlsx', label: 'Excel', ext: 'xlsx', hint: 'Excel / Sheets / LibreOffice' },
	{ id: 'docx', label: 'Word', ext: 'docx', hint: 'Formatted table document' },
	{ id: 'pdf', label: 'PDF', ext: 'pdf', hint: 'Print-ready, tone coloured' },
	{ id: 'txt', label: 'Text', ext: 'txt', hint: 'Tab separated plain text' },
	{ id: 'json', label: 'JSON', ext: 'json', hint: 'Full data, every field' },
	{ id: 'anki', label: 'Anki deck', ext: 'apkg', hint: 'Build it in the deck creator' }
];

/** "new HSK 7-9" -> "New-HSK-2025-HSK-7-9" — safe on every OS. */
export function exportFilename(ctx: ExportContext, ext: string): string {
	const slug = `${ctx.listName} ${ctx.levelLabel}`
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');
	return `${slug}.${ext}`;
}
