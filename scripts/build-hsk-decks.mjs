/**
 * Pre-builds one ready-to-import `.apkg` per HSK word list, so the site can hand
 * out a direct download instead of making every visitor generate the same deck
 * in their browser (thousands of audio fetches, minutes of waiting).
 *
 *   node scripts/build-hsk-decks.mjs                 # both lists
 *   node scripts/build-hsk-decks.mjs --list old
 *   node scripts/build-hsk-decks.mjs --no-audio --limit 20   # quick smoke test
 *
 * Flags:
 *   --list new|old     only this list
 *   --limit N          first N words per level (testing)
 *   --no-audio         skip the audio field entirely
 *   --no-examples      skip example sentences
 *   --audio-concurrency N   clips in flight (default 48)
 *   --audio-cache DIR  where to keep the clips (default .cache/hsk-audio)
 *   --out DIR          output directory (default dist-decks/)
 *   --tag TAG          release tag the manifest points at
 *   --manifest-only    rewrite the manifest from the files already in --out
 *
 * **One file per list, one note and one card per word**, with a subdeck per HSK
 * level inside it — the successor to the decks `main.ipynb` published, minus
 * their four note types and four subdecks per level. A note carries everything
 * the dictionary computes (common meaning, full definitions, character
 * breakdown, radical, level, frequency, example sentences), plus the recording
 * and the stroke-practice grid.
 *
 * The card is the **app's own design** (`deck.ts` → `deckTemplate.ts`), the same
 * one `/create` exports and the released v2.x decks shipped: the `char-card`
 * hanzi, the control bar, the sidebar of field switches. The premium line's
 * panel design is a separate product; nothing here reads from `premium/`.
 *
 * Output is far too big for git — upload `dist-decks/*.apkg` as GitHub Release
 * assets and commit only `static/data/hsk/decks.json`, which is what the site
 * reads.
 */

