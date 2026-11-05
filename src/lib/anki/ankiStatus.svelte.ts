/**
 * One AnkiConnect connection state for the whole site, so a status pill, the
 * Export step's "Send to Anki" and the progress chips all agree. Nothing here
 * runs on import: the first `checkAnki()` is what reaches out, because the
 * permission request pops a dialog in Anki and must follow a click.
 */
import { createAnkiConnect, type AnkiConnect, type AnkiStatus } from './ankiConnect';

export const anki = $state<{ status: AnkiStatus | 'idle' | 'checking'; version?: number; error?: string }>({
	status: 'idle'
});

let client: AnkiConnect | null = null;
export function ankiClient(): AnkiConnect {
	return (client ??= createAnkiConnect());
}

let inflight: Promise<AnkiStatus> | null = null;

/**
 * Set once a connect has worked in this browser. Its only use is to let a
 * page check Anki *without* a click: with the origin already on AnkiConnect's
 * list, `requestPermission` answers at once with no dialog, so the page can
 * make "Send to Anki" the main button before the reader asks. Without it no
 * page reaches out on its own — a first connect pops prompts and must follow
 * a click.
 */
const KNOWN_KEY = 'xhz.anki.known';
export function ankiKnown(): boolean {
	try {
		return localStorage.getItem(KNOWN_KEY) === '1';
	} catch {
		return false;
	}
}
function remember(ok: boolean) {
	try {
		if (ok) localStorage.setItem(KNOWN_KEY, '1');
	} catch {
		// Private mode: the reader clicks Send once per visit instead.
	}
}

/** Check quietly if this browser has connected before; otherwise do nothing. */
export function probeAnki(): void {
	if (anki.status === 'idle' && ankiKnown()) void checkAnki();
}

/** Connect (asking permission if needed) and publish the result. Concurrent calls share one request. */
export function checkAnki(): Promise<AnkiStatus> {
	inflight ??= (async () => {
		anki.status = 'checking';
		anki.error = undefined;
		try {
			const r = await ankiClient().connect();
			anki.status = r.status;
			anki.version = r.version;
			remember(r.status === 'ready');
		} catch (e) {
			anki.status = 'unreachable';
			anki.error = (e as Error).message;
		} finally {
			inflight = null;
		}
		return anki.status as AnkiStatus;
	})();
	return inflight;
}

/** What to tell the reader for each state. One line each. */
export const ANKI_STATUS_TEXT: Record<AnkiStatus | 'idle' | 'checking', string> = {
	idle: 'Not checked',
	checking: 'Looking for Anki… Allow it if your browser or Anki asks.',
	unreachable: 'Anki not found. Open Anki with AnkiConnect, allow this site if your browser asks, then try again.',
	denied: 'Anki said no. Allow this site in AnkiConnect, then try again.',
	'needs-key': 'Your AnkiConnect uses an API key, which this site does not support yet.',
	outdated: 'AnkiConnect is out of date. Update it in Tools → Add-ons.',
	ready: 'Connected to Anki'
};
