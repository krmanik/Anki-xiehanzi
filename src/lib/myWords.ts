/**
 * "My words": what a reader has built, kept in this browser.
 *
 * - **Saved decks** — every export or send from `/create` saves its word list
 *   and card settings under the deck's name. The name is the key on purpose:
 *   the deck id hashes the name, so one saved entry is one deck in Anki, and
 *   reopening it and sending again updates that deck in place.
 * - **Draft** — the words on `/create` right now, so closing the tab loses
 *   nothing. Cleared once the deck is saved.
 * - **Word bag** — the dictionary's starred words (`BAG_KEY`, owned by
 *   `/dictionary`; this module only reads, prunes and backs it up).
 *
 * Words are stored as strings and looked up again on reopen: a `Word` carries
 * every field's HTML, and a few thousand of them would not fit in localStorage.
 * Everything here goes through `localStorage` wrapped in try/catch — private
 * mode and cleared site data just mean nothing persists.
 */
import type { TabContent, TemplateOpts } from './deckTemplate';

export const LISTS_KEY = 'xhz.mywords.lists';
export const DRAFT_KEY = 'xhz.mywords.draft';
/** The dictionary's word bag — `/dictionary` writes it. */
export const BAG_KEY = 'xiehanzi:dict-bag';

/** Enough of `/create`'s state to rebuild the same deck. */
export interface DeckSettings {
	includeAudio: boolean;
	tabs: string[];
	tabContent: TabContent;
	order: string[];
	template: TemplateOpts;
}

export interface SavedDeck {
	/** The deck name — also the key. */
	name: string;
	words: string[];
	/** Epoch ms of the last export or send. */
	savedAt: number;
	/** Where the words came from, e.g. "New HSK (2025) · HSK 3". */
	source?: string;
	settings?: DeckSettings;
}

export interface Draft {
	words: string[];
	deckName: string;
	savedAt: number;
	settings?: DeckSettings;
}

export interface Backup {
	app: 'anki-xiehanzi';
	kind: 'my-words';
	version: 1;
	exportedAt: number;
	decks: SavedDeck[];
	bag: string[];
}

// ---------- pure ----------

const strings = (v: unknown): string[] | null =>
	Array.isArray(v) ? [...new Set(v.map(String).map((s) => s.trim()).filter(Boolean))] : null;

/** Card settings, or undefined when any part is missing — a half-restored deck is worse than the default. */
export function parseSettings(v: unknown): DeckSettings | undefined {
	if (!v || typeof v !== 'object') return undefined;
	const s = v as Partial<DeckSettings>;
	const tabContent = s.tabContent as TabContent | undefined;
	if (
		!Array.isArray(s.tabs) ||
		!s.tabs.length ||
		!tabContent ||
		typeof tabContent !== 'object' ||
		!s.tabs.every((t) => Array.isArray(tabContent[t]?.front) && Array.isArray(tabContent[t]?.back)) ||
		!Array.isArray(s.order) ||
		!s.template ||
		typeof s.template !== 'object'
	)
		return undefined;
	return {
		includeAudio: s.includeAudio === true,
		tabs: s.tabs.map(String),
		tabContent,
		order: s.order.map(String),
		template: s.template
	};
}

function parseDeck(v: unknown): SavedDeck | null {
	if (!v || typeof v !== 'object') return null;
	const o = v as Record<string, unknown>;
	const name = typeof o.name === 'string' ? o.name.trim() : '';
	const words = strings(o.words);
	if (!name || !words?.length) return null;
	const deck: SavedDeck = { name, words, savedAt: Number(o.savedAt) || 0 };
	if (typeof o.source === 'string' && o.source) deck.source = o.source;
	const settings = parseSettings(o.settings);
	if (settings) deck.settings = settings;
	return deck;
}

/** Newest first; one entry per name (the newer wins). Bad rows are dropped, not thrown on. */
export function parseDecks(raw: unknown): SavedDeck[] {
	if (!Array.isArray(raw)) return [];
	return mergeDecks([], raw.map(parseDeck).filter((d): d is SavedDeck => !!d));
}