import { mkdirSync, readFileSync, writeFileSync, statSync, existsSync, renameSync, rmSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

import { root, staticDir, installFetchShim } from './lib/node-env.mjs';
import { fromSay, tooShort, LAME } from './lib/say.mjs';

installFetchShim();

const { Package, APKG_SCHEMA } = await import('genanki-js');
const JSZip = (await import('jszip')).default;
const deck = await import('../src/lib/deck.ts');
const { cardLayout, noteFields, itemOrder } = await import('./lib/deck-layout.mjs');

const LISTS = {
	new: {
		name: 'New HSK (2025)',
		levels: ['1', '2', '3', '4', '5', '6', '7-9'],
		/** The submodule ships this list's own recordings. */
		audioDir: join(root, 'HSK-3.0-words-list', 'New HSK (2025)', 'Audio')
	},
	old: { name: 'Old HSK (2012)', levels: ['1', '2', '3', '4', '5', '6'], audioDir: null }
};

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

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

const args = parseArgs(process.argv.slice(2));
const outDir = args.out ? resolve(isAbsolute(args.out) ? '/' : root, args.out) : join(root, 'dist-decks');
const withAudio = !args['no-audio'];
const withExamples = !args['no-examples'];
const layoutOpts = { audio: withAudio, examples: withExamples };
const tag = args.tag ?? defaultTag();
const cacheDir = args['audio-cache']
	? resolve(isAbsolute(args['audio-cache']) ? '/' : root, args['audio-cache'])
	: join(root, '.cache', 'hsk-audio');

function defaultTag() {
	const d = new Date();
	return `hsk-decks-${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Audio
//
// `deck.ts`'s own resolver is a browser path: CDN recording, then Edge TTS —
// and Edge TTS is a *browser* API that fails under Node with "the file buffer is
// empty" on every single word, so the words the CDN has never recorded used to
// end up silent behind a screenful of stack traces. This resolver is injected
// instead, and never synthesizes anything it can find a recording for:
//
//   1. the clip cache on disk;
//   2. the HSK submodule's own Audio folder — the same recordings the CDN
//      serves, already checked out, so a full build needs no network at all;
//   3. the CDN, for a word the checkout has not got (the 2012 list has no
//      folder of its own, and shares only part of its words with the 2025 one);
//   4. macOS `say`, the last resort.
// ---------------------------------------------------------------------------

const CDN = 'https://cdn.jsdelivr.net/gh/krmanik/HSK-3.0/New%20HSK%20(2025)/Audio';

/** Anki plays the file the note names, and the note names `cmn-<word>.mp3`. */
const clipPath = (word) => join(cacheDir, `${word}.mp3`);

/**
 * The cache used to be keyed by a hash of the CDN url (it wrapped `fetch`), so
 * move those clips across rather than fetching them all a second time.
 */
function adoptLegacyClip(word) {
	const legacy = join(
		cacheDir,
		createHash('sha1').update(`${CDN}/cmn-${encodeURIComponent(word)}.mp3`).digest('hex') + '.mp3'
	);
	if (!existsSync(legacy)) return false;
	renameSync(legacy, clipPath(word));
	return true;
}

/** The checked-out recording for a word, if this list ships one. */
function fromCheckout(word, audioDir) {
	if (!audioDir) return null;
	const path = join(audioDir, `cmn-${word}.mp3`);
	if (!existsSync(path)) return null;
	const buf = readFileSync(path);
	// A handful of the repo's clips are zero-length placeholders.
	return buf.byteLength > 500 ? buf : null;
}

async function fromCdn(word) {
	// One retry: with many requests in flight a few drop, and falling through to
	// synthesis for those is both slow and worse audio.
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const res = await fetch(`${CDN}/cmn-${encodeURIComponent(word)}.mp3`, {
				signal: AbortSignal.timeout(30000)
			});
			// The CDN says it has no clip for this word — retrying won't help.
			if (res.status === 404) return null;
			if (res.ok) {
				const buf = new Uint8Array(await res.arrayBuffer());
				if (buf.byteLength > 500) return buf;
			}
		} catch {
			/* dropped connection — retry once */
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	return null;
}

let spoken = { cache: 0, checkout: 0, cdn: 0, say: 0, none: 0 };
let warnedNoLame = false;

/** One word's clip, cached on disk across runs. Returns a Blob or null. */
function makeAudioResolver(audioDir) {
	return async function audioFor(word) {
		const path = clipPath(word);

		if (!existsSync(path)) adoptLegacyClip(word);
		if (existsSync(path)) {
			// A valid container holding no speech passes every other check.
			if (tooShort(path)) rmSync(path, { force: true });
			else {
				spoken.cache++;
				return new Blob([readFileSync(path)]);
			}
		}

		const local = fromCheckout(word, audioDir);
		if (local) {
			writeFileSync(path, local);
			spoken.checkout++;
			return new Blob([local]);
		}

		const recorded = await fromCdn(word);
		if (recorded) {
			writeFileSync(path, recorded);
			spoken.cdn++;
			return new Blob([recorded]);
		}

		// No recording exists anywhere. `say` needs no network and, unlike Edge
		// TTS, works under Node — but the note names an .mp3, so without an
		// encoder its WAV is no use and the word stays silent.
		if (!LAME) {
			if (!warnedNoLame) {
				warnedNoLame = true;
				console.warn('\n  no `lame` on PATH — words with no recording stay silent');
			}
			spoken.none++;
			return null;
		}
		const said = fromSay(word, join(cacheDir, word));
		if (said?.ext === 'mp3') {
			spoken.say++;
			return new Blob([said.buf]);
		}
		rmSync(join(cacheDir, `${word}.wav`), { force: true });
		spoken.none++;
		return null;
	};
}

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

function levelLabel(level) {
	return level === '7-9' ? 'HSK 7-9' : `HSK ${level}`;
}

function listSlug(listId) {
	return listId === 'new' ? 'New-HSK-2025' : 'Old-HSK-2012';
}

/** One file per list — a filename that survives a URL untouched. */
function fileName(listId) {
	return `Anki-xiehanzi-${listSlug(listId)}.apkg`;
}

/** Anki nests on `::`, so the one import builds a tidy level tree. */
function deckName(listId) {
	return `Anki xiehanzi::${LISTS[listId].name}`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function loadLevelWords(listId, level) {
	const file = join(staticDir, 'data', 'hsk', `${listId}-${level}.json`);
	const entries = JSON.parse(readFileSync(file, 'utf8'));
	const words = entries.map((e) => e.s);
	return args.limit ? words.slice(0, Number(args.limit)) : words;
}

/** Blobs are what the browser fetch returns; JSZip in Node wants bytes. */
async function normalizeMedia(pkg) {
	for (const item of pkg.media) {
		if (item.data && typeof item.data.arrayBuffer === 'function') {
			item.data = new Uint8Array(await item.data.arrayBuffer());
		}
	}
}

/** genanki's Package#writeToFile, minus the browser download. */
async function writeApkg(pkg, db, path) {
	db.run(APKG_SCHEMA);
	pkg.write(db);

	const zip = new JSZip();
	zip.file('collection.anki2', new Uint8Array(db.export()).buffer);
	const index = {};
	pkg.media.forEach((item, i) => {
		zip.file(String(i), item.data);
		index[i] = item.name;
	});
	zip.file('media', JSON.stringify(index));

	const buf = await zip.generateAsync({
		type: 'nodebuffer',
		compression: 'DEFLATE',
		compressionOptions: { level: 6 }
	});
	writeFileSync(path, buf);
	return buf.byteLength;
}

/**
 * Build one list's `.apkg`: every level in one file, one subdeck per level.
 *
 * The stroke data ships whole rather than subset to the deck's own characters —
 * see `buildHanziData` in `deck.ts`: both list decks claim the media name
 * `_hanzi-writer-data.json`, and Anki keys media by name across the collection,
 * so two different subsets would have the second import quietly strip
 * characters from the first.
 */
async function buildList(listId) {
	const name = deckName(listId);
	const file = fileName(listId);

	// A word introduced at two levels belongs to the earlier one.
	const levelOf = new Map();
	const words = [];
	for (const level of LISTS[listId].levels) {
		for (const w of loadLevelWords(listId, level)) {
			if (levelOf.has(w)) continue;
			levelOf.set(w, level);
			words.push(w);
		}
	}

	process.stdout.write(`\n${listId}: ${words.length} words\n  looking up…`);

	const looked = [];
	let missing = 0;
	for (const w of words) {
		const record = await deck.lookupWord(w);
		if (!record) {
			missing++;
			continue;
		}
		looked.push(record);
	}
	process.stdout.write(` ${looked.length} ok${missing ? `, ${missing} not in cedict` : ''}\n`);

	const db = await deck.setupSql();
	spoken = { cache: 0, checkout: 0, cdn: 0, say: 0, none: 0 };

	let lastPrint = 0;
	const pkg = await deck.buildDeckPackage({
		words: looked,
		deckName: name,
		deckFor: (word) => `${name}::${levelLabel(levelOf.get(word.Simplified) ?? '1')}`,
		includeAudio: withAudio,
		fields: noteFields(layoutOpts),
		order: itemOrder(layoutOpts),
		tabContent: cardLayout(layoutOpts),
		// The injected resolver owns the CDN lookup, so the browser path's
		// "is this an HSK word?" gate is not consulted.
		hskWordsDict: new Set(),
		getAudio: withAudio ? makeAudioResolver(LISTS[listId].audioDir) : undefined,
		db,
		// No browser to be polite for: the CDN serves ~28 clips/s at this depth,
		// against ~4/s at the in-browser default.
		audioConcurrency: Number(args['audio-concurrency'] ?? 48),
		onProgress: (value) => {
			const pct = Math.floor(value);
			if (pct >= lastPrint + 5) {
				lastPrint = pct;
				process.stdout.write(`\r  media ${pct}%   `);
			}
		}
	});

	await normalizeMedia(pkg);

	mkdirSync(outDir, { recursive: true });
	const bytes = await writeApkg(pkg, db, join(outDir, file));
	const audioFiles = pkg.media.filter((m) => m.name.startsWith('cmn-')).length;
	process.stdout.write(
		`\r  wrote ${file} — ${mb(bytes)} MB, ${audioFiles} audio clips` +
			`${withAudio ? ` (${spoken.cache} cached, ${spoken.checkout} local, ${spoken.cdn} CDN, ${spoken.say} spoken)` : ''}` +
			`${spoken.none > 0 ? `, ${spoken.none} silent` : ''}\n`
	);

	return {
		list: listId,
		file,
		words: looked.length,
		levels: LISTS[listId].levels.length,
		audio: audioFiles,
		bytes
	};
}

function mb(bytes) {
	return (bytes / 1024 / 1024).toFixed(1);
}

// ---------------------------------------------------------------------------
// Manifest — the only build output the site (and git) actually needs.
// ---------------------------------------------------------------------------

const MANIFEST = join(staticDir, 'data', 'hsk', 'decks.json');
const RELEASE_BASE = 'https://github.com/krmanik/Anki-xiehanzi/releases/download';

function writeManifest(decks) {
	const previous = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : null;
	const byList = new Map((previous?.decks ?? []).map((d) => [d.list, d]));
	for (const d of decks) byList.set(d.list, d);

	const manifest = {
		generated: new Date().toISOString().slice(0, 10),
		tag,
		baseUrl: `${RELEASE_BASE}/${tag}`,
		options: { audio: withAudio, examples: withExamples },
		decks: [...byList.values()].sort((a, b) => a.list.localeCompare(b.list))
	};
	writeFileSync(MANIFEST, JSON.stringify(manifest, null, '\t') + '\n');
	console.log(`\nmanifest → static/data/hsk/decks.json (${manifest.decks.length} decks, tag ${tag})`);
}

/** Rebuild the manifest from .apkg files already sitting in --out. */
function manifestFromDisk() {
	const decks = [];
	for (const [listId, list] of Object.entries(LISTS)) {
		const file = fileName(listId);
		const path = join(outDir, file);
		if (!existsSync(path)) continue;
		const words = new Set();
		for (const level of list.levels) for (const w of loadLevelWords(listId, level)) words.add(w);
		decks.push({
			list: listId,
			file,
			words: words.size,
			levels: list.levels.length,
			audio: withAudio ? words.size : 0,
			bytes: statSync(path).size
		});
	}
	return decks;
}

// ---------------------------------------------------------------------------

const targets = Object.keys(LISTS).filter((listId) => !args.list || args.list === listId);

if (!targets.length) {
	console.error('build-hsk-decks: nothing matches --list');
	process.exit(1);
}

if (args['manifest-only']) {
	writeManifest(manifestFromDisk());
	process.exit(0);
}

if (withAudio) mkdirSync(cacheDir, { recursive: true });

console.log(
	`building ${targets.length} deck(s) → ${outDir}` +
		`${withAudio ? '' : ' (no audio)'}${withExamples ? '' : ' (no examples)'}`
);

// cedict + the HSK/YCT meaning glosses — the same warm-up the create page does
// on mount. Without it every SimpleMeaning comes out empty.
await deck.loadDict();

const started = Date.now();
const built = [];
for (const listId of targets) built.push(await buildList(listId));
writeManifest(built);
console.log(`done in ${Math.round((Date.now() - started) / 1000)}s`);
