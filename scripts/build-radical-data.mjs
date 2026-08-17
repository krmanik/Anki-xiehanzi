/**
 * Builds the static Kangxi-radical data under `static/data/radicals/`.
 *
 *   node scripts/build-radical-data.mjs        (npm run build:radicals)
 *
 * Four sources are merged into one committed `index.json` (plus the glyph SVGs
 * it points at), so neither the `/radicals` browser nor the deck builder ever
 * touches the network:
 *
 *   scripts/data/chinese_radicals.json  number, character, stroke count, English
 *                                       meaning, colloquial term (+ its pinyin
 *                                       and gloss), pinyin, frequency, examples
 *   en.wikipedia.org/wiki/Kangxi_radicals
 *                                       the readings that file has no column for
 *                                       — Hán-Việt, Hiragana-Romaji,
 *                                       Hangul-Romaja — plus the variant forms
 *                                       and the simplified radical
 *   static/data/cedict.db               pinyin + a short gloss for every example
 *                                       character, so an example is never a bare
 *                                       hanzi the learner has to look up
 *   zdic.net/hans/<radical>             字源演变 (oracle bone → clerical → regular)
 *                                       and 字形对比 (CN/HK/TW/JP/KR) glyph SVGs
 *
 * Flags:
 *   --no-zdic     skip the zdic scrape entirely (no `evolution` / `compare`)
 *   --refresh     re-fetch even when the HTML/SVG is already cached
 *   --limit N     first N radicals only (testing)
 *   --delay MS    politeness delay between zdic page fetches (default 700)
 *
 * Network responses are cached under `.cache/radicals/` (git-ignored), so a
 * rerun after the first is offline and instant.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pinzhu from '../src/lib/dict/pinyinzhuyin.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'static', 'data', 'radicals');
const glyphDir = join(outDir, 'glyphs');
const cacheDir = join(root, '.cache', 'radicals');
const cedictPath = join(root, 'static', 'data', 'cedict.db');
const radicalsPath = join(root, 'scripts', 'data', 'chinese_radicals.json');

const WIKI_URL = 'https://en.wikipedia.org/wiki/Kangxi_radicals';
const ZDIC_URL = (char) => `https://www.zdic.net/hans/${encodeURIComponent(char)}`;
// zdic answers 403 to anything that does not look like a browser, so the
// crawler identifies as one and stays polite through --delay instead.
const UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const args = parseArgs(process.argv.slice(2));
const withZdic = !args['no-zdic'];
const refresh = Boolean(args.refresh);
const limit = args.limit ? Number(args.limit) : Infinity;
const delayMs = args.delay ? Number(args.delay) : 700;

if (!existsSync(cedictPath)) fail(`missing ${cedictPath}`);
if (!existsSync(radicalsPath)) fail(`missing ${radicalsPath}`);

function fail(msg) {
	console.error(`build-radical-data: ${msg}`);
	process.exit(1);
}

function parseArgs(argv) {
	const out = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith('--')) continue;
		const key = a.slice(2);
		const next = argv[i + 1];
		if (next && !next.startsWith('--')) {
			out[key] = next;
			i++;
		} else {
			out[key] = true;
		}
	}
	return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Cached fetch
// ---------------------------------------------------------------------------

mkdirSync(cacheDir, { recursive: true });

/**
 * Fetch to a cache file; returns null when the server says the page is gone.
 *
 * A full run is ~2,700 requests over half an hour, so a dropped connection is
 * expected rather than exceptional — retry a few times with backoff instead of
 * losing the whole crawl. Everything already fetched is on disk, so even a hard
 * failure only costs the tail of the run.
 */
async function cachedFetch(url, cacheFile, { binary = false, attempts = 4 } = {}) {
	const path = join(cacheDir, cacheFile);
	if (!refresh && existsSync(path)) {
		const body = readFileSync(path);
		return body.length === 0 ? null : binary ? body : body.toString('utf8');
	}
	mkdirSync(dirname(path), { recursive: true });

	let lastError;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			const res = await fetch(url, {
				headers: { 'user-agent': UA },
				signal: AbortSignal.timeout(25000)
			});
			if (res.status === 404 || res.status === 403) {
				writeFileSync(path, Buffer.alloc(0)); // negative cache — do not re-ask
				return null;
			}
			if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
			const buf = Buffer.from(await res.arrayBuffer());
			writeFileSync(path, buf);
			return binary ? buf : buf.toString('utf8');
		} catch (err) {
			lastError = err;
			if (attempt < attempts) await sleep(1000 * 2 ** attempt);
		}
	}
	console.warn(`  skipped ${url} — ${lastError?.message ?? lastError}`);
	return null;
}

