import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

// Mock the heavy deck runtime (genanki/sql.js/jieba/edge-tts/network). The page
// only needs these as stubs; the real template constants come from deckTemplate.
vi.mock('$lib/deck', async () => {
	const t = await import('$lib/deckTemplate');
	return {
		CARD_STYLE_LS_KEY: t.CARD_STYLE_LS_KEY,
		CARD_TABS_LS_KEY: t.CARD_TABS_LS_KEY,
		DEFAULT_TEMPLATE: t.DEFAULT_TEMPLATE,
		elementOrder: t.elementOrder,
		DEFAULT_BODY_ORDER: t.DEFAULT_BODY_ORDER,
		generateDeck: vi.fn(async () => {}),
		initJieba: vi.fn(async () => {}),
		loadDict: vi.fn(() => {}),
		loadHskWordsDict: vi.fn(async () => new Set<string>()),
		lookupWord: vi.fn(async (w: string) => ({
			Simplified: w, Traditional: w, Pinyin: 'pin', Zhuyin: 'zhu',
			Definitions: 'def', Syllable: 'syl', SimpleMeaning: 'mean',
			commonMeaning: 'mean', pos: ['n'], dominantPos: 'n', classifiers: [],
			level: null, rank: null, readings: []
		})),
		playWordAudio: vi.fn(async () => true),
		setupSql: vi.fn(async () => ({})),
		cutParagraph: vi.fn(() => [])
	};
});

vi.mock('hanzi-writer', () => ({
	default: { create: () => ({ loopCharacterAnimation() {}, hideCharacter() {} }) }
}));

// `+`-prefixed files are SvelteKit-reserved, so this test lives outside routes/.
import Page from '../routes/create/+page.svelte';
import * as deck from '$lib/deck';
import { posDisplay } from '$lib/dict/cedict';

beforeEach(() => localStorage.clear());

describe('Create page — structure', () => {
	it('renders the deck generator heading and the default card tab', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: 'Create Deck' })).toBeInTheDocument();
		expect(screen.getByText('Card 1')).toBeInTheDocument();
	});
});

describe('Create page — card type tabs', () => {
	it('adds and removes card types', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.click(screen.getByText('+'));
		expect(screen.getByText('Card 2')).toBeInTheDocument();

		const closeButtons = screen.getAllByLabelText('close tab');
		await user.click(closeButtons[closeButtons.length - 1]);
		expect(screen.queryByText('Card 2')).toBeNull();
	});
});

describe('Create page — field front/back selection', () => {
	it('lists the writing component and many field checkboxes', () => {
		const { container } = render(Page);
		const checkboxes = container.querySelectorAll('input[type="checkbox"]');
		expect(checkboxes.length).toBeGreaterThan(4);
		expect(screen.getByText('Writing Component')).toBeInTheDocument();
	});
});

describe('Create page — advanced customiser', () => {
	it('opens and closes the per-card customiser', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.click(screen.getByText('Advanced customisation'));
		expect(screen.getByRole('dialog', { name: 'Card Customiser' })).toBeInTheDocument();
		await user.click(screen.getByText('Save customisation'));
		expect(screen.queryByRole('dialog', { name: 'Card Customiser' })).toBeNull();
	});
});

describe('Create page — navigation + generate', () => {
	it('navigates to step 2 and triggers deck generation', async () => {
		const user = userEvent.setup();
		render(Page);

		await user.click(screen.getByText('Input Chinese Characters'));
		expect(screen.getByRole('heading', { name: 'Enter Chinese Characters' })).toBeInTheDocument();

		// Generate is disabled until at least one word is added.
		const genBtn = screen.getByText('Generate Deck') as HTMLButtonElement;
		expect(genBtn).toBeDisabled();

		await user.type(screen.getByPlaceholderText('Type a word, e.g. 中国'), '中国');
		await user.click(screen.getByText('Add'));
		await user.click(screen.getByText('Generate Deck'));
		expect(deck.generateDeck).toHaveBeenCalled();
		// A fresh SQLite db is created per export (avoids "table col already exists").
		expect(deck.setupSql).toHaveBeenCalled();
	});

	it('Export CSV includes the Part of Speech column populated from word.pos', async () => {
		const user = userEvent.setup();

		// Capture the CSV blob instead of triggering a real download.
		let csv = '';
		const origCreate = URL.createObjectURL;
		URL.createObjectURL = (blob: Blob) => {
			// read synchronously enough for the assertion via a stashed promise
			(blob as any)._text = blob.text();
			(URL.createObjectURL as any)._blob = blob;
			return 'blob:mock';
		};
		URL.revokeObjectURL = () => {};

		render(Page);
		await user.click(screen.getByText('Input Chinese Characters'));
		await user.type(screen.getByPlaceholderText('Type a word, e.g. 中国'), '中国');
		await user.click(screen.getByText('Add'));
		await user.click(screen.getByText('Export CSV'));

		const blob = (URL.createObjectURL as any)._blob as Blob;
		csv = await blob.text();
		URL.createObjectURL = origCreate;

		expect(csv).toContain('PartOfSpeech');
		// pos:['n'] → posDisplay('n') must appear in the data row (not blank).
		expect(csv).toContain(posDisplay('n'));
	});
});
