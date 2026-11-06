// /create's hand-off next steps (`then`), its draft and its saved decks.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

vi.mock('$lib/deck', async () => {
	const t = await import('$lib/deckTemplate');
	return {
		CARD_STYLE_LS_KEY: t.CARD_STYLE_LS_KEY,
		CARD_TABS_LS_KEY: t.CARD_TABS_LS_KEY,
		DEFAULT_TEMPLATE: t.DEFAULT_TEMPLATE,
		elementOrder: t.elementOrder,
		DEFAULT_BODY_ORDER: t.DEFAULT_BODY_ORDER,
		generateDeck: vi.fn(async () => {}),
		generateDeckBlob: vi.fn(async () => new Blob(['apkg'])),
		initJieba: vi.fn(async () => {}),
		loadDict: vi.fn(() => {}),
		loadHskWordsDict: vi.fn(async () => new Set<string>()),
		lookupWord: vi.fn(async (w: string) => ({
			Simplified: w, Traditional: w, Pinyin: 'pin', Zhuyin: 'zhu',
			Definitions: 'def', Syllable: 'syl', SimpleMeaning: 'mean',
			commonMeaning: 'mean', pos: ['n'], dominantPos: 'n', classifiers: [],
			level: null, rank: null, readings: [], breakdown: []
		})),
		playWordAudio: vi.fn(async () => true),
		setupSql: vi.fn(async () => ({})),
		cutParagraph: vi.fn(() => []),
		wordsByLevel: vi.fn(async () => []),
		getSmartSentences: vi.fn(async () => []),
		renderCardHtml: vi.fn(() => '<!DOCTYPE html><html><body class="card"></body></html>')
	};
});

vi.mock('hanzi-writer', () => ({
	default: { create: () => ({ loopCharacterAnimation() {}, hideCharacter() {} }) }
}));

const { sendPackage, ankiCall } = vi.hoisted(() => ({
	sendPackage: vi.fn(async (..._args: unknown[]) => {}),
	ankiCall: vi.fn(async (_action: string) => ['Default', 'Boya', 'Boya::Book 1'] as unknown)
}));
vi.mock('$lib/anki/sendDeck', () => ({ sendPackage, SEND_STAGE_TEXT: {} }));
vi.mock('$lib/anki/ankiStatus.svelte', () => ({
	anki: { status: 'idle' },
	ankiClient: () => ({ call: ankiCall }),
	checkAnki: vi.fn(async () => 'ready'),
	probeAnki: vi.fn(),
	ANKI_STATUS_TEXT: { checking: 'Looking for Anki…', unreachable: 'Anki not found.' }
}));

import Page from '../routes/create/+page.svelte';
import * as deck from '$lib/deck';
import { PENDING_WORDS_KEY } from '$lib/hskHandoff';
import { DRAFT_KEY, LISTS_KEY, type DeckSettings } from '$lib/myWords';
import { DEFAULT_TEMPLATE } from '$lib/deckTemplate';

const handOff = (extra: Record<string, unknown> = {}) =>
	sessionStorage.setItem(
		PENDING_WORDS_KEY,
		JSON.stringify({ label: 'New HSK (2025) · HSK 3', words: ['会', '发展'], options: { audio: false, examples: false }, ...extra })
	);
const savedDecks = () => JSON.parse(localStorage.getItem(LISTS_KEY) ?? '[]');
const settings: DeckSettings = {
	includeAudio: false,
	tabs: ['Reading'],
	tabContent: { Reading: { front: ['frontSimplified'], back: ['backPinyin'], additional: [], elementStyles: {} } },
	order: ['Simplified', 'Pinyin'],
	template: { ...DEFAULT_TEMPLATE }
};

beforeEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	vi.mocked(deck.generateDeck).mockClear();
	sendPackage.mockClear();
});

