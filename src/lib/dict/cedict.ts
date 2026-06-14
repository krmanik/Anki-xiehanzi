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
let yctWords: Map<string, string> | null = null;
let bctFallbackGlosses: Map<string, string> | null = null;

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
	return hskWords?.get(word.trim()) ?? yctWords?.get(word.trim()) ?? '';
}

export async function loadYctMeanings(): Promise<void> {
	if (yctWords) return;
	yctWords = new Map();
	try {
		const res = await fetch(`${base}/data/yct_words.json`);
		if (res.ok) {
			const data = await res.json();
			for (const level of Object.values<any>(data)) {
				if (!Array.isArray(level)) continue;
				for (const entry of level) {
					if (entry?.word && entry?.meaning && !yctWords.has(entry.word)) {
						yctWords.set(entry.word, String(entry.meaning).trim());
					}
				}
			}
		}
	} catch {
		// non-fatal
	}
}

async function loadBctFallbackGlosses(): Promise<void> {
	if (bctFallbackGlosses) return;
	bctFallbackGlosses = new Map();
	try {
		const res = await fetch(`${base}/data/BCT_missing_glosses.json`);
		if (res.ok) {
			const data: Record<string, string> = await res.json();
			for (const [word, gloss] of Object.entries(data)) {
				if (gloss) bctFallbackGlosses.set(word, gloss);
			}
		}
	} catch {
		// non-fatal
	}
}

export function bctFallbackMeaningOf(word: string): string {
	return bctFallbackGlosses?.get(word.trim()) ?? '';
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
	// The shipped db only indexes cedict.word (PK). lookup() filters on
	// `simplified`, so without this every word triggers a full 120k-row scan
	// (~12ms/word, ~68s for a 5k-word HSK batch). Build it once, in-memory.
	cedictDb.run('CREATE INDEX IF NOT EXISTS idx_cedict_simplified ON cedict(simplified)');
	console.log('cedict.db loaded');
}

export async function loadSentences(): Promise<void> {
	if (sentencesDb) return;
	sentencesDb = await openDbFromZip(`${base}/data/hsk_sentences.db.zip`);
	console.log('hsk_sentences.db loaded');
}

/**
 * Compiled-statement cache, keyed by db then SQL string. sql.js `prepare()`
 * recompiles SQL on every call and is ~half the per-query cost, so for the
 * batch lookups on /create (same SQL run thousands of times) we prepare once
 * and reuse with bind/step/reset. Keyed by db via WeakMap so a reopened
 * Database gets a fresh statement set automatically.
 */
const stmtCache = new WeakMap<any, Map<string, any>>();

function cachedStmt(db: any, sql: string): any {
	let m = stmtCache.get(db);
	if (!m) {
		m = new Map();
		stmtCache.set(db, m);
	}
	let stmt = m.get(sql);
	if (!stmt) {
		stmt = db.prepare(sql);
		m.set(sql, stmt);
	}
	return stmt;
}

function queryOne(db: any, sql: string, params: any[]): Record<string, any> | null {
	const stmt = cachedStmt(db, sql);
	try {
		stmt.bind(params);
		return stmt.step() ? stmt.getAsObject() : null;
	} finally {
		stmt.reset();
	}
}

