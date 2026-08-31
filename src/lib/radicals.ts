/**
 * Data layer for the Kangxi radical browser (`/radicals`) and the radical deck.
 *
 * Everything is served from the pre-built `static/data/radicals/index.json`
 * (see `scripts/build-radical-data.mjs`) — 214 radicals with their readings,
 * example characters and zdic glyph SVGs, ~600 KB, no dictionary DB involved.
 * Only `loadRadicals` touches the network; the rest is pure and unit-tested.
 */

import { base } from '$app/paths';
import { toneOfPinyin } from '$lib/tone';

export interface RadicalExample {
	/** the example character */
	char: string;
	/** tone-marked pinyin of its teaching reading */
	pinyin: string;
	/** zhuyin of the same reading */
	zhuyin: string;
	/** short English gloss */
	meaning: string;
	/** frequency rank, 1 = most common; null when unranked */
	rank: number | null;
	/** coarse frequency band ("Top 500"), '' when unranked */
	band: string;
}

/** The radical read as an ordinary word, when it is one (水 is, 丨 is not). */
export interface RadicalWord {
	pinyin: string;
	meaning: string;
	rank: number | null;
	band: string;
}

export interface RadicalGlyph {
	/** Chinese label as zdic gives it (甲骨文, 中国大陆, …) */
	script?: string;
	region?: string;
	/** English label for the same thing */
	label: string;
	/** file name under `static/data/radicals/glyphs/` */
	file: string;
}

export interface Radical {
	/** Kangxi number, 1–214 */
	number: number;
	char: string;
	/** combining forms (氵 for 水), never repeating `char` */
	variants: string[];
	/** simplified form, only when cedict confirms the simplification (見 → 见) */
	simplified: string[];
	/**
	 * the traditional form a simplified radical stands in for — Wikipedia's
	 * "(pr. 兒)". Seven radicals: 儿 厂 尸 干 广 气 虫.
	 */
	traditional: string[];
	strokes: number;
	/** English meaning ("moon") */
	meaning: string;
	/** tone-marked pinyin */
	pinyin: string;
	/** zhuyin of the same reading */
	zhuyin: string;
	/** codepoint of the CJK ideograph, e.g. "U+6C34" */
	unicode: string;
	/** the typographic form from Unicode's Kangxi Radicals block (⽔) */
	kangxiForm: string;
	/** what it means as a standalone word, when it is one */
	word: RadicalWord | null;
	/** Chinese teaching name (月字旁) with its pinyin and gloss */
	colloquial: { term: string; pinyin: string; english: string } | null;
	hanviet: string;
	kana: string;
	romaji: string;
	hangul: string;
	romaja: string;
	/** how many characters in common use are filed under it */
	frequency: number;
	examples: RadicalExample[];
	/** 字源演变 — one glyph per script, oldest first */
	evolution: RadicalGlyph[];
	/** 字形对比 — the same glyph as printed in CN/HK/TW/JP/KR */
	compare: RadicalGlyph[];
}

export interface RadicalIndex {
	generated: string;
	count: number;
	sources: { readings: string; glyphs: string | null; examples: string };
	radicals: Radical[];
}

let cache: Promise<RadicalIndex> | null = null;

/** The whole radical table (cached for the session). */
export function loadRadicals(): Promise<RadicalIndex> {
	cache ??= fetch(`${base}/data/radicals/index.json`).then((r) => {
		if (!r.ok) throw new Error(`Radical data unavailable (${r.status})`);
		return r.json() as Promise<RadicalIndex>;
	});
	return cache;
}

/** One character's Hanzi Writer strokes, as the animation needs them. */
export interface StrokeCharacter {
	strokes: string[];
	medians: number[][][];
}

let strokeCache: Promise<Record<string, StrokeCharacter>> | null = null;

/**
 * Stroke data for the radicals and their variant forms (~460 KB, written by
 * `npm run build:radicals`) rather than the 32 MB Hanzi Writer blob. Cached for
 * the session; both the detail panel and the in-browser deck builder read it.
 *
 * The full blob is the fallback for a deployment where `strokes.json` has not
 * been regenerated yet.
 */
