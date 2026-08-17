/**
 * Pure helpers for the `/dictionary` page — query classification, result
 * ranking, ideographic-description parsing and etymology wording.
 *
 * Nothing here touches sql.js, fetch or the DOM: the database layer lives in
 * `dict/cedict.ts` and the committed character assets in `dict/chardata.ts`,
 * the same split `deckTemplate.ts` has from `deck.ts`.
 */

/** A search result row, whatever the query looked like. */
export interface SearchHit {
	simplified: string;
	traditional: string;
	/** numbered pinyin as stored, e.g. "ni3 hao3" */
	syllables: string;
	/** tone-marked pinyin, e.g. "nǐ hǎo" */
	pinyin: string;
	meaning: string;
	rank: number | null;
	level: string | null;
	/** how the row matched, for the "matched on" hint in the list */
	via: 'hanzi' | 'pinyin' | 'english';
	score: number;
}

/**
 * What the reader typed. `both` is the honest answer for a latin run that is
 * spellable in pinyin *and* a plausible English word — "love" is lo + ve, "man"
 * is a syllable, "he" is a syllable. Guessing one of them is what makes a
 * dictionary feel broken, so `both` is searched both ways and the scores decide.
 */
export type QueryKind = 'hanzi' | 'pinyin' | 'english' | 'both' | 'empty';

const CJK = /[㐀-䶿一-鿿豈-﫿⺀-⿟㇀-㇯]/;

/** Does the string hold at least one CJK character (radicals and strokes count)? */
export function hasHanzi(s: string): boolean {
	return CJK.test(s ?? '');
}

/** Every CJK character in the string, in order, duplicates kept. */
export function hanziOf(s: string): string[] {
	return [...(s ?? '')].filter((c) => CJK.test(c));
}

/**
 * A pinyin-looking query is latin letters, optionally with tone marks, tone
 * digits, spaces or apostrophes, and no character that only English uses.
 * "hao3", "nǐ hǎo", "ni'hao" are pinyin; "hello world" is not, because `world`
 * is not spellable in pinyin syllables.
 */
const PINYIN_SYLLABLE =
	/^(?:[bpmfdtnlgkhjqxrzcsyw]|zh|ch|sh)?(?:i|u|ü|v|a|o|e|ai|ei|ao|ou|an|en|ang|eng|ong|er|ia|ie|iao|iu|iou|ian|in|iang|ing|iong|ua|uo|uai|ui|uei|uan|un|uen|uang|ueng|üe|ve|üan|van|ün|vn|n|ng|m)?[1-5]?$/;

/**
 * Strip tone marks and tone digits, lowercase, drop separators, and write every
 * spelling of ü as `v`.
 *
 * The ü has to be folded *before* the combining marks are stripped: NFD turns ǚ
 * into u + diaeresis + caron, so stripping first silently reads 女 nǚ as "nu"
 * and the word stops being findable by its own pinyin. cedict spells it `u:`,
 * which normalizes here too.
 */
