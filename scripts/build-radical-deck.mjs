/**
 * Builds the Kangxi radical decks — 214 radicals, fully offline once imported.
 *
 * Each edition is packaged as two decks, not one: a Recognize deck and a Write
 * deck, each with its own note type, so either can be studied or suspended
 * without touching the other.
 *
 *   free     no zdic glyph images, no word sense — the browser builds this one
 *            on demand from /radicals; the release asset is a convenience
 *   premium  adds the 字源演变 / 字形对比 glyph rows, the zhuyin, the word sense
 *            and the codepoints
 *
 *   node scripts/build-radical-deck.mjs                  (npm run build:radical-deck)
 *   node scripts/build-radical-deck.mjs --edition free   just one of them
 *   node scripts/build-radical-deck.mjs --limit 5        quick smoke test
 *
 * Flags:
 *   --edition E      free | premium (default: both)
 *   --limit N        first N radicals only (testing)
 *   --no-audio       skip TTS entirely
 *   --no-images      skip the 字源演变 / 字形对比 SVGs (premium too)
 *   --tts say        speak every clip with macOS `say` (one voice throughout)
 *   --speech-only    resolve the clips and rewrite audio.json, build nothing
 *   --out DIR        output directory (default dist-decks/)
 *   --tag TAG        release tag the manifest points at
 *   --audio-cache D  where to keep the TTS clips (default .cache/radical-audio)
 *
 * Everything the cards show comes from `static/data/radicals/index.json`
 * (`npm run build:radicals`); the card layout itself is the pure
 * `src/lib/radicalDeck.ts`, so what is unit-tested is what ships.
 *
 * Media in the package:
 *   xhz-radical-<n>.mp3     pronunciation (see `resolveSpeech` — the clip says
 *                           the radical's reading, spoken through a character
 *                           TTS actually knows)
 *   _xhzr-<glyph>.svg       zdic glyph images
 *   _xhz-hanzi-writer.js    stroke engine (`rd.ENGINE_FILE`); the stroke data
 *                           itself rides in each note's hidden StrokeData field
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

import { root, staticDir, installFetchShim } from './lib/node-env.mjs';
import { fromSay, tooShort } from './lib/say.mjs';

installFetchShim();

const { Model, Deck, Package, APKG_SCHEMA } = await import('genanki-js');
const JSZip = (await import('jszip')).default;
const initSqlJs = (await import('sql.js')).default;
const EdgeTTSBrowser = (await import('@kingdanx/edge-tts-browser')).default;
const { toneOfPinyin } = await import('../src/lib/tone.ts');
const rd = await import('../src/lib/radicalDeck.ts');

const args = parseArgs(process.argv.slice(2));
const outDir = args.out
	? resolve(isAbsolute(args.out) ? '/' : root, args.out)
	: join(root, 'dist-decks');
const withAudio = !args['no-audio'];
const withImages = !args['no-images'];
const ttsMode = args.tts === 'say' ? 'say' : 'auto';
const limit = args.limit ? Number(args.limit) : Infinity;
const tag = args.tag ?? defaultTag();
const audioCacheDir = args['audio-cache']
	? resolve(isAbsolute(args['audio-cache']) ? '/' : root, args['audio-cache'])
	: join(root, '.cache', 'radical-audio');

const dataFile = join(staticDir, 'data', 'radicals', 'index.json');
const glyphDir = join(staticDir, 'data', 'radicals', 'glyphs');
const strokeFile = join(staticDir, 'data', 'hanzi-writer-data.json');
const cedictPath = join(staticDir, 'data', 'cedict.db');

const VOICE = 'zh-CN-XiaoxiaoNeural';

const deckFile = (edition) =>
	edition === 'free'
		? 'Anki-xiehanzi-Kangxi-Radicals-Free.apkg'
		: 'Anki-xiehanzi-Kangxi-Radicals.apkg';

const EDITIONS =
	args.edition === 'free' ? ['free'] : args.edition === 'premium' ? ['premium'] : ['free', 'premium'];

if (!existsSync(dataFile)) fail(`missing ${dataFile} — run: npm run build:radicals`);

function fail(msg) {
	console.error(`build-radical-deck: ${msg}`);
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

function defaultTag() {
	const d = new Date();
	return `radical-deck-${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Deck id from the deck's name (FNV-1a), matching `radicalDeckId` in the browser. */
