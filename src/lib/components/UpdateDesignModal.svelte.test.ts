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
});