export function loadRadicalStrokes(): Promise<Record<string, StrokeCharacter>> {
	strokeCache ??= fetch(`${base}/data/radicals/strokes.json`)
		.then((r) => (r.ok ? r.json() : Promise.reject(new Error(`strokes.json ${r.status}`))))
		.catch(() => fetch(`${base}/data/hanzi-writer-data.json`).then((r) => r.json()));
	return strokeCache;
}

export interface RadicalDeckEdition {
	/** Release asset filename. */
	file: string;
	cards: number;
	glyphs: number;
	bytes: number;
	/** Sold on Patreon rather than downloadable from a release. */
	premium: boolean;
	features: {
		recognitionCard: boolean;
		writingCard: boolean;
		audio: boolean;
		strokeOrder: boolean;
		glyphEvolution: boolean;
		/** the panelled answer layout rather than one running column */
		panels?: boolean;
		/** what the radical means as a standalone word, its zhuyin, its codepoints */
		wordSense?: boolean;
		/** the review sidebar that shows and hides parts of the card */
		fieldToggles?: boolean;
		/** print-ready PDFs: the flashcard deck, the practice sheets, the poster */
		printables?: boolean;
	};
}

export interface RadicalDeckManifest {
	generated: string;
	tag: string;
	/** Release download URL the filenames hang off. */
	baseUrl: string;
	/** Where the premium edition is bought. */
	shop: string;
	/**
	 * The Patreon post for *this* product, when there is one. A shop front makes
	 * a reader hunt for the radical deck among everything else on sale; the post
	 * is the page that actually describes what they are about to buy.
	 */
	post?: string;
	radicals: number;
	audio: number;
	editions: Partial<Record<'free' | 'premium', RadicalDeckEdition>>;
	options: { audio: boolean; images: boolean };
}

let deckCache: Promise<RadicalDeckManifest | null> | null = null;

/**
 * The prebuilt deck's manifest, or null when none is published yet — a missing
 * file is a normal state (the page simply shows no download), not an error.
 */
export function loadRadicalDeck(): Promise<RadicalDeckManifest | null> {
	deckCache ??= fetch(`${base}/data/radicals/deck.json`)
		.then((r) => (r.ok ? (r.json() as Promise<RadicalDeckManifest>) : null))
		.then((m) => (m?.editions ? m : null))
		.catch(() => null);
	return deckCache;
}

const PATREON_SHOP = 'https://www.patreon.com/cw/krmani/shop';

/**
 * Where a deck button goes: the release asset for the free edition, and for the
 * premium one — whose `.apkg` is never published as a release — the post that
 * describes it, falling back to the shop front and then to Patreon itself.
 */
export function radicalDeckUrl(
	manifest: RadicalDeckManifest,
	edition: RadicalDeckEdition
): string {
	if (edition.premium) return manifest.post || manifest.shop || PATREON_SHOP;
	return `${manifest.baseUrl}/${edition.file}`;
}

/**
 * What the premium edition adds over the deck the browser builds for free.
 *
 * The free deck now carries both card types, audio and stroke order — what is
 * bought is the *answer*: the panelled layout, the zdic glyph images, and the
 * detail (word sense, zhuyin, codepoints) the free note type leaves out.
 */
export function premiumExtras(manifest: RadicalDeckManifest | null): string[] {
	const premium = manifest?.editions.premium;
	if (!premium) return [];
	const f = premium.features;
	const extras: string[] = [];
	if (f.panels !== false) {
		extras.push('A panelled answer — every kind of detail in its own labelled card');
	}
	if (f.glyphEvolution) {
		extras.push(
			'How the glyph evolved, from oracle bone to print, and how it is set region by region'
		);
	}
	if (f.wordSense !== false) {
		extras.push('What the radical means as a word of its own, its zhuyin and its codepoints');
	}
	if (f.fieldToggles !== false) {
		extras.push('A sidebar that shows and hides any part of a card, front and back');
	}
	if (f.printables) {
		extras.push(
			'Print-ready PDFs — a two-sided flashcard deck, a practice sheet for every radical, ' +
				'and a poster of all 214'
		);
	}
	extras.push('Prebuilt and kept up to date — nothing to generate');
	return extras;
}

/** URL of one glyph SVG. */
export function glyphUrl(file: string): string {
	return `${base}/data/radicals/glyphs/${file}`;
}

