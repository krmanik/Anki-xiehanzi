/**
 * Hand-off between the HSK browser (`/hsk`) and the deck creator (`/create`).
 *
 * A level can be 5,600 words, far too many for a query string, so the list is
 * parked in sessionStorage and consumed once by WordSourceInput on mount.
 */

export const PENDING_WORDS_KEY = 'xiehanzi:pending-words';

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
}

function parsePending(raw: string | null): PendingWords | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<PendingWords>;
		if (!Array.isArray(parsed?.words) || parsed.words.length === 0) return null;
		return {
			label: String(parsed.label ?? 'word list'),
			words: parsed.words.map(String),
			options: {
				audio: parsed.options?.audio === true,
				examples: parsed.options?.examples === true
			}
		};
	} catch {
		return null;
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
