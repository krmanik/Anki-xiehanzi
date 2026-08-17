/**
 * Builds the free Kangxi radical `.apkg` in the browser, from `/radicals`.
 *
 * The premium edition is packaged offline (`scripts/build-radical-deck.mjs`)
 * and sold; the free one is generated on demand here, so a reader can pick what
 * goes in it — which cards, audio or not, tone colours or not — instead of
 * downloading one fixed file. Both go through the same pure layout module
 * (`radicalDeck.ts`), so what is unit-tested is what a reader gets.
 *
 * Everything it needs is already static:
 *   data/radicals/index.json     the radicals themselves (the page has them)
 *   data/radicals/strokes.json   stroke data for the 214, ~350 KB
 *   data/radicals/audio.json     which character each radical is spoken through
 *   data/_hanzi-writer.min.js    the stroke engine (packaged as `ENGINE_FILE`)
 * plus one audio clip per radical from the HSK CDN, with Edge TTS behind it.
 */

import { base } from '$app/paths';
import { APKG_SCHEMA, Deck, Model, Package } from 'genanki-js';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import EdgeTTSBrowser from '@kingdanx/edge-tts-browser';

import {
	ENGINE_FILE,
	RADICAL_FIELDS,
	audioFile,
	buildRadicalNote,
	modelId,
	modelName,
	orderByKangxi,
	radicalCss,
	radicalDeckName,
	radicalReq,
	radicalTags,
	radicalNoteGuid,
	radicalTemplates,
	type RadicalDeckOptions
} from './radicalDeck';
import { loadRadicalStrokes, type Radical } from './radicals';

export { radicalDeckName } from './radicalDeck';

/** What the reader sees while it builds. */
export interface RadicalBuildProgress {
	/** 0–100 */
	value: number;
	label: string;
}

export interface BuildRadicalDeckOptions {
	radicals: Radical[];
	options: RadicalDeckOptions;
	deckName?: string;
	onProgress?: (progress: RadicalBuildProgress) => void;
	/** How many clips to fetch at once. */
	audioConcurrency?: number;
	signal?: AbortSignal;
}

export interface RadicalDeckResult {
	blob: Blob;
	fileName: string;
	notes: number;
	cards: number;
	/** Full names of the decks in the package, one per card type. */
	decks: string[];
	/** How many radicals ended up with a pronunciation clip. */
	audio: number;
}

const CDN = 'https://cdn.jsdelivr.net/gh/krmanik/HSK-3.0/New%20HSK%20(2025)/Audio';

/**
 * Deck id seeded on the deck's name (FNV-1a), in Anki's [2^30, 2^31) range —
 * the same scheme `deck.ts` uses, inlined rather than imported because that
 * module drags in jieba, cedict and the segmenter, none of which the radical
 * page has any use for.
 */
export function radicalDeckId(name: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193);
	return ((h >>> 0) % (1 << 30)) + (1 << 30);
}

/** "Anki xiehanzi::Kangxi Radicals (Free)" → "Anki-xiehanzi-Kangxi-Radicals-Free.apkg" */
export function radicalDeckFileName(deckName: string): string {
	const leaf = deckName.split('::').pop() ?? deckName;
	return `Anki-xiehanzi-${leaf.replace(/[()]/g, '').trim().replace(/\s+/g, '-')}.apkg`;
}

let speechCache: Promise<Record<string, string>> | null = null;

/**
 * Which character each radical is spoken through. Most radicals are not words
 * anyone says — 丨 gǔn comes back silent or mangled — so the deck builder
 * resolves a character with the same syllable and tone (丨 → 滚) and commits the
 * mapping; here it is only looked up. The character it names is one the audio CDN
 * was checked to have, where any exists, so most radicals come back as a real
 * recording rather than TTS. A radical missing from the map is spoken as itself.
 */
export function loadRadicalSpeech(): Promise<Record<string, string>> {
	speechCache ??= fetch(`${base}/data/radicals/audio.json`)
		.then((r) => (r.ok ? r.json() : null))
		.then((data) => (data?.speak ?? {}) as Record<string, string>)
		.catch(() => ({}));
	return speechCache;
}

/** One clip: the HSK recording if the CDN has that character, else Edge TTS. */
async function fetchClip(text: string, signal?: AbortSignal): Promise<Blob | null> {
	try {
		const res = await fetch(`${CDN}/cmn-${encodeURIComponent(text)}.mp3`, { signal });
		if (res.ok) {
			const blob = await res.blob();
			if (blob.size > 500) return blob;
		}
	} catch {
		/* fall through to TTS */
	}
	if (signal?.aborted) return null;
	try {
		const tts = new EdgeTTSBrowser();
		tts.tts.setVoiceParams({ text, voice: 'zh-CN-XiaoxiaoNeural' });
		const blob = await tts.ttsToFile(`cmn-${text}.mp3`);
		return blob && blob.size > 500 ? blob : null;
	} catch {
		return null;
	}
}

const aborted = (signal?: AbortSignal) => {
	if (signal?.aborted) throw new DOMException('Deck build cancelled', 'AbortError');
};

/**
 * Build the deck. Progress runs 0 → 100 across the three slow parts: the stroke
 * data, the audio (by far the longest), and zipping.
 */