/** Strip tone marks so "yuè" matches a typed "yue". */
export function stripTones(s: string): string {
	return (s ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();
}

/**
 * Filter by radical or variant hanzi, any of the five readings (with or without
 * tone marks), the Chinese teaching name, the English meaning, an example
 * character, or a bare Kangxi number. An empty query keeps everything.
 */
export function filterRadicals(radicals: Radical[], query: string): Radical[] {
	const q = query.trim();
	if (!q) return radicals;
	const lower = stripTones(q);
	const compact = lower.replace(/\s+/g, '');
	const asNumber = /^\d+$/.test(q) ? Number(q) : null;

	return radicals.filter((r) => {
		if (asNumber !== null && r.number === asNumber) return true;
		if (r.char === q || r.variants.includes(q)) return true;
		if (r.simplified.includes(q) || r.traditional.includes(q)) return true;
		if (r.colloquial?.term.includes(q)) return true;
		if (r.kana.includes(q) || r.hangul.includes(q)) return true;
		if (r.examples.some((e) => e.char === q)) return true;
		const haystack = stripTones(
			[r.pinyin, r.meaning, r.hanviet, r.romaji, r.romaja, r.colloquial?.english ?? ''].join(' ')
		).replace(/\s+/g, '');
		return haystack.includes(compact);
	});
}

export type RadicalSort = 'number' | 'strokes' | 'frequency' | 'pinyin';

export const RADICAL_SORTS: { value: RadicalSort; label: string }[] = [
	{ value: 'number', label: 'Kangxi order' },
	{ value: 'strokes', label: 'Stroke count' },
	{ value: 'frequency', label: 'Most productive first' },
	{ value: 'pinyin', label: 'Pinyin A–Z' }
];

/** Sort a copy of `radicals`; Kangxi number is the tiebreak everywhere. */
export function sortRadicals(radicals: Radical[], mode: RadicalSort): Radical[] {
	const out = [...radicals];
	switch (mode) {
		case 'strokes':
			return out.sort((a, b) => a.strokes - b.strokes || a.number - b.number);
		case 'frequency':
			return out.sort((a, b) => b.frequency - a.frequency || a.number - b.number);
		case 'pinyin':
			return out.sort(
				(a, b) => stripTones(a.pinyin).localeCompare(stripTones(b.pinyin)) || a.number - b.number
			);
		default:
			return out.sort((a, b) => a.number - b.number);
	}
}

/** Stroke counts present in the data, ascending — the filter chips. */
export function strokeCounts(radicals: Radical[]): number[] {
	return [...new Set(radicals.map((r) => r.strokes))].sort((a, b) => a - b);
}

/** Tone of a radical's pinyin, for the shared tone palette. */
export function radicalTone(pinyin: string): number {
	return toneOfPinyin(pinyin ?? '');
}

/**
 * How productive a radical is, as a coarse band. The counts run from 0 (乀, 乁)
 * to well over 500 (艹, 氵), so the bands are logarithmic rather than even.
 */
export function productivityBand(frequency: number): string {
	if (frequency >= 300) return 'Very common';
	if (frequency >= 100) return 'Common';
	if (frequency >= 30) return 'Moderate';
	if (frequency >= 5) return 'Uncommon';
	return 'Rare';
}

/**
 * Every form a radical is written in, head form first. This is what a learner
 * has to recognize, so variants and the other side of the simplification —
 * whichever side this radical is on — belong with it.
 */
export function allForms(r: Radical): string[] {
	return [...new Set([r.char, ...r.variants, ...r.simplified, ...r.traditional])];
}

/** "月 · yuè · moon" — a one-line label for lists and page titles. */
export function radicalLabel(r: Radical): string {
	return [r.char, r.pinyin, r.meaning].filter(Boolean).join(' · ');
}

/** Group radicals by stroke count, ascending, for the browse-by-strokes view. */
export function byStrokeCount(radicals: Radical[]): { strokes: number; radicals: Radical[] }[] {
	const groups = new Map<number, Radical[]>();
	for (const r of sortRadicals(radicals, 'number')) {
		const hit = groups.get(r.strokes);
		if (hit) hit.push(r);
		else groups.set(r.strokes, [r]);
	}
	return [...groups.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([strokes, list]) => ({ strokes, radicals: list }));
}
