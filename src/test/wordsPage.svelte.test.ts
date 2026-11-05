import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PENDING_WORDS_KEY } from '$lib/hskHandoff';
import { BAG_KEY, DRAFT_KEY, LISTS_KEY, makeBackup } from '$lib/myWords';
import { DEFAULT_TEMPLATE } from '$lib/deckTemplate';
import Page from '../routes/words/+page.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => ({ goto }));

const settings = {
	includeAudio: true,
	tabs: ['Reading'],
	tabContent: { Reading: { front: ['frontSimplified'], back: ['backPinyin'], additional: [], elementStyles: {} } },
	order: ['Simplified', 'Pinyin'],
	template: { ...DEFAULT_TEMPLATE }
};
const decks = [
	{ name: 'HSK 3 — 6 Nov', words: ['会', '发展'], savedAt: 2, source: 'New HSK (2025) · HSK 3', settings },
	{ name: 'My words — 5 Nov', words: ['爱'], savedAt: 1 }
];
const pending = () => JSON.parse(sessionStorage.getItem(PENDING_WORDS_KEY)!);

beforeEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	goto.mockClear();
});

describe('My words page', () => {
	it('says what lands here when there is nothing yet', () => {
		render(Page);
		expect(screen.getByText(/Nothing yet/)).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Backup/ })).toBeNull();
	});

	it('reopens a deck on Export with its name and card, or sends it in one click', async () => {
		localStorage.setItem(LISTS_KEY, JSON.stringify(decks));
		const user = userEvent.setup();
		render(Page);
		const rows = within(screen.getByRole('region', { name: 'Decks' })).getAllByRole('listitem');
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveTextContent('2 words');

		await user.click(within(rows[0]).getByRole('button', { name: /Open/ }));
		expect(pending()).toMatchObject({ then: 'export', deckName: 'HSK 3 — 6 Nov', words: ['会', '发展'], settings });
		expect(goto).toHaveBeenCalledWith('/create');

		await user.click(within(rows[1]).getByRole('button', { name: /Send to Anki/ }));
		expect(pending()).toMatchObject({ then: 'send', deckName: 'My words — 5 Nov' });
	});

	it('asks once before deleting a deck', async () => {
		localStorage.setItem(LISTS_KEY, JSON.stringify(decks));
		const user = userEvent.setup();
		render(Page);
		await user.click(screen.getByRole('button', { name: 'Delete HSK 3 — 6 Nov' }));
		await user.click(screen.getByRole('button', { name: 'Keep' }));
		expect(JSON.parse(localStorage.getItem(LISTS_KEY)!)).toHaveLength(2);
		await user.click(screen.getByRole('button', { name: 'Delete HSK 3 — 6 Nov' }));
		await user.click(screen.getByRole('button', { name: 'Delete' }));
		expect(JSON.parse(localStorage.getItem(LISTS_KEY)!).map((d: { name: string }) => d.name)).toEqual(['My words — 5 Nov']);
	});

	it('shows the unfinished list and the word bag', async () => {
		localStorage.setItem(DRAFT_KEY, JSON.stringify({ words: ['八'], deckName: 'x', savedAt: 1 }));
		localStorage.setItem(BAG_KEY, JSON.stringify(['好', '水']));
		const user = userEvent.setup();
		render(Page);
		expect(screen.getByText(/Unfinished · 1 word/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/create');

		await user.click(screen.getByRole('button', { name: 'Remove 水' }));
		expect(JSON.parse(localStorage.getItem(BAG_KEY)!)).toEqual(['好']);
		await user.click(screen.getByRole('button', { name: 'Make a deck' }));
		expect(pending()).toMatchObject({ words: ['好'], then: 'export' });
	});

	it('restores a backup by merging it in', async () => {
		localStorage.setItem(LISTS_KEY, JSON.stringify([decks[1]]));
		const user = userEvent.setup();
		render(Page);
		const file = new File([JSON.stringify(makeBackup([decks[0]], ['龙']))], 'b.json', { type: 'application/json' });
		await user.upload(screen.getByLabelText('Restore from a backup file'), file);
		expect(await screen.findByText(/Restored 1 deck, 1 word in the bag/)).toBeInTheDocument();
		expect(JSON.parse(localStorage.getItem(LISTS_KEY)!)).toHaveLength(2);
		expect(JSON.parse(localStorage.getItem(BAG_KEY)!)).toEqual(['龙']);
	});

	it('says so when the file is not a backup', async () => {
		const user = userEvent.setup();
		render(Page);
		await user.upload(screen.getByLabelText('Restore from a backup file'), new File(['nope'], 'x.json', { type: 'application/json' }));
		expect(await screen.findByText(/not a My words backup/)).toBeInTheDocument();
	});
});
