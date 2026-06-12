/**
 * Rich dictionary layer backed by cedict.db (SQLite via sql.js) and
 * hsk_sentences.db. Replaces the older binary cedict_ts lookup and adds common
 * meaning, parts of speech, classifiers, HSK level, frequency rank, per-reading
 * definitions and example sentences.
 */

import { unzip } from 'unzipit';
import initSqlJs from 'sql.js';
import Chinese from 'chinese-s2t';
import { base } from '$app/paths';
import pinzhu from './pinyinzhuyin';
import { rankSentences } from './sentences';

let SQL: any = null;
let cedictDb: any = null;
let sentencesDb: any = null;
let hskWords: Map<string, string> | null = null;

/** Load the simple HSK glosses (word -> short meaning) from hsk_words.json. */
export async function loadHskMeanings(): Promise<void> {
	if (hskWords) return;
	hskWords = new Map();
	try {
		const res = await fetch(`${base}/data/hsk_words.json`);
		if (res.ok) {
			const data = await res.json();
			for (const level of Object.values<any>(data)) {
				if (!Array.isArray(level)) continue;
				for (const entry of level) {
					if (entry?.word && entry?.meaning && !hskWords.has(entry.word)) {
						hskWords.set(entry.word, String(entry.meaning).trim());
					}
				}
			}
			console.log(`HSK simple meanings loaded: ${hskWords.size}`);
		}
	} catch (e) {
		console.log('Failed to load hsk_words.json', e);
	}
}

export function simpleMeaningOf(word: string): string {
	return hskWords?.get(word.trim()) ?? '';
}

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
	dominantPos: string; // raw code
	classifiers: string[];
	level: string | null;
	rank: number | null;
	readings: Reading[];
}

/**
 * Reference inside an "erhua variant of …" gloss, e.g.
 *   erhua variant of 麵條|面条[mian4 tiao2]   -> trad 麵條, simp 面条, py "mian4 tiao2"
 *   erhua variant of 好玩[hao3 wan2]          -> simp 好玩 (trad == simp)
 */
const ERHUA_REF = /erhua variant of ([^|\[\];,]+)(?:\|([^\[\];,]+))?\[([A-Za-z0-9: ]+)\]/;

/** Join a base word's per-reading definitions, preferring the one matching `py`. */
function flattenDefs(defs: Record<string, string>, py: string): string {
	const pick = defs[py] ?? defs[py.replace(/v/g, 'u:')];
	const vals = pick != null ? [pick] : Object.values(defs);
	return vals
		.map((v) => v.replace(/;\s*$/, '').trim())
		.filter(Boolean)
		.join('; ');
}

/**
 * Resolve an "erhua variant of X[…]" gloss to include X's actual definition, on
 * the fly (cedict.db is left untouched). Returns the original def unchanged when
 * it isn't an erhua reference or the base word can't be found / has no meaning.
 */
function resolveErhua(def: string): string {
	const m = ERHUA_REF.exec(def);
	if (!m) return def;
	const base = (m[2] || m[1]).trim(); // simplified form
	const py = m[3].trim();
	const row = queryOne(cedictDb, `SELECT definitions FROM cedict WHERE word = ? LIMIT 1`, [base]);
	if (!row) return def;
	const baseDefs = safeJSON<Record<string, string>>(row.definitions, {});
	const meaning = flattenDefs(baseDefs, py);
	// Avoid recursing into a base that is itself another erhua reference.
	if (!meaning || ERHUA_REF.test(meaning)) return def;
	return `${def}; ${meaning}`;
}

