/**
 * Put an `.apkg` straight into the open Anki, through AnkiConnect, instead of
 * a download the reader then imports by hand.
 *
 * The package is imported **as a package** — never rebuilt from
 * `addNotes`/`createModel`, which cannot set a note's GUID or a note type's
 * id, so a later manual import of the same deck would land as duplicates.
 * Going through the importer keeps both, and a re-send updates in place
 * exactly as a re-import does.
 *
 * Three calls, checked against the add-on's source (`__init__.py`):
 * 1. `storeMediaFile` writes the bytes (base64 `data`) or has Anki fetch them
 *    itself (`url`) into `collection.media`, and returns the name it stored
 *    under — use that, not the one asked for.
 * 2. `importPackage` runs the legacy `AnkiPackageImporter(col, path)` and
 *    resolves `path` against Anki's working directory, so it is given an
 *    absolute path built from `getMediaDirPath`.
 * 3. `deleteMediaFile` moves the package to the media trash. It runs even when
 *    the import fails, so a failed send leaves nothing in the collection.
 *
 * Pure apart from the injected client, so it runs in the node test project.
 */
import type { AnkiConnect } from './ankiConnect';

/** The add-on runs every action on Anki's main thread; a big import blocks it for a while. */
const STORE_TIMEOUT = 5 * 60_000;
const IMPORT_TIMEOUT = 10 * 60_000;

export type SendStage = 'storing' | 'importing' | 'cleaning' | 'done';

export type PackageSource =
	/** Bytes built in the browser (the `/create` deck). */
	| { data: Blob | Uint8Array }
	/** A file Anki downloads itself — the prebuilt release decks, so 55 MB never passes through the page. */
	| { url: string };

export interface SendOptions {
	onStage?: (stage: SendStage) => void;
	/** Defaults to a timestamped name; Anki's Check Media ignores names starting `_`. */
	fileName?: string;
	/**
	 * After the import, bring Anki to this deck's overview (a name) or to the
	 * deck list (`true`), so the reader does not go looking for what arrived.
	 * Best effort: a deck Anki cannot find just leaves Anki where it was.
	 */
	showDeck?: string | true;
}

/**
 * A name for the temporary file in `collection.media`. Leading underscore so
 * Check Media leaves it alone if a send is cut off mid-way; no deck name in it,
 * because a deck name can hold characters a file name cannot.
 */
export function tempPackageName(now = Date.now()): string {
	return `_xhz-import-${now}.apkg`;
}

/** `dir` + `name` with the separator the dir already uses (Windows paths come back with `\`). */
export function joinMediaPath(dir: string, name: string): string {
	const sep = dir.includes('\\') && !dir.includes('/') ? '\\' : '/';
	return dir.endsWith(sep) ? dir + name : dir + sep + name;
}

/** Base64 without a data-URL prefix, in chunks so a 30 MB deck does not blow the argument limit. */
export function toBase64(bytes: Uint8Array): string {
	let out = '';
	const CHUNK = 0x8000;
	for (let i = 0; i < bytes.length; i += CHUNK) {
		out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
	}
	return btoa(out);
}

async function bytesOf(data: Blob | Uint8Array): Promise<Uint8Array> {
	return data instanceof Uint8Array ? data : new Uint8Array(await data.arrayBuffer());
}

/** Store, import, clean up. Throws an `AnkiConnectError` (or the add-on's own message) on failure. */
export async function sendPackage(client: AnkiConnect, source: PackageSource, opts: SendOptions = {}): Promise<void> {
	const stage = opts.onStage ?? (() => {});
	const asked = opts.fileName ?? tempPackageName();

	stage('storing');
	const params: Record<string, unknown> =
		'url' in source ? { filename: asked, url: source.url } : { filename: asked, data: toBase64(await bytesOf(source.data)) };
	const stored = (await client.call<string | null>('storeMediaFile', params, STORE_TIMEOUT)) || asked;

	try {
		const dir = await client.call<string>('getMediaDirPath');
		stage('importing');
		const ok = await client.call<boolean>('importPackage', { path: joinMediaPath(dir, stored) }, IMPORT_TIMEOUT);
		// False means no collection is open (Anki is on the profile picker).
		if (!ok) throw new Error('Anki has no profile open. Open your profile in Anki, then try again.');
	} finally {
		stage('cleaning');
		try {
			await client.call('deleteMediaFile', { filename: stored });
		} catch {
			// The import's own error is the one worth reporting.
		}
	}
	if (opts.showDeck) {
		try {
			const shown =
				typeof opts.showDeck === 'string' && (await client.call<boolean>('guiDeckOverview', { name: opts.showDeck }));
			if (!shown) await client.call('guiDeckBrowser');
		} catch {
			// The deck is in; failing to show it is not worth an error.
		}
	}
	stage('done');
}

/** The reader-facing line for each stage. */
export const SEND_STAGE_TEXT: Record<SendStage, string> = {
	storing: 'Handing the deck to Anki…',
	importing: 'Anki is importing it…',
	cleaning: 'Tidying up…',
	done: 'In Anki now'
};
