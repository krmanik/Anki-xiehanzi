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

import { generateDeck, commonReadingIndex, displayReadings, buildNoteFields, renderCardHtml, noteTags, stableNoteGuid, type Word } from './deck';
import { DEFAULT_TEMPLATE, type TabContent } from './deckTemplate';
import type { Reading } from './dict/cedict';

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

describe('most-common reading', () => {
	const readings: Reading[] = [
		{ syllable: 'de5', pinyin: 'de', pinyinPlain: 'de', zhuyin: 'ㄉㄜ˙', definition: 'of' },
		{
			syllable: 'di2',
			pinyin: 'dí',
			pinyinPlain: 'dí',
			zhuyin: 'ㄉㄧˊ',
			definition: 'really and truly; genuine; certain'
		},
		{ syllable: 'di4', pinyin: 'dì', pinyinPlain: 'dì', zhuyin: 'ㄉㄧˋ', definition: 'aim; clear' }
	];

	it('picks the reading with the longest definition', () => {
		expect(commonReadingIndex(readings)).toBe(1);
		expect(commonReadingIndex([])).toBe(0);
	});

	it('displayReadings collapses to the common reading only when asked', () => {
		const w = { ...word(), readings, Pinyin: 'de, dí, dì' } as Word;
		expect(displayReadings(w, false).Pinyin).toBe('de, dí, dì');
		const common = displayReadings(w, true);
		expect(common.Pinyin).toBe('dí');
		expect(common.Zhuyin).toBe('ㄉㄧˊ');
		expect(common.Syllable).toBe('di2');
		expect(common.Definitions).toContain('genuine');
	});
});

describe('exact-match preview', () => {
	const fields = ['Simplified', 'Traditional', 'Pinyin', 'Zhuyin', 'PartOfSpeech', 'SimpleMeaning', 'Definitions'];

	it('buildNoteFields returns per-field HTML matching the export', () => {
		const f = buildNoteFields(word(), DEFAULT_TEMPLATE, []);
		expect(f.Simplified).toBe('中国');
		expect(f.Traditional).toBe('〔中國〕');
		expect(f.Definitions).toContain('meaning-container');
		expect(f.Audio).toBe('[sound:cmn-中国.mp3]');
	});

	it('renderCardHtml inlines the real template, CSS and field values', () => {
		const tabContent: TabContent = {
			'Card 1': { front: ['frontSimplified'], back: ['backSimplified', 'backDefinitions'], additional: [], elementStyles: {} }
		};
		const html = renderCardHtml({
			side: 'back',
			tab: 'Card 1',
			word: word(),
			fields,
			tabContent,
			template: DEFAULT_TEMPLATE,
			includeAudio: false,
			examples: []
		});
		expect(html).toContain('<!DOCTYPE html>');
		expect(html).toContain('class="card"');
		// real card CSS + the per-card model CSS are inlined
		expect(html).toContain('.meaning-card');
		// field placeholders substituted, none left over
		expect(html).toContain('中国');
		expect(html).not.toContain('{{');
		// Persistence shim so the template's init code runs in the iframe
		expect(html).toContain('window.Persistence');
		// Bundled media point at served static files (no broken root-relative _media)
		expect(html).toContain('url(/img/_MaterialIcons-Regular.woff2)');
		expect(html).toContain('src="/img/_pleco.png"');
		expect(html).not.toContain('url(_MaterialIcons-Regular.woff2)');
		expect(html).not.toContain('src="_');
		// Offline loaders the preview can't use are stripped
		expect(html).not.toContain('_anki-persistence.js');
	});
});

describe('note tags', () => {
	it('tags a word by HSK level, part of speech and frequency band', () => {
		const w = { ...word(), level: 'new-1,new-2', dominantPos: 'n', rank: 50 } as Word;
		expect(noteTags(w)).toEqual(['Xiehanzi', 'HSK::1', 'HSK::2', 'POS::Noun', 'Frequency::Top_100']);
	});

	it('omits tags whose data is missing and never emits spaces', () => {
		const w = { ...word(), level: null, dominantPos: '', rank: null } as Word;
		expect(noteTags(w)).toEqual(['Xiehanzi']);
		const multi = { ...word(), level: null, dominantPos: 'ad', rank: 50 } as Word;
		expect(noteTags(multi).every((t) => !/\s/.test(t))).toBe(true);
	});
});

describe('stable note guid', () => {
	it('is deterministic and identity-based, so re-exports update rather than duplicate', () => {
		const a = stableNoteGuid(word(), '1969669503');
		const b = stableNoteGuid({ ...word(), Pinyin: 'changed', SimpleMeaning: 'changed' } as Word, '1969669503');
		// Same Simplified+Traditional → same guid even when other fields change.
		expect(a).toBe(b);
		// Different word or model → different guid.
		expect(stableNoteGuid({ ...word(), Simplified: '美国' } as Word, '1969669503')).not.toBe(a);
		expect(stableNoteGuid(word(), '1969669504')).not.toBe(a);
	});
});

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
		const noteRow = cdb.exec('SELECT flds, tags, guid FROM notes')[0].values[0];
		const flds = noteRow[0] as string;
		// Hierarchical tags + a stable identity guid ride along on the note.
		expect(noteRow[1]).toBe('Xiehanzi HSK::1 Frequency::Top_100');
		expect(noteRow[2]).toBe(stableNoteGuid(word(), '1969669504'));
		expect(flds).toContain('bd-char'); // character breakdown chips
		expect(flds).toContain('country'); // 国 gloss
		expect(flds).toContain('radical-chip'); // radical chip
		expect(flds).toContain('囗'); // 国 radical
		expect(flds).toContain('HSK 1'); // level → label
		expect(flds).toContain('Top 100'); // rank 50 → band

		cdb.close();
		db.close();
	}, 20000);

	it('renders injected smart example sentences into the note', async () => {
		const SQL = await loadSql();
		const db = new SQL.Database();
		h.saved = null;

		const tabContent: TabContent = {
			'Card 1': { front: ['frontSimplified'], back: ['backExamples'], additional: [], elementStyles: {} }
		};

		await generateDeck({
			words: [word()],
			deckName: 'examples-deck',
			includeAudio: false,
			fields: ['Simplified', 'Examples'],
			tabContent,
			hskWordsDict: new Set<string>(),
			db,
			template: undefined,
			onProgress: () => {},
			// Inject so the test doesn't touch hsk_sentences.db / the network.
			getExamples: async () => [
				{ simplified: '这是中国。', traditional: '這是中國。', pinyin: 'zhè shì zhōng guó 。', translation: 'This is China.' }
			]
		});

		const start = Date.now();
		while (!h.saved && Date.now() - start < 8000) {
			await new Promise((r) => setTimeout(r, 25));
		}
		expect(h.saved).toBeTruthy();

		const zip = await JSZip.loadAsync(await h.saved!.arrayBuffer());
		const anki2 = await zip.file('collection.anki2')!.async('uint8array');
		const cdb = new SQL.Database(anki2);
		const flds = cdb.exec('SELECT flds FROM notes')[0].values[0][0] as string;
		expect(flds).toContain('example-item');
		expect(flds).toContain('example-sim');
		expect(flds).toContain('example-translation');
		expect(flds).toContain('This is China.');
		// Pre-colorized at export with dedicated ex-tone spans so example colours
		// can be toggled independently of the main card via the sidebar.
		expect(flds).toContain('<span class="ex-tone4">这</span>');
		expect(flds).toContain('<span class="ex-tone1">zhōng</span>');

		cdb.close();
		db.close();
	}, 20000);
});
