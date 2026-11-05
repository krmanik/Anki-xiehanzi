import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (url: string) => goto(url) }));

import NavMenu from './NavMenu.svelte';

describe('NavMenu', () => {
	it('marks the section of the current page, including sub-pages', () => {
		render(NavMenu, { props: { current: '/hsk/new/3' } });
		const nav = screen.getByRole('navigation', { name: 'Main' });
		expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('HSK lists');
	});

	it('lists Premium, the Learn / Make groups and every tool', () => {
		render(NavMenu, { props: { current: '/create' } });
		for (const name of ['Home', 'HSK lists', 'Radicals', 'Dictionary', 'Create a deck', 'Reader', 'Worksheets', 'Premium'])
			expect(screen.getByRole('link', { name })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Create a deck' })).toHaveAttribute('aria-current', 'page');
	});

	it('sends a search to the dictionary and tells the drawer to close', async () => {
		const onnavigate = vi.fn();
		render(NavMenu, { props: { current: '/', onnavigate } });
		const box = screen.getByRole('searchbox', { name: 'Look up a word' });
		await fireEvent.input(box, { target: { value: '你好' } });
		await fireEvent.submit(box.closest('form')!);
		expect(goto).toHaveBeenCalledWith('/dictionary?q=%E4%BD%A0%E5%A5%BD');
		expect(onnavigate).toHaveBeenCalled();
	});

	it('hides Share until the visitor opted out of the popup, and the theme toggle unless asked', () => {
		render(NavMenu, { props: { current: '/' } });
		expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
		expect(screen.queryByRole('button', { name: /dark mode/i })).toBeNull();
	});
});