describe('Create page — hand-off next steps', () => {
	it('without a next step it stays on the words', async () => {
		handOff();
		render(Page);
		expect(await screen.findByRole('heading', { name: '2 words' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: 'Words' })).not.toHaveClass('hidden');
	});

	it('“export” lands on Export once the words are in', async () => {
		handOff({ then: 'export' });
		render(Page);
		expect(await screen.findByRole('region', { name: 'Export' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Download .apkg/ })).toBeInTheDocument();
		expect((screen.getByLabelText('Deck name') as HTMLInputElement).value).toMatch(/^HSK 3 — /);
		expect(sendPackage).not.toHaveBeenCalled();
	});

	it('“send” asks where the deck goes, then sends and keeps it in My words', async () => {
		handOff({ then: 'send' });
		const user = userEvent.setup();
		render(Page);
		const dialog = await screen.findByRole('dialog', { name: 'Send to Anki' });
		// The page's name is offered as a new deck; Anki's own decks are one tap away.
		expect(((await within(dialog).findByLabelText('New deck name')) as HTMLInputElement).value).toMatch(/^HSK 3 — /);
		await user.click(within(dialog).getByRole('button', { name: 'Existing deck' }));
		expect(within(dialog).getByRole('radio', { name: 'Boya' })).toBeInTheDocument();
		await user.click(within(dialog).getByRole('radio', { name: /Book 1/ }));
		expect(within(dialog).getByText(/New words go into “Boya › Book 1”/)).toBeInTheDocument();
		expect(within(dialog).getByRole('note')).toHaveTextContent(/May overwrite/);
		expect(sendPackage).not.toHaveBeenCalled();
		await user.click(within(dialog).getByRole('button', { name: 'Confirm and send' }));

		await waitFor(() => expect(sendPackage).toHaveBeenCalled());
		const name = (screen.getByLabelText('Deck name') as HTMLInputElement).value;
		expect(name).toBe('Boya::Book 1');
		expect(sendPackage.mock.calls[0][2]).toMatchObject({ showDeck: name });
		await waitFor(() => expect(savedDecks()).toHaveLength(1));
		expect(savedDecks()[0]).toMatchObject({ name, words: ['会', '发展'], source: 'New HSK (2025) · HSK 3' });
	});

	it('an old “Ask every time: off” setting still opens the check; nothing is sent before the confirm', async () => {
		localStorage.setItem('xhz.anki.send', JSON.stringify({ ask: false, openAfter: false }));
		handOff({ then: 'send', deckName: 'Mine' });
		const user = userEvent.setup();
		render(Page);
		const dialog = await screen.findByRole('dialog', { name: 'Send to Anki' });
		await within(dialog).findByLabelText('New deck name');
		expect(sendPackage).not.toHaveBeenCalled();
		await user.click(within(dialog).getByRole('button', { name: 'Create and send' }));
		await waitFor(() => expect(sendPackage).toHaveBeenCalled());
		expect(sendPackage.mock.calls[0][2]).toMatchObject({ showDeck: undefined });
		await waitFor(() => expect(savedDecks()[0]?.name).toBe('Mine'));
	});

	it('a reopened deck keeps its name and its card', async () => {
		handOff({ then: 'export', deckName: 'Old deck', settings });
		render(Page);
		await screen.findByRole('region', { name: 'Export' });
		expect((screen.getByLabelText('Deck name') as HTMLInputElement).value).toBe('Old deck');
		const exp = within(screen.getByRole('region', { name: 'Export' }));
		expect(exp.getByText('2 words')).toBeInTheDocument();
		expect(exp.getByText('1 card type')).toBeInTheDocument();
	});
});

describe('Create page — My words', () => {
	it('a download saves the deck and clears the draft', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.type(screen.getByPlaceholderText('Type words, e.g. 你好 谢谢 学习'), '中国');
		await user.click(screen.getByRole('button', { name: 'Add' }));
		await waitFor(() => expect(JSON.parse(localStorage.getItem(DRAFT_KEY)!).words).toEqual(['中国']));

		await user.click(screen.getByRole('button', { name: /Export$/ }));
		await user.click(screen.getByRole('button', { name: /Download .apkg/ }));
		await waitFor(() => expect(savedDecks()).toHaveLength(1));
		expect(savedDecks()[0].words).toEqual(['中国']);
		expect(savedDecks()[0].settings.tabs).toEqual(['Card 1']);
		expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
		expect(screen.getByRole('link', { name: 'Saved in My words' })).toHaveAttribute('href', '/words');
	});

	it('picks up the unfinished list, and Start over drops it', async () => {
		localStorage.setItem(DRAFT_KEY, JSON.stringify({ words: ['爱', '八'], deckName: 'Half done', savedAt: 1 }));
		const user = userEvent.setup();
		render(Page);
		expect(await screen.findByText('八')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Start over' }));
		expect(screen.getByText('No words yet.')).toBeInTheDocument();
		expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
	});

	it('an unfinished list about to be replaced by a hand-off is kept as a deck', async () => {
		localStorage.setItem(DRAFT_KEY, JSON.stringify({ words: ['爱'], deckName: 'Half done', savedAt: 1 }));
		handOff();
		render(Page);
		expect(await screen.findByRole('heading', { name: '2 words' })).toBeInTheDocument();
		expect(savedDecks()).toEqual([expect.objectContaining({ name: 'Half done', words: ['爱'] })]);
		expect(screen.queryByText('爱')).toBeNull();
	});
});