async function buildReadings(pinyinArr: string[], defs: Record<string, string>): Promise<Reading[]> {
	const readings: Reading[] = [];
	for (const raw of pinyinArr) {
		let syllable = raw.replace(/v/g, 'u:').replace(/0/g, '5');
		const p = await pinzhu.pinyinAndZhuyin(syllable, 'w-pinyin', 'w-pinyin');
		const def = resolveErhua((defs[raw] ?? defs[syllable] ?? '').replace(/;\s*$/, '').trim());
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
		`SELECT simplified, traditional, pinyin, definitions, classifiers, all_PoS, dominant_PoS, eng_Tran, rank
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
		dominantPos: (row.dominant_PoS || '').trim(),
		classifiers: safeJSON<string[]>(row.classifiers, []),
		level: levelRow?.level ?? null,
		rank: typeof row.rank === 'number' ? row.rank : null,
		readings
	};
}

export interface CharInfo {
	character: string;
	pinyin: string; // tone-marked, e.g. "zhōng"
	definition: string; // short gloss (first sense)
	radical: string; // e.g. "囗"
	decomposition: string; // ideographic description, e.g. "⿴囗玉"
}

/** Trim a character's CEDICT definition to a short gloss for breakdown chips. */
function shortCharDef(raw: string): string {
	if (!raw) return '';
	// definitions are "; "/"," separated sense lists — keep the first sense only.
	return raw.split(/[;,]/)[0].trim();
}

/** Look up per-character info (pinyin, gloss, radical, decomposition). */
export async function lookupCharacters(chars: string[]): Promise<CharInfo[]> {
	if (!cedictDb) await loadCedict();
	const out: CharInfo[] = [];
	for (const ch of chars) {
		const row = queryOne(
			cedictDb,
			`SELECT character, definition, pinyin, decomposition, radical FROM character WHERE character = ? LIMIT 1`,
			[ch]
		);
		if (!row) continue;
		const pinyinArr = safeJSON<string[]>(row.pinyin, []);
		out.push({
			character: row.character,
			pinyin: pinyinArr.join(' '),
			definition: shortCharDef(row.definition || ''),
			radical: safeJSON<string>(row.radical, '') || (row.radical ?? ''),
			decomposition: row.decomposition || ''
		});
	}
	return out;
}

/** Per-character breakdown of a word (CJK characters only, in order). */
export async function characterBreakdown(word: string): Promise<CharInfo[]> {
	const chars = [...word.trim()].filter((c) => /[㐀-鿿豈-﫿]/.test(c));
	return lookupCharacters(chars);
}

/**
 * All words at the given HSK level tokens (e.g. ['1','2','7+']), most-common
 * first. A word counts for a level if any of its (comma-joined) level tokens
 * matches. Used by the "add words by HSK level" source on the create page.
 */
export async function wordsByLevel(levels: string[]): Promise<string[]> {
	if (!cedictDb) await loadCedict();
	const out = new Set<string>();
	for (const lvl of levels) {
		const tok = `new-${lvl}`;
		// Boundary-safe match: exact, leading, trailing or interior comma-joined.
		const rows = queryAll(
			cedictDb,
			`SELECT wl.word AS word, c.rank AS rank
			 FROM word_levels wl LEFT JOIN cedict c ON c.word = wl.word
			 WHERE wl.level = ? OR wl.level LIKE ? OR wl.level LIKE ? OR wl.level LIKE ?
			 ORDER BY CASE WHEN c.rank IS NULL THEN 1 ELSE 0 END, c.rank ASC`,
			[tok, `${tok},%`, `%,${tok}`, `%,${tok},%`]
		);
		for (const r of rows) out.add(r.word);
	}
	return [...out];
}

export interface Sentence {
	sentence: string;
	pinyin: string;
	translation: string;
	nChars: number;
	difficulty: number;
}

export interface ExampleSentence {
	simplified: string;
	traditional: string;
	pinyin: string;
	translation: string;
}

export interface SentenceQueryOptions {
	limit?: number;
	minChars?: number;
	maxChars?: number;
}

/**
 * Example sentences containing the word, easiest first, optionally length-bounded
 * by n_chars. Loads the sentences db on demand.
 */
export async function getSentences(word: string, opts: SentenceQueryOptions = {}): Promise<Sentence[]> {
	const { limit = 5, minChars, maxChars } = opts;
	if (!sentencesDb) {
		try {
			await loadSentences();
		} catch (e) {
			console.log('sentences db load failed', e);
			return [];
		}
	}
	const w = word.trim();
	const where = ['sentence LIKE ?'];
	const params: any[] = [`%${w}%`];
	if (minChars != null) {
		where.push('n_chars >= ?');
		params.push(minChars);
	}
	if (maxChars != null) {
		where.push('n_chars <= ?');
		params.push(maxChars);
	}
	params.push(limit);
	const rows = queryAll(
		sentencesDb,
		`SELECT sentence, pinyin, translation, n_chars, difficulty
		 FROM sentences WHERE ${where.join(' AND ')} ORDER BY difficulty ASC LIMIT ?`,
		params
	);
	return rows.map((r) => ({
		sentence: r.sentence,
		pinyin: r.pinyin ?? '',
		translation: r.translation ?? '',
		nChars: r.n_chars ?? 0,
		difficulty: r.difficulty
	}));
}

/**
 * Smart example sentences for a word: pulls a length-bounded candidate pool then
 * ranks by difficulty + length (see rankSentences). Traditional is derived from
 * simplified via chinese-s2t (the db only stores simplified).
 */
export async function getSmartSentences(
	word: string,
	opts: SentenceQueryOptions = {}
): Promise<ExampleSentence[]> {
	const limit = opts.limit ?? 3;
	// Over-fetch a pool so the re-ranking has something to choose from.
	const pool = await getSentences(word, { ...opts, limit: Math.max(limit * 4, 12) });
	return rankSentences(pool, limit).map((r) => ({
		simplified: r.sentence,
		traditional: Chinese.s2t(r.sentence),
		pinyin: r.pinyin,
		translation: r.translation
	}));
}
