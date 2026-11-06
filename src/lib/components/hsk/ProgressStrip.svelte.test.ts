import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ProgressStrip from './ProgressStrip.svelte';
import { anki } from '$lib/anki/ankiStatus.svelte';
import { progress } from '$lib/anki/progress.svelte';

beforeEach(() => {
	anki.status = 'idle';
	progress.status = 'idle';
	progress.states = new Map();
});

describe('ProgressStrip', () => {
	it('is one button before Anki is connected', () => {
		render(ProgressStrip, { words: ['的', '了'] });
		expect(screen.getByRole('button', { name: /Show my progress/ })).toBeInTheDocument();
		expect(screen.queryByText(/known/)).not.toBeInTheDocument();
	});

	it('counts the list and filters by state', async () => {
		anki.status = 'ready';
		progress.status = 'ready';
		progress.states = new Map([
			['的', 'known'],
			['了', 'learning'],
			['走', 'known']
		]);
		const user = userEvent.setup();
		render(ProgressStrip, { words: ['的', '了', '在', '是'] });
		expect(screen.getByText(/1 of 4 known/)).toBeInTheDocument();
		expect(screen.getByText('1 learning')).toBeInTheDocument();
		const known = screen.getByRole('button', { name: /Known/ });
		expect(known).toHaveAttribute('aria-pressed', 'false');
		await user.click(known);
		expect(known).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: /All/ })).toHaveAttribute('aria-pressed', 'false');
	});
});
