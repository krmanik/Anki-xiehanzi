/**
 * Which Anki deck a send lands in, and the reader's send settings. Pure apart
 * from the two localStorage helpers at the bottom.
 *
 * What a send does to a deck follows from how the package is built
 * (`deck.ts`): every `/create` deck has a note type of its own, seeded on the
 * deck's name, and each note's GUID is seeded on that note type and the word.
 * So every word of a send lands in the chosen deck; sending the same deck
 * again **updates its words in place** (cards keep their review history); and
 * the same word in two decks is two notes. The cards are built into a holding
 * deck and moved into the chosen one after the import (`sendPackage`'s
 * `moveTo`), so an existing deck is chosen by name and keeps its description.
 */

/**
 * There is deliberately no "skip the picker" setting: a send can overwrite
 * notes already in the collection, so every Send shows the deck and the
 * warning and waits for a confirm (user ask, 2026-11-06). An `ask` key stored
 * by an earlier build is ignored.
 */
export interface SendPrefs {
	/** Bring Anki to the deck once it is in. */
	openAfter: boolean;
}

export const DEFAULT_SEND_PREFS: SendPrefs = { openAfter: true };
export const SEND_PREFS_KEY = 'xhz.anki.send';

export type Target = { kind: 'new' | 'existing'; name: string };

/** Case-insensitive A→Z, parents before children ("A" < "A::B" < "AB"). */
export function sortDecks(names: string[]): string[] {
	const key = (n: string) => n.toLocaleLowerCase().split('::');
	return [...new Set(names)].sort((a, b) => {
		const ka = key(a);
		const kb = key(b);
		for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
			const c = ka[i].localeCompare(kb[i]);
			if (c) return c;
		}
		return ka.length - kb.length;
	});
}

/** Decks whose name holds every word of the query, in any order. */
export function filterDecks(names: string[], query: string): string[] {
	const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
	if (!terms.length) return names;
	return names.filter((n) => {
		const hay = n.toLocaleLowerCase();
		return terms.every((t) => hay.includes(t));
	});
}

/** `Parent::Child` as the reader sees it in Anki's deck list. */
export const deckLabel = (name: string): string => name.split('::').join(' › ');

/** A deck name as Anki stores it: no space around `::`, no empty level. */
export function cleanDeckName(name: string): string {
	return name
		.split('::')
		.map((p) => p.trim())
		.filter(Boolean)
		.join('::');
}

/** The deck already in Anki by that name (Anki's names are case-insensitive), if any. */
export function findDeck(names: string[], name: string): string | undefined {
	const want = cleanDeckName(name).toLocaleLowerCase();
	return names.find((n) => n.toLocaleLowerCase() === want);
}

/** Start where the page's deck name points: that deck if Anki has it, else a new one by that name. */
export function suggestTarget(deckName: string, names: string[]): Target {
	const hit = findDeck(names, deckName);
	return hit ? { kind: 'existing', name: hit } : { kind: 'new', name: deckName.trim() };
}

/**
 * Resolve the picker's state to the name to build with. A "new" name Anki
 * already has is that existing deck — Anki would merge them anyway, so the
 * note says so rather than promising a new deck.
 */
export function resolveTarget(t: Target, names: string[]): Target {
	if (t.kind === 'existing') return t;
	const hit = findDeck(names, t.name);
	return hit ? { kind: 'existing', name: hit } : { kind: 'new', name: cleanDeckName(t.name) };
}

/**
 * Why this name cannot be sent to, or null. A filtered deck holds no cards of
 * its own and cannot have subdecks; Anki's importer answers by making
 * "Name 1730…" beside it, so it is refused here instead.
 */
export function targetProblem(name: string, filtered: string[]): string | null {
	const parts = cleanDeckName(name).split('::');
	for (let i = 1; i <= parts.length; i++) {
		const hit = findDeck(filtered, parts.slice(0, i).join('::'));
		if (hit) return `“${deckLabel(hit)}” is a filtered deck, which cannot take new cards. Pick another name.`;
	}
	return null;
}

/** One line under the picker: where this send goes. Null when there is no name yet. */
export function targetNote(t: Target): string | null {
	if (!t.name.trim()) return null;
	return t.kind === 'existing' ? `New words go into “${deckLabel(t.name)}”.` : `Makes a new deck “${deckLabel(t.name)}”.`;
}

