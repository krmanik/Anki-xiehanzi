import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { page } from '$app/state';
import { PENDING_WORDS_KEY } from '$lib/hskHandoff';
import Page from '../routes/hsk/[list]/[level]/+page.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn(async () => {}) }));
vi.mock('$app/navigation', () => ({ goto }));

const words = [
	{ s: '中', t: '中', p: 'zhong1', y: 'zhōng', z: 'ㄓㄨㄥ', m: 'within; among', o: ['Noun'] },
	{ s: '会', t: '會', p: 'hui4', y: 'huì', z: 'ㄏㄨㄟˋ', m: 'can', o: ['Verb'], f: 40 },
	{ s: '发展', t: '發展', p: 'fa1 zhan3', y: 'fā zhǎn', z: 'ㄈㄚ ㄓㄢˇ', m: 'development', o: ['Verb', 'Noun'] }
];

const index = {
	generated: '2026-11-01',
	lists: [
		{ id: 'new', name: 'New HSK', year: '2025', subtitle: '', total: 3, levels: [{ level: '3', count: 3, file: 'new-3.json' }] },
		{ id: 'old', name: 'Old HSK', year: '2012', subtitle: '', total: 0, levels: [{ level: '1', count: 0, file: 'old-1.json' }] }
	]
};

beforeEach(() => {
	sessionStorage.clear();
	goto.mockClear();
	page.params = { list: 'new', level: '3' };
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => {
			const body = url.endsWith('index.json') ? index : url.endsWith('new-3.json') ? words : null;
			return { ok: body !== null, status: body ? 200 : 404, json: async () => body } as Response;
		})
	);
});

describe('HSK level page', () => {
	it('lists the words and filters by compact pinyin', async () => {
		const user = userEvent.setup();
		render(Page);
		const list = await screen.findByRole('list', { name: 'HSK 3 words' });
		expect(within(list).getAllByRole('listitem')).toHaveLength(3);
		await user.type(screen.getByRole('searchbox'), 'fazhan');
		expect(within(list).getAllByRole('listitem')).toHaveLength(1);
		expect(screen.getByText('1 of 3')).toBeInTheDocument();
	});

	it('hands the selected words to the deck creator', async () => {
		const user = userEvent.setup();
		render(Page);
		await screen.findByRole('list', { name: 'HSK 3 words' });
		await user.click(screen.getByRole('checkbox', { name: 'Select 会' }));
		await user.click(screen.getByRole('checkbox', { name: 'Select 发展' }));
		await user.click(screen.getByRole('button', { name: /add to my deck/i }));
		const pending = JSON.parse(sessionStorage.getItem(PENDING_WORDS_KEY)!);
		expect(pending.words).toEqual(['会', '发展']);
		expect(pending.label).toBe('New HSK (2025) · HSK 3');
		expect(goto).toHaveBeenCalledWith('/create');
	});
});
