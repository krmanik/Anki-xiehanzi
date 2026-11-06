import { describe, expect, it } from 'vitest';
import { createAnkiConnect } from './ankiConnect';
import {
	applyDesign,
	blockedReason,
	deckRoot,
	describePlan,
	planDesign,
	readInstalled,
	readUsage,
	templatesParam,
	toInstalled,
	type WantedModel
} from './designSync';
import { hskDeckModel } from '../hskDeckLayout';

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

const wanted: WantedModel = {
	id: '1969669503',
	name: 'Basic - (Anki-xiehanzi)',
	flds: [{ name: 'Simplified' }, { name: 'Pinyin' }, { name: 'SimpleMeaning' }],
	tmpls: [
		{ name: 'Card 1', qfmt: 'NEW-Q1', afmt: 'NEW-A1' },
		{ name: 'Card 2', qfmt: 'NEW-Q2', afmt: 'NEW-A2' }
	],
	css: '.card{color:red}'
};

/** What `findModelsById` sends back: Anki's own model dict, extra keys and all. */
const rawInstalled = {
	id: 1969669503,
	name: 'My renamed type',
	type: 0,
	flds: [
		{ name: 'Simplified', ord: 0 },
		{ name: 'Pinyin', ord: 1 },
		{ name: 'MyNotes', ord: 2 }
	],
	tmpls: [
		{ name: 'Card 1', ord: 0, qfmt: 'OLD-Q1', afmt: 'OLD-A1' },
		{ name: 'Mine', ord: 1, qfmt: 'x', afmt: 'y' }
	],
	css: '.card{color:blue}'
};

/** The same note type without the reader's own "Mine" card: one this design can update. */
const ours = toInstalled({ ...rawInstalled, tmpls: [rawInstalled.tmpls[0]] });

describe('planDesign', () => {
	const installed = toInstalled(rawInstalled);

	it('reads the parts of Anki’s model dict that matter', () => {
		expect(installed).toEqual({
			id: 1969669503,
			name: 'My renamed type',
			fields: ['Simplified', 'Pinyin', 'MyNotes'],
			templates: [
				{ name: 'Card 1', qfmt: 'OLD-Q1', afmt: 'OLD-A1' },
				{ name: 'Mine', qfmt: 'x', afmt: 'y' }
			],
			css: '.card{color:blue}'
		});
	});

	it('adds missing fields, updates shared cards, skips new card types', () => {
		const plan = planDesign(ours, wanted);
		expect(plan).toEqual({
			modelName: 'My renamed type',
			addFields: ['SimpleMeaning'],
			updateTemplates: ['Card 1'],
			skippedTemplates: ['Card 2'],
			foreignTemplates: [],
			css: true,
			upToDate: false,
			blocked: false
		});
	});

	it('blocks when the note type has a card the design does not know (the CSS would restyle it)', () => {
		const plan = planDesign(installed, wanted);
		expect(plan.foreignTemplates).toEqual(['Mine']);
		expect(plan.blocked).toBe(true);
		expect(blockedReason(plan)).toMatch(/“Mine”/);
	});

	it('blocks a different design on the same id (no card in common)', () => {
		const other = toInstalled({ ...rawInstalled, tmpls: [{ name: 'Standard', qfmt: 'a', afmt: 'b' }] });
		const plan = planDesign(other, wanted);
		expect(plan.updateTemplates).toEqual([]);
		expect(plan.blocked).toBe(true);
	});

	it('is up to date once the note type matches', () => {
		const same = toInstalled({
			...rawInstalled,
			flds: wanted.flds,
			tmpls: [...wanted.tmpls, { name: 'Mine', qfmt: 'x', afmt: 'y' }],
			css: wanted.css
		});
		const plan = planDesign(same, wanted);
		expect(plan.upToDate).toBe(true);
		expect(plan.blocked).toBe(false);
		expect(describePlan(plan)).toEqual([]);
	});

	it('says what changes in one line each', () => {
		expect(describePlan(planDesign(ours, wanted))).toEqual([
			'New card layout and styling',
			'Adds a field: SimpleMeaning (empty on existing notes)',
			'Leaves out card type Card 2 — your note type has no such card'
		]);
	});
});

