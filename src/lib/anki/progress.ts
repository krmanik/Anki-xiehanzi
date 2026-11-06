/**
 * How far the reader has got with each word, read from their own Anki.
 * Pure: the queries, the note → word cache and the aggregation. The calls
 * themselves are in `progress.svelte.ts`.
 *
 * AnkiConnect has no way to ask for one field of a note: `notesInfo` returns
 * every field whole, ~5 KB a note for the HSK deck, so the 11,000-note
 * collection is ~50 MB. And a per-word field search (`"Simplified:你好"`) is a
 * full scan each — 14 s for one 506-word level, measured. So:
 *
 * 1. Three Anki searches, each ~150 ms, say which notes are studied, which of
 *    those are still learning, and how many cards are due. They return ids only.
 * 2. Only the *studied* notes are ever opened with `notesInfo`, and their word
 *    is cached (`NOTE_CACHE_KEY`, see `NoteCache`), so a visit after the first
 *    opens just the notes studied or edited since.
 * 3. Every word not among the studied notes is "new", whether or not it is in
 *    Anki — not studied is what the reader is asking about.
 *
 * Any note type with a `Simplified` field counts: the HSK decks, `/create`
 * decks, the v2.3 four-note-type decks and premium all carry one, and so do
 * other people's Chinese decks, which is right — the reader knows the word
 * whichever deck taught it.
 */

export type WordState = 'known' | 'learning' | 'new';

/** Anki's own line between young and mature: a review interval of 21 days. */
export const MATURE_DAYS = 21;

const SCOPE = '"Simplified:_*"';
/** Notes with at least one card in study (not new, not suspended). */
export const STUDIED_QUERY = `${SCOPE} -is:new -is:suspended`;
/** Of those, notes with a card still short of mature (learning cards have interval 0). */
export const LEARNING_QUERY = `${STUDIED_QUERY} prop:ivl<${MATURE_DAYS}`;
/** Cards waiting for today's review. */
export const DUE_QUERY = `${SCOPE} is:due -is:suspended -is:buried`;

export const NOTE_CACHE_KEY = 'xhz.progress.notes';

/** A note id (as a string key) → the word in its `Simplified` field. */
export type NoteWords = Record<string, string>;

/**
 * What is stored: per note, its word and the note's `mod` when it was read.
 * Note ids are **not** unique enough to key on alone — genanki-js numbers its
 * notes 1, 2, 3…, so another profile has a note 1 too, and a deleted id can
 * come back holding another word. Hence the profile name, and `mod`, checked
 * with the cheap `notesModTime` before the cache is trusted.
 */
export interface NoteCache {
	profile: string;
	notes: Record<string, [word: string, mod: number]>;
}

/** The `Simplified` field as text: no markup, no entities that matter, no spaces. */
export function wordOfField(value: string): string {
	return value
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, '')
		.trim();
}

/** A stored cache for this profile, or an empty one (other profile, missing, wrong shape). */
export function parseNoteCache(raw: string | null, profile: string): NoteCache {
	const empty: NoteCache = { profile, notes: {} };
	if (!raw) return empty;
	try {
		const v = JSON.parse(raw);
		if (!v || typeof v !== 'object' || v.profile !== profile || !v.notes || typeof v.notes !== 'object') return empty;
		const notes: NoteCache['notes'] = {};
		for (const [k, e] of Object.entries(v.notes)) {
			if (/^\d+$/.test(k) && Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'number') {
				notes[k] = [e[0], e[1]];
			}
		}
		return { profile, notes };
	} catch {
		return empty;
	}
}

/**
 * The studied notes that must be opened with `notesInfo`: not cached, or
 * changed since (`mods` is `notesModTime`'s reply for `studied`, same order;
 * an empty entry is a note that has gone).
 */
export function staleNotes(studied: readonly number[], mods: readonly unknown[], cache: NoteCache): number[] {
	return studied.filter((id, i) => {
		const hit = cache.notes[String(id)];
		const mod = (mods[i] as { mod?: unknown } | undefined)?.mod;
		return !hit || typeof mod !== 'number' || hit[1] !== mod;
	});
}

