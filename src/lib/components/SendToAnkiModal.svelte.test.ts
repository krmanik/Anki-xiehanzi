import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SendToAnkiModal from './SendToAnkiModal.svelte';

beforeEach(() => localStorage.clear());

const decks = async () => ['Default', 'Boya', 'Anki xiehanzi::New HSK (2025)'];

describe('SendToAnkiModal', () => {
	it('creates a new deck by the typed name, and remembers "Open in Anki after"', async () => {
		const onsend = vi.fn();
		const user = userEvent.setup();
		render(SendToAnkiModal, { deckName: 'My words — 6 Nov', loadDecks: decks, onsend, onclose: () => {} });
		const input = (await screen.findByLabelText('New deck name')) as HTMLInputElement;
		expect(screen.getByRole('button', { name: 'New deck' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByText(/Makes a new deck “My words — 6 Nov”/)).toBeInTheDocument();
		await user.clear(input);
		await user.type(input, 'Lesson 3');
		await user.click(screen.getByLabelText('Open in Anki after'));
		await user.click(screen.getByRole('button', { name: 'Create and send' }));
		expect(onsend).toHaveBeenCalledWith('Lesson 3', { openAfter: false });
		expect(JSON.parse(localStorage.getItem('xhz.anki.send')!)).toEqual({ openAfter: false });
	});

	it('typing a name Anki already has sends to that deck', async () => {
		const onsend = vi.fn();
		const user = userEvent.setup();
		render(SendToAnkiModal, { deckName: 'x', loadDecks: decks, onsend, onclose: () => {} });
		const input = await screen.findByLabelText('New deck name');
		await user.clear(input);
		await user.type(input, 'boya');
		expect(screen.getByText(/New words go into “Boya”/)).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Confirm and send' }));
		expect(onsend).toHaveBeenCalledWith('Boya', expect.anything());
	});

	it('picks a deck from the Existing deck list', async () => {
		const onsend = vi.fn();
		const user = userEvent.setup();
		render(SendToAnkiModal, { deckName: 'x', loadDecks: decks, onsend, onclose: () => {} });
		await screen.findByLabelText('New deck name');
		await user.click(screen.getByRole('button', { name: 'Existing deck' }));
		expect(screen.getByRole('button', { name: 'Confirm and send' })).toBeDisabled();
		await user.click(screen.getByRole('radio', { name: /New HSK \(2025\)/ }));
		await user.click(screen.getByRole('button', { name: 'Confirm and send' }));
		expect(onsend).toHaveBeenCalledWith('Anki xiehanzi::New HSK (2025)', expect.anything());
	});

	it('a prebuilt deck only says where it goes and that it updates in place', async () => {
		const onsend = vi.fn();
		const user = userEvent.setup();
		render(SendToAnkiModal, { fixed: true, deckName: 'Anki xiehanzi::New HSK (2025)', loadDecks: decks, onsend, onclose: () => {} });
		expect(await screen.findByText('Anki xiehanzi › New HSK (2025)')).toBeInTheDocument();
		expect(screen.getByText(/Already in your Anki: updates it in place/)).toBeInTheDocument();
		expect(screen.queryByRole('radio')).toBeNull();
		expect(screen.queryByRole('button', { name: 'Existing deck' })).toBeNull();
		await user.click(screen.getByRole('button', { name: 'Confirm and send' }));
		expect(onsend).toHaveBeenCalledWith('Anki xiehanzi::New HSK (2025)', expect.anything());
	});

	it('checks the chosen deck and warns it may overwrite before the confirm', async () => {
		const onsend = vi.fn();
		const countNotes = vi.fn(async (deck: string) => (deck === 'Boya' ? 340 : 0));
		const user = userEvent.setup();
		render(SendToAnkiModal, { deckName: 'Boya', loadDecks: decks, countNotes, onsend, onclose: () => {} });
		expect(await screen.findByText('It already holds 340 notes.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Existing deck' })).toHaveAttribute('aria-pressed', 'true');
		expect(countNotes).toHaveBeenCalledWith('Boya');
		expect(screen.getByRole('note')).toHaveTextContent(/May overwrite\..*edits you made in Anki are lost.*Reviews and progress are kept/);
		expect(onsend).not.toHaveBeenCalled();
		await user.click(screen.getByRole('button', { name: 'Confirm and send' }));
		expect(onsend).toHaveBeenCalledWith('Boya', { openAfter: true });
	});

	it('has no setting to skip the check', async () => {
		render(SendToAnkiModal, { deckName: 'x', loadDecks: decks, onsend: () => {}, onclose: () => {} });
		await screen.findByLabelText('New deck name');
		expect(screen.getAllByRole('checkbox')).toHaveLength(1);
		expect(screen.queryByText(/Ask every time/)).toBeNull();
	});

	it('shows why Anki could not be reached, with a retry', async () => {
		const loadDecks = vi.fn().mockRejectedValueOnce(new Error('Anki not found.')).mockResolvedValue(['Boya']);
		const user = userEvent.setup();
		render(SendToAnkiModal, { deckName: 'x', loadDecks, onsend: () => {}, onclose: () => {} });
		expect(await screen.findByText(/Anki not found/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Create and send' })).toBeDisabled();
		await user.click(screen.getByRole('button', { name: 'Try again' }));
		expect(await screen.findByLabelText('New deck name')).toBeInTheDocument();
	});

	it('leaves filtered decks out of the list and refuses a name under one', async () => {
		const onsend = vi.fn();
		const user = userEvent.setup();
		const loadDecks = async () => ({ decks: ['Default', 'Boya'], filtered: ['Due today'] });
		render(SendToAnkiModal, { deckName: 'x', loadDecks, onsend, onclose: () => {} });
		const input = await screen.findByLabelText('New deck name');
		await user.click(screen.getByRole('button', { name: 'Existing deck' }));
		expect(screen.queryByRole('radio', { name: /Due today/ })).toBeNull();
		await user.click(screen.getByRole('button', { name: 'New deck' }));
		await user.clear(screen.getByLabelText('New deck name'));
		await user.type(screen.getByLabelText('New deck name'), 'due today::Lesson');
		expect(screen.getByRole('alert')).toHaveTextContent('“Due today” is a filtered deck');
		expect(screen.getByRole('button', { name: 'Create and send' })).toBeDisabled();
		void input;
	});

	it('shows the caller’s check for a deck Anki already has', async () => {
		const checkTarget = vi.fn(async (d: string) => (d === 'Boya' ? 'Holds 3 notes from an older version.' : null));
		render(SendToAnkiModal, { deckName: 'Boya', loadDecks: decks, checkTarget, onsend: () => {}, onclose: () => {} });
		expect(await screen.findByText('Holds 3 notes from an older version.')).toBeInTheDocument();
		expect(checkTarget).toHaveBeenCalledWith('Boya');
	});
});
