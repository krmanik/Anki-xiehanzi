import { describe, expect, it } from 'vitest';
import { AnkiConnectError, createAnkiConnect } from './ankiConnect';
import JSZip from 'jszip';
import { holdingDeckName, joinMediaPath, sendableDecks, sendPackage, tempPackageName, toBase64, trimPackage, type SendStage } from './sendDeck';

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
		await expect(sendPackage(old.client, { data: new Uint8Array([1]) }, { showDeck: true })).resolves.toEqual({});
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

async function apkg(media: Record<string, string>): Promise<Uint8Array> {
	const zip = new JSZip();
	zip.file('collection.anki2', 'db');
	const index: Record<string, string> = {};
	Object.entries(media).forEach(([name, body], i) => {
		zip.file(String(i), body);
		index[i] = name;
	});
	zip.file('media', JSON.stringify(index));
	return zip.generateAsync({ type: 'uint8array' });
}

describe('trimPackage', () => {
	it('drops the media Anki already has and keeps the rest under their keys', async () => {
		const bytes = await apkg({ '_hanzi-writer-data.json': 'x'.repeat(5000), 'cmn-好.mp3': 'a', 'cmn-新.mp3': 'b' });
		const { bytes: out, dropped } = await trimPackage(bytes, new Set(['_hanzi-writer-data.json', 'cmn-好.mp3', 'other.png']));
		expect(dropped).toEqual(['_hanzi-writer-data.json', 'cmn-好.mp3']);
		const zip = await JSZip.loadAsync(out);
		expect(JSON.parse(await zip.file('media')!.async('string'))).toEqual({ 2: 'cmn-新.mp3' });
		expect(await zip.file('2')!.async('string')).toBe('b');
		expect(zip.file('0')).toBeNull();
		expect(zip.file('collection.anki2')).not.toBeNull();
	});

	it('returns the same bytes when there is nothing to drop', async () => {
		const bytes = await apkg({ 'cmn-新.mp3': 'b' });
		expect((await trimPackage(bytes, new Set(['x']))).bytes).toBe(bytes);
		expect((await trimPackage(new Uint8Array([1, 2, 3]), new Set(['x']))).bytes).toEqual(new Uint8Array([1, 2, 3]));
	});

	it('sendPackage asks Anki what it has and stores the smaller package', async () => {
		const bytes = await apkg({ '_hanzi-writer-data.json': 'x'.repeat(5000), 'cmn-新.mp3': 'b' });
		const { client, log } = fakeAnki({ ...happy, getMediaFilesNames: () => ['_hanzi-writer-data.json'] });
		await sendPackage(client, { data: bytes }, { fileName: '_t.apkg' });
		expect(log[0].action).toBe('getMediaFilesNames');
		const sent = await JSZip.loadAsync(Buffer.from(log[1].params.data, 'base64'));
		expect(Object.values(JSON.parse(await sent.file('media')!.async('string')))).toEqual(['cmn-新.mp3']);
	});

	it('has Anki download a fetchFromUrl file it lacks, and keeps one whose download fails', async () => {
		const bytes = await apkg({ '_hanzi-writer-data.json': 'x'.repeat(5000), '_big.bin': 'y', 'cmn-新.mp3': 'b' });
		const { client, log } = fakeAnki({
			...happy,
			getMediaFilesNames: () => [],
			storeMediaFile: (p: any) => {
				if (p.url?.includes('big')) throw new Error('offline');
				return p.filename;
			}
		});
		await sendPackage(client, { data: bytes }, {
			fileName: '_t.apkg',
			fetchFromUrl: { '_hanzi-writer-data.json': 'https://x/strokes.json', '_big.bin': 'https://x/big' }
		});
		expect(log[1].params).toEqual({ filename: '_hanzi-writer-data.json', url: 'https://x/strokes.json' });
		const pkg = log.find((l) => l.params?.filename === '_t.apkg' && l.params.data)!;
		const sent = await JSZip.loadAsync(Buffer.from(pkg.params.data, 'base64'));
		expect(Object.values(JSON.parse(await sent.file('media')!.async('string'))).sort()).toEqual(['_big.bin', 'cmn-新.mp3']);
	});

	it('sends the package whole when Anki cannot list its media', async () => {
		const bytes = await apkg({ 'cmn-新.mp3': 'b' });
		const { client, log } = fakeAnki(happy);
		await sendPackage(client, { data: bytes }, { fileName: '_t.apkg' });
		expect(log[1].params.data).toBe(toBase64(bytes));
	});
});

