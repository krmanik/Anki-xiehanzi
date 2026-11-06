import { describe, expect, it } from 'vitest';
import { alignBlocker, alignNoteType, planAlign, shapeToPlan, type PackageModel } from './noteTypeAlign';
import { createAnkiConnect } from './ankiConnect';
import type { InstalledModel } from './designSync';

const t = (name: string, q = `${name}-q`) => ({ name, qfmt: q, afmt: `${name}-a` });
const wanted = (tmpls: string[], flds = ['Simplified', 'Pinyin', 'Audio']): PackageModel => ({
	id: '4000000001',
	name: 'Anki-xiehanzi · L',
	flds: flds.map((name) => ({ name })),
	tmpls: tmpls.map((n) => t(n)),
	css: '',
	req: tmpls.map((_, i) => [i, 'any', [0]])
});
const installed = (tmpls: string[], fields = ['Simplified', 'Pinyin', 'Audio']): InstalledModel => ({
	id: 4000000001,
	name: 'Anki-xiehanzi · L (renamed)',
	fields,
	templates: tmpls.map((n) => t(n, `old-${n}`)),
	css: ''
});

describe('planAlign', () => {
	it('same schema: nothing to do, the package is left alone', () => {
		const p = planAlign(installed(['Standard']), wanted(['Standard']));
		expect(p.same).toBe(true);
		const m = wanted(['Standard']);
		expect(shapeToPlan(m, p)).toBe(m);
	});

	it('a card type added in the design is added to Anki first; one dropped is kept as Anki has it', () => {
		const p = planAlign(installed(['Standard', 'Writing']), wanted(['Reading', 'Standard']));
		expect(p.addTemplates.map((x) => x.name)).toEqual(['Reading']);
		expect(p.keepTemplates.map((x) => x.name)).toEqual(['Writing']);
		expect(p.templateOrder).toEqual(['Standard', 'Writing', 'Reading']);
		const shaped = shapeToPlan(wanted(['Reading', 'Standard']), p);
		// Anki's order, this design's templates, the kept one untouched.
		expect(shaped.tmpls.map((x) => [x.name, x.qfmt])).toEqual([
			['Standard', 'Standard-q'],
			['Writing', 'old-Writing'],
			['Reading', 'Reading-q']
		]);
		expect(shaped.req).toEqual([
			[0, 'any', [0]],
			[1, 'any', [0]],
			[2, 'any', [0]]
		]);
	});

	it('order of card types alone is a schema change too', () => {
		const p = planAlign(installed(['A', 'B']), wanted(['B', 'A']));
		expect(p.same).toBe(false);
		expect(shapeToPlan(wanted(['B', 'A']), p).tmpls.map((x) => x.name)).toEqual(['A', 'B']);
	});

	it('adds missing fields and puts them in the package order', () => {
		const p = planAlign(installed(['S'], ['Pinyin', 'Simplified']), wanted(['S']));
		expect(p.addFields).toEqual(['Audio']);
		expect(p.reorder).toBe(true);
	});

	it('refuses when Anki’s copy has a field the package would empty', () => {
		const p = planAlign(installed(['S'], ['Simplified', 'Pinyin', 'Audio', 'My notes']), wanted(['S']));
		expect(alignBlocker(p)).toMatch(/“My notes”/);
	});
});

describe('alignNoteType', () => {
	function fake(handlers: Record<string, (p: any) => unknown>) {
		const log: { action: string; params: any }[] = [];
		const fetch = (async (_u: string, init: RequestInit) => {
			const { action, params } = JSON.parse(String(init.body));
			log.push({ action, params });
			try {
				return new Response(JSON.stringify({ result: handlers[action]?.(params) ?? null, error: null }));
			} catch (e) {
				return new Response(JSON.stringify({ result: null, error: (e as Error).message }));
			}
		}) as unknown as typeof globalThis.fetch;
		return { client: createAnkiConnect({ fetch }), log };
	}
	const raw = (tmpls: string[], fields = ['Simplified', 'Pinyin', 'Audio']) => ({
		id: 4000000001,
		name: 'Anki-xiehanzi · L',
		flds: fields.map((name) => ({ name })),
		tmpls: tmpls.map((n) => t(n, `old-${n}`)),
		css: ''
	});

	it('a first send has nothing to align', async () => {
		const { client, log } = fake({
			findModelsById: () => {
				throw new Error('model was not found: 4000000001');
			}
		});
		expect(await alignNoteType(client, wanted(['S']))).toBeNull();
		expect(log.map((l) => l.action)).toEqual(['findModelsById']);
	});

	it('adds fields, reorders and adds card types by the installed name, before anything is imported', async () => {
		const { client, log } = fake({ findModelsById: () => [raw(['S'], ['Pinyin', 'Simplified'])] });
		const r = await alignNoteType(client, wanted(['S', 'W']));
		expect(r!.plan.addTemplates.map((x) => x.name)).toEqual(['W']);
		expect(log.map((l) => l.action)).toEqual([
			'findModelsById',
			'modelFieldAdd',
			'modelFieldReposition',
			'modelFieldReposition',
			'modelFieldReposition',
			'modelTemplateAdd'
		]);
		expect(log[1].params).toEqual({ modelName: 'Anki-xiehanzi · L', fieldName: 'Audio' });
		expect(log[5].params).toEqual({ modelName: 'Anki-xiehanzi · L', template: { Name: 'W', Front: 'W-q', Back: 'W-a' } });
	});

	it('writes nothing when it has to refuse', async () => {
		const { client, log } = fake({ findModelsById: () => [raw(['S'], ['Simplified', 'Pinyin', 'Audio', 'Extra'])] });
		await expect(alignNoteType(client, wanted(['S', 'W']))).rejects.toThrow(/“Extra”/);
		expect(log.map((l) => l.action)).toEqual(['findModelsById']);
	});
});
