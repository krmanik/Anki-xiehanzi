/**
 * The prebuilt Anki decks.
 *
 * `scripts/build-hsk-decks.mjs` builds **one `.apkg` per HSK list** offline —
 * every level in one file, a subdeck per level — and writes
 * `static/data/hsk/decks.json`; the files themselves are GitHub Release assets
 * (too big for the repo). The site reads the manifest to offer a one-click
 * download instead of making every visitor regenerate the same deck in their own
 * browser.
 *
 * A list with no prebuilt deck simply falls back to the deck creator, so the
 * manifest can lag behind the word lists without breaking anything.
 */

import { base } from '$app/paths';

export interface HskDeckEntry {
	list: string;
	/** Release asset filename. */
	file: string;
	words: number;
	/** How many HSK levels are inside, one subdeck each. */
	levels: number;
	/** How many notes carry an audio clip. */
	audio: number;
	bytes: number;
}

export interface HskDeckManifest {
	/** ISO date the decks were built. */
	generated: string;
	/** Release tag holding the assets. */
	tag: string;
	/** Release download URL the filenames hang off. */
	baseUrl: string;
	options: { audio: boolean; examples: boolean };
	decks: HskDeckEntry[];
}

let manifestCache: Promise<HskDeckManifest | null> | null = null;

/**
 * The deck manifest, or null when there is none published yet (a missing file
 * is a normal state, not an error — the UI just hides the download).
 */
export function loadHskDecks(): Promise<HskDeckManifest | null> {
	manifestCache ??= fetch(`${base}/data/hsk/decks.json`)
		.then((r) => (r.ok ? (r.json() as Promise<HskDeckManifest>) : null))
		.then((m) => (m && Array.isArray(m.decks) ? m : null))
		.catch(() => null);
	return manifestCache;
}

/** The prebuilt deck for one word list, if the manifest has one. */
export function findDeck(manifest: HskDeckManifest | null, list: string): HskDeckEntry | null {
	if (!manifest) return null;
	return manifest.decks.find((d) => d.list === list) ?? null;
}

/** Direct download URL of a release asset. */
export function deckUrl(manifest: HskDeckManifest, deck: HskDeckEntry): string {
	return `${manifest.baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(deck.file)}`;
}

/** Human file size — decks run from a few MB to tens of MB. */
export function formatBytes(bytes: number): string {
	if (!bytes || bytes < 0) return '';
	const mb = bytes / 1024 / 1024;
	if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/**
 * One-line summary of what is inside a prebuilt deck.
 *
 * Audio and examples are read off the manifest rather than assumed — a deck can
 * be built with `--no-audio` / `--no-examples` — while stroke practice is in
 * every build, offline, because the deck carries the stroke data itself.
 */
export function deckSummary(manifest: HskDeckManifest, deck: HskDeckEntry): string {
	const parts = [`${deck.words.toLocaleString()} words`];
	if (deck.levels > 0) parts.push(`${deck.levels} levels`);
	if (manifest.options.audio && deck.audio > 0) parts.push('audio');
	if (manifest.options.examples) parts.push('example sentences');
	parts.push('stroke order');
	return parts.join(' · ');
}
