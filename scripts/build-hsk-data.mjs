/**
 * Builds the static HSK browser data under `static/data/hsk/`.
 *
 *   node scripts/build-hsk-data.mjs        (npm run build:hsk)
 *
 * Two vocabulary lists are emitted, one JSON file per level plus an index:
 *
 *   old-1 … old-6    Old HSK (2012), from `HSK Wordlist/HSK Official With
 *                    Definitions 2012 L*.txt` (simp, trad, numbered pinyin,
 *                    tone-marked pinyin, meaning), enriched from cedict.db.
 *   new-1 … new-7-9  New HSK 3.0 (2025), ordered by the official list in the
 *                    HSK-3.0-words-list submodule (which also supplies zhuyin,
 *                    the Chinese POS label and the corpus frequency), enriched
 *                    from cedict.db.
 *
 * Everything the /hsk pages show is baked in here so the browser never has to
 * pull the 10 MB cedict.db just to read a word list.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pinzhu from '../src/lib/dict/pinyinzhuyin.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'static', 'data', 'hsk');
const cedictPath = join(root, 'static', 'data', 'cedict.db');
const oldDir = join(root, 'HSK Wordlist');
const newDir = join(root, 'HSK-3.0-words-list', 'New HSK (2025)', 'Anki xiehanzi');

const OLD_LEVELS = ['1', '2', '3', '4', '5', '6'];
const NEW_LEVELS = ['1', '2', '3', '4', '5', '6', '7-9'];

if (!existsSync(cedictPath)) fail(`missing ${cedictPath}`);
if (!existsSync(newDir)) fail(`missing ${newDir} — run: git submodule update --init`);

function fail(msg) {
	console.error(`build-hsk-data: ${msg}`);
	process.exit(1);
}

const db = new DatabaseSync(cedictPath, { readOnly: true });

const cedictStmt = db.prepare(
	`SELECT simplified, traditional, pinyin, definitions, classifiers, all_PoS, dominant_PoS, eng_Tran, rank
	 FROM cedict WHERE word = ?
	 ORDER BY CASE WHEN rank IS NULL THEN 1 ELSE 0 END, rank ASC LIMIT 1`
);

/** Mirrors posDisplay() in src/lib/dict/cedict.ts. */
const POS = {
	mg: 'Number Morpheme', rg: 'Pronoun Morpheme', a: 'Adjective', ad: 'Adverbial Adjective',
	an: 'Nominal Adjective', b: 'Distinction Word', c: 'Conjunction', cc: 'Coordinating Conjunction',
	d: 'Adverb', e: 'Exclamation', f: 'Direction Word', g: 'Morpheme', k: 'Suffix',
	l: 'Fixed Expression', m: 'Numeral', mq: 'Numeral-Classifier', n: 'Noun', nr: 'Personal Name',
	ns: 'Place Name', nt: 'Organization Name', nz: 'Proper Noun', o: 'Onomatopoeia',
	p: 'Preposition', q: 'Classifier', qt: 'Temporal Classifier', qv: 'Verbal Classifier',
	r: 'Pronoun', s: 'Place Word', t: 'Time Word', tg: 'Time Morpheme', u: 'Particle',
	v: 'Verb', vn: 'Verbal Noun', y: 'Modal Particle', z: 'Status Word'
};
const posDisplay = (raw) => (raw ? (POS[raw.toLowerCase()] ?? raw.toUpperCase()) : '');

