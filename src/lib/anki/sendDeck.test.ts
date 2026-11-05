import { describe, expect, it } from 'vitest';
import { AnkiConnectError, createAnkiConnect } from './ankiConnect';
import { joinMediaPath, sendPackage, tempPackageName, toBase64, type SendStage } from './sendDeck';

/** A fake add-on: records each action, answers from `handlers`. */
function fakeAnki(handlers: Record<string, (params: any) => unknown>) {
	const log: { action: string; params: any }[] = [];
	const fetch = (async (_url: string, init: RequestInit) => {
		const { action, params } = JSON.parse(String(init.body));
		log.push({ action, params });
		const h = handlers[action];
		if (!h) return new Response(JSON.stringify({ result: null, error: `unsupported action ${action}` }));
		try {
			return new Response(JSON.stringify({ result: h(params), error: null }));
		} catch (e) {
			return new Response(JSON.stringify({ result: null, error: (e as Error).message }));
		}
	}) as unknown as typeof globalThis.fetch;
	return { client: createAnkiConnect({ fetch }), log };
}

const happy = {
	storeMediaFile: (p: any) => p.filename,
	getMediaDirPath: () => '/Users/me/Anki2/User 1/collection.media',
	importPackage: () => true,
	deleteMediaFile: () => null
};

describe('toBase64', () => {
	it('matches Buffer, across chunk boundaries', () => {
		const bytes = new Uint8Array(70_000).map((_, i) => (i * 31) % 256);
		expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
		expect(toBase64(new Uint8Array())).toBe('');
	});
});

describe('joinMediaPath', () => {
	it('keeps the separator the dir uses', () => {
		expect(joinMediaPath('/a/collection.media', 'x.apkg')).toBe('/a/collection.media/x.apkg');
		expect(joinMediaPath('C:\\Users\\me\\collection.media', 'x.apkg')).toBe('C:\\Users\\me\\collection.media\\x.apkg');
		expect(joinMediaPath('/a/', 'x.apkg')).toBe('/a/x.apkg');
	});
});

describe('tempPackageName', () => {
	it('is underscore-led so Check Media skips it', () => {
		expect(tempPackageName(42)).toBe('_xhz-import-42.apkg');
	});
});

describe('sendPackage', () => {
	it('stores bytes, imports by absolute path, then deletes', async () => {
		const { client, log } = fakeAnki(happy);
		const stages: SendStage[] = [];
		await sendPackage(client, { data: new Uint8Array([1, 2, 3]) }, { fileName: '_t.apkg', onStage: (s) => stages.push(s) });
		expect(log.map((l) => l.action)).toEqual(['storeMediaFile', 'getMediaDirPath', 'importPackage', 'deleteMediaFile']);
		expect(log[0].params).toEqual({ filename: '_t.apkg', data: 'AQID' });
		expect(log[2].params).toEqual({ path: '/Users/me/Anki2/User 1/collection.media/_t.apkg' });
		expect(log[3].params).toEqual({ filename: '_t.apkg' });
		expect(stages).toEqual(['storing', 'importing', 'cleaning', 'done']);
	});

	it('reads a Blob', async () => {
		const { client, log } = fakeAnki(happy);
		await sendPackage(client, { data: new Blob([new Uint8Array([255])]) }, { fileName: '_t.apkg' });
		expect(log[0].params.data).toBe('/w==');
	});

	it('hands Anki a url instead of bytes', async () => {
		const { client, log } = fakeAnki(happy);
		await sendPackage(client, { url: 'https://example.com/d.apkg' }, { fileName: '_t.apkg' });
		expect(log[0].params).toEqual({ filename: '_t.apkg', url: 'https://example.com/d.apkg' });
	});

	it('uses the name Anki stored under', async () => {
		const { client, log } = fakeAnki({ ...happy, storeMediaFile: () => '_t-1.apkg' });
		await sendPackage(client, { data: new Uint8Array([1]) }, { fileName: '_t.apkg' });
		expect(log[2].params.path).toMatch(/\/_t-1\.apkg$/);
		expect(log[3].params).toEqual({ filename: '_t-1.apkg' });
	});

	it('opens the deck in Anki afterwards, falling back to the deck list', async () => {
		const shown = fakeAnki({ ...happy, guiDeckOverview: () => true, guiDeckBrowser: () => null });
		await sendPackage(shown.client, { data: new Uint8Array([1]) }, { showDeck: 'My words' });
		expect(shown.log.slice(-1)[0]).toEqual({ action: 'guiDeckOverview', params: { name: 'My words' } });

		const missing = fakeAnki({ ...happy, guiDeckOverview: () => false, guiDeckBrowser: () => null });
		await sendPackage(missing.client, { data: new Uint8Array([1]) }, { showDeck: 'Gone' });
		expect(missing.log.at(-1)?.action).toBe('guiDeckBrowser');

		// An add-on without the gui actions still reports success.
		const old = fakeAnki(happy);
		await expect(sendPackage(old.client, { data: new Uint8Array([1]) }, { showDeck: true })).resolves.toBeUndefined();
	});

	it('still deletes the file when the import fails, and reports the import error', async () => {
		const { client, log } = fakeAnki({
			...happy,
			importPackage: () => {
				throw new Error('bad zip');
			}
		});
		await expect(sendPackage(client, { data: new Uint8Array([1]) })).rejects.toThrow('bad zip');
		expect(log.at(-1)?.action).toBe('deleteMediaFile');
	});

	it('says so when no profile is open', async () => {
		const { client } = fakeAnki({ ...happy, importPackage: () => false });
		await expect(sendPackage(client, { data: new Uint8Array([1]) })).rejects.toThrow(/profile/);
	});

	it('does not import when storing fails', async () => {
		const { client, log } = fakeAnki({
			...happy,
			storeMediaFile: () => {
				throw new Error('download failed');
			}
		});
		await expect(sendPackage(client, { url: 'https://x/y' })).rejects.toBeInstanceOf(AnkiConnectError);
		expect(log.map((l) => l.action)).toEqual(['storeMediaFile']);
	});
});