export async function buildRadicalDeck(
	opts: BuildRadicalDeckOptions
): Promise<RadicalDeckResult> {
	const { radicals, options, signal } = opts;
	const onProgress = opts.onProgress ?? (() => {});
	const deckName = opts.deckName ?? radicalDeckName(options.edition);

	onProgress({ value: 2, label: 'Loading stroke data…' });
	const needsStrokes = options.strokeOrder || options.cards.includes('write');
	const strokes = needsStrokes ? await loadRadicalStrokes() : {};
	aborted(signal);

	const SQL = await initSqlJs({ locateFile: () => `${base}/data/sql-wasm.wasm` });
	const db = new SQL.Database();

	/**
	 * One deck — and one note type — per card type: recognition and writing are
	 * different work, and a learner who wants only one of them should be able to
	 * study, suspend or delete it without touching the other.
	 */
	const parts = options.cards.map((card) => {
		const single = { ...options, cards: [card] };
		const name = `${deckName}::${card === 'write' ? 'Write' : 'Recognize'}`;
		return {
			card,
			model: new Model({
				name: modelName(options.edition, card),
				id: modelId(options.edition, card),
				flds: RADICAL_FIELDS.map((f) => ({ name: f })),
				req: radicalReq(single),
				css: radicalCss(options),
				tmpls: radicalTemplates(single).map((t) => ({ name: t.name, qfmt: t.qfmt, afmt: t.afmt })),
				// Sorting on the Kangxi number lists a deck in table order.
				sortf: RADICAL_FIELDS.indexOf('Number')
			}),
			deck: new Deck(radicalDeckId(name), name)
		};
	});

	const pkg = new Package();
	pkg.setSqlJs(db);
	for (const part of parts) pkg.addDeck(part.deck);

	// ── Audio first: the note's Audio field names the file that has to be in the
	//    package, so a clip that never arrives has to be known before the note.
	const clips = new Map<number, Blob>();
	if (options.audio) {
		const speak = await loadRadicalSpeech();
		let done = 0;
		const queue = radicals.slice();
		const concurrency = Math.min(opts.audioConcurrency ?? 8, Math.max(1, queue.length));
		await Promise.all(
			Array.from({ length: concurrency }, async () => {
				for (;;) {
					const r = queue.shift();
					if (!r) return;
					if (signal?.aborted) return;
					const blob = await fetchClip(speak[String(r.number)] || r.char, signal);
					if (blob) clips.set(r.number, blob);
					done++;
					onProgress({
						value: 5 + (done / radicals.length) * 80,
						label: `Recording ${done} of ${radicals.length}…`
					});
				}
			})
		);
		aborted(signal);
	}

	onProgress({ value: 88, label: 'Writing the notes…' });
	for (const r of radicals) {
		const data = strokes[r.char];
		const fields = buildRadicalNote(
			// The zdic glyph images are premium; a free note carries no reference to
			// media the package does not contain.
			options.glyphs ? r : { ...r, evolution: [], compare: [] },
			{
				strokeData: data ? JSON.stringify(data) : '',
				audio: clips.has(r.number) ? audioFile(r) : false
			}
		);
		const values = RADICAL_FIELDS.map((f) => fields[f] ?? '');
		for (const part of parts) {
			part.deck.addNote(
				part.model.note(values, radicalTags(r), radicalNoteGuid(r, options.edition, part.card))
			);
		}
	}

	for (const r of radicals) {
		const blob = clips.get(r.number);
		if (blob) pkg.addMedia(blob, audioFile(r));
	}

	if (needsStrokes) {
		// The cards inject the engine by name (`ENGINE_FILE`). Shipping the deck
		// without it leaves every card asking Anki's media server for the file and
		// getting the 404 *page* back — `SyntaxError: Unexpected token '<'`, and no
		// animation. The card survives that now, but the deck should not ship in
		// that state, and a failed fetch here used to be packaged as an HTML page
		// under the engine's name — so check the bytes, not just the status.
		const res = await fetch(`${base}/data/_hanzi-writer.min.js`);
		const engine = res.ok ? await res.blob() : null;
		const head = engine ? await engine.slice(0, 400).text() : '';
		if (!engine || !head.includes('HanziWriter')) {
			throw new Error('Could not load the stroke engine — try again.');
		}
		pkg.addMedia(engine, ENGINE_FILE);
	}

	onProgress({ value: 92, label: 'Packing the deck…' });
	db.run(APKG_SCHEMA);
	pkg.write(db);
	orderByKangxi(db);

	const zip = new JSZip();
	zip.file('collection.anki2', new Uint8Array(db.export()).buffer);
	const media: Record<number, string> = {};
	// Blobs go in as bytes: JSZip only takes a Blob where it detects browser Blob
	// support, and the offline smoke-test runs this same code under Node.
	const items: { name: string; data: Blob }[] = pkg.media;
	await Promise.all(
		items.map(async (item, i) => {
			zip.file(String(i), await item.data.arrayBuffer());
			media[i] = item.name;
		})
	);
	zip.file('media', JSON.stringify(media));

	const blob = await zip.generateAsync(
		{ type: 'blob', mimeType: 'application/apkg', compression: 'DEFLATE' },
		(meta: { percent: number }) =>
			onProgress({ value: 92 + meta.percent * 0.08, label: 'Packing the deck…' })
	);
	db.close();
	onProgress({ value: 100, label: 'Done' });

	return {
		blob,
		fileName: radicalDeckFileName(deckName),
		notes: radicals.length * parts.length,
		cards: radicals.length * parts.length,
		decks: parts.map((p) => p.deck.name),
		audio: clips.size
	};
}

/** Hand the finished package to the browser as a download. */
export function saveRadicalDeck(result: RadicalDeckResult): void {
	const url = URL.createObjectURL(result.blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = result.fileName;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
