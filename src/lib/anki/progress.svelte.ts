/**
 * The reader's progress, read from Anki once and shared by every page that
 * shows it (the HSK level pages, Home). Pure half: `progress.ts`.
 *
 * Read-only: nothing here writes to the collection. It runs only once Anki is
 * connected (`anki.status === 'ready'`), and refreshes when the tab comes back
 * into view — the reader has most likely just been reviewing in Anki.
 */
import { anki, ankiClient } from './ankiStatus.svelte';
import {
	cacheWords,
	DUE_QUERY,
	LEARNING_QUERY,
	NOTE_CACHE_KEY,
	parseNoteCache,
	staleNotes,
	STUDIED_QUERY,
	updateCache,
	wordStates,
	type NoteCache,
	type WordState
} from './progress';

/** Notes per `notesInfo` request: ~5 KB each, so ~500 KB a request. */
const READ_CHUNK = 100;
/** A tab coming back sooner than this does not re-ask. */
const FRESH_MS = 30_000;

export const progress = $state<{
	status: 'idle' | 'loading' | 'ready' | 'error';
	states: Map<string, WordState>;
	/** Cards due today. */
	due: number;
	/** While notes are being read for the first time: how many of how many. */
	reading?: { done: number; total: number };
	error?: string;
	at?: number;
}>({ status: 'idle', states: new Map(), due: 0 });

function loadCache(profile: string): NoteCache {
	try {
		return parseNoteCache(localStorage.getItem(NOTE_CACHE_KEY), profile);
	} catch {
		return { profile, notes: {} };
	}
}

function saveCache(cache: NoteCache) {
	try {
		localStorage.setItem(NOTE_CACHE_KEY, JSON.stringify(cache));
	} catch {
		// Full or private: the next visit reads the notes again.
	}
}

let inflight: Promise<void> | null = null;

/** Read progress from Anki. Does nothing until Anki is connected; concurrent calls share one read. */
export function loadProgress(force = false): Promise<void> {
	if (anki.status !== 'ready') return Promise.resolve();
	if (!force && progress.status === 'ready' && progress.at && Date.now() - progress.at < FRESH_MS) {
		return Promise.resolve();
	}
	inflight ??= (async () => {
		const client = ankiClient();
		// Only the first read shows a loading state; a refresh keeps the old numbers up.
		if (progress.status !== 'ready') progress.status = 'loading';
		progress.error = undefined;
		try {
			const [profile, studied, learning, due] = await client.multi<unknown>([
				{ action: 'getActiveProfile' },
				{ action: 'findNotes', params: { query: STUDIED_QUERY } },
				{ action: 'findNotes', params: { query: LEARNING_QUERY } },
				{ action: 'findCards', params: { query: DUE_QUERY } }
			]);
			for (const r of [studied, learning, due]) if (r instanceof Error) throw r;
			const studiedIds = studied as number[];
			let cache = loadCache(typeof profile === 'string' ? profile : '');

			const mods = studiedIds.length ? await client.call<unknown[]>('notesModTime', { notes: studiedIds }) : [];
			const stale = staleNotes(studiedIds, mods, cache);
			const read: unknown[] = [];
			for (let i = 0; i < stale.length; i += READ_CHUNK) {
				progress.reading = { done: i, total: stale.length };
				read.push(...(await client.call<unknown[]>('notesInfo', { notes: stale.slice(i, i + READ_CHUNK) })));
			}
			progress.reading = undefined;
			cache = updateCache(cache, studiedIds, read);
			saveCache(cache);

			progress.states = wordStates(cacheWords(cache), studiedIds, learning as number[]);
			progress.due = (due as number[]).length;
			progress.status = 'ready';
			progress.at = Date.now();
		} catch (e) {
			progress.reading = undefined;
			progress.error = (e as Error).message;
			// A failed refresh keeps the numbers already on screen.
			if (progress.status !== 'ready') progress.status = 'error';
		} finally {
			inflight = null;
		}
	})();
	return inflight;
}

/**
 * Refresh whenever the tab comes back into view. Call from a component's
 * `onMount` and return the result, so the listener goes with the page.
 */
export function watchProgress(): () => void {
	const onShow = () => {
		if (document.visibilityState === 'visible') void loadProgress();
	};
	document.addEventListener('visibilitychange', onShow);
	return () => document.removeEventListener('visibilitychange', onShow);
}
