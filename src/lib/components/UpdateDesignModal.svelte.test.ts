import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import UpdateDesignModal from './UpdateDesignModal.svelte';
import { anki } from '$lib/anki/ankiStatus.svelte';
import { ANKI_CONNECT_URL } from '$lib/anki/ankiConnect';
import type { WantedModel } from '$lib/anki/designSync';

const wanted: WantedModel = {
	id: '1969669503',
	name: 'Basic - (Anki-xiehanzi)',
	flds: [{ name: 'Simplified' }],
	tmpls: [{ name: 'Card 1', qfmt: 'NEW-Q', afmt: 'NEW-A' }],
	css: 'new'
};

/** AnkiConnect behind `fetch`: answers from `handlers`, logs every action; anything else is a media file. */
function stubAnki(handlers: Record<string, (p: any) => unknown>) {
	const actions: string[] = [];
	vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
		if (url !== ANKI_CONNECT_URL) return new Response(new Uint8Array([1, 2, 3]));
		const { action, params } = JSON.parse(String(init!.body));
		actions.push(action);
		const h = handlers[action];
		return h
			? new Response(JSON.stringify({ result: h(params), error: null }))
			: new Response(JSON.stringify({ result: null, error: `unsupported action ${action}` }));
	});
	return actions;
}

const model = (tmpls: { name: string; qfmt: string; afmt: string }[]) => ({
	id: 1969669503,
	name: 'Basic - (Anki-xiehanzi)',
	flds: [{ name: 'Simplified' }],
	tmpls,
	css: 'old'
});
const usage = {
	findNotes: () => [1, 2],
	findCards: () => [11, 12],
	getDecks: () => ({ 'Anki xiehanzi::New HSK (2025)::HSK 1': [11, 12] }),
	getMediaFilesNames: () => ['_hanzi-writer-data.json']
};

beforeEach(() => {
	anki.status = 'ready';
});
afterEach(() => vi.unstubAllGlobals());