// ---------------------------------------------------------------------------
// HTML helpers — the two pages scraped here are stable, regular markup, so a
// parser dependency would buy nothing a few anchored regexes do not.
// ---------------------------------------------------------------------------

const ENTITIES = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	'#39': "'",
	'#160': ' '
};

function decodeEntities(s) {
	return s
		.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
		.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
		.replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/**
 * Tag soup → plain text, with `<sup>` footnote markers dropped.
 *
 * Tags are walked rather than matched with `/<[^>]+>/`: Wikipedia's HTML carries
 * `data-mw='{"parts":[…]}'` attributes whose JSON contains `>`, and a regex that
 * stops at the first one leaves the rest of the JSON in the cell. That is where
 * radical 13's Hán-Việt reading `khuynh"}},"i":0}}]}'>quynhkhuynh` came from.
 */
function text(html) {
	const source = String(html);
	let out = '';
	let depth = 0; // inside how many <sup> elements
	let i = 0;
	while (i < source.length) {
		const lt = source.indexOf('<', i);
		if (lt === -1) {
			if (!depth) out += source.slice(i);
			break;
		}
		if (!depth) out += source.slice(i, lt);
		// Find this tag's own '>', ignoring any inside a quoted attribute value.
		let j = lt + 1;
		let quote = null;
		for (; j < source.length; j++) {
			const c = source[j];
			if (quote) {
				if (c === quote) quote = null;
			} else if (c === '"' || c === "'") quote = c;
			else if (c === '>') break;
		}
		const tag = source.slice(lt + 1, j);
		if (/^sup\b/i.test(tag)) depth++;
		else if (/^\/sup\b/i.test(tag) && depth) depth--;
		// A cell listing two readings does it with a line break; without a
		// separator here they came out welded together ("quynhkhuynh").
		else if (/^br\b|^br\/|^\/(li|p|div)\b/i.test(tag) && !depth) out += ' / ';
		i = j + 1;
	}
	return decodeEntities(out).replace(/\s+/g, ' ').trim();
}

/** Every CJK character in a cell, in order, deduplicated. */
function hanziOf(s) {
	const hits = String(s).match(/[㐀-䶿一-鿿豈-﫿⺀-⿟]/gu) ?? [];
	return [...new Set(hits)];
}

// ---------------------------------------------------------------------------
// Wikipedia — the Kangxi radical table
// ---------------------------------------------------------------------------

/**
 * Columns: №, radical forms, stroke count, meaning, colloquial term, pinyin,
 * Hán-Việt, Hiragana-Romaji, Hangul-Romaja, frequency, simplified, examples.
 *
 * Only the four things `chinese_radicals.json` has no column for are kept —
 * the readings, the variant forms and the simplified radical. Everything else
 * stays with the local file, which is the source this project maintains.
 */
async function loadWikipedia() {
	const html = await cachedFetch(WIKI_URL, 'kangxi-wikipedia.html');
	if (!html) fail(`could not fetch ${WIKI_URL}`);
	// The page carries several wikitables; the one wanted is whichever has the
	// Hán-Việt column, not whichever comes first.
	const table = (html.match(/<table\b[^>]*class="[^"]*wikitable[^"]*"[\s\S]*?<\/table>/gi) ?? []).find(
		(t) => t.includes('Hán-Việt') || t.includes('H&#225;n-Vi&#7879;t')
	);
	if (!table) fail('Kangxi radical table not found on the Wikipedia page');

	const byNumber = new Map();
	for (const row of table.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? []) {
		const cells = (row.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) ?? []).map(text);
		if (cells.length < 11) continue; // header row
		const number = Number(cells[0]);
		if (!Number.isInteger(number)) continue;

		// "月 (⺝)" — the head form first, any bracketed variants after it.
		const forms = hanziOf(cells[1]);
		// "つき / tsuki" and "달월 / dalweol" pair a native script with a romanization.
		const [kana = '', romaji = ''] = splitReading(cells[7]);
		const [hangul = '', romaja = ''] = splitReading(cells[8]);

		byNumber.set(number, {
			variants: forms.slice(1),
			colloquial: hanziOf(cells[4])[0] ? cells[4].trim() : '',
			hanviet: cells[6],
			kana,
			romaji,
			hangul,
			romaja,
			simplified: hanziOf(cells[10])
		});
	}
	if (byNumber.size < 214) fail(`Wikipedia table gave only ${byNumber.size} radicals`);
	return byNumber;
}

