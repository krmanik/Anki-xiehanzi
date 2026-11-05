/**
 * Which Anki deck a send lands in, and the reader's send settings. Pure apart
 * from the two localStorage helpers at the bottom.
 *
 * What a send does to a deck follows from how the package is built
 * (`deck.ts`): each note's GUID is seeded on the note type and the word, so a
 * word already in the collection is **updated where it is** — its cards keep
 * their deck and their review history — and only new words are added to the
 * chosen deck. Anki matches decks by name on import, so an existing deck is
 * chosen by giving the package that deck's name.
 */

export interface SendPrefs {
	/** Show the deck picker on every Send. Off: Send goes straight to the deck name on the page. */
	ask: boolean;
	/** Bring Anki to the deck once it is in. */
	openAfter: boolean;
}

export const DEFAULT_SEND_PREFS: SendPrefs = { ask: true, openAfter: true };
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

/** The deck already in Anki by that name (Anki's names are case-insensitive), if any. */
export function findDeck(names: string[], name: string): string | undefined {
	const want = name.trim().toLocaleLowerCase();
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
	return hit ? { kind: 'existing', name: hit } : { kind: 'new', name: t.name.trim().replace(/\s*::\s*/g, '::') };
}

/** One line under the picker: what this send will do. Null when there is no name yet. */
export function targetNote(t: Target): string | null {
	if (!t.name.trim()) return null;
	return t.kind === 'existing'
		? `Adds new words to “${deckLabel(t.name)}”. Words already in Anki are updated where they are; reviews are kept.`
		: `Makes a new deck “${deckLabel(t.name)}”. Words already in Anki are updated where they are, not added twice.`;
}

export function parseSendPrefs(raw: unknown): SendPrefs {
	const o = raw && typeof raw === 'object' ? (raw as Partial<SendPrefs>) : {};
	return {
		ask: typeof o.ask === 'boolean' ? o.ask : DEFAULT_SEND_PREFS.ask,
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
