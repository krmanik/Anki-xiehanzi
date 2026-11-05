/**
 * Data layer for the HSK word browser (`/hsk`).
 *
 * Everything is served from the pre-built JSON under `static/data/hsk/`
 * (see `scripts/build-hsk-data.mjs`) so browsing a list never pulls the 10 MB
 * cedict.db that the deck generator needs. Only `loadHskIndex` / `loadHskLevel`
 * touch the network; the rest is pure and unit-tested.
 */

import { base } from '$app/paths';
import { toneDigits, toneOfPinyin } from '$lib/tone';
import { markNumberedPinyin } from '$lib/syllables';

export interface HskReading {
	/** numbered pinyin, e.g. "hao3" */
	p: string;
	/** tone-marked pinyin, e.g. "hǎo" */
	y: string;
	/** zhuyin, e.g. "ㄏㄠˇ" */
	z: string;
	/** sense list for this reading */
	d: string;
}

export interface HskEntry {
	s: string; // simplified
	t: string; // traditional
	p: string; // numbered pinyin of the primary reading
	y: string; // tone-marked pinyin
	z: string; // zhuyin
	m: string; // short meaning
	o?: string[]; // parts of speech
	c?: string[]; // classifiers
	f?: number; // frequency rank (1 = most common)
	q?: number; // corpus frequency count (new HSK lists only)
	r?: HskReading[]; // per-reading definitions, when richer than `m`
}

export interface HskLevelMeta {
	level: string;
	count: number;
	file: string;
}

export interface HskListMeta {
	id: string;
	name: string;
	year: string;
	subtitle: string;
	total: number;
	levels: HskLevelMeta[];
}

export interface HskIndex {
	generated: string;
	lists: HskListMeta[];
}

let indexCache: Promise<HskIndex> | null = null;
const levelCache = new Map<string, Promise<HskEntry[]>>();

/** Metadata for every list and level (cached for the session). */
export function loadHskIndex(): Promise<HskIndex> {
	indexCache ??= fetch(`${base}/data/hsk/index.json`).then((r) => {
		if (!r.ok) throw new Error(`HSK index unavailable (${r.status})`);
		return r.json() as Promise<HskIndex>;
	});
	return indexCache;
}

/** All words of one level, in official list order (cached for the session). */
export function loadHskLevel(listId: string, level: string): Promise<HskEntry[]> {
	const key = `${listId}-${level}`;
	let hit = levelCache.get(key);
	if (!hit) {
		hit = fetch(`${base}/data/hsk/${key}.json`).then((r) => {
			if (!r.ok) throw new Error(`HSK ${listId} level ${level} unavailable (${r.status})`);
			return r.json() as Promise<HskEntry[]>;
		});
		levelCache.set(key, hit);
	}
	return hit;
}

/** "7-9" -> "HSK 7–9" (en dash), "1" -> "HSK 1". */
export function levelLabel(level: string): string {
	return `HSK ${level.replace('-', '–')}`;
}

/** URL-safe level slug used in `/hsk/[list]/[level]`. */
export function levelSlug(level: string): string {
	return level;
}

/** Strip tone marks so "hǎo" matches a typed "hao". */
export function stripTones(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();
}

/** Pinyin without tone marks, digits or spaces — the shape people type. */
function searchablePinyin(entry: HskEntry): string {
	return stripTones(`${entry.y} ${entry.p}`).replace(/[\s:]/g, '');
}

/**
 * Filter by hanzi (simplified or traditional), pinyin (with or without tones
 * and spaces), zhuyin, or meaning text. An empty query keeps everything.
 */
export function filterEntries(entries: HskEntry[], query: string): HskEntry[] {
	const q = query.trim();
	if (!q) return entries;
	const lower = stripTones(q);
	const compact = lower.replace(/[\s:]/g, '');
	return entries.filter(
		(e) =>
			e.s.includes(q) ||
			e.t.includes(q) ||
			e.z.includes(q) ||
			searchablePinyin(e).includes(compact) ||
			stripTones(e.m).includes(lower)
	);
}

export type SortMode = 'list' | 'frequency' | 'pinyin' | 'length';

export const SORT_MODES: { value: SortMode; label: string }[] = [
	{ value: 'list', label: 'Official order' },
	{ value: 'frequency', label: 'Most common first' },
	{ value: 'pinyin', label: 'Pinyin A–Z' },
	{ value: 'length', label: 'Shortest first' }
];