const safeJSON = (raw, fallback) => {
	try {
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
};

/** ".a.d.v." -> ['Adjective','Adverb','Verb'] */
const parsePoS = (raw) =>
	(raw ?? '')
		.split('.')
		.map((s) => s.trim())
		.filter(Boolean)
		.map(posDisplay);

/**
 * The 2012 lists join syllables inside a word ("bu2 ke4qi5"), which breaks
 * per-character tone coloring. Split after every tone digit instead.
 */
function normalizeNumbered(py) {
	return (py ?? '')
		.replace(/\s+/g, '')
		.replace(/([1-5])/g, '$1 ')
		.trim();
}

const zhuyinOf = (numbered) =>
	normalizeNumbered(numbered)
		.split(' ')
		.filter(Boolean)
		.map((syl) => {
			try {
				return pinzhu.numericPinyin2Zhuyin(syl.replace(/v/g, 'u:')) ?? '';
			} catch {
				return '';
			}
		})
		.filter(Boolean)
		.join(' ');

async function markedOf(numbered) {
	const p = await pinzhu.pinyinAndZhuyin(normalizeNumbered(numbered).replace(/v/g, 'u:'), 'w', 'w');
	// p[2] separates syllables with &nbsp; (it is built for card HTML); the JSON
	// is consumed as plain text, so rebuild zhuyin from the syllables instead.
	return { marked: p[1], zhuyin: zhuyinOf(numbered) };
}

const tidy = (s) =>
	(s ?? '')
		.replace(/\s*;\s*$/, '')
		.replace(/\s+/g, ' ')
		.trim();

/**
 * cedict.db's `eng_Tran` column comes from a CSV import: some rows are still
 * wrapped in quotes and a few particles carry a literal "#" placeholder.
 */
const cleanEng = (raw) => {
	const s = tidy((raw ?? '').replace(/\//g, '; ')).replace(/^"+|"+$/g, '');
	return s === '#' || s === '-' ? '' : s;
};

/**
 * CEDICT often opens a sense list with a cross-reference ("old variant of
 * 和[he2]; and; together with; …"). As a headline gloss that is noise whenever
 * real senses follow — the full text stays in the per-reading definitions.
 */
const dropVariantPrefix = (s) => {
	const m = /^(?:old |unofficial |erhua )?variant of [^;]+;\s*(.+)$/i.exec(s);
	return m ? m[1] : s;
};

/**
 * Comparable form of a pinyin string: no spaces, no case, composed accents.
 * The source lists ship precomposed accents (NFC) while pinyinzhuyin builds
 * tone marks from combining characters, so without normalising, "gè" from the
 * word list never matches the "gè" we generate and the wrong reading wins.
 */
const pyKey = (s) => (s ?? '').normalize('NFC').toLowerCase().replace(/\s+/g, '');

/**
 * One vocabulary entry. Keys are short because 5.6k of them ship as JSON:
 *   s simplified · t traditional · p numbered pinyin · y tone-marked pinyin
 *   z zhuyin · m short meaning · o part of speech · c classifiers
 *   f frequency rank · r extra readings [{ p, y, z, d }]
 */
async function buildEntry(word, seed) {
	const row = cedictStmt.get(word) ?? null;

	const pinyinArr = row ? safeJSON(row.pinyin, []) : [];
	const defs = row ? safeJSON(row.definitions, {}) : {};

	const readings = [];
	for (const raw of pinyinArr) {
		const numbered = raw.replace(/v/g, 'u:').replace(/0/g, '5');
		const { marked, zhuyin } = await markedOf(numbered);
		readings.push({ p: numbered, y: marked, z: zhuyin, d: tidy(defs[raw] ?? defs[numbered] ?? '') });
	}

	// Prefer the reading the source list gives us — the old lists carry numbered
	// pinyin, the new ones tone-marked pinyin — otherwise the most common one.
	// CEDICT capitalises proper-noun readings ("Ri4" for 日 = Japan), so when a
	// reading matches in both cases the lowercase, general one wins.
	const pickMatch = (matches) =>
		matches.find((r) => r.p === r.p.toLowerCase()) ?? matches[0] ?? null;
	let primary = readings[0];
	if (seed?.numbered) {
		const want = pyKey(normalizeNumbered(seed.numbered));
		primary = pickMatch(readings.filter((r) => pyKey(r.p) === want)) ?? primary;
	} else if (seed?.marked) {
		const want = pyKey(seed.marked);
		primary = pickMatch(readings.filter((r) => pyKey(r.y) === want)) ?? primary;
	}

	const numbered = primary?.p ?? normalizeNumbered(seed?.numbered ?? '');
	let marked = primary?.y ?? seed?.marked ?? '';
	let zhuyin = primary?.z ?? seed?.zhuyin ?? '';
	if (!marked && numbered) ({ marked, zhuyin } = await markedOf(numbered));
	if (!zhuyin && numbered) zhuyin = zhuyinOf(numbered);

	// `eng_Tran` is a single curated gloss for the whole headword, so for a word
	// with several pronunciations it can describe a reading other than the one we
	// show (说 shuō would be glossed with the shuì senses). Prefer the definition
	// belonging to the reading on the card whenever there is a choice.
	const meaning = dropVariantPrefix(
		readings.length > 1
			? tidy(primary?.d) || cleanEng(row?.eng_Tran) || tidy(seed?.meaning)
			: cleanEng(row?.eng_Tran) || tidy(primary?.d) || tidy(seed?.meaning)
	);

	const entry = {
		s: word,
		t: row?.traditional || seed?.traditional || word,
		p: numbered,
		y: marked || seed?.marked || '',
		z: zhuyin || seed?.zhuyin || '',
		m: meaning
	};

	const pos = row ? parsePoS(row.all_PoS) : [];
	const dominant = posDisplay((row?.dominant_PoS ?? '').trim());
	const posList = [...new Set([dominant, ...pos].filter(Boolean))];
	if (posList.length) entry.o = posList;
	else if (seed?.posCn) entry.o = [seed.posCn];

	const cl = row ? safeJSON(row.classifiers, []) : [];
	if (cl.length) entry.c = cl;

	const rank = typeof row?.rank === 'number' ? row.rank : null;
	if (rank) entry.f = rank;
	if (seed?.freq) entry.q = seed.freq;

	// Only ship the reading list when it adds something (a second pronunciation,
	// or a sense list richer than the one-line meaning).
	const extra = readings.filter((r) => r.d);
	if (extra.length > 1 || (extra.length === 1 && extra[0].d !== meaning)) entry.r = extra;

	return entry;
}

function readLines(path) {
	return readFileSync(path, 'utf8')
		.replace(/^﻿/, '')
		.split(/\r?\n/)
		.filter((l) => l.trim());
}

/** Old HSK (2012): simp \t trad \t numbered pinyin \t marked pinyin \t meaning */
function oldSeeds(level) {
	const path = join(oldDir, `HSK Official With Definitions 2012 L${level}.txt`);
	return readLines(path).map((line) => {
		const [simp, trad, numbered, marked, meaning] = line.split('\t');
		return { word: simp?.trim(), traditional: trad?.trim(), numbered, marked, meaning };
	});
}

/** New HSK (2025): simp \t trad \t pinyin \t zhuyin \t level \t POS(cn) \t freq \t html */
function newSeeds(level) {
	const path = join(newDir, `HSK_Level_${level}.txt`);
	return readLines(path).map((line) => {
		const [simp, trad, marked, zhuyin, , posCn, freq] = line.split('\t');
		return {
			word: simp?.trim(),
			traditional: trad?.trim(),
			marked,
			zhuyin,
			posCn: posCn?.trim(),
			freq: Number(freq) || 0
		};
	});
}

const LISTS = [
	{
		id: 'old',
		name: 'Old HSK',
		year: '2012',
		subtitle: 'HSK 2.0 — the classic six-level syllabus',
		levels: OLD_LEVELS,
		seeds: oldSeeds
	},
	{
		id: 'new',
		name: 'New HSK',
		year: '2025',
		subtitle: 'HSK 3.0 — the current nine-level standard',
		levels: NEW_LEVELS,
		seeds: newSeeds
	}
];

mkdirSync(outDir, { recursive: true });

const index = [];

for (const list of LISTS) {
	const levels = [];
	for (const level of list.levels) {
		const seeds = list.seeds(level);
		const seen = new Set();
		const entries = [];
		for (const seed of seeds) {
			if (!seed.word || seen.has(seed.word)) continue;
			seen.add(seed.word);
			entries.push(await buildEntry(seed.word, seed));
		}
		const file = `${list.id}-${level}.json`;
		const json = JSON.stringify(entries);
		writeFileSync(join(outDir, file), json);
		levels.push({ level, count: entries.length, file });
		console.log(`  ${file.padEnd(14)} ${String(entries.length).padStart(5)} words  ${(json.length / 1024).toFixed(0)} KB`);
	}
	index.push({
		id: list.id,
		name: list.name,
		year: list.year,
		subtitle: list.subtitle,
		total: levels.reduce((n, l) => n + l.count, 0),
		levels
	});
}

writeFileSync(join(outDir, 'index.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), lists: index }, null, '\t'));
console.log(`build-hsk-data: wrote ${index.reduce((n, l) => n + l.levels.length, 0)} level files to static/data/hsk/`);