describe('sendPackage moveTo', () => {
	const hold = holdingDeckName(1);

	it('moves the cards out of the holding deck, deletes it, and counts the new notes', async () => {
		let moved = false;
		const { client, log } = fakeAnki({
			...happy,
			findNotes: () => (moved ? [] : [1, 2]),
			findCards: () => (moved ? [] : [11, 12, 21]),
			changeDeck: () => {
				moved = true;
				return null;
			},
			deleteDecks: () => null
		});
		const r = await sendPackage(client, { data: new Uint8Array([1]) }, { moveTo: { from: hold, to: 'Lesson 3' } });
		expect(r).toEqual({ added: 2 });
		expect(log.find((l) => l.action === 'changeDeck')!.params).toEqual({ cards: [11, 12, 21], deck: 'Lesson 3' });
		expect(log.find((l) => l.action === 'findCards')!.params.query).toBe('deck:"\\_xhz-incoming-1"');
		const del = log.find((l) => l.action === 'deleteDecks')!;
		expect(del.params).toEqual({ decks: [hold], cardsToo: true });
		// Never delete before the cards are out.
		expect(log.findIndex((l) => l.action === 'deleteDecks')).toBeGreaterThan(log.findIndex((l) => l.action === 'changeDeck'));
	});

	it('never deletes the holding deck while cards are still in it', async () => {
		const { client, log } = fakeAnki({
			...happy,
			findNotes: () => [1],
			findCards: () => [11],
			changeDeck: () => {
				throw new Error('boom');
			},
			deleteDecks: () => null
		});
		await expect(sendPackage(client, { data: new Uint8Array([1]) }, { moveTo: { from: hold, to: 'X' } })).rejects.toThrow('boom');
		expect(log.some((l) => l.action === 'deleteDecks')).toBe(false);
	});

	it('still empties the holding deck when the import throws, and reports the import error', async () => {
		const { client, log } = fakeAnki({
			...happy,
			importPackage: () => {
				throw new Error('bad package');
			},
			findNotes: () => [],
			findCards: () => [],
			deleteDecks: () => null
		});
		await expect(sendPackage(client, { data: new Uint8Array([1]) }, { moveTo: { from: hold, to: 'X' } })).rejects.toThrow('bad package');
		expect(log.some((l) => l.action === 'deleteDecks')).toBe(true);
		expect(log.some((l) => l.action === 'deleteMediaFile')).toBe(true);
	});
});

describe('sendPackage noteType', () => {
	it('counts only notes that were not there before, and reports duplicate cards', async () => {
		let imported = false;
		let moved = false;
		const { client } = fakeAnki({
			...happy,
			importPackage: () => {
				imported = true;
				return true;
			},
			// mid:… → the note type's notes; deck:… → the holding deck
			findNotes: (p: any) =>
				p.query.startsWith('mid:') ? (imported ? [1, 2, 3] : [1, 2]) : moved ? [] : [1, 2, 3],
			findCards: (p: any) =>
				p.query === 'mid:4000000001 card:2' ? [21, 22, 23, 24] : p.query.startsWith('mid:') ? [11, 12, 13] : moved ? [] : [11, 21],
			changeDeck: () => {
				moved = true;
				return null;
			},
			deleteDecks: () => null
		});
		const r = await sendPackage(client, { data: new Uint8Array([1]) }, {
			moveTo: { from: holdingDeckName(1), to: 'L' },
			noteType: '4000000001',
			cardTypes: 2
		});
		// Notes 1 and 2 only got a new card type; 3 is new.
		expect(r).toEqual({ added: 1, duplicates: true });
	});
});

describe('sendableDecks', () => {
	it('sets filtered decks apart', async () => {
		const { client } = fakeAnki({
			deckNames: () => ['Default', 'Filt', 'Gone'],
			multi: (p: any) =>
				p.actions.map((a: any) =>
					a.params.deck === 'Filt'
						? { result: { dyn: 1, name: 'Filt' }, error: null }
						: a.params.deck === 'Gone'
							? { result: false, error: null }
							: { result: { dyn: false }, error: null }
				)
		});
		expect(await sendableDecks(client)).toEqual({ decks: ['Default', 'Gone'], filtered: ['Filt'] });
	});
});
