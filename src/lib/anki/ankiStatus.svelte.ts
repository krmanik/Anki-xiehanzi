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

/** Connect (asking permission if needed) and publish the result. Concurrent calls share one request. */
export function checkAnki(): Promise<AnkiStatus> {
	inflight ??= (async () => {
		anki.status = 'checking';
		anki.error = undefined;
		try {
			const r = await ankiClient().connect();
			anki.status = r.status;
			anki.version = r.version;
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