describe('UpdateDesignModal', () => {
	it('names the note type and its decks, then writes only on Update', async () => {
		const actions = stubAnki({
			findModelsById: () => [model([{ name: 'Card 1', qfmt: 'OLD', afmt: 'OLD' }])],
			...usage,
			storeMediaFile: (p) => p.filename,
			updateModelTemplates: () => null,
			updateModelStyling: () => null
		});
		const user = userEvent.setup();
		render(UpdateDesignModal, {
			wanted,
			media: [{ name: '_anki-persistence.js', url: '/data/_anki-persistence.js' }],
			needsStrokeData: true,
			onclose: () => {}
		});
		expect(await screen.findByText('2 notes · Anki xiehanzi › New HSK (2025)')).toBeInTheDocument();
		expect(screen.getByText('New card layout and styling')).toBeInTheDocument();
		expect(screen.getByText(/Kept: your notes/)).toBeInTheDocument();
		expect(actions).not.toContain('updateModelTemplates');

		await user.click(screen.getByRole('button', { name: 'Update design' }));
		expect(await screen.findByText('Card design updated')).toBeInTheDocument();
		expect(actions.slice(-3)).toEqual(['storeMediaFile', 'updateModelTemplates', 'updateModelStyling']);
	});

	it('refuses a note type that holds a card the design does not know', async () => {
		stubAnki({ findModelsById: () => [model([{ name: 'Standard', qfmt: 'a', afmt: 'b' }])], ...usage });
		render(UpdateDesignModal, { wanted, onclose: () => {} });
		expect(await screen.findByText(/“Standard”/)).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Update design' })).toBeNull();
	});

	it('says when the deck is not in the open profile', async () => {
		// The add-on's own reply for an id the collection has not got.
		vi.stubGlobal('fetch', async () =>
			new Response(JSON.stringify({ result: null, error: 'model was not found: 1969669503' }))
		);
		render(UpdateDesignModal, { wanted, onclose: () => {} });
		expect(await screen.findByText(/isn't in the Anki profile you have open/)).toBeInTheDocument();
	});

	it('warns when the writing grid has no stroke data to read', async () => {
		stubAnki({
			findModelsById: () => [model([{ name: 'Card 1', qfmt: 'OLD', afmt: 'OLD' }])],
			...usage,
			getMediaFilesNames: () => []
		});
		render(UpdateDesignModal, { wanted, needsStrokeData: true, onclose: () => {} });
		expect(await screen.findByText(/needs stroke data/)).toBeInTheDocument();
	});

	it('finds a saved deck’s note type through its notes, even under a new id', async () => {
		let usageQuery = '';
		const actions = stubAnki({
			findNotes: (p) => {
				if (p.query.startsWith('mid:')) usageQuery = p.query;
				return [1, 2];
			},
			notesInfo: () => [{ modelName: 'Basic - (Anki-xiehanzi)-9f8e7' }, { modelName: 'Basic - (Anki-xiehanzi)-9f8e7' }],
			findModelsByName: (p) => [{ ...model([{ name: 'Card 1', qfmt: 'OLD', afmt: 'OLD' }]), id: 1793900000001, name: p.modelNames[0] }],
			findCards: () => [11, 12],
			getDecks: () => ({ 'My words — 6 Nov': [11, 12] })
		});
		render(UpdateDesignModal, { wanted, deckName: 'My words — 6 Nov', onclose: () => {} });
		expect(await screen.findByText('Basic - (Anki-xiehanzi)-9f8e7')).toBeInTheDocument();
		expect(actions).not.toContain('findModelsById');
		expect(usageQuery).toBe('mid:1793900000001');
	});

	it('updates several note types in one go and skips one the collection lacks', async () => {
		const two: WantedModel[] = [
			{ ...wanted, id: '1969669522', name: 'Kangxi Radical Free Recognize - (Anki-xiehanzi)' },
			{ ...wanted, id: '1969669524', name: 'Kangxi Radical Free Write - (Anki-xiehanzi)' },
			{ ...wanted, id: '1', name: 'Not installed' }
		];
		const written: string[] = [];
		const actions = stubAnki({
			findModelsById: (p) => {
				const w = two.find((x) => Number(x.id) === p.modelIds[0]);
				if (w?.name === 'Not installed') throw new Error('never');
				return w ? [{ ...model([{ name: 'Card 1', qfmt: 'OLD', afmt: 'OLD' }]), id: Number(w.id), name: w.name }] : [];
			},
			...usage,
			storeMediaFile: (p) => p.filename,
			updateModelTemplates: (p) => written.push(p.model.name),
			updateModelStyling: () => null
		});
		// The third id answers "not found", like the add-on does.
		const realFetch = globalThis.fetch;
		vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
			const body = init?.body ? JSON.parse(String(init.body)) : null;
			if (body?.action === 'findModelsById' && body.params.modelIds[0] === 1) {
				return new Response(JSON.stringify({ result: null, error: 'model was not found: 1' }));
			}
			return realFetch(url, init);
		});
		const user = userEvent.setup();
		render(UpdateDesignModal, {
			wanted: two,
			media: [{ name: '_xhz-hanzi-writer.js', url: '/data/_hanzi-writer.min.js' }],
			onclose: () => {}
		});
		expect(await screen.findByText('Kangxi Radical Free Recognize - (Anki-xiehanzi)')).toBeInTheDocument();
		expect(screen.getByText('Kangxi Radical Free Write - (Anki-xiehanzi)')).toBeInTheDocument();
		expect(screen.queryByText('Not installed')).toBeNull();
		expect(screen.getAllByText('New card layout and styling')).toHaveLength(1);

		await user.click(screen.getByRole('button', { name: 'Update design' }));
		expect(await screen.findByText('Card design updated')).toBeInTheDocument();
		expect(written).toEqual(['Kangxi Radical Free Recognize - (Anki-xiehanzi)', 'Kangxi Radical Free Write - (Anki-xiehanzi)']);
		expect(actions.filter((a) => a === 'storeMediaFile')).toHaveLength(1);
	});

	it('refuses media that came back as something else', async () => {
		stubAnki({
			findModelsById: () => [model([{ name: 'Card 1', qfmt: 'OLD', afmt: 'OLD' }])],
			...usage,
			storeMediaFile: () => null
		});
		const user = userEvent.setup();
		render(UpdateDesignModal, {
			wanted,
			media: [{ name: '_xhz-hanzi-writer.js', url: '/data/_hanzi-writer.min.js', check: 'HanziWriter' }],
			onclose: () => {}
		});
		await user.click(await screen.findByRole('button', { name: 'Update design' }));
		expect(await screen.findByText(/did not load correctly/)).toBeInTheDocument();
	});
});