/**
 * Put `incoming` into `decks`: same name → the newer `savedAt` wins. Newest
 * first. A winner with no card settings keeps the loser's — the same deck,
 * just more words.
 */
export function mergeDecks(decks: SavedDeck[], incoming: SavedDeck[]): SavedDeck[] {
	const byName = new Map<string, SavedDeck>();
	for (const d of [...decks, ...incoming]) {
		const had = byName.get(d.name);
		if (!had) byName.set(d.name, d);
		else {
			const [win, lose] = d.savedAt >= had.savedAt ? [d, had] : [had, d];
			byName.set(d.name, win.settings || !lose.settings ? win : { ...win, settings: lose.settings });
		}
	}
	return [...byName.values()].sort((a, b) => b.savedAt - a.savedAt);
}

export function parseDraft(raw: unknown): Draft | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const words = strings(o.words);
	if (!words?.length) return null;
	const draft: Draft = { words, deckName: typeof o.deckName === 'string' ? o.deckName : '', savedAt: Number(o.savedAt) || 0 };
	const settings = parseSettings(o.settings);
	if (settings) draft.settings = settings;
	return draft;
}

export function makeBackup(decks: SavedDeck[], bag: string[], now = Date.now()): Backup {
	return { app: 'anki-xiehanzi', kind: 'my-words', version: 1, exportedAt: now, decks, bag };
}

/** Read a backup file's text. Throws a one-line reason the page can show. */
export function parseBackup(text: string): { decks: SavedDeck[]; bag: string[] } {
	let o: Partial<Backup>;
	try {
		o = JSON.parse(text);
	} catch {
		throw new Error('That file is not a My words backup (not JSON).');
	}
	if (!o || o.kind !== 'my-words') throw new Error('That file is not a My words backup.');
	return { decks: parseDecks(o.decks), bag: strings(o.bag) ?? [] };
}

/** Bag ∪ incoming, keeping the bag's order and appending the rest. */
export function mergeBag(bag: string[], incoming: string[]): string[] {
	return [...new Set([...bag, ...incoming])];
}

/** "6 Nov" this year, "6 Nov 2025" otherwise. */
export function savedDate(ms: number, now = new Date()): string {
	const d = new Date(ms);
	const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
	if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
	return d.toLocaleDateString('en-GB', opts);
}

/** The first few words, for a one-line preview. */
export function wordPreview(words: string[], max = 12): string {
	return words.slice(0, max).join(' ') + (words.length > max ? ' …' : '');
}

// ---------- storage ----------

function read(key: string): unknown {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function write(key: string, value: unknown): void {
	try {
		if (value === null) localStorage.removeItem(key);
		else localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* storage full or disabled — the list simply does not persist */
	}
}

let persistAsked = false;
/** Ask the browser not to evict this site's storage. Once per visit, never awaited. */
function askPersist(): void {
	if (persistAsked) return;
	persistAsked = true;
	try {
		void navigator.storage?.persist?.().catch(() => {});
	} catch {
		/* not offered — fine */
	}
}

export const loadDecks = (): SavedDeck[] => parseDecks(read(LISTS_KEY));
export const storeDecks = (decks: SavedDeck[]): void => write(LISTS_KEY, decks);

/** Save (or update, by name) one deck. Returns the new list. */
export function saveDeck(deck: SavedDeck): SavedDeck[] {
	const next = mergeDecks(loadDecks(), [deck]);
	storeDecks(next);
	askPersist();
	return next;
}

export function deleteDeck(name: string): SavedDeck[] {
	const next = loadDecks().filter((d) => d.name !== name);
	storeDecks(next);
	return next;
}

export const loadDraft = (): Draft | null => parseDraft(read(DRAFT_KEY));
export function saveDraft(draft: Draft | null): void {
	write(DRAFT_KEY, draft && draft.words.length ? draft : null);
	if (draft) askPersist();
}

export const loadBag = (): string[] => strings(read(BAG_KEY)) ?? [];
export const storeBag = (bag: string[]): void => write(BAG_KEY, bag);