/**
 * The cache trimmed to the notes studied now, plus what was just read, so it
 * never outgrows the collection: a note reset to new drops out and is read
 * again if it comes back.
 */
export function updateCache(cache: NoteCache, studied: readonly number[], read: readonly unknown[]): NoteCache {
	const fresh = new Map<string, [string, number]>();
	for (const info of read) {
		const hit = noteWordOf(info);
		if (hit) fresh.set(hit[0], [hit[1], hit[2]]);
	}
	const notes: NoteCache['notes'] = {};
	for (const id of studied) {
		const k = String(id);
		const e = fresh.get(k) ?? cache.notes[k];
		if (e) notes[k] = e;
	}
	return { profile: cache.profile, notes };
}

/** The words of a cache, for `wordStates`. */
export function cacheWords(cache: NoteCache): NoteWords {
	const out: NoteWords = {};
	for (const [k, [w]] of Object.entries(cache.notes)) out[k] = w;
	return out;
}

/** One `notesInfo` reply entry → [note id, word, mod], or null for a note that has gone or has no word. */
export function noteWordOf(info: unknown): [string, string, number] | null {
	if (!info || typeof info !== 'object') return null;
	const n = info as { noteId?: unknown; mod?: unknown; fields?: Record<string, { value?: unknown }> };
	const value = n.fields?.Simplified?.value;
	if (typeof n.noteId !== 'number' || typeof value !== 'string') return null;
	const word = wordOfField(value);
	return word ? [String(n.noteId), word, typeof n.mod === 'number' ? n.mod : 0] : null;
}

/**
 * Each studied word's state. A word can sit in several notes (the v2.3 decks
 * give it four, one per card type), and **learning wins**: a word whose meaning
 * card is mature but whose writing card is not is not known yet. Words absent
 * from the map are new.
 */
export function wordStates(
	words: NoteWords,
	studied: readonly number[],
	learning: readonly number[]
): Map<string, Exclude<WordState, 'new'>> {
	const young = new Set(learning);
	const out = new Map<string, Exclude<WordState, 'new'>>();
	for (const id of studied) {
		const w = words[String(id)];
		if (w === undefined) continue;
		if (young.has(id)) out.set(w, 'learning');
		else if (!out.has(w)) out.set(w, 'known');
	}
	return out;
}

export function stateOf(word: string, states: ReadonlyMap<string, WordState>): WordState {
	return states.get(word) ?? 'new';
}

export interface ProgressCount {
	total: number;
	known: number;
	learning: number;
	new: number;
}

/** Counts for a word list. A word listed twice counts once. */
export function countStates(words: readonly string[], states: ReadonlyMap<string, WordState>): ProgressCount {
	const c: ProgressCount = { total: 0, known: 0, learning: 0, new: 0 };
	for (const w of new Set(words)) {
		c.total++;
		c[stateOf(w, states)]++;
	}
	return c;
}

/** Whole percent, floored, so 599 of 600 never reads "100%". */
export function percent(part: number, total: number): number {
	return total > 0 ? Math.floor((part / total) * 100) : 0;
}

/** A level counts as done once this share of it is known. */
export const LEVEL_DONE = 0.8;

/**
 * Whether a level is behind the reader. Home walks the levels in order and
 * stops at the first that is not — loading only as many as it must.
 */
export function levelDone(count: ProgressCount): boolean {
	return count.total > 0 && count.known / count.total >= LEVEL_DONE;
}

/** Whole-collection totals: distinct words by state, from the state map alone. */
export function totals(states: ReadonlyMap<string, WordState>): { known: number; learning: number } {
	let known = 0;
	let learning = 0;
	for (const s of states.values()) {
		if (s === 'known') known++;
		else if (s === 'learning') learning++;
	}
	return { known, learning };
}
