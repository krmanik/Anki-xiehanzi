import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
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
		cutParagraph: vi.fn(() => []),
		wordsByLevel: vi.fn(async () => ['爱', '吧']),
		getSmartSentences: vi.fn(async () => []),
		renderCardHtml: vi.fn(() => '<!DOCTYPE html><html><body class="card"></body></html>')
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

describe('Create page — appearance accordion', () => {
	it('groups styling controls under a "Customize appearance" accordion (open by default)', async () => {
		const user = userEvent.setup();
		render(Page);
		// Open by default — styling controls are visible.
		expect(screen.getByText('Collapse dictionary definitions')).toBeInTheDocument();
		// Clicking the header collapses them away.
		await user.click(screen.getByText('Customize appearance'));
		expect(screen.queryByText('Collapse dictionary definitions')).toBeNull();
	});
});

describe('Create page — example sentence options', () => {
	it('shows example options only when the Examples field is selected', async () => {
		const user = userEvent.setup();
		render(Page);
		// Not shown by default.
		expect(screen.queryByText('Example sentences')).toBeNull();
		// Tick Example Sentences on the back → contextual options appear.
		await user.click(screen.getByLabelText('Example Sentences back'));
		expect(screen.getByText('Example sentences')).toBeInTheDocument();
		expect(screen.getByText('Min length (chars)')).toBeInTheDocument();
		expect(screen.getByText('Max length (chars)')).toBeInTheDocument();
	});
});

describe('Create page — presets', () => {
	it('replaces the lone default card with a one-click preset and enables audio', async () => {
		const user = userEvent.setup();
		render(Page);

		// Beginner preset includes the Audio field.
		const audio = screen.getByLabelText('Include Audio (Text-to-Speech)') as HTMLInputElement;
		expect(audio.checked).toBe(false);

		await user.click(screen.getByRole('button', { name: /Beginner/ }));

		// The empty default "Card 1" is replaced by a "Beginner" tab.
		expect(screen.queryByText('Card 1')).toBeNull();
		// Preset button + new tab both read "Beginner".
		expect(screen.getAllByText('Beginner').length).toBeGreaterThanOrEqual(2);
		expect(audio.checked).toBe(true);
	});

	it('appends a second preset as a new card type', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.click(screen.getByRole('button', { name: /Beginner/ }));
		await user.click(screen.getByRole('button', { name: /Reading/ }));
		// Two distinct card-type tabs now exist alongside the preset buttons.
		expect(screen.getAllByText('Beginner').length).toBeGreaterThanOrEqual(2);
		expect(screen.getAllByText('Reading').length).toBeGreaterThanOrEqual(2);
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

describe('Create page — export preview', () => {
	it('shows deck stats and card previews before generating', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.click(screen.getByText('Input Chinese Characters'));
		await user.type(screen.getByPlaceholderText('Type a word, e.g. 中国'), '中国');
		await user.click(screen.getByText('Add'));
		await user.click(screen.getByText('Preview & Generate'));

		const dialog = screen.getByRole('dialog', { name: 'Export preview' });
		expect(dialog).toBeInTheDocument();
		// Stats panel: one word, HSK + frequency sections.
		expect(within(dialog).getByText('HSK level')).toBeInTheDocument();
		expect(within(dialog).getByText('Frequency')).toBeInTheDocument();
		// Word pager renders the actual word and its position.
		expect(within(dialog).getByText('word 1 / 1')).toBeInTheDocument();
		expect(within(dialog).getByLabelText('next word')).toBeDisabled();
		// Back out without generating.
		await user.click(within(dialog).getByRole('button', { name: 'Back' }));
		expect(screen.queryByRole('dialog', { name: 'Export preview' })).toBeNull();
		expect(deck.generateDeck).not.toHaveBeenCalled();
	});
});

describe('Create page — HSK level source', () => {
	it('adds all words for the selected HSK levels', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.click(screen.getByText('Input Chinese Characters'));
		await user.click(screen.getByRole('button', { name: 'HSK Level' }));
		await user.click(screen.getByRole('button', { name: 'HSK 1' }));
		await user.click(screen.getByRole('button', { name: 'Add words' }));

		expect(deck.wordsByLevel).toHaveBeenCalledWith(['1']);
		// Both mocked words land in the list (rendered as WordCards).
		expect(await screen.findByText('爱')).toBeInTheDocument();
		expect(await screen.findByText('吧')).toBeInTheDocument();
	});
});

describe('Create page — navigation + generate', () => {
	it('navigates to step 2 and triggers deck generation', async () => {
		const user = userEvent.setup();
		render(Page);

		await user.click(screen.getByText('Input Chinese Characters'));
		expect(screen.getByRole('heading', { name: 'Enter Chinese Characters' })).toBeInTheDocument();

		// Preview & Generate is disabled until at least one word is added.
		const genBtn = screen.getByText('Preview & Generate') as HTMLButtonElement;
		expect(genBtn).toBeDisabled();

		await user.type(screen.getByPlaceholderText('Type a word, e.g. 中国'), '中国');
		await user.click(screen.getByText('Add'));
		// Opens the export preview; generation happens from inside it.
		await user.click(screen.getByText('Preview & Generate'));
		expect(screen.getByRole('dialog', { name: 'Export preview' })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Generate deck' }));
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
