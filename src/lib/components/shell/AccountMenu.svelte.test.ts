import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import AccountMenu from './AccountMenu.svelte';
import { account } from '$lib/accountStore.svelte';
import type { Session } from '$lib/patreon';

const session: Session = {
	v: 1,
	sub: '1',
	name: 'Ada Lovelace',
	image: '',
	creator: false,
	member: null,
	purchases: null,
	iat: 1,
	exp: 2
};

afterEach(() => {
	account.state = null;
	vi.restoreAllMocks();
});

describe('AccountMenu', () => {
	it('logged out: one Log in button, no menu, no theme icon', async () => {
		vi.spyOn(account, 'enabled', 'get').mockReturnValue(true);
		const logIn = vi.spyOn(account, 'logIn').mockImplementation(() => {});
		account.state = { kind: 'out' };
		render(AccountMenu, { props: { current: '/', buttonClass: '' } });
		expect(screen.queryByRole('button', { name: /Account menu/ })).toBeNull();
		expect(screen.queryByRole('button', { name: /mode/ })).toBeNull();
		expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/krmanik/Anki-xiehanzi');
		await fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
		expect(logIn).toHaveBeenCalled();
	});

	it('draws nothing before the login is read', () => {
		vi.spyOn(account, 'enabled', 'get').mockReturnValue(true);
		render(AccountMenu, { props: { current: '/', buttonClass: '' } });
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('logged in: names the person, links My decks, and logs out', async () => {
		account.state = { kind: 'in', token: 't', session };
		render(AccountMenu, { props: { current: '/account', buttonClass: '' } });
		expect(screen.getByRole('button', { name: /mode/ })).toBeInTheDocument();
		const button = screen.getByRole('button', { name: 'Account menu for Ada Lovelace' });
		await fireEvent.click(button);
		expect(screen.getByRole('link', { name: /My decks/ })).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: /My words/ })).toHaveAttribute('href', '/words');

		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(screen.queryByRole('link', { name: /My words/ })).toBeNull();
		expect(button).toHaveFocus();

		await fireEvent.click(button);

		await fireEvent.click(screen.getByRole('button', { name: /Log out/ }));
		expect(account.state).toEqual({ kind: 'out' });
		expect(screen.queryByRole('button', { name: /Account menu/ })).toBeNull();
	});

	it('dev builds show the theme icon logged out too', () => {
		account.state = { kind: 'out' };
		render(AccountMenu, { props: { current: '/', buttonClass: '', showThemeToggle: true } });
		expect(screen.getByRole('button', { name: /mode/ })).toBeInTheDocument();
	});
});