/**
 * What a send can overwrite, said before it happens. A note whose GUID (this
 * deck's note type + the word) is already in the collection — i.e. this deck was
 * sent before — takes the incoming fields, and the deck's note type takes the
 * incoming card design. Edits made in Anki to those notes or to the card design
 * are lost; scheduling is not part of a note, so reviews stay. Other decks are
 * not touched: each has its own note type.
 */
export const OVERWRITE_WARNING =
	'If this deck was sent before, its words and card design take this version and edits you made in Anki are lost. Reviews and progress are kept.';

/** The same for a prebuilt deck, whose note type is shared by every copy of it. */
export const FIXED_OVERWRITE_WARNING =
	'Words already in this deck take this version and edits you made to them or its card design in Anki are lost. Reviews and progress are kept.';

/** An Anki search for every note in a deck (and its subdecks), the name taken literally. */
export function deckQuery(name: string): string {
	return `deck:"${name.replace(/[\\"*_]/g, (c) => '\\' + c)}"`;
}

/** What the chosen deck holds now, said after `targetNote` (which names it). */
export function heldNote(_name: string, count: number): string {
	return count ? `It already holds ${count.toLocaleString('en')} note${count === 1 ? '' : 's'}.` : 'It is empty.';
}

export function parseSendPrefs(raw: unknown): SendPrefs {
	const o = raw && typeof raw === 'object' ? (raw as Partial<SendPrefs>) : {};
	return {
		openAfter: typeof o.openAfter === 'boolean' ? o.openAfter : DEFAULT_SEND_PREFS.openAfter
	};
}

export function loadSendPrefs(): SendPrefs {
	try {
		return parseSendPrefs(JSON.parse(localStorage.getItem(SEND_PREFS_KEY) ?? 'null'));
	} catch {
		return { ...DEFAULT_SEND_PREFS };
	}
}

export function saveSendPrefs(prefs: SendPrefs): void {
	try {
		localStorage.setItem(SEND_PREFS_KEY, JSON.stringify(prefs));
	} catch {
		/* private mode: the defaults come back next visit */
	}
}

const words = (n: number) => `${n.toLocaleString('en')} word${n === 1 ? '' : 's'}`;

/**
 * What a finished send did, in one line: how many words are new in the deck and
 * how many were already there and updated, and any card type kept because the
 * design dropped it (`noteTypeAlign`). `added` is unknown only when the send
 * could not count it.
 */
/** Said after a send when Anki made duplicate cards (`hasDuplicateCards`). */
export const DUPLICATE_CARDS_NOTE =
	'Anki made duplicate cards (an Anki bug, not your words). In Anki, run Tools → Check Database to delete them.';

export function sentNote(deck: string, total: number, added: number | undefined, kept: string[] = [], duplicates = false): string {
	const where = `“${deckLabel(deck)}”`;
	let line: string;
	if (added === undefined) line = `In Anki now: ${where}.`;
	else if (added >= total) line = `${words(added)} added to ${where}.`;
	else if (added === 0) line = `${where} already had all ${words(total)}: updated in place.`;
	else line = `${words(added)} added to ${where}; ${words(total - added)} already there, updated in place.`;
	if (kept.length) {
		line += ` Card type${kept.length === 1 ? '' : 's'} no longer in this design stay${kept.length === 1 ? 's' : ''} in Anki: ${kept.join(', ')}.`;
	}
	if (duplicates) line += ` ${DUPLICATE_CARDS_NOTE}`;
	return line;
}

/** The note type ids every deck used before each `/create` deck got its own (`DECK_MODELS`). */
export const SHARED_NOTE_TYPE_IDS = ['1969669503', '1969669504'] as const;

/** An Anki search for this deck's notes still on the shared note types. */
export function legacyQuery(deck: string): string {
	return `${deckQuery(deck)} (${SHARED_NOTE_TYPE_IDS.map((id) => `mid:${id}`).join(' OR ')})`;
}

/**
 * Said before sending into a deck that an older version of the site filled:
 * its notes sit on a shared note type, so the deck's own note type adds the
 * words a second time (user choice, 2026-11-06 — accepted once per old deck).
 */
export function legacyNote(count: number): string | null {
	if (!count) return null;
	return `This deck holds ${count.toLocaleString('en')} note${count === 1 ? '' : 's'} from an older version of this site. This send adds its words again; delete the old copies in Anki's browser (note type “Basic - (Anki-xiehanzi)…”).`;
}

/** Said before sending a prebuilt deck whose shared note type Anki holds in another layout. */
export function layoutNote(modelName: string): string {
	return `Your Anki has “${modelName}”, this deck's note type, in an older layout. Anki will skip the words already on it instead of updating them; only new words come in.`;
}
