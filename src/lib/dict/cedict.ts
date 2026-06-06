/**
 * Rich dictionary layer backed by cedict.db (SQLite via sql.js) and
 * hsk_sentences.db. Replaces the older binary cedict_ts lookup and adds common
 * meaning, parts of speech, classifiers, HSK level, frequency rank, per-reading
 * definitions and example sentences.
 */

import { unzip } from 'unzipit';
import initSqlJs from 'sql.js';
import { base } from '$app/paths';
import pinzhu from './pinyinzhuyin';

let SQL: any = null;
let cedictDb: any = null;
let sentencesDb: any = null;

/** Part-of-speech code -> human readable name (ICTCLAS-style tags used by cedict.db). */
export function posDisplay(raw: string): string {
	switch (raw.toLowerCase()) {
		case 'mg': return 'Number Morpheme';
		case 'rg': return 'Pronoun Morpheme';
		case 'a': return 'Adjective';
		case 'ad': return 'Adverbial Adjective';
		case 'an': return 'Nominal Adjective';
		case 'b': return 'Distinction Word';
		case 'c': return 'Conjunction';
		case 'cc': return 'Coordinating Conjunction';
		case 'd': return 'Adverb';
		case 'e': return 'Exclamation';
		case 'f': return 'Direction Word';
		case 'g': return 'Morpheme';
		case 'k': return 'Suffix';
		case 'l': return 'Fixed Expression';
		case 'm': return 'Numeral';
		case 'mq': return 'Numeral-Classifier';
		case 'n': return 'Noun';
		case 'nr': return 'Personal Name';
		case 'ns': return 'Place Name';
		case 'nt': return 'Organization Name';
		case 'nz': return 'Proper Noun';
		case 'o': return 'Onomatopoeia';
		case 'p': return 'Preposition';
		case 'q': return 'Classifier';
		case 'qt': return 'Temporal Classifier';
		case 'qv': return 'Verbal Classifier';
		case 'r': return 'Pronoun';
		case 's': return 'Place Word';
		case 't': return 'Time Word';
		case 'tg': return 'Time Morpheme';
		case 'u': return 'Particle';
		case 'v': return 'Verb';
		case 'vn': return 'Verbal Noun';
		case 'y': return 'Modal Particle';
		case 'z': return 'Status Word';
		default: return raw ? raw.toUpperCase() : '';
	}
}

async function getSQL() {
	if (!SQL) {
		SQL = await initSqlJs({ locateFile: () => `${base}/data/sql-wasm.wasm` });
	}
	return SQL;
}

async function openDbFromZip(zipUrl: string): Promise<any> {
	const { entries } = await unzip(zipUrl);
	const key = Object.keys(entries).find((k) => k.endsWith('.db'));
	if (!key) throw new Error(`No .db entry in ${zipUrl}`);
	const buf = await entries[key].arrayBuffer();
	const sql = await getSQL();
	return new sql.Database(new Uint8Array(buf));
}

export async function loadCedict(): Promise<void> {
	if (cedictDb) return;
	cedictDb = await openDbFromZip(`${base}/data/cedict.db.zip`);
	console.log('cedict.db loaded');
}

export async function loadSentences(): Promise<void> {
	if (sentencesDb) return;
	sentencesDb = await openDbFromZip(`${base}/data/hsk_sentences.db.zip`);
	console.log('hsk_sentences.db loaded');
}

function queryOne(db: any, sql: string, params: any[]): Record<string, any> | null {
	const stmt = db.prepare(sql);
	try {
		stmt.bind(params);
		return stmt.step() ? stmt.getAsObject() : null;
	} finally {
		stmt.free();
	}
}

function queryAll(db: any, sql: string, params: any[]): Record<string, any>[] {
	const stmt = db.prepare(sql);
	const rows: Record<string, any>[] = [];
	try {
		stmt.bind(params);
		while (stmt.step()) rows.push(stmt.getAsObject());
	} finally {
		stmt.free();
	}
	return rows;
}

function parsePoS(allPoS: string | null): string[] {
	if (!allPoS) return [];
	return allPoS
		.split('.')
		.map((s) => s.trim())
		.filter(Boolean);
}

function safeJSON<T>(raw: string | null, fallback: T): T {
	if (!raw) return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

export interface Reading {
	syllable: string; // numbered pinyin, e.g. "ni3 hao3"
	pinyin: string; // tone-marked, colored HTML
	pinyinPlain: string; // tone-marked plain text
	zhuyin: string;
	definition: string;
}

export interface CedictEntry {
	simplified: string;
	traditional: string;
	commonMeaning: string;
	pos: string[]; // raw codes
	classifiers: string[];
	level: string | null;
	rank: number | null;
	readings: Reading[];
}

async function buildReadings(pinyinArr: string[], defs: Record<string, string>): Promise<Reading[]> {
	const readings: Reading[] = [];
	for (const raw of pinyinArr) {
		let syllable = raw.replace(/v/g, 'u:').replace(/0/g, '5');
		const p = await pinzhu.pinyinAndZhuyin(syllable, 'w-pinyin', 'w-pinyin');
		const def = (defs[raw] ?? defs[syllable] ?? '').replace(/;\s*$/, '').trim();
		readings.push({
			syllable: raw,
			pinyin: p[0],
			pinyinPlain: p[1],
			zhuyin: p[2],
			definition: def
		});
	}
	return readings;
}

/** Look up a word; returns null if not found in cedict.db. */
export async function lookup(word: string): Promise<CedictEntry | null> {
	if (!cedictDb) await loadCedict();
	const w = word.trim();
	const row = queryOne(
		cedictDb,
		`SELECT simplified, traditional, pinyin, definitions, classifiers, all_PoS, eng_Tran, rank
		 FROM cedict WHERE simplified = ?
		 ORDER BY CASE WHEN rank IS NULL THEN 1 ELSE 0 END, rank ASC LIMIT 1`,
		[w]
	);
	if (!row) return null;

	const pinyinArr = safeJSON<string[]>(row.pinyin, []);
	const defs = safeJSON<Record<string, string>>(row.definitions, {});
	const readings = await buildReadings(pinyinArr, defs);

	const levelRow = queryOne(cedictDb, `SELECT level FROM word_levels WHERE word = ? LIMIT 1`, [w]);

	return {
		simplified: row.simplified,
		traditional: row.traditional || row.simplified,
		commonMeaning: (row.eng_Tran || '').replace(/\//g, '; '),
		pos: parsePoS(row.all_PoS),
		classifiers: safeJSON<string[]>(row.classifiers, []),
		level: levelRow?.level ?? null,
		rank: typeof row.rank === 'number' ? row.rank : null,
		readings
	};
}

export interface Sentence {
	sentence: string;
	difficulty: number;
}

/** Example sentences containing the word, easiest first. Loads sentences db on demand. */
export async function getSentences(word: string, limit = 5): Promise<Sentence[]> {
	if (!sentencesDb) {
		try {
			await loadSentences();
		} catch (e) {
			console.log('sentences db load failed', e);
			return [];
		}
	}
	const w = word.trim();
	const rows = queryAll(
		sentencesDb,
		`SELECT sentence, difficulty FROM sentences WHERE sentence LIKE ? ORDER BY difficulty ASC LIMIT ?`,
		[`%${w}%`, limit]
	);
	return rows.map((r) => ({ sentence: r.sentence, difficulty: r.difficulty }));
}
