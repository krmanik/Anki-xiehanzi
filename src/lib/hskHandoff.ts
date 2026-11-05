/**
 * Hand-off between the HSK browser (`/hsk`) and the deck creator (`/create`).
 *
 * A level can be 5,600 words, far too many for a query string, so the list is
 * parked in sessionStorage and consumed once by WordSourceInput on mount.
 */

import { parseSettings, type DeckSettings } from './myWords';

export const PENDING_WORDS_KEY = 'xiehanzi:pending-words';

/**
 * Where the creator goes once the words are in. Absent: stay on Words.
 * `export` skips Card style (the default card is what most people want);
 * `send` also presses Send to Anki — the producer's button already said so.
 */
export type PendingThen = 'export' | 'send';

/** Deck features the HSK page can ask the creator to switch on. */
export interface PendingOptions {
	/** Text-to-speech audio field (one clip per word, generated on export). */
	audio: boolean;
	/** Example-sentence field, filled from hsk_sentences.db. */
	examples: boolean;
}

export interface PendingWords {
	/** Human-readable source, e.g. "New HSK (2025) · HSK 3" */
	label: string;
	words: string[];
	options: PendingOptions;
	then?: PendingThen;
	/** Reopening a saved deck: keep its name, so a send updates that deck. */
	deckName?: string;
	/** Reopening a saved deck: its card types, fields and look. */
	settings?: DeckSettings;
}

function parsePending(raw: string | null): PendingWords | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<PendingWords>;
		if (!Array.isArray(parsed?.words) || parsed.words.length === 0) return null;
		const pending: PendingWords = {
			label: String(parsed.label ?? 'word list'),
			words: parsed.words.map(String),
			options: {
				audio: parsed.options?.audio === true,
				examples: parsed.options?.examples === true
			}
		};
		if (parsed.then === 'export' || parsed.then === 'send') pending.then = parsed.then;
		if (typeof parsed.deckName === 'string' && parsed.deckName.trim()) pending.deckName = parsed.deckName;
		const settings = parseSettings(parsed.settings);
		if (settings) pending.settings = settings;
		return pending;
	} catch {
		return null;
	}
}

/**
 * Park a word list for the creator to pick up. Producers: the dictionary's
 * word bag, the rows selected on an HSK level page ("Add to my deck" /
 * "Send to Anki"), and a saved deck reopened from My words.
 */
export function setPendingWords(pending: PendingWords): void {
	try {
		sessionStorage.setItem(PENDING_WORDS_KEY, JSON.stringify(pending));
	} catch {
		/* private mode / storage disabled — the creator simply starts empty */
	}
}

/** Look at the pending list without consuming it. */
export function peekPendingWords(): PendingWords | null {
	try {
		return parsePending(sessionStorage.getItem(PENDING_WORDS_KEY));
	} catch {
		return null;
	}
}

/** Read and clear the pending word list, if any. Safe to call on every mount. */
export function takePendingWords(): PendingWords | null {
	try {
		const pending = parsePending(sessionStorage.getItem(PENDING_WORDS_KEY));
		sessionStorage.removeItem(PENDING_WORDS_KEY);
		return pending;
	} catch {
		return null;
	}
}