describe('readInstalled', () => {
	it('finds the note type by id', async () => {
		const { client, log } = fakeAnki({ findModelsById: () => [rawInstalled] });
		expect((await readInstalled(client, '1969669503'))?.name).toBe('My renamed type');
		expect(log[0].params).toEqual({ modelIds: [1969669503] });
	});

	it('returns null when the collection has no such note type', async () => {
		const { client } = fakeAnki({
			findModelsById: () => {
				throw new Error('model was not found: 1969669503');
			}
		});
		expect(await readInstalled(client, 1969669503)).toBeNull();
	});

	it('passes other errors on', async () => {
		const { client } = fakeAnki({
			findModelsById: () => {
				throw new Error('collection is not available');
			}
		});
		await expect(readInstalled(client, 1)).rejects.toThrow('collection is not available');
	});
});

describe('readUsage', () => {
	it('counts notes and groups decks to two levels, most cards first', async () => {
		const { client } = fakeAnki({
			findNotes: () => [1, 2, 3, 4],
			findCards: () => [11, 12, 13, 14],
			getDecks: () => ({
				'My words — 6 Nov': [11],
				'Anki xiehanzi::New HSK (2025)::HSK 1': [12, 13],
				'Anki xiehanzi::New HSK (2025)::HSK 2': [14]
			})
		});
		expect(await readUsage(client, 1969669503)).toEqual({
			notes: 4,
			decks: ['Anki xiehanzi::New HSK (2025)', 'My words — 6 Nov']
		});
	});

	it('skips the card lookups when there are no notes', async () => {
		const { client, log } = fakeAnki({ findNotes: () => [] });
		expect(await readUsage(client, 1)).toEqual({ notes: 0, decks: [] });
		expect(log.map((l) => l.action)).toEqual(['findNotes']);
	});

	it('deckRoot keeps two levels', () => {
		expect(deckRoot('A::B::C')).toBe('A::B');
		expect(deckRoot('Solo')).toBe('Solo');
	});
});

describe('applyDesign', () => {
	it('stores media, then adds fields, then templates, then CSS — by the installed name', async () => {
		const { client, log } = fakeAnki({
			storeMediaFile: (p) => p.filename,
			modelFieldAdd: () => null,
			updateModelTemplates: () => null,
			updateModelStyling: () => null
		});
		const plan = planDesign(ours, wanted);
		await applyDesign(client, plan, wanted, [{ name: '_anki-persistence.js', data: 'AAAA' }]);
		expect(log).toEqual([
			{ action: 'storeMediaFile', params: { filename: '_anki-persistence.js', data: 'AAAA' } },
			{ action: 'modelFieldAdd', params: { modelName: 'My renamed type', fieldName: 'SimpleMeaning' } },
			{
				action: 'updateModelTemplates',
				params: { model: { name: 'My renamed type', templates: { 'Card 1': { Front: 'NEW-Q1', Back: 'NEW-A1' } } } }
			},
			{ action: 'updateModelStyling', params: { model: { name: 'My renamed type', css: '.card{color:red}' } } }
		]);
	});

	it('stops at the first error', async () => {
		const { client, log } = fakeAnki({
			modelFieldAdd: () => {
				throw new Error('nope');
			}
		});
		const plan = planDesign(ours, wanted);
		await expect(applyDesign(client, plan, wanted)).rejects.toThrow('nope');
		expect(log.map((l) => l.action)).toEqual(['modelFieldAdd']);
	});

	it('writes nothing for a blocked plan', async () => {
		const { client, log } = fakeAnki({});
		const plan = planDesign(toInstalled(rawInstalled), wanted);
		await expect(applyDesign(client, plan, wanted)).rejects.toThrow(/restyle/);
		expect(log).toEqual([]);
	});

	it('templatesParam picks only the named cards', () => {
		expect(templatesParam(wanted, ['Card 2'])).toEqual({ 'Card 2': { Front: 'NEW-Q2', Back: 'NEW-A2' } });
	});
});

describe('hskDeckModel', () => {
	it('is the note type the prebuilt decks carry', () => {
		const { model, usesWriter } = hskDeckModel({ audio: true, examples: true });
		expect(model.id).toBe('1969669503');
		expect(model.name).toBe('Basic - (Anki-xiehanzi)');
		expect(model.tmpls.map((t) => t.name)).toEqual(['Card 1']);
		expect(model.flds.map((f) => f.name)).toContain('SimpleMeaning');
		expect(usesWriter).toBe(true);
	});

	it('takes the no-audio note type without audio', () => {
		expect(hskDeckModel({ audio: false }).model.id).toBe('1969669504');
	});
});