/** Sort a copy of `entries`; unranked words always sort last under 'frequency'. */
export function sortEntries(entries: HskEntry[], mode: SortMode): HskEntry[] {
	const out = [...entries];
	switch (mode) {
		case 'frequency':
			return out.sort((a, b) => (a.f ?? Infinity) - (b.f ?? Infinity));
		case 'pinyin':
			return out.sort((a, b) => stripTones(a.y).localeCompare(stripTones(b.y)));
		case 'length':
			return out.sort((a, b) => [...a.s].length - [...b.s].length || (a.f ?? Infinity) - (b.f ?? Infinity));
		default:
			return out;
	}
}

/** Per-character tone coloring of a word's hanzi. */
export function hanziTones(chars: string, numbered: string): { ch: string; tone: number }[] {
	const tones = toneDigits(numbered);
	return [...chars].map((ch, i) => ({ ch, tone: tones[i] ?? tones[tones.length - 1] ?? 5 }));
}

/**
 * Split tone-marked pinyin into syllables carrying their tone number. Tones come
 * from the numbered pinyin when the syllable counts agree (it is authoritative
 * for neutral tones), and from the tone marks otherwise.
 */
export function pinyinTones(marked: string, numbered: string): { text: string; tone: number }[] {
	const sylls = (marked ?? '').split(/\s+/).filter(Boolean);
	const digits = toneDigits(numbered ?? '');
	const aligned = digits.length === sylls.length;
	return sylls.map((text, i) => ({ text, tone: aligned ? digits[i] : toneOfPinyin(text) }));
}

/** How common a word is, as a coarse band for the UI. */
export function frequencyBand(rank: number | undefined): string {
	if (!rank) return '';
	if (rank <= 500) return 'Top 500';
	if (rank <= 1500) return 'Top 1.5k';
	if (rank <= 5000) return 'Top 5k';
	if (rank <= 10000) return 'Top 10k';
	return 'Rare';
}

/** "個|个[ge4]" -> "个 (ge4)"; plain "位[wei4]" -> "位 (wei4)". */
export function formatClassifier(raw: string): string {
	const m = /^([^|\[]+)(?:\|([^\[]+))?(?:\[([^\]]+)\])?$/.exec(raw.trim());
	if (!m) return raw;
	const hanzi = (m[2] || m[1]).trim();
	return m[3] ? `${hanzi} (${m[3].trim()})` : hanzi;
}

/** Stable row id within a level (a word can be listed under two readings). */
export function entryKey(entry: HskEntry): string {
	return `${entry.s}|${entry.p}`;
}

/**
 * Everything a word-list filter should find a word by, as one string: both
 * scripts, zhuyin, the meaning, and every reading's pinyin with and without
 * spaces — so "fazhan" finds 发展 and "hai" finds 还, whose list reading is
 * huán. Tone marks are left in; the filter strips them.
 */
export function entrySearchText(entry: HskEntry): string {
	const readings = [{ y: entry.y, p: entry.p }, ...(entry.r ?? [])];
	const pinyin = readings.flatMap((r) => [r.y, r.y.replace(/\s+/g, ''), r.p]);
	const senses = (entry.r ?? []).map((r) => r.d);
	return [entry.s, entry.t, entry.z, ...pinyin, entry.m, ...senses].join(' ');
}

const NUMBERED_PINYIN = /^[A-Za-z:üÜ]+[0-5](?:\s+[A-Za-z:üÜ]+[0-5])*$/;

/**
 * A short meaning as a word list prints it: CEDICT's notation read the way the
 * card reads it. Measure words (`CL:片[pian4]`) are dropped — the list shows
 * them separately — and cross references lose the traditional form and get
 * tone marks: `variant of 為|为[wei4]` → `variant of 为 [wèi]`. Plain text, not
 * the deck's HTML (`deckTemplate.formatDefinition`), which must not change.
 */
export function listMeaning(raw: string): string {
	return (raw ?? '')
		.replace(/\bCL:[^;)]*/g, '')
		.replace(/(?:[^\s[\];,()|]+\|)?([^\s[\];,()|]*)\[([^\]]+)\]/g, (match, word: string, inner: string) =>
			NUMBERED_PINYIN.test(inner.trim())
				? `${word ? `${word} ` : ''}[${markNumberedPinyin(inner.trim())}]`
				: match
		)
		.replace(/\(\s*\)/g, '')
		.replace(/;\s*;/g, ';')
		.replace(/^[;\s,]+|[;\s,]+$/g, '')
		.trim();
}

/**
 * The one line a word row prints. Candidates in order; a gloss wrapped in
 * quotes is unwrapped, and cedict's placeholder `#` (了, 龙 …) is skipped for
 * the next candidate instead of being shown as the meaning.
 */
export function rowMeaning(candidates: (string | null | undefined)[]): string {
	for (const raw of candidates) {
		const text = listMeaning((raw ?? '').trim().replace(/^"(.*)"$/s, '$1'));
		if (text && !/^[#\s;|│]+$/.test(text)) return text;
	}
	return '';
}
