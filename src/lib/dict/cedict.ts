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
import {
	commonness,
	hasToneMarker,
	normalizePinyin,
	queryKind,
	scoreEnglish,
	scoreHanzi,
	scorePinyin,
	sortHits,
	type SearchHit
} from '$lib/dictionary';

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

// Both dbs are multi-MB downloads and several callers race to open them (the
// create page preloads while a word lookup may already be in flight). Keep the
// in-flight promise so concurrent callers share one download.
let cedictLoading: Promise<void> | null = null;
let sentencesLoading: Promise<void> | null = null;

export function loadCedict(): Promise<void> {
	if (cedictDb) return Promise.resolve();
	cedictLoading ??= openDbFromZip(`${base}/data/cedict.db.zip`)
		.then((db) => {
			cedictDb = db;
			// The shipped db only indexes cedict.word (PK). lookup() filters on
			// `simplified`, so without this every word triggers a full 120k-row scan
			// (~12ms/word, ~68s for a 5k-word HSK batch). Build it once, in-memory.
			cedictDb.run('CREATE INDEX IF NOT EXISTS idx_cedict_simplified ON cedict(simplified)');
			console.log('cedict.db loaded');
		})
		.catch((e) => {
			cedictLoading = null; // allow a retry
			throw e;
		});
	return cedictLoading;
}