function queryAll(db: any, sql: string, params: any[]): Record<string, any>[] {
	const stmt = cachedStmt(db, sql);
	const rows: Record<string, any>[] = [];
	try {
		stmt.bind(params);
		while (stmt.step()) rows.push(stmt.getAsObject());
	} finally {
		stmt.reset();
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
	if (!row) {
		await loadBctFallbackGlosses();
		const gloss = bctFallbackGlosses!.get(w);
		if (!gloss) return null;
		return {
			simplified: w,
			traditional: w,
			commonMeaning: gloss,
			pos: [],
			dominantPos: '',
			classifiers: [],
			level: null,
			rank: null,
			readings: []
		};
	}

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

// Per-character info is identical across every word containing that char, so
// cache it across the whole batch (the same chars repeat constantly). `null`
// caches a confirmed miss to skip re-querying chars not in the db.
const charInfoCache = new Map<string, CharInfo | null>();

/** Look up per-character info (pinyin, gloss, radical, decomposition). */
export async function lookupCharacters(chars: string[]): Promise<CharInfo[]> {
	if (!cedictDb) await loadCedict();
	const out: CharInfo[] = [];
	for (const ch of chars) {
		let info = charInfoCache.get(ch);
		if (info === undefined) {
			const row = queryOne(
				cedictDb,
				`SELECT character, definition, pinyin, decomposition, radical FROM character WHERE character = ? LIMIT 1`,
				[ch]
			);
			info = row
				? {
						character: row.character,
						pinyin: safeJSON<string[]>(row.pinyin, []).join(' '),
						definition: shortCharDef(row.definition || ''),
						radical: safeJSON<string>(row.radical, '') || (row.radical ?? ''),
						decomposition: row.decomposition || ''
					}
				: null;
			charInfoCache.set(ch, info);
		}
		if (info) out.push(info);
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

let yctData: Record<string, { word: string; pinyin_tone: string; meaning: string }[]> | null =
	null;

async function loadYctData(): Promise<
	Record<string, { word: string; pinyin_tone: string; meaning: string }[]>
> {
	if (yctData) return yctData;
	const res = await fetch(`${base}/data/yct_words.json`);
	yctData = res.ok ? await res.json() : {};
	return yctData!;
}

/** Words from YCT levels 1–4, in list order, with meaning for offline fallback. */
export async function wordsByYct(levels: string[]): Promise<{ word: string; meaning: string }[]> {
	const data = await loadYctData();
	const out: { word: string; meaning: string }[] = [];
	const seen = new Set<string>();
	for (const lvl of levels) {
		const entries = data[`level_${lvl}`] ?? [];
		for (const entry of entries) {
			if (!seen.has(entry.word)) {
				seen.add(entry.word);
				out.push({ word: entry.word, meaning: entry.meaning });
			}
		}
	}
	return out;
}

let bctWords: Record<string, string[]> | null = null;

async function loadBctWords(): Promise<Record<string, string[]>> {
	if (bctWords) return bctWords;
	const res = await fetch(`${base}/data/BCT_words.json`);
	bctWords = res.ok ? await res.json() : {};
	return bctWords!;
}

/** Words from BCT level A or B, in list order. */
export async function wordsByBct(levels: string[]): Promise<string[]> {
	const data = await loadBctWords();
	const out: string[] = [];
	const seen = new Set<string>();
	for (const lvl of levels) {
		const words: string[] = data[lvl.toUpperCase()] ?? [];
		for (const w of words) {
			if (!seen.has(w)) {
				seen.add(w);
				out.push(w);
			}
		}
	}
	return out;
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

// In-memory sentence store + token->sentence inverted index. The db ships an
// FTS5 table (sentences_fts), but the sql.js wasm we load is built WITHOUT
// FTS5, so MATCH throws. And `sentence LIKE '%w%'` is a full 75k-row scan run
// once per word — froze the 5k-word export. Instead we read the rows once and
// index by the pre-segmented `tokens` column, so every per-word lookup is pure
// JS (a Map hit), no SQL, no scan.
let sentenceRows: Map<number, Sentence> | null = null;
let sentenceTokenIndex: Map<string, number[]> | null = null;

function ensureSentenceIndex(): void {
	if (sentenceTokenIndex) return;
	sentenceRows = new Map();
	sentenceTokenIndex = new Map();
	const rows = queryAll(
		sentencesDb,
		`SELECT rank, sentence, pinyin, translation, tokens, n_chars, difficulty FROM sentences`,
		[]
	);
	for (const r of rows) {
		const rank: number = r.rank;
		sentenceRows.set(rank, {
			sentence: r.sentence,
			pinyin: r.pinyin ?? '',
			translation: r.translation ?? '',
			nChars: r.n_chars ?? 0,
			difficulty: r.difficulty
		});
		for (const tok of String(r.tokens ?? '').split(/\s+/)) {
			if (!tok) continue;
			const arr = sentenceTokenIndex.get(tok);
			if (arr) arr.push(rank);
			else sentenceTokenIndex.set(tok, [rank]);
		}
	}
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
	ensureSentenceIndex();
	const w = word.trim();

	// Primary: whole-token match via the inverted index.
	let hits: Sentence[] = (sentenceTokenIndex!.get(w) ?? []).map((r) => sentenceRows!.get(r)!);

	// Fallback: words that only ever appear inside a longer token have no
	// standalone token entry. Substring-scan the in-memory rows (no SQL) — rare,
	// and a 75k-item JS pass is a few ms vs the old per-word table scan.
	if (hits.length === 0) {
		hits = [];
		for (const s of sentenceRows!.values()) {
			if (s.sentence.includes(w)) hits.push(s);
		}
	}

	if (minChars != null) hits = hits.filter((s) => s.nChars >= minChars);
	if (maxChars != null) hits = hits.filter((s) => s.nChars <= maxChars);
	hits.sort((a, b) => a.difficulty - b.difficulty);
	return hits.slice(0, limit);
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