function deckIdFor(name) {
	let h = 0x811c9dc5;
	for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193);
	return ((h >>> 0) % (1 << 30)) + (1 << 30);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

// ---------------------------------------------------------------------------
// Pronunciation
// ---------------------------------------------------------------------------

/**
 * TTS reads text, and most radicals are not text anyone writes: 丨, 亅, 匸 come
 * back silent or mangled. What a learner needs to hear is the *reading*, so the
 * clip is synthesized from a character that carries the same syllable and tone
 * and that the voice definitely knows.
 *
 * It returns a *list* of characters, best first, because the best clip is a real
 * recording off the HSK CDN and the CDN only has the characters the HSK lists
 * use: 丶 zhǔ resolves to 主, which the CDN has never heard of, and one entry
 * further down (煮) it does. `clipFor` walks the list.
 *
 * **A candidate is only ever a character there is no doubt about the reading of**
 * — one reading in cedict, or one reading in the HSK list the recordings come
 * from (see `speaks` and `recordingSays`). A recording says a character the way
 * people usually read it, and matching on *any* of its readings is how 亅 jué came
 * out as "jiǎo" (脚), 己 jǐ as "gěi" (给), 豆 dòu as "dú" (读), 工 gōng as "hóng"
 * (红) and 行 háng as its own "xíng".
 *
 *   1. the radical itself — 月, 水, 心, 大 are ordinary words and sound right;
 *      行 (xíng, háng) and 广 (guǎng, yǎn) are read another way more often, so
 *      they are never spoken through themselves;
 *   2. its simplified form, when that form reads the same — 車 chē → 车;
 *   3. the substitution from `scripts/data/radical-audio.json`, when the
 *      character it names really does read that way (24 did not: 冖 mì was
 *      pointed at 盖 gài, 卩 jié at 印 yìn, 釆 biàn at 采 cǎi);
 *   4. characters read the same way, the ones with a recording first, then the
 *      most common.
 */