/**
 * "つき / tsuki" → ['つき', 'tsuki'] — the native script and its romanization,
 * told apart by *script*, not by position.
 *
 * The column holds both, and in more shapes than a positional split survives:
 * "ひと / hito (にんべん nin'ben / ひとやね /hitoyane)" lists the combining forms in
 * brackets, and "しん / こころ" (radical 61) is two kana readings with no
 * romanization at all — which a positional split printed as
 * `日本語 しん こころ`, and the bracket case as
 * `hito (にんべん nin'ben / ひとやね / hitoyane)`. Brackets are dropped and the
 * first native reading is paired with the first Latin one, if there is one:
 * the card has room for one reading per language.
 */
function splitReading(cell) {
	const parts = String(cell)
		.replace(/[（(][^）)]*[）)]?/g, ' ')
		.split('/')
		.map((s) => s.replace(/\s+/g, ' ').trim())
		.filter(Boolean);
	const latin = /^[a-zà-öø-ÿ'’ \-ōūāēī]+$/i;
	return [parts.find((p) => !latin.test(p)) ?? '', parts.find((p) => latin.test(p)) ?? ''];
}

// ---------------------------------------------------------------------------
// zdic — 字源演变 and 字形对比 glyph images
// ---------------------------------------------------------------------------

/**
 * Both blocks are lists of `<img src="//img.zdic.net/…svg" alt="LABEL">`, the
 * evolution one wrapped in a link to the script's instance page. Labels come
 * from the page itself so a new script type needs no code change here; the
 * English side is a lookup with the Chinese label as the fallback.
 */
const SCRIPT_EN = {
	甲骨文: 'Oracle bone',
	金文: 'Bronze',
	楚系简帛: 'Chu bamboo & silk',
	说文: 'Shuowen seal',
	秦系简牍: 'Qin bamboo',
	隶书: 'Clerical',
	楷書: 'Regular',
	楷书: 'Regular',
	小篆: 'Small seal',
	篆书: 'Seal'
};

const REGION_EN = {
	中国大陆: 'Mainland China',
	香港: 'Hong Kong',
	台湾: 'Taiwan',
	日本: 'Japan',
	韩国: 'South Korea',
	韓國: 'South Korea'
};

