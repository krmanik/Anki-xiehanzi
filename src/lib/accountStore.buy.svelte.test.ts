import { afterEach, describe, expect, it, vi } from 'vitest';
import { account } from '$lib/accountStore.svelte';
import { readPending } from '$lib/account';

afterEach(() => {
	account.state = null;
	localStorage.clear();
	vi.restoreAllMocks();
});

describe('account.buy', () => {
	it('goes straight to checkout logged out: no login tab, only the pending mark', () => {
		vi.spyOn(account, 'enabled', 'get').mockReturnValue(true);
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		account.state = { kind: 'out' };
		account.buy({ id: 'kangxi-radicals' });
		expect(open).not.toHaveBeenCalled();
		expect(readPending()?.product).toBe('kangxi-radicals');
	});
});