export function loadSentences(): Promise<void> {
	if (sentencesDb) return Promise.resolve();
	sentencesLoading ??= openDbFromZip(`${base}/data/hsk_sentences.db.zip`)
		.then((db) => {
			sentencesDb = db;
			console.log('hsk_sentences.db loaded');
		})
		.catch((e) => {
			sentencesLoading = null;
			throw e;
		});
	return sentencesLoading;
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

/**
 * Every headword in cedict.db, most-common first. Only offline batch jobs want
 * this (building a bundled dictionary); the app looks words up one at a time.
 */
export async function allWords(): Promise<string[]> {
	if (!cedictDb) await loadCedict();
	const rows = queryAll(
		cedictDb,
		`SELECT word FROM cedict
		 ORDER BY CASE WHEN rank IS NULL OR rank = 0 THEN 1 ELSE 0 END, rank ASC`,
		[]
	);
	return rows.map((r) => r.word as string);
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
 * Every sentence in the db, in storage order. Only offline batch jobs want this
 * (bundling the whole corpus into a deck); the app looks sentences up per word.
 */
export async function allSentences(): Promise<Sentence[]> {
	if (!sentencesDb) await loadSentences();
	ensureSentenceIndex();
	return [...sentenceRows!.values()];
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

// ---------------------------------------------------------------------------
// Dictionary search (`/dictionary`)
// ---------------------------------------------------------------------------

/**
 * Tone-marked pinyin for a numbered-pinyin string ("ni3 hao3" -> "nǐ hǎo").
 * Cached: search re-converts the same common words on every keystroke.
 */
const pinyinPlainCache = new Map<string, string>();
async function toPinyinPlain(syllables: string): Promise<string> {
	const key = (syllables ?? '').trim();
	if (!key) return '';
	const hit = pinyinPlainCache.get(key);
	if (hit !== undefined) return hit;
	const p = await pinzhu.pinyinAndZhuyin(key.replace(/v/g, 'u:').replace(/0/g, '5'), '', '');
	const plain = p[1] || key;
	pinyinPlainCache.set(key, plain);
	return plain;
}

/**
 * cedict's slash-joined gloss as one readable line, falling back to the
 * per-reading definitions. Some rows carry `#` as their `eng_Tran` (龙, 钕 …) —
 * a placeholder, not a meaning, and printing it says nothing.
 */
function commonMeaningOf(engTran: string | null, definitions?: string | null): string {
	const gloss = (engTran || '').replace(/\//g, '; ').replace(/;\s*$/, '').trim();
	if (gloss && gloss !== '#') return gloss;
	const defs = safeJSON<Record<string, string>>(definitions ?? null, {});
	return Object.values(defs)
		.map((d) => d.replace(/;\s*$/, '').trim())
		.filter(Boolean)
		.join('; ');
}

interface RawRow {
	word: string;
	traditional: string | null;
	pinyin: string | null;
	definitions: string | null;
	eng_Tran: string | null;
	rank: number | null;
	level: string | null;
}

const SEARCH_COLUMNS = `c.word AS word, c.traditional AS traditional, c.pinyin AS pinyin,
	 c.definitions AS definitions, c.eng_Tran AS eng_Tran, c.rank AS rank, wl.level AS level`;
const SEARCH_FROM = `FROM cedict c LEFT JOIN word_levels wl ON wl.word = c.word`;

/**
 * Turn rows into hits. Every reading is shown, not just the first: cedict's
 * `pinyin` array is not ordered by commonness (分 lists fen4 before fen1), so a
 * result labelled with element 0 alone is labelled wrong half the time.
 */
async function toHits(
	rows: RawRow[],
	via: SearchHit['via'],
	score: (row: RawRow, syllables: string[]) => number
): Promise<SearchHit[]> {
	const out: SearchHit[] = [];
	for (const row of rows) {
		const readings = safeJSON<string[]>(row.pinyin, []);
		const shown = readings.slice(0, 3);
		const plain: string[] = [];
		for (const r of shown) plain.push(await toPinyinPlain(r));
		out.push({
			simplified: row.word,
			traditional: row.traditional || row.word,
			syllables: readings[0] ?? '',
			pinyin: plain.filter(Boolean).join(' / '),
			meaning: commonMeaningOf(row.eng_Tran, row.definitions),
			rank: typeof row.rank === 'number' ? row.rank : null,
			level: row.level ?? null,
			via,
			score: score(row, readings)
		});
	}
	return out;
}

// word/pinyin/rank projection of the whole table (~2.3 MB of strings), built on
// the first pinyin search only. Pinyin is stored as a JSON array of numbered
// syllables, so no SQL LIKE can match "nihao" against "ni3 hao3" — the index
// keys every reading by its normalized (toneless, spaceless) form instead.
let pinyinIndex: Map<string, number[]> | null = null;
let pinyinRows: { word: string; pinyin: string; syllables: string; rank: number | null }[] = [];

function ensurePinyinIndex(): void {
	if (pinyinIndex) return;
	pinyinIndex = new Map();
	pinyinRows = [];
	for (const r of queryAll(cedictDb, `SELECT word, pinyin, rank FROM cedict`, [])) {
		for (const syllables of safeJSON<string[]>(r.pinyin, [])) {
			const norm = normalizePinyin(syllables);
			if (!norm) continue;
			const i = pinyinRows.length;
			pinyinRows.push({
				word: r.word,
				pinyin: syllables,
				syllables,
				rank: typeof r.rank === 'number' ? r.rank : null
			});
			const bucket = pinyinIndex.get(norm);
			if (bucket) bucket.push(i);
			else pinyinIndex.set(norm, [i]);
		}
	}
}

/** Rows for a set of words, in one query, keyed by word. */
function rowsForWords(words: string[]): Map<string, RawRow> {
	const out = new Map<string, RawRow>();
	if (!words.length) return out;
	const placeholders = words.map(() => '?').join(',');
	for (const r of queryAll(
		cedictDb,
		`SELECT ${SEARCH_COLUMNS} ${SEARCH_FROM} WHERE c.word IN (${placeholders})`,
		words
	)) {
		out.set(r.word, r as RawRow);
	}
	return out;
}

/**
 * Search the dictionary by hanzi, pinyin (with or without tones) or English.
 * The query kind is detected, not chosen by the reader — typing "hao3", "hǎo",
 * "好" or "good" all just work. Results are ranked by how well they match and,
 * within that, by how common the word is.
 */
export async function searchDictionary(query: string, limit = 40): Promise<SearchHit[]> {
	const q = (query ?? '').trim();
	const kind = queryKind(q);
	if (kind === 'empty') return [];
	if (!cedictDb) await loadCedict();

	if (kind === 'hanzi') return sortHits(await searchHanzi(q)).slice(0, limit);
	if (kind === 'pinyin') return sortHits(await searchPinyin(q)).slice(0, limit);
	if (kind === 'english') return sortHits(await searchEnglish(q)).slice(0, limit);

	// Ambiguous latin ("long", "man", "love"): search both and let the scores
	// settle it. One word's row can come back from both, so the better score wins.
	const [byPinyin, byEnglish] = await Promise.all([searchPinyin(q), searchEnglish(q)]);
	const merged = new Map<string, SearchHit>();
	for (const hit of [...byPinyin, ...byEnglish]) {
		const key = hit.simplified + hit.syllables;
		const seen = merged.get(key);
		if (!seen || hit.score > seen.score) merged.set(key, hit);
	}
	return sortHits([...merged.values()]).slice(0, limit);
}

/** Words written with the query: the whole word, then prefixes, then anywhere. */
async function searchHanzi(q: string): Promise<SearchHit[]> {
	const rows = queryAll(
		cedictDb,
		`SELECT ${SEARCH_COLUMNS} ${SEARCH_FROM}
		 WHERE c.word = ? OR c.traditional = ? OR c.word LIKE ? OR c.word LIKE ? OR c.traditional LIKE ?
		 ORDER BY CASE WHEN c.rank IS NULL THEN 1 ELSE 0 END, c.rank ASC
		 LIMIT 400`,
		[q, q, `${q}%`, `%${q}%`, `%${q}%`]
	) as RawRow[];
	return toHits(rows, 'hanzi', (row) => scoreHanzi(row.word, q, row.rank));
}

/** Words read as the query, tones optional. */
async function searchPinyin(q: string): Promise<SearchHit[]> {
	ensurePinyinIndex();
	const norm = normalizePinyin(q);
	if (!norm) return [];
	const picked = new Map<string, true>();

	const take = (i: number) => picked.set(pinyinRows[i].word, true);
	for (const i of pinyinIndex!.get(norm) ?? []) take(i);
	if (picked.size < 400) {
		for (const [key, bucket] of pinyinIndex!) {
			if (key !== norm && key.startsWith(norm)) for (const i of bucket) take(i);
			if (picked.size >= 400) break;
		}
	}
	if (picked.size < 40) {
		for (const [key, bucket] of pinyinIndex!) {
			if (!key.startsWith(norm) && key.includes(norm)) for (const i of bucket) take(i);
			if (picked.size >= 200) break;
		}
	}

	const words = [...picked.keys()].slice(0, 400);
	const byWord = rowsForWords(words);
	const rows = words.map((w) => byWord.get(w)).filter(Boolean) as RawRow[];
	// The tone the reader typed, if any, only breaks ties — a wrong-tone match is
	// still shown, just below the right-tone one.
	const wantsTones = hasToneMarker(q) ? normalizeTypedTones(q) : '';
	// A word matches on its best reading, not its first — 行 lists heng2 first
	// but is looked up as xing2 or hang2.
	return toHits(rows, 'pinyin', (row, readings) =>
		Math.max(
			...readings.map((syl) =>
				scorePinyin(syl, norm, row.rank, wantsTones !== '' && numberedTones(syl) === wantsTones)
			),
			0
		)
	);
}

/**
 * Words glossed with the query. cedict packs every sense into one slash-joined
 * `eng_Tran`, so the LIKE is a coarse filter and the scoring decides what each
 * hit is worth.
 */
async function searchEnglish(q: string): Promise<SearchHit[]> {
	const rows = queryAll(
		cedictDb,
		`SELECT ${SEARCH_COLUMNS} ${SEARCH_FROM}
		 WHERE c.eng_Tran LIKE ?
		 ORDER BY CASE WHEN c.rank IS NULL THEN 1 ELSE 0 END, c.rank ASC
		 LIMIT 600`,
		[`%${q}%`]
	) as RawRow[];
	return toHits(rows, 'english', (row) =>
		scoreEnglish(commonMeaningOf(row.eng_Tran, row.definitions), q, row.rank)
	);
}

/** Tone digits of a numbered-pinyin string: "ni3 hao3" -> "33". */
function numberedTones(syllables: string): string {
	return (syllables.match(/[1-5]/g) ?? []).join('');
}

/** Tone digits the reader typed, whether as digits ("hao3") or marks ("hǎo"). */
function normalizeTypedTones(q: string): string {
	const digits = q.match(/[1-5]/g);
	if (digits) return digits.join('');
	const marks: Record<string, string> = { '̄': '1', '́': '2', '̌': '3', '̀': '4' };
	return [...q.normalize('NFD')]
		.map((c) => marks[c] ?? '')
		.join('');
}

/** Words containing `char`, most common first — the "words with this character" list. */
export async function wordsContaining(char: string, limit = 12): Promise<SearchHit[]> {
	if (!cedictDb) await loadCedict();
	const rows = queryAll(
		cedictDb,
		`SELECT ${SEARCH_COLUMNS} ${SEARCH_FROM}
		 WHERE c.word LIKE ? AND LENGTH(c.word) > 1
		 ORDER BY CASE WHEN c.rank IS NULL THEN 1 ELSE 0 END, c.rank ASC
		 LIMIT ?`,
		[`%${char}%`, limit]
	) as RawRow[];
	return toHits(rows, 'hanzi', (row) => commonness(row.rank));
}

/** A character built from `component`, for the "characters sharing this part" list. */
export interface RelatedCharacter {
	character: string;
	pinyin: string;
	definition: string;
	decomposition: string;
	rank: number | null;
}

/**
 * Characters whose decomposition names `component` — the deck's "character
 * relations" fan, computed rather than stored. The `character` table is 9.5k
 * rows, so the LIKE scan is cheap; ordering joins cedict's frequency rank so the
 * characters a learner will actually meet come first.
 */
export async function charactersWithComponent(
	component: string,
	limit = 24
): Promise<RelatedCharacter[]> {
	if (!cedictDb) await loadCedict();
	const rows = queryAll(
		cedictDb,
		`SELECT ch.character AS character, ch.definition AS definition, ch.pinyin AS pinyin,
		        ch.decomposition AS decomposition, c.rank AS rank
		 FROM character ch LEFT JOIN cedict c ON c.word = ch.character
		 WHERE ch.decomposition LIKE ? AND ch.character != ?
		 ORDER BY CASE WHEN c.rank IS NULL THEN 1 ELSE 0 END, c.rank ASC
		 LIMIT ?`,
		[`%${component}%`, component, limit]
	);
	return rows.map((r) => ({
		character: r.character,
		pinyin: safeJSON<string[]>(r.pinyin, []).join(' / '),
		definition: shortCharDef(r.definition || ''),
		decomposition: r.decomposition || '',
		rank: typeof r.rank === 'number' ? r.rank : null
	}));
}