export function normalizePinyin(s: string): string {
	return (s ?? '')
		.normalize('NFD')
		.toLowerCase()
		.replace(/u\u0308/g, 'v') // u + combining diaeresis (ü, ǖ, ǘ, ǚ, ǜ)
		.replace(/u:/g, 'v')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[\s'’·\-]+/g, '')
		.replace(/[1-5]/g, '');
}

/** Is every whitespace-separated run spellable as one or more pinyin syllables? */
function looksLikePinyin(s: string): boolean {
	const parts = (s ?? '')
		.normalize('NFD')
		.toLowerCase()
		.replace(/ü/g, 'v')
		.replace(/[̀-ͯ]/g, '')
		.split(/[\s'’·\-]+/)
		.filter(Boolean);
	if (!parts.length) return false;
	// A single run of letters may be several syllables typed together ("nihao").
	return parts.every((p) => PINYIN_SYLLABLE.test(p) || splitSyllables(p) !== null);
}

const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];
const FINALS = [
	'iang', 'iong', 'uang', 'ueng', 'ang', 'eng', 'ong', 'iao', 'ian', 'ing', 'uai', 'uan', 'uen', 'van',
	'ai', 'ei', 'ao', 'ou', 'an', 'en', 'er', 'ia', 'ie', 'iu', 'in', 'ua', 'uo', 'ui', 'un', 've', 'vn',
	'a', 'o', 'e', 'i', 'u', 'v', 'n', 'm'
];

/**
 * Greedily split a run of letters into pinyin syllables, e.g. "nihao" →
 * ["ni","hao"]. Returns null when the run cannot be spelled in pinyin, which is
 * what tells an English query from a pinyin one.
 */
export function splitSyllables(run: string): string[] | null {
	const s = run.toLowerCase();
	if (!s) return null;
	const out: string[] = [];
	let i = 0;
	while (i < s.length) {
		let matched = '';
		for (const ini of ['', ...INITIALS]) {
			if (ini && !s.startsWith(ini, i)) continue;
			for (const fin of FINALS) {
				const syl = ini + fin;
				if (!s.startsWith(syl, i)) continue;
				if (syl.length > matched.length) matched = syl;
			}
		}
		if (!matched) return null;
		out.push(matched);
		i += matched.length;
	}
	return out;
}

/** Does the query carry a tone, as a digit ("hao3") or a mark ("hǎo")? */
export function hasToneMarker(query: string): boolean {
	const q = query ?? '';
	return /[1-5]/.test(q) || /[̀-̌]/.test(q.normalize('NFD'));
}

/** What the user typed: hanzi, pinyin, English, or something that reads as both. */
export function queryKind(query: string): QueryKind {
	const q = (query ?? '').trim();
	if (!q) return 'empty';
	if (hasHanzi(q)) return 'hanzi';
	if (!looksLikePinyin(q)) return 'english';
	// A tone is something only a pinyin typist writes; without one, a spellable
	// run stays ambiguous ("long", "man", "love") and is searched both ways.
	return hasToneMarker(q) ? 'pinyin' : 'both';
}

/** Frequency band label for a cedict rank, same wording the deck uses. */
export function frequencyBand(rank: number | null): string {
	if (rank == null) return '';
	if (rank <= 100) return 'Top 100';
	if (rank <= 500) return 'Top 500';
	if (rank <= 1000) return 'Top 1000';
	if (rank <= 3000) return 'Top 3000';
	if (rank <= 10000) return 'Top 10000';
	return 'Rare';
}

/** HSK level tokens ("new-1,old-2") → display labels (["HSK 1"]). */
export function levelLabels(level: string | null): string[] {
	if (!level) return [];
	const out: string[] = [];
	for (const tok of level.split(',')) {
		const m = /^new-(.+)$/.exec(tok.trim());
		if (m) out.push(`HSK ${m[1]}`);
	}
	return out;
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

/**
 * Commonness score, 0–1, from cedict's frequency rank. Used as the tiebreaker
 * everywhere, so an exact match on a rare word still loses to the common word
 * the reader almost certainly meant.
 */
export function commonness(rank: number | null): number {
	if (rank == null) return 0;
	return 1 / (1 + Math.log10(Math.max(rank, 1)));
}

/**
 * Score a hanzi match: the whole word first, then words starting with the
 * query, then words containing it, each shaded by commonness.
 */
export function scoreHanzi(word: string, query: string, rank: number | null): number {
	const base = word === query ? 300 : word.startsWith(query) ? 200 : word.includes(query) ? 120 : 60;
	// Short words win inside a band — 分 before 分子 before 分子生物学.
	return base - Math.min(word.length, 8) * 3 + commonness(rank) * 40;
}

/** Score a pinyin match on the normalized (toneless, spaceless) forms. */
export function scorePinyin(
	wordPinyin: string,
	queryNorm: string,
	rank: number | null,
	toneExact: boolean
): number {
	const p = normalizePinyin(wordPinyin);
	const base = p === queryNorm ? 300 : p.startsWith(queryNorm) ? 200 : p.includes(queryNorm) ? 120 : 60;
	return base + (toneExact ? 25 : 0) + commonness(rank) * 40;
}

/**
 * Score an English match. A gloss that *is* the query ("love") beats one that
 * merely mentions it ("to fall in love with"), and an early sense beats a late
 * one — cedict packs senses into one slash-joined string, so position matters.
 */
export function scoreEnglish(meaning: string, query: string, rank: number | null): number {
	const m = (meaning ?? '').toLowerCase();
	const q = query.trim().toLowerCase();
	if (!q) return 0;
	const senses = m.split(/[;/]/).map((s) => s.trim());
	const exact = senses.findIndex((s) => s === q || s === `to ${q}` || s === `a ${q}`);
	const starts = senses.findIndex((s) => s.startsWith(q));
	const word = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(m);
	let base = 40;
	if (exact >= 0) base = 300 - Math.min(exact, 6) * 10;
	else if (starts >= 0) base = 200 - Math.min(starts, 6) * 10;
	else if (word) base = 120;
	else if (m.includes(q)) base = 80;
	return base + commonness(rank) * 40;
}

/** Highest score first, then most common, then shortest. */
export function sortHits(hits: SearchHit[]): SearchHit[] {
	return [...hits].sort(
		(a, b) =>
			b.score - a.score ||
			commonness(b.rank) - commonness(a.rank) ||
			a.simplified.length - b.simplified.length ||
			a.simplified.localeCompare(b.simplified)
	);
}

// ---------------------------------------------------------------------------
// Ideographic description sequences (the `decomposition` column)
// ---------------------------------------------------------------------------

/** The twelve ideographic description characters and what each arrangement is. */
export const IDS_LABELS: Record<string, string> = {
	'⿰': 'left to right',
	'⿱': 'top to bottom',
	'⿲': 'left to middle to right',
	'⿳': 'top to middle to bottom',
	'⿴': 'full surround',
	'⿵': 'surround from above',
	'⿶': 'surround from below',
	'⿷': 'surround from the left',
	'⿸': 'surround from the upper left',
	'⿹': 'surround from the upper right',
	'⿺': 'surround from the lower left',
	'⿻': 'overlaid'
};

/** Structure label for a decomposition string, or '' when it has no IDC. */
export function structureLabel(decomposition: string): string {
	for (const ch of decomposition ?? '') {
		if (IDS_LABELS[ch]) return IDS_LABELS[ch];
	}
	return '';
}

/**
 * The component characters of a decomposition, in order: the IDC symbols and
 * makemeahanzi's `？` placeholder for an unnamed part are dropped, and so is the
 * character itself (an atomic glyph decomposes to itself).
 */
export function componentsOf(decomposition: string, self = ''): string[] {
	return [...(decomposition ?? '')].filter(
		(c) => !IDS_LABELS[c] && c !== '？' && c !== '?' && c !== self
	);
}

/** One sentence describing how the parts sit, for the structure card. */
export function describeStructure(decomposition: string, self = ''): string {
	const label = structureLabel(decomposition);
	const parts = componentsOf(decomposition, self);
	if (!label) return '';
	if (parts.length < 2) return `Written ${label}.`;
	return `Written ${label}: ${parts.join(' + ')}.`;
}

// ---------------------------------------------------------------------------
// Etymology
// ---------------------------------------------------------------------------

/** One character's etymology, as stored in `static/data/dict/etymology.json`. */
export interface Etymology {
	/** 'pictographic' | 'ideographic' | 'pictophonetic' */
	t?: string;
	/** free-text hint, e.g. "Pieces 八 divided with a knife 刀" */
	h?: string;
	/** the sound-bearing component (pictophonetic only) */
	p?: string;
	/** the meaning-bearing component (pictophonetic only) */
	s?: string;
}

/** What a component contributes, when the etymology says so. */
export type ComponentRole = 'semantic' | 'phonetic' | null;

export function componentRole(component: string, ety: Etymology | null | undefined): ComponentRole {
	if (!ety) return null;
	if (ety.s && ety.s === component) return 'semantic';
	if (ety.p && ety.p === component) return 'phonetic';
	return null;
}

/** Reader-facing name for the character-formation type. */
export function etymologyTypeLabel(type: string | undefined): string {
	switch (type) {
		case 'pictographic':
			return 'Pictograph';
		case 'ideographic':
			return 'Ideograph';
		case 'pictophonetic':
			return 'Semantic-phonetic';
		default:
			return type ? type[0].toUpperCase() + type.slice(1) : '';
	}
}

/** One line explaining the type, so the chip is not jargon on its own. */
export function etymologyTypeBlurb(type: string | undefined): string {
	switch (type) {
		case 'pictographic':
			return 'A picture of the thing it means.';
		case 'ideographic':
			return 'The parts together show the idea.';
		case 'pictophonetic':
			return 'One part gives the meaning, the other the sound.';
		default:
			return '';
	}
}

// ---------------------------------------------------------------------------
// Strokes
// ---------------------------------------------------------------------------

/** A stroke type from `static/data/dict/stroke-types.json`. */
export interface StrokeType {
	glyph: string;
	abbr: string;
	romanization: string;
	unicode: string;
}

/**
 * Pair a character's ordered stroke names with their type entries. A name with
 * no entry still comes through, so the sequence is never short a stroke.
 */
export function strokeSequence(
	names: string[] | undefined,
	types: Record<string, StrokeType>
): { name: string; type: StrokeType | null }[] {
	return (names ?? []).map((name) => ({ name, type: types[name] ?? null }));
}

// ---------------------------------------------------------------------------
// Readings
// ---------------------------------------------------------------------------

/**
 * Put the reading a learner means first.
 *
 * cedict's `pinyin` array is **not** ordered by commonness — 分 lists fèn before
 * fēn, 女 lists rǔ before nǚ — so taking element 0 as "the" reading colours the
 * headword by the rare one. The richest sense list is the best signal available
 * without a second data source: a word's common reading is the one the
 * dictionary spends its definitions on.
 *
 * Display only. `lookup()` keeps cedict's own order, because the deck's field
 * output is built from it and must not drift.
 */
export function orderReadings<T extends { definition: string }>(readings: T[]): T[] {
	return [...(readings ?? [])]
		.map((r, i) => ({ r, i, weight: (r.definition ?? '').length }))
		.sort((a, b) => b.weight - a.weight || a.i - b.i)
		.map((x) => x.r);
}

/**
 * Zhuyin as text. `pinyinzhuyin` separates syllables with a literal `&nbsp;`
 * because its output is meant for a card's innerHTML; printed as text content
 * that is the entity itself ("ㄇY&nbsp;ㄇY").
 */
export function plainZhuyin(zhuyin: string): string {
	return (zhuyin ?? '').replace(/&nbsp;|&#160;|&#xa0;/gi, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * A reading's definition split into senses. cedict keeps the measure word in
 * the sense list as `CL:個|个[ge4]`; the entry prints classifiers on their own
 * row, so it is dropped here rather than shown as a numbered meaning.
 */
export function senses(definition: string): string[] {
	return (definition ?? '')
		.split(';')
		.map((d) => d.trim())
		.filter((d) => d && !/^CL:/i.test(d));
}
