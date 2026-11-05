import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import NavDropdown from './NavDropdown.svelte';
import { TOOLS } from '$lib/nav';

describe('NavDropdown', () => {
	it('opens the tools as links and closes on Escape', async () => {
		render(NavDropdown, { props: { item: TOOLS, current: '/', linkClass: '' } });
		const button = screen.getByRole('button', { name: 'Tools' });
		expect(screen.queryByRole('link', { name: /Reader/ })).toBeNull();

		await fireEvent.click(button);
		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByRole('link', { name: /Reader/ })).toHaveAttribute('href', '/tools/reader');
		expect(screen.getAllByRole('link')).toHaveLength(4);

		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(screen.queryByRole('link', { name: /Reader/ })).toBeNull();
		expect(button).toHaveFocus();
	});

	it('marks the open tool as the current page', async () => {
		render(NavDropdown, { props: { item: TOOLS, current: '/tools/worksheets', linkClass: '' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Tools' }));
		expect(screen.getByRole('link', { name: /Worksheets/ })).toHaveAttribute('aria-current', 'page');
	});
});
