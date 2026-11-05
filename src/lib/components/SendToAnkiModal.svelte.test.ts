import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SendToAnkiModal from './SendToAnkiModal.svelte';

beforeEach(() => localStorage.clear());

const decks = async () => ['Default', 'Boya', 'Anki xiehanzi::New HSK (2025)'];

describe('SendToAnkiModal', () => {
	it('creates a new deck by the typed name, and remembers the settings', async () => {
		const onsend = vi.fn();
		const user = userEvent.setup();
		render(SendToAnkiModal, { deckName: 'My words — 6 Nov', loadDecks: decks, onsend, onclose: () => {} });
		const input = (await screen.findByLabelText('New deck name')) as HTMLInputElement;
		expect(screen.getByText(/Makes a new deck “My words — 6 Nov”/)).toBeInTheDocument();
		await user.clear(input);
		await user.type(input, 'Lesson 3');
		await user.click(screen.getByText('Settings'));
		await user.click(screen.getByRole('switch', { name: /Open it in Anki/ }));
		await user.click(screen.getByRole('button', { name: 'Create and send' }));
		expect(onsend).toHaveBeenCalledWith('Lesson 3', { ask: true, openAfter: false });
		expect(JSON.parse(localStorage.getItem('xhz.anki.send')!)).toEqual({ ask: true, openAfter: false });
	});

	it('typing a name Anki already has sends to that deck', async () => {
		const onsend = vi.fn();
		const user = userEvent.setup();
		render(SendToAnkiModal, { deckName: 'x', loadDecks: decks, onsend, onclose: () => {} });
		const input = await screen.findByLabelText('New deck name');
		await user.clear(input);
		await user.type(input, 'boya');
		expect(screen.getByText(/Adds new words to “Boya”/)).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Send' }));
		expect(onsend).toHaveBeenCalledWith('Boya', expect.anything());
	});

	it('a prebuilt deck only says where it goes and that it updates in place', async () => {
		const onsend = vi.fn();
		const user = userEvent.setup();
		render(SendToAnkiModal, { fixed: true, deckName: 'Anki xiehanzi::New HSK (2025)', loadDecks: decks, onsend, onclose: () => {} });
		expect(await screen.findByText('Anki xiehanzi › New HSK (2025)')).toBeInTheDocument();
		expect(screen.getByText(/Already in your Anki: updates it in place/)).toBeInTheDocument();
		expect(screen.queryByRole('radio')).toBeNull();
		await user.click(screen.getByRole('button', { name: 'Send' }));
		expect(onsend).toHaveBeenCalledWith('Anki xiehanzi::New HSK (2025)', expect.anything());
	});

	it('shows why Anki could not be reached, with a retry', async () => {
		const loadDecks = vi.fn().mockRejectedValueOnce(new Error('Anki not found.')).mockResolvedValue(['Boya']);
		const user = userEvent.setup();
		render(SendToAnkiModal, { deckName: 'x', loadDecks, onsend: () => {}, onclose: () => {} });
		expect(await screen.findByText(/Anki not found/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Create and send' })).toBeDisabled();
		await user.click(screen.getByRole('button', { name: 'Try again' }));
		expect(await screen.findByRole('radio', { name: 'Boya' })).toBeInTheDocument();
	});
});