function makeSpeechResolver(db, subs) {
	const rows = db
		.prepare(`SELECT word, pinyin, rank FROM cedict WHERE length(word) = 1`)
		.all();

	/**
	 * "gǔn" and "gun3" both key as "gun3" — no pinyin conversion needed.
	 *
	 * ü keys as `u:`, the way cedict writes it, and has to be picked out *before*
	 * the tone marks come off: stripping combining marks turns nǚ into "nu", which
	 * would file 女 nǚ under nu3 and pronounce it 努.
	 */
	const keyOfMarked = (marked) => {
		const base = String(marked ?? '')
			.normalize('NFD')
			.replace(/ü/g, 'u:')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase()
			.replace(/[^a-z:]/g, '');
		return base ? `${base}${toneOfPinyin(marked)}` : '';
	};
	const keyOfNumbered = (numbered) => {
		const m = /^([a-zü:]+)([1-5])$/i.exec(String(numbered ?? '').trim());
		return m ? `${m[1].toLowerCase().replace(/ü/g, 'u:')}${m[2]}` : '';
	};

	// cedict has one row per *entry*, so a character with several senses appears
	// several times; readings are collected across all of its rows.
	//
	// **Only characters with exactly one reading are ever spoken.** There is no
	// way to tell from the data which reading of a polyphone a recording of it
	// will use — the `pinyin` array is not in order of commonness (女 lists ru3
	// before nu:3, 无 lists mo2 before wu2, 行 lists heng2 first) — and guessing is
	// how 亅 jué came out as 脚 "jiǎo", 己 jǐ as 给 "gěi", 豆 dòu as 读 "dú", 工
	// gōng as 红 "hóng" and 行 háng as its own "xíng". A one-reading character can
	// only be said one way. Every radical turns out to have one.
	const readingsOf = new Map(); // char -> Set(key)
	const rankOf = new Map(); // char -> frequency rank
	for (const row of rows) {
		let list;
		try {
			list = JSON.parse(row.pinyin ?? '[]');
		} catch {
			list = [];
		}
		const keys = list.map(keyOfNumbered).filter(Boolean);
		if (!keys.length) continue;
		if (!readingsOf.has(row.word)) readingsOf.set(row.word, new Set());
		for (const key of keys) readingsOf.get(row.word).add(key);
		rankOf.set(row.word, Math.min(rankOf.get(row.word) ?? Infinity, row.rank ?? Infinity));
	}

	/** Is `char` read `key`, and only `key`? */
	const speaks = (char, key) => {
		const keys = readingsOf.get(char);
		return !!key && keys?.size === 1 && keys.has(key);
	};

	/**
	 * What the CDN's recording of a character says, which is not a guess: the CDN
	 * *is* the New HSK 2025 audio set, and the word lists carry the pinyin of every
	 * word in it. So a polyphone can still be spoken through its own recording when
	 * the HSK reading is the one on the card — 大 dà, 女 nǚ, 色 sè, 血 xuè all read
	 * their common way there — while 行, whose HSK reading is xíng, cannot.
	 */
	const hskReadings = new Map(); // char -> Set(key)
	for (const file of readdirSync(join(staticDir, 'data', 'hsk'))) {
		if (!/^new-.*\.json$/.test(file)) continue;
		let words;
		try {
			words = JSON.parse(readFileSync(join(staticDir, 'data', 'hsk', file), 'utf8'));
		} catch {
			continue;
		}
		for (const w of Array.isArray(words) ? words : []) {
			const key = keyOfNumbered(w?.p);
			if (!key) continue;
			for (const form of [w.s, w.t]) {
				if (!form || [...form].length !== 1) continue;
				if (!hskReadings.has(form)) hskReadings.set(form, new Set());
				hskReadings.get(form).add(key);
			}
		}
	}
	/** Does the CDN's clip of `char` say `key`? (And nothing else — 差 is two words.) */
	const recordingSays = (char, key) => {
		const keys = hskReadings.get(char);
		return !!key && keys?.size === 1 && keys.has(key);
	};

	const sharing = new Map(); // key -> [{ char, rank }], commonest first
	for (const [char, keys] of readingsOf) {
		if (keys.size !== 1) continue;
		const key = [...keys][0];
		if (!sharing.has(key)) sharing.set(key, []);
		sharing.get(key).push({ char, rank: rankOf.get(char) ?? Infinity });
	}
	for (const list of sharing.values()) list.sort((a, b) => a.rank - b.rank);

	/** How many homophones to offer the CDN before giving up on a recording. */
	const HOMOPHONES = 12;

	/** Substitutions whose character does not read the way the card does. */
	const rejectedSubs = [];

	const resolve = (radical) => {
		const key = keyOfMarked(radical.pinyin);
		const out = [];
		const add = (char, why) => {
			if (char && !out.some((c) => c.char === char)) out.push({ char, why });
		};
		// A radical that is also an everyday word speaks for itself — as long as
		// there is no doubt about which way it is read. 竹 zhú and 犬 quǎn have one
		// reading; 大 and 色 have two but are recorded the card's way; 行 (xíng,
		// háng) and 广 (guǎng, yǎn) are neither, and used to be read out wrong.
		const sayable = (char) => speaks(char, key) || recordingSays(char, key);

		if (sayable(radical.char)) add(radical.char, 'self');
		for (const simplified of radical.simplified ?? []) {
			if (sayable(simplified)) add(simplified, 'simplified');
		}
		const sub = subs[radical.char]?.alternative;
		if (sub && sub !== radical.char) {
			if (sayable(sub)) add(sub, 'substitute');
			else {
				const has = [...(readingsOf.get(sub) ?? [])].join('/') || '?';
				rejectedSubs.push(`${radical.char} ${radical.pinyin} ✗ ${sub} (${has})`);
			}
		}
		// Homophones with a recording first — one fetch, no synthesis, one voice.
		const homophones = (key ? sharing.get(key) : null)?.slice(0, HOMOPHONES) ?? [];
		for (const hit of homophones) if (recordingSays(hit.char, key)) add(hit.char, 'homophone');
		for (const hit of homophones) add(hit.char, 'homophone');
		return out;
	};

	/** Every reading a character has, for the check after the clips are in. */
	resolve.readingsOf = (char) => [...(readingsOf.get(char) ?? [])];
	/** Whether a clip of `char` can only be the reading `key`. */
	resolve.sayable = (char, key) => speaks(char, key) || recordingSays(char, key);
	resolve.keyOf = keyOfMarked;
	resolve.rejectedSubs = rejectedSubs;
	return resolve;
}