/** `//img.zdic.net/zy/jinwen/32_EFE7.svg` → `zy-jinwen-32_EFE7.svg`. */
function glyphName(src) {
	return src
		.replace(/^\/\/img\.zdic\.net\//, '')
		.replace(/[^a-zA-Z0-9._-]+/g, '-')
		.replace(/\//g, '-');
}

/**
 * The blocks sit between two `<h3 class="dict-sub-title">` headings, and are
 * followed by 各书体字形实例 — a gallery of *every* rubbing zdic holds, dozens per
 * script. Stopping at the next heading is what keeps the tidy one-per-script row
 * from swallowing that gallery.
 */
function extractBlock(html, className) {
	const start = html.indexOf(`class="${className}"`);
	if (start < 0) return [];
	const nextHeading = html.indexOf('<h3', start);
	const end = nextHeading < 0 ? start + 8000 : nextHeading;
	const chunk = html.slice(start, end);
	const items = [];
	for (const m of chunk.matchAll(/<img\s+src="(\/\/img\.zdic\.net\/[^"]+\.svg)"\s+alt="([^"]*)"/g)) {
		items.push({ src: m[1], label: decodeEntities(m[2]) });
	}
	return items;
}

async function fetchGlyphs(char) {
	const key = [...char].map((c) => c.codePointAt(0).toString(16).toUpperCase()).join('_');
	const html = await cachedFetch(ZDIC_URL(char), `zdic/${key}.html`);
	if (!html) return { evolution: [], compare: [] };

	const evolution = extractBlock(html, 'glyph-evolution').map((it) => ({
		script: it.label,
		label: SCRIPT_EN[it.label] ?? it.label,
		file: glyphName(it.src),
		src: it.src
	}));
	const compare = extractBlock(html, 'glyph-compare').map((it) => ({
		region: it.label,
		label: REGION_EN[it.label] ?? it.label,
		file: glyphName(it.src),
		src: it.src
	}));
	return { evolution, compare };
}

/**
 * Download every referenced SVG once, into `static/data/radicals/glyphs/`, and
 * drop the ones a previous run left behind. Returns the set that is now on disk
 * — a glyph the server no longer serves is removed from the data too, so the
 * page and the deck never point at a missing file.
 */
async function syncGlyphs(entries) {
	const wanted = new Map();
	for (const r of entries) {
		for (const g of [...r.evolution, ...r.compare]) wanted.set(g.file, g.src);
	}
	mkdirSync(glyphDir, { recursive: true });

	const have = new Set();
	let n = 0;
	for (const [file, src] of wanted) {
		const dest = join(glyphDir, file);
		if (!refresh && existsSync(dest)) {
			have.add(file);
			continue;
		}
		const buf = await cachedFetch(`https:${src}`, `img/${file}`, { binary: true });
		if (buf) {
			writeFileSync(dest, buf);
			have.add(file);
		}
		if (++n % 100 === 0) console.log(`  glyphs ${n}/${wanted.size}`);
		await sleep(60);
	}

	// Only a full run knows the complete glyph set; pruning after `--limit` would
	// delete every SVG the test slice happens not to mention.
	if (limit === Infinity) {
		for (const f of readdirSync(glyphDir)) {
			if (!have.has(f)) rmSync(join(glyphDir, f));
		}
	}
	return have;
}

// ---------------------------------------------------------------------------
// cedict — pinyin + gloss for the example characters
// ---------------------------------------------------------------------------

const db = new DatabaseSync(cedictPath, { readOnly: true });
/**
 * cedict is keyed on the simplified form, but plenty of the example characters
 * Wikipedia lists are traditional (內, 兩, 冊), so match either column or a
 * third of the examples come back glossless.
 */
const cedictStmt = db.prepare(
	`SELECT pinyin, definitions, eng_Tran, rank FROM cedict
	 WHERE word = $c OR traditional = $c
	 ORDER BY CASE WHEN word = $c THEN 0 ELSE 1 END,
	          CASE WHEN rank IS NULL THEN 1 ELSE 0 END, rank ASC LIMIT 1`
);

const safeJSON = (raw, fallback) => {
	try {
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
};

/**
 * First clauses of one reading's gloss, trimmed to something that fits a card.
 * cedict writes for a dictionary, not a flashcard: register markers, classifier
 * notes and cross-reference pinyin ("天干[tian1 gan1]") are all noise here.
 */
function shortGloss(def) {
	const clauses = String(def ?? '')
		.replace(/\(CL:[^)]*\)/g, '')
		.replace(/\[[^\]]*\]/g, '')
		.replace(/([^\s|]+)\|([^\s|]+)/g, '$2')
		.replace(/\((bound form|literary|archaic|old|coll\.?|dialect)\)\s*/gi, '')
		.split(/;|\//)
		.map((s) => s.trim())
		.filter(Boolean);
	// "variant of 期; period" teaches nothing about the character on the card —
	// keep it only when it is all the entry has.
	const meaningful = clauses.filter((c) => !/^(old |archaic )?variant of\b/i.test(c));
	const gloss = (meaningful.length ? meaningful : clauses).slice(0, 2).join('; ');
	return gloss.length > 60 ? `${gloss.slice(0, 57).trimEnd()}…` : gloss;
}

/**
 * A character's *teaching* reading, which is rarely the first one cedict lists:
 * 王 leads with the surname Wang, 三 with the surname San. Score the readings so
 * a surname, a cross-reference ("used in 丁丁") or a variant note loses to the
 * ordinary sense, and a capitalized reading — cedict's marker for proper nouns —
 * loses to a lowercase one.
 */
function pickReading(row) {
	const defs = safeJSON(row?.definitions, {});
	const readings = Object.keys(defs);
	if (!readings.length) {
		const first = (safeJSON(row?.pinyin, []) ?? [])[0] ?? '';
		return { reading: first, def: row?.eng_Tran ?? '' };
	}
	const score = (reading) => {
		const def = String(defs[reading] ?? '').toLowerCase();
		let s = 0;
		if (/^[A-Z]/.test(reading)) s -= 10;
		if (/^surname\b/.test(def)) s -= 5;
		if (/^used in\b/.test(def)) s -= 4;
		if (/^(old )?variant of\b/.test(def)) s -= 3;
		if (!def.trim()) s -= 8;
		return s;
	};
	const best = readings.reduce((a, b) => (score(b) > score(a) ? b : a));
	return { reading: best, def: defs[best] };
}

const exampleCache = new Map();

/** Tone-marked pinyin of a character's teaching reading, or '' when unknown. */
async function markedReading(char) {
	const { reading } = pickReading(cedictStmt.get({ c: char }));
	const numbered = String(reading ?? '').replace(/v/g, 'u:');
	if (!numbered) return '';
	const p = await pinzhu.pinyinAndZhuyin(numbered, 'w', 'w');
	return p[1] ?? '';
}

/** "一字旁" → "yī zì páng", read character by character. */
async function readTerm(term) {
	const out = [];
	for (const ch of String(term ?? '')) {
		const marked = await markedReading(ch);
		if (marked) out.push(marked);
	}
	return out.join(' ');
}

/** Zhuyin for a tone-marked syllable ("shuǐ" → "ㄕㄨㄟˇ"). */
function zhuyinOfMarked(marked) {
	const base = String(marked ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-zü:]/g, '');
	if (!base) return '';
	const tone = toneOfMarked(marked);
	try {
		return pinzhu.numericPinyin2Zhuyin(`${base.replace(/ü/g, 'u:')}${tone}`) ?? '';
	} catch {
		return '';
	}
}

/** Tone number carried by the marks on a syllable; 5 when it carries none. */
function toneOfMarked(marked) {
	const decomposed = String(marked ?? '').normalize('NFD');
	if (/̄/.test(decomposed)) return 1;
	if (/́/.test(decomposed)) return 2;
	if (/̌/.test(decomposed)) return 3;
	if (/̀/.test(decomposed)) return 4;
	return 5;
}

/** How common an example character is, as a coarse band for a card chip. */
function frequencyBand(rank) {
	if (!rank) return '';
	if (rank <= 500) return 'Top 500';
	if (rank <= 1500) return 'Top 1500';
	if (rank <= 5000) return 'Top 5000';
	if (rank <= 10000) return 'Top 10k';
	return 'Rare';
}

/**
 * The radical read as an ordinary word, when it is one: 水 is "water" you can
 * say, 丨 is not. Premium cards show this so a learner knows which radicals are
 * also vocabulary.
 */
async function describeAsWord(char) {
	const row = cedictStmt.get({ c: char });
	if (!row) return null;
	const { reading, def } = pickReading(row);
	const gloss = shortGloss(def);
	// cedict describes the un-word-like radicals in terms of themselves ("radical
	// in Chinese characters (Kangxi radical 2)"). That is the card's own subject,
	// not vocabulary, so it does not earn a line.
	if (!gloss || /\b(radical|component|stroke)\b/i.test(gloss)) return null;
	const numbered = String(reading ?? '').replace(/v/g, 'u:');
	let pinyin = '';
	if (numbered) {
		const p = await pinzhu.pinyinAndZhuyin(numbered, 'w', 'w');
		pinyin = p[1] ?? '';
	}
	return { pinyin, meaning: gloss, rank: row.rank ?? null, band: frequencyBand(row.rank) };
}

async function describeExample(char) {
	if (exampleCache.has(char)) return exampleCache.get(char);
	const row = cedictStmt.get({ c: char });
	const { reading, def } = pickReading(row);
	const numbered = String(reading ?? '').replace(/v/g, 'u:');
	let pinyin = '';
	let zhuyin = '';
	if (numbered) {
		const p = await pinzhu.pinyinAndZhuyin(numbered, 'w', 'w');
		pinyin = p[1] ?? '';
		try {
			zhuyin = pinzhu.numericPinyin2Zhuyin(numbered) ?? '';
		} catch {
			zhuyin = '';
		}
	}
	const out = {
		char,
		pinyin,
		zhuyin,
		meaning: shortGloss(def),
		rank: row?.rank ?? null,
		band: frequencyBand(row?.rank)
	};
	exampleCache.set(char, out);
	return out;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const localRadicals = JSON.parse(readFileSync(radicalsPath, 'utf8'));
const wiki = await loadWikipedia();
console.log(`wikipedia: ${wiki.size} radicals`);

const entries = [];
const slice = localRadicals.slice(0, limit === Infinity ? undefined : limit);

for (const r of slice) {
	const w = wiki.get(r.number) ?? {};
	const examples = [];
	for (const ex of r.examples ?? []) examples.push(await describeExample(ex));

	let glyphs = { evolution: [], compare: [] };
	if (withZdic) {
		const cachedAlready = existsSync(
			join(cacheDir, 'zdic', `${r.character.codePointAt(0).toString(16).toUpperCase()}.html`)
		);
		glyphs = await fetchGlyphs(r.character);
		if (!cachedAlready || refresh) await sleep(delayMs);
	}

	// The local file and Wikipedia disagree on a handful of variant lists; the
	// local one is hand-checked for this project, so it wins where it has data.
	const variants = (r.alternate_forms?.length ? r.alternate_forms : (w.variants ?? [])).filter(
		(v) => v !== r.character
	);
	// Wikipedia's Simplified column repeats the head form for radicals that were
	// never simplified — only a genuinely different glyph is worth showing.
	const simplified = (w.simplified ?? []).filter(
		(s) => s !== r.character && !variants.includes(s)
	);

	// The local file names ~a third of the radicals; Wikipedia's Colloquial Term
	// column covers most of the rest, and its reading is built from cedict rather
	// than left blank.
	let colloquial = r.colloquial_term
		? {
				term: r.colloquial_term,
				pinyin: r.colloquial_term_pinyin ?? '',
				english: r.colloquial_term_english ?? ''
			}
		: null;
	if (!colloquial && w.colloquial) {
		colloquial = { term: w.colloquial, pinyin: await readTerm(w.colloquial), english: '' };
	}

	entries.push({
		number: r.number,
		char: r.character,
		variants,
		simplified,
		strokes: r.stroke_count,
		meaning: r.meaning,
		pinyin: r.pinyin,
		zhuyin: zhuyinOfMarked(r.pinyin),
		// Unicode's Kangxi Radicals block runs U+2F00–U+2FD5 in Kangxi order, so
		// radical n is exactly U+2F00 + n - 1 — the typographic form, as distinct
		// from the CJK ideograph a learner actually types.
		unicode: `U+${r.character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
		kangxiForm: String.fromCodePoint(0x2f00 + r.number - 1),
		word: await describeAsWord(r.character),
		colloquial,
		hanviet: w.hanviet ?? '',
		kana: w.kana ?? '',
		romaji: w.romaji ?? '',
		hangul: w.hangul ?? '',
		romaja: w.romaja ?? '',
		frequency: r.frequency ?? 0,
		examples,
		evolution: glyphs.evolution,
		compare: glyphs.compare
	});

	if (entries.length % 20 === 0) console.log(`  radicals ${entries.length}/${slice.length}`);
}

// `src` is only needed to download the SVG; the committed JSON carries the local
// file name, which is all the page and the deck ever resolve.
if (withZdic) {
	const have = await syncGlyphs(entries);
	console.log(`glyphs: ${have.size} files`);
	for (const e of entries) {
		e.evolution = e.evolution.filter((g) => have.has(g.file));
		e.compare = e.compare.filter((g) => have.has(g.file));
	}
}
for (const e of entries) {
	e.evolution = e.evolution.map(({ src, ...keep }) => keep);
	e.compare = e.compare.map(({ src, ...keep }) => keep);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(
	join(outDir, 'index.json'),
	`${JSON.stringify(
		{
			generated: new Date().toISOString().slice(0, 10),
			count: entries.length,
			sources: {
				readings: WIKI_URL,
				glyphs: withZdic ? 'https://www.zdic.net/' : null,
				examples: 'CC-CEDICT'
			},
			radicals: entries
		},
		null,
		'\t'
	)}\n`
);

console.log(`wrote ${join(outDir, 'index.json')} — ${entries.length} radicals`);

/**
 * Stroke data for just these characters (~350 KB), so neither the radical page
 * nor the in-browser deck builder has to pull the 32 MB Hanzi Writer blob to
 * animate 214 glyphs. Variants and simplified forms are included — the browser
 * shows those too.
 */
const strokeSource = join(root, 'static', 'data', 'hanzi-writer-data.json');
if (existsSync(strokeSource)) {
	const all = JSON.parse(readFileSync(strokeSource, 'utf8'));
	const wanted = new Set();
	for (const e of entries) {
		for (const ch of [e.char, ...e.variants, ...e.simplified]) if (ch) wanted.add(ch);
	}
	const subset = {};
	let missing = 0;
	for (const ch of wanted) {
		if (all[ch]) subset[ch] = all[ch];
		else missing++;
	}
	const strokePath = join(outDir, 'strokes.json');
	writeFileSync(strokePath, JSON.stringify(subset));
	console.log(
		`wrote ${strokePath} — ${Object.keys(subset).length} characters` +
			`${missing ? `, ${missing} without stroke data` : ''}`
	);
} else {
	console.log(`skipped strokes.json — no ${strokeSource}`);
}
