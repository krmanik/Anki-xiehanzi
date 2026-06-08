import { describe, it, expect, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';

// Capture the .apkg blob genanki hands to file-saver instead of "downloading" it.
const h = vi.hoisted(() => ({ saved: null as Blob | null }));
vi.mock('file-saver', () => ({ saveAs: (blob: Blob) => (h.saved = blob) }));

// Browser-only deps that deck.ts imports at module load — stub for node.
vi.mock('@kingdanx/edge-tts-browser', () => ({
	default: class {
		tts = { setVoiceParams() {} };
		async ttsToFile() {
			return new Blob();
		}
	}
}));
vi.mock('jieba-wasm', () => ({ default: async () => {}, cut: () => [] }));

import { generateDeck, type Word } from './deck';
import type { TabContent } from './deckTemplate';

function word(): Word {
	return {
		Simplified: '中国',
		Traditional: '中國',
		Pinyin: 'Zhōng guó',
		Zhuyin: 'ㄓㄨㄥ ㄍㄨㄛˊ',
		Definitions: 'China',
		Syllable: 'Zhong1 guo2',
		SimpleMeaning: 'China',
		commonMeaning: 'China',
		pos: [],
		dominantPos: '',
		classifiers: [],
		level: 'new-1',
		rank: 50,
		readings: [],
		breakdown: [
			{ character: '中', pinyin: 'zhōng', definition: 'middle', radical: '丨', decomposition: '' },
			{ character: '国', pinyin: 'guó', definition: 'country', radical: '囗', decomposition: '' }
		]
	};
}

async function loadSql() {
	const wasmBinary = fs.readFileSync(path.resolve('node_modules/sql.js/dist/sql-wasm.wasm'));
	return initSqlJs({ wasmBinary });
}

describe('generateDeck — real .apkg round-trip', () => {
	it('produces a zip whose embedded SQLite carries the per-card CSS, templates and fields', async () => {
		const SQL = await loadSql();
		const db = new SQL.Database();

		const tabContent: TabContent = {
			'Card 1': {
				front: ['frontSimplified'],
				back: ['backSimplified', 'backPinyin', 'backDefinitions'],
				additional: [],
				// per-card-type override — must surface in the exported model CSS
				elementStyles: { simplified: { color: '#aa0000' }, controlButtons: { order: 95 } }
			}
		};

		await generateDeck({
			words: [word()],
			deckName: 'test-deck',
			includeAudio: false,
			fields: ['Simplified', 'Traditional', 'Pinyin', 'Zhuyin', 'PartOfSpeech', 'SimpleMeaning', 'Definitions'],
			tabContent,
			hskWordsDict: new Set<string>(),
			db,
			template: undefined,
			onProgress: () => {}
		});

		// writeToFile zips asynchronously after generateDeck resolves — wait for it.
		const start = Date.now();
		while (!h.saved && Date.now() - start < 8000) {
			await new Promise((r) => setTimeout(r, 25));
		}
		expect(h.saved, 'apkg blob was produced').toBeTruthy();

		const zip = await JSZip.loadAsync(await h.saved!.arrayBuffer());
		// Anki package structure.
		expect(zip.file('collection.anki2')).toBeTruthy();
		expect(zip.file('media')).toBeTruthy();
		const mediaInfo = JSON.parse(await zip.file('media')!.async('string'));
		expect(typeof mediaInfo).toBe('object');

		// Open the embedded collection and read the note type (model).
		const anki2 = await zip.file('collection.anki2')!.async('uint8array');
		const cdb = new SQL.Database(anki2);
		const res = cdb.exec('SELECT models FROM col');
		const models = JSON.parse(res[0].values[0][0] as string);
		const model: any = Object.values(models)[0];

		// Field list matches the requested apkg fields.
		expect(model.flds.map((f: any) => f.name)).toEqual(
			expect.arrayContaining(['Simplified', 'Pinyin', 'Definitions'])
		);

		// Deck-wide + per-card CSS is present and scoped.
		expect(model.css).toContain('.card-body{display:flex');
		expect(model.css).toContain('.ct0 #char_sim{color:#aa0000 !important;}');
		expect(model.css).toContain('.ct0 .modal-footer1{order:95;}');

		// Templates wrap the body in the per-card flex container.
		expect(model.tmpls[0].afmt).toContain('ct0 card-body');
		expect(model.tmpls[0].qfmt).toContain('ct0 card-body');

		cdb.close();
		db.close();
	}, 20000);

	it('renders breakdown / radical / HSK / frequency values into the note', async () => {
		const SQL = await loadSql();
		const db = new SQL.Database();
		h.saved = null;

		const META = ['Breakdown', 'Radical', 'HskLevel', 'Frequency'];
		const tabContent: TabContent = {
			'Card 1': {
				front: ['frontSimplified'],
				back: META.map((f) => `back${f}`),
				additional: [],
				elementStyles: {}
			}
		};

		await generateDeck({
			words: [word()],
			deckName: 'meta-deck',
			includeAudio: false,
			fields: ['Simplified', ...META],
			tabContent,
			hskWordsDict: new Set<string>(),
			db,
			template: undefined,
			onProgress: () => {}
		});

		const start = Date.now();
		while (!h.saved && Date.now() - start < 8000) {
			await new Promise((r) => setTimeout(r, 25));
		}
		expect(h.saved, 'apkg blob was produced').toBeTruthy();

		const zip = await JSZip.loadAsync(await h.saved!.arrayBuffer());
		const anki2 = await zip.file('collection.anki2')!.async('uint8array');
		const cdb = new SQL.Database(anki2);

		// Model carries the new fields.
		const models = JSON.parse(cdb.exec('SELECT models FROM col')[0].values[0][0] as string);
		const model: any = Object.values(models)[0];
		expect(model.flds.map((f: any) => f.name)).toEqual(expect.arrayContaining(META));

		// The note's stored field values carry the rendered metadata.
		const flds = cdb.exec('SELECT flds FROM notes')[0].values[0][0] as string;
		expect(flds).toContain('bd-char'); // character breakdown chips
		expect(flds).toContain('country'); // 国 gloss
		expect(flds).toContain('radical-chip'); // radical chip
		expect(flds).toContain('囗'); // 国 radical
		expect(flds).toContain('HSK 1'); // level → label
		expect(flds).toContain('Top 100'); // rank 50 → band

		cdb.close();
		db.close();
	}, 20000);
});