/**
 * One clip per spoken character, cached on disk across runs, from whichever
 * source answers first:
 *
 *   1. the HSK 3.0 audio CDN — the same clips the HSK decks use, so a radical
 *      and the word it appears in sound like the same speaker;
 *   2. Edge TTS, for a character the CDN has never heard of;
 *   3. macOS `say`, which needs no network at all.
 *
 * Anki plays mp3 and m4a alike, so the caller is told which extension it got
 * rather than everything being forced through a converter.
 */
const CDN = 'https://cdn.jsdelivr.net/gh/krmanik/HSK-3.0/New%20HSK%20(2025)/Audio';

async function fromCdn(text) {
	try {
		const res = await fetch(`${CDN}/cmn-${encodeURIComponent(text)}.mp3`, {
			signal: AbortSignal.timeout(20000)
		});
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		return buf.byteLength > 500 ? { buf, ext: 'mp3' } : null;
	} catch {
		return null;
	}
}

async function fromEdgeTts(text) {
	try {
		const tts = new EdgeTTSBrowser();
		tts.tts.setVoiceParams({ text, voice: VOICE });
		const blob = await tts.ttsToFile('clip.mp3');
		const buf = Buffer.from(await blob.arrayBuffer());
		return buf.byteLength > 500 ? { buf, ext: 'mp3' } : null;
	} catch {
		return null;
	}
}

const clipCache = new Map();

/**
 * A clip already on disk, unless it is one of the silent ones (see `fromSay`).
 * `.m4a` is read but never written any more — an old cache is full of them, and
 * Anki plays none of them, so they are dropped on sight.
 */
function fromCache(text) {
	for (const ext of ['mp3', 'wav']) {
		const path = join(audioCacheDir, `${text}.${ext}`);
		if (!existsSync(path)) continue;
		if (tooShort(path)) {
			rmSync(path, { force: true });
			continue;
		}
		return { buf: readFileSync(path), ext, source: 'cache' };
	}
	return null;
}

/** One character, from the cache or the CDN — no synthesis. */
async function recordingFor(text) {
	if (clipCache.has(text)) return clipCache.get(text);
	const hit = fromCache(text) ?? (await fromCdn(text));
	const out = hit ? { ...hit, source: hit.source ?? 'cdn' } : null;
	if (out && out.source !== 'cache') {
		writeFileSync(join(audioCacheDir, `${text}.${out.ext}`), out.buf);
	}
	if (out) clipCache.set(text, out);
	return out;
}

/**
 * The clip for one radical, given the characters it could be spoken through,
 * best first.
 *
 * A real recording beats synthesis by a distance, so every candidate is offered
 * to the CDN before anything is synthesized — 104 of the 214 radicals get a
 * recording that way, most of them from the second or third candidate. Only when
 * the CDN has none of them does the first candidate go through TTS.
 */
