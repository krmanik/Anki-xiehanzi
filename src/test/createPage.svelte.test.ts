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
			level: null, rank: null, readings: [], breakdown: []
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

type User = ReturnType<typeof userEvent.setup>;

async function addWord(user: User, word = '中国') {
	await user.type(screen.getByPlaceholderText('Type a word, e.g. 中国'), word);
	await user.click(screen.getByRole('button', { name: 'Add' }));
}
// The step pills: "2 Card style", "3 Export".
const toStep = (user: User, name: 'Words' | 'Card style' | 'Export') =>
	user.click(screen.getByRole('button', { name: new RegExp(`${name}$`) }));

describe('Create page — structure', () => {
	it('starts on the words, with the steps ahead and a dated deck name', async () => {
		const user = userEvent.setup();
		render(Page);
		expect(screen.getByRole('heading', { name: 'Create a deck' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Add words' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Words$/ })).toHaveAttribute('aria-current', 'step');
		// No words yet → nothing to style.
		expect(screen.getByRole('button', { name: /Next: card style/ })).toBeDisabled();

		await toStep(user, 'Export');
		expect((screen.getByLabelText('Deck name') as HTMLInputElement).value).toMatch(/^My words — \d+ \w{3}$/);
	});
});

describe('Create page — card type tabs', () => {
	it('adds and removes card types', async () => {
		const user = userEvent.setup();
		render(Page);
		await toStep(user, 'Card style');
		expect(screen.getByText('Card 1')).toBeInTheDocument();
		await user.click(screen.getByText('+'));
		expect(screen.getByText('Card 2')).toBeInTheDocument();

		const closeButtons = screen.getAllByLabelText('close tab');
		await user.click(closeButtons[closeButtons.length - 1]);
		expect(screen.queryByText('Card 2')).toBeNull();
	});
});

describe('Create page — appearance accordion', () => {
	it('keeps styling controls under a closed "Customize appearance" accordion', async () => {
		const user = userEvent.setup();
		render(Page);
		await toStep(user, 'Card style');
		expect(screen.queryByText('Collapse dictionary definitions')).toBeNull();
		await user.click(screen.getByText('Customize appearance'));
		expect(screen.getByText('Collapse dictionary definitions')).toBeInTheDocument();
	});
});

describe('Create page — example sentence options', () => {
	it('shows example options only when the Examples field is selected', async () => {
		const user = userEvent.setup();
		render(Page);
		await toStep(user, 'Card style');
		await user.click(screen.getByText('Customize appearance'));
		expect(screen.queryByText('Min length (chars)')).toBeNull();
		await user.click(screen.getByLabelText('Example Sentences back'));
		expect(screen.getByText('Min length (chars)')).toBeInTheDocument();
		expect(screen.getByText('Max length (chars)')).toBeInTheDocument();
	});
});

describe('Create page — style tiles', () => {
	const tile = (name: RegExp) => screen.getByRole('button', { name, pressed: false });

	it('lights Standard for a new deck and swaps the card for a picked tile', async () => {
		const user = userEvent.setup();
		render(Page);
		await toStep(user, 'Card style');
		expect(screen.getByRole('button', { name: /^Standard/ })).toHaveAttribute('aria-pressed', 'true');

		await user.click(tile(/^Beginner/));
		expect(screen.getByRole('button', { name: /^Beginner/, pressed: true })).toBeInTheDocument();
		expect(screen.queryByText('Card 1')).toBeNull();
		// Audio stays the switch's call.
		expect(screen.getByRole('switch', { name: /Audio/ })).not.toBeChecked();
	});

	it('asks before a tile replaces a hand-edited card, and can add it instead', async () => {
		const user = userEvent.setup();
		render(Page);
		await toStep(user, 'Card style');
		await user.click(screen.getByLabelText('Pinyin back'));
		expect(screen.getByText(/Custom card/)).toBeInTheDocument();

		await user.click(tile(/^Reading/));
		await user.click(screen.getByRole('button', { name: 'Add new' }));
		expect(screen.getByText('Card 1')).toBeInTheDocument();
		expect(screen.getAllByText('Reading').length).toBeGreaterThan(0);
	});

	it('the advanced picker still adds a preset and switches audio on for it', async () => {
		const user = userEvent.setup();
		render(Page);
		await toStep(user, 'Card style');
		await user.click(screen.getByRole('button', { name: /Add a ready-made card type/ }));
		// Beginner is both a tile and a picker entry; the picker's is the one without aria-pressed.
		const entry = screen.getAllByRole('button', { name: /^Beginner/ }).find((b) => !b.hasAttribute('aria-pressed'))!;
		await user.click(entry);
		expect(screen.getByRole('switch', { name: /Audio/ })).toBeChecked();
	});
});

describe('Create page — field front/back selection', () => {
	it('lists the writing component and many field checkboxes', async () => {
		const user = userEvent.setup();
		const { container } = render(Page);
		await toStep(user, 'Card style');
		expect(container.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(4);
		expect(screen.getByText('Writing Component')).toBeInTheDocument();
	});
});

describe('Create page — advanced customiser', () => {
	it('opens and closes the per-card customiser', async () => {
		const user = userEvent.setup();
		render(Page);
		await toStep(user, 'Card style');
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
		await addWord(user);
		await user.click(screen.getByRole('button', { name: /Next: card style/ }));
		await user.click(screen.getByRole('button', { name: /Next: export/ }));
		await user.click(screen.getByRole('button', { name: /Preview every card/ }));

		const dialog = screen.getByRole('dialog', { name: 'Export preview' });
		expect(within(dialog).getByText('HSK level')).toBeInTheDocument();
		expect(within(dialog).getByText('Frequency')).toBeInTheDocument();
		expect(within(dialog).getByText('word 1 / 1')).toBeInTheDocument();
		expect(within(dialog).getByLabelText('next word')).toBeDisabled();
		await user.click(within(dialog).getByRole('button', { name: 'Back' }));
		expect(screen.queryByRole('dialog', { name: 'Export preview' })).toBeNull();
		expect(deck.generateDeck).not.toHaveBeenCalled();
	});
});

describe('Create page — HSK level source', () => {
	it('adds all words for the selected HSK levels', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.click(screen.getByRole('button', { name: 'HSK' }));
		await user.click(screen.getByRole('button', { name: 'HSK 1' }));
		await user.click(screen.getByRole('button', { name: 'Add words' }));

		expect(deck.wordsByLevel).toHaveBeenCalledWith(['1']);
		expect(await screen.findByText('爱')).toBeInTheDocument();
		expect(await screen.findByText('吧')).toBeInTheDocument();
	});
});

describe('Create page — export', () => {
	it('asks for words before it offers a download', async () => {
		const user = userEvent.setup();
		render(Page);
		await toStep(user, 'Export');
		expect(screen.queryByRole('button', { name: /Download .apkg/ })).toBeNull();
		expect(within(screen.getByRole('region', { name: 'Export' })).getByText(/No words yet/)).toBeInTheDocument();
	});

	it('downloads from the export step, a fresh SQLite db per export', async () => {
		const user = userEvent.setup();
		render(Page);
		await addWord(user);
		await toStep(user, 'Export');
		await user.click(screen.getByRole('button', { name: /Download .apkg/ }));
		expect(screen.queryByRole('dialog', { name: 'Export preview' })).toBeNull();
		expect(deck.generateDeck).toHaveBeenCalled();
		expect(deck.setupSql).toHaveBeenCalled();
	});

	it('can also generate from inside the export preview', async () => {
		const user = userEvent.setup();
		render(Page);
		await addWord(user);
		await toStep(user, 'Export');
		await user.click(screen.getByRole('button', { name: /Preview every card/ }));
		await user.click(screen.getByRole('button', { name: 'Generate deck' }));
		expect(deck.generateDeck).toHaveBeenCalled();
	});

	it('CSV includes the Part of Speech column populated from word.pos', async () => {
		const user = userEvent.setup();
		const origCreate = URL.createObjectURL;
		URL.createObjectURL = (blob: Blob) => {
			(URL.createObjectURL as any)._blob = blob;
			return 'blob:mock';
		};
		URL.revokeObjectURL = () => {};

		render(Page);
		await addWord(user);
		await toStep(user, 'Export');
		await user.click(screen.getByRole('button', { name: /CSV/ }));

		const csv = await ((URL.createObjectURL as any)._blob as Blob).text();
		URL.createObjectURL = origCreate;
		expect(csv).toContain('PartOfSpeech');
		expect(csv).toContain(posDisplay('n'));
	});
});