async function clipFor(candidates) {
	mkdirSync(audioCacheDir, { recursive: true });
	const [primary] = candidates;

	// `--tts say` keeps one voice across all 214 clips; the default prefers the
	// recordings, which is faster and natural but mixes two voices in one deck.
	if (ttsMode !== 'say') {
		for (const candidate of candidates) {
			const hit = await recordingFor(candidate.char);
			if (hit) return { ...hit, ...candidate };
		}
	}

	if (clipCache.has(primary.char)) {
		const hit = clipCache.get(primary.char);
		return hit ? { ...hit, ...primary } : null;
	}
	let got = fromCache(primary.char);
	let source = got ? 'cache' : null;
	for (const step of got ? [] : ['edge-tts', 'say']) {
		got =
			step === 'edge-tts'
				? await fromEdgeTts(primary.char)
				: fromSay(primary.char, join(audioCacheDir, primary.char));
		if (got) {
			source = step;
			break;
		}
	}
	const out = got ? { ...got, source } : null;
	if (out && source !== 'cache') {
		writeFileSync(join(audioCacheDir, `${primary.char}.${out.ext}`), out.buf);
	}
	clipCache.set(primary.char, out);
	return out ? { ...out, ...primary } : null;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const index = JSON.parse(readFileSync(dataFile, 'utf8'));
const radicals = index.radicals.slice(0, limit === Infinity ? undefined : limit);
const strokeData = JSON.parse(readFileSync(strokeFile, 'utf8'));
const subs = JSON.parse(readFileSync(join(root, 'scripts', 'data', 'radical-audio.json'), 'utf8'));

console.log(
	`building ${radicals.length} radicals → ${outDir} (${EDITIONS.join(' + ')})` +
		`${withAudio ? '' : ' (no audio)'}${withImages ? '' : ' (no images)'}`
);

const SQL = await initSqlJs({ locateFile: (f) => join(staticDir, 'data', f) });

// ── Pronunciation, resolved first: the note's Audio field names the very file
//    that ends up in the package, so the clip has to exist before the note, and
//    both editions share the same clips. ─────────────────────────────────────
const clips = new Map(); // radical number -> media file name
const clipBuffers = new Map(); // media file name -> bytes
const spoken = [];
if (withAudio || args['speech-only']) {
	const cedict = new DatabaseSync(cedictPath, { readOnly: true });
	const resolveSpeech = makeSpeechResolver(cedict, subs);
	const speech = radicals.map((r) => ({ radical: r, candidates: resolveSpeech(r) }));
	cedict.close();

	for (const [i, { radical: r, candidates }] of speech.entries()) {
		const clip = await clipFor(candidates);
		if (clip) {
			const name = rd.audioFile(r, clip.ext);
			clipBuffers.set(name, clip.buf);
			clips.set(r.number, name);
		}
		spoken.push({
			radical: r.char,
			number: r.number,
			spoken: clip?.char ?? candidates[0].char,
			why: clip?.why ?? null,
			source: clip?.source ?? null
		});
		if ((i + 1) % 20 === 0) process.stdout.write(`\r  audio ${i + 1}/${radicals.length}   `);
	}

	// The map is committed so the *browser* builder can speak the radicals too:
	// resolving them needs cedict, which the site never loads. It records the
	// character whose clip this build actually found, so the browser asks the CDN
	// for the one file that is known to be there.
	writeFileSync(
		join(staticDir, 'data', 'radicals', 'audio.json'),
		`${JSON.stringify(
			{
				generated: new Date().toISOString().slice(0, 10),
				note: 'radical number -> the character its pronunciation clip is spoken through',
				speak: Object.fromEntries(spoken.map((s) => [s.number, s.spoken]))
			},
			null,
			'\t'
		)}\n`
	);
	console.log('\r  speech map → static/data/radicals/audio.json');

	const tally = (key) =>
		Object.entries(
			spoken.reduce((acc, s) => ({ ...acc, [s[key] ?? 'none']: (acc[s[key] ?? 'none'] ?? 0) + 1 }), {})
		)
			.map(([k, v]) => `${v} ${k}`)
			.join(', ');
	console.log(`  audio: ${clips.size}/${radicals.length} clips via ${tally('source')}`);
	console.log(`         spoken through: ${tally('why')}`);

	// ── The check that used to be missing. A clip is only right if the character
	//    it is spoken through is normally read the way the card says, and if the
	//    file is long enough to hold a syllable. 亅 jué shipped as 脚 "jiǎo" and 14
	//    radicals shipped as unplayable m4a because nothing here said otherwise.
	const wrong = [];
	const silent = [];
	const unplayable = [];
	for (const s of spoken) {
		const r = radicals.find((x) => x.number === s.number);
		const want = resolveSpeech.keyOf(r.pinyin);
		const got = resolveSpeech.readingsOf(s.spoken);
		if (!clips.has(s.number)) {
			silent.push(`${r.char} ${r.pinyin}`);
			continue;
		}
		// The clip is right only if there is no doubt about how the character it
		// says is read: one reading in cedict, or one reading in the HSK list the
		// recordings come from.
		if (got.length && !resolveSpeech.sayable(s.spoken, want)) {
			wrong.push(`${r.char} ${r.pinyin} → ${s.spoken} (${got.join('/')})`);
		}
		const name = clips.get(s.number);
		if (!/\.(mp3|wav|ogg)$/.test(name)) unplayable.push(`${r.char} → ${name}`);
	}
	if (resolveSpeech.rejectedSubs.length) {
		console.log(
			`         ${resolveSpeech.rejectedSubs.length} substitutions in radical-audio.json ignored` +
				` (the character reads differently): ${resolveSpeech.rejectedSubs.slice(0, 4).join(', ')}…`
		);
	}
	for (const [label, list] of [
		['spoken through the wrong reading', wrong],
		['no clip at all', silent],
		['a format Anki does not play', unplayable]
	]) {
		if (list.length) console.log(`  ⚠ ${list.length} ${label}: ${list.join(', ')}`);
	}
	if (wrong.length || unplayable.length) {
		throw new Error('refusing to build: the pronunciation check above failed');
	}
	if (args['speech-only']) process.exit(0);
}
const audioCount = clips.size;

/**
 * Build one edition.
 *
 *   premium — both cards, plus the zdic 字源演变 / 字形对比 glyph rows.
 *   free    — the recognition card only, and no glyph images.
 *
 * Each edition is its own note type (see `rd.modelId`), so a user who imports
 * both keeps two independent decks instead of one silently rewriting the other.
 */
async function buildEdition(edition) {
	const images = withImages && edition === 'premium';
	// Everything on, minus whatever the flags switched off — the released decks
	// are the fullest form of each edition.
	const options = rd.radicalOptions(edition, { audio: withAudio, glyphs: images });

	// One deck and one note type per card type — recognition and writing are
	// separate work, and either should be studyable without the other.
	const parts = options.cards.map((card) => {
		const single = { ...options, cards: [card] };
		const name = rd.radicalDeckName(edition, card);
		return {
			card,
			name,
			model: new Model({
				name: rd.modelName(edition, card),
				id: rd.modelId(edition, card),
				flds: rd.RADICAL_FIELDS.map((f) => ({ name: f })),
				req: rd.radicalReq(single),
				css: rd.radicalCss(options),
				tmpls: rd
					.radicalTemplates(single)
					.map((t) => ({ name: t.name, qfmt: t.qfmt, afmt: t.afmt })),
				// Sort by the Kangxi number so the browser lists a deck in table order.
				sortf: rd.RADICAL_FIELDS.indexOf('Number')
			}),
			deck: new Deck(deckIdFor(name), name)
		};
	});

	const pkg = new Package();
	pkg.setSqlJs(SQL);
	for (const part of parts) pkg.addDeck(part.deck);

	const usedGlyphs = new Set();
	let missingStrokes = 0;

	for (const r of radicals) {
		const strokes = strokeData[r.char];
		if (!strokes) missingStrokes++;
		if (images) {
			for (const g of [...r.evolution, ...r.compare]) usedGlyphs.add(g.file);
		}

		const fields = rd.buildRadicalNote(images ? r : { ...r, evolution: [], compare: [] }, {
			strokeData: strokes ? JSON.stringify(strokes) : '',
			audio: clips.get(r.number) ?? false
		});
		const values = rd.RADICAL_FIELDS.map((f) => fields[f] ?? '');
		for (const part of parts) {
			part.deck.addNote(
				part.model.note(values, rd.radicalTags(r), rd.radicalNoteGuid(r, edition, part.card))
			);
		}
	}

	for (const [name, buf] of clipBuffers) pkg.addMedia(buf, name);

	let glyphCount = 0;
	if (images) {
		if (!existsSync(glyphDir)) fail(`missing ${glyphDir} — run: npm run build:radicals`);
		const onDisk = new Set(readdirSync(glyphDir));
		for (const file of usedGlyphs) {
			if (!onDisk.has(file)) continue;
			pkg.addMedia(readFileSync(join(glyphDir, file)), rd.glyphMedia(file));
			glyphCount++;
		}
	}

	// The stroke engine, under this deck's own media name (`rd.ENGINE_FILE`); the
	// stroke data itself rides in the notes. Checked, not trusted: a deck that
	// ships anything else under that name gives every card a
	// `SyntaxError: Unexpected token '<'` and no animation.
	const engine = readFileSync(join(staticDir, 'data', '_hanzi-writer.min.js'));
	if (!engine.subarray(0, 400).toString('utf8').includes('HanziWriter')) {
		throw new Error('static/data/_hanzi-writer.min.js is not the Hanzi Writer engine');
	}
	pkg.addMedia(engine, rd.ENGINE_FILE);

	const db = new SQL.Database();
	mkdirSync(outDir, { recursive: true });
	const file = deckFile(edition);
	const bytes = await writeApkg(pkg, db, join(outDir, file));
	db.close();

	const cards = radicals.length * parts.length;
	console.log(
		`  ${edition}: ${file} — ${mb(bytes)} MB, ${cards} cards in ${parts.length} decks` +
			`${glyphCount ? `, ${glyphCount} glyph SVGs` : ''}` +
			`${missingStrokes ? `, ${missingStrokes} without stroke data` : ''}`
	);

	return { edition, file, cards, glyphs: glyphCount, bytes };
}

/** genanki's Package#writeToFile, minus the browser download. */
async function writeApkg(p, sqlDb, path) {
	sqlDb.run(APKG_SCHEMA);
	p.write(sqlDb);
	// Card order — see `orderByKangxi` in src/lib/radicalDeck.ts. Shared with the
	// in-browser builder so both decks come out in Kangxi order.
	rd.orderByKangxi(sqlDb);

	const zip = new JSZip();
	zip.file('collection.anki2', new Uint8Array(sqlDb.export()).buffer);
	const media = {};
	p.media.forEach((item, i) => {
		zip.file(String(i), item.data);
		media[i] = item.name;
	});
	zip.file('media', JSON.stringify(media));

	const buf = await zip.generateAsync({
		type: 'nodebuffer',
		compression: 'DEFLATE',
		compressionOptions: { level: 6 }
	});
	writeFileSync(path, buf);
	return buf.byteLength;
}

// ---------------------------------------------------------------------------
// Build + manifest — what the site reads to describe (and link) the decks.
// ---------------------------------------------------------------------------

const built = [];
for (const edition of EDITIONS) built.push(await buildEdition(edition));

const manifest = {
	generated: new Date().toISOString().slice(0, 10),
	tag,
	// The free edition is a release asset; the premium one is sold on Patreon and
	// is never published as a download.
	baseUrl: `https://github.com/krmanik/Anki-xiehanzi/releases/download/${tag}`,
	shop: 'https://www.patreon.com/cw/krmani/shop',
	radicals: radicals.length,
	audio: audioCount,
	editions: Object.fromEntries(
		built.map((b) => [
			b.edition,
			{
				file: b.file,
				cards: b.cards,
				glyphs: b.glyphs,
				bytes: b.bytes,
				premium: b.edition === 'premium',
				features: {
					recognitionCard: true,
					writingCard: true,
					audio: withAudio,
					strokeOrder: true,
					glyphEvolution: b.glyphs > 0,
					// What premium is: the panelled answer and the detail that goes
					// with it. Both card types are free now — the browser builds them.
					panels: b.edition === 'premium',
					wordSense: b.edition === 'premium',
					fieldToggles: b.edition === 'premium'
				}
			}
		])
	),
	options: { audio: withAudio, images: withImages }
};
writeFileSync(
	join(staticDir, 'data', 'radicals', 'deck.json'),
	`${JSON.stringify(manifest, null, '\t')}\n`
);
console.log('manifest → static/data/radicals/deck.json');

if (withAudio && spoken.some((s) => s.why !== 'self')) {
	const swapped = spoken.filter((s) => s.why !== 'self');
	writeFileSync(
		join(audioCacheDir, 'spoken.json'),
		`${JSON.stringify(swapped, null, '\t')}\n`
	);
	console.log(`  ${swapped.length} clips spoken through another character (see spoken.json)`);
}
