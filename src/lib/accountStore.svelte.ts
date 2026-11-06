/**
 * The login as reactive state, shared by the header, `/shop` and `/account`.
 *
 * Buying with as little hopping as Patreon allows — **this page never goes
 * away**:
 *   - Buy always opens Patreon's checkout in a new tab — no login first.
 *     Back on the shop, a logged-out buyer is asked to log in to see it.
 *   - Log in (header, shop, account) opens one tab that logs in (Patreon's
 *     "Allow", once), stores the login and closes itself.
 * The login reaches this tab through localStorage (`storage` event), so every
 * open tab updates at once — logging out in one logs out all.
 * Back on this tab, `/refresh` re-reads purchases with the creator token (no
 * Patreon screen) and the product shows "Unlocked". Patreon can take a moment
 * to count a sale, so the check retries before saying "not showing yet".
 */
import { base } from '$app/paths';
import { replaceState } from '$app/navigation';
import {
	AUTH_URL,
	authPageUrl,
	clearPending,
	clearToken,
	loginUrl,
	markPending,
	readPending,
	refreshToken,
	resolveAccount,
	storeToken,
	TOKEN_KEY,
	type AccountState
} from '$lib/account';
import { readSession, unlocks, type Session } from '$lib/patreon';

type Product = { id: string; unlockTiers?: readonly string[] };

const RETRY_MS = [0, 4000, 10000, 20000];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

class AccountStore {
	state = $state<AccountState | null>(null);
	/** A purchase check is running. */
	checking = $state(false);
	/** Product id confirmed after a purchase — the page says "Unlocked". */
	unlocked = $state<string | null>(null);
	/** Product id bought but not visible yet (or not logged in to see it). */
	waiting = $state<string | null>(null);

	#busy = false;
	#listening = false;

	get session(): Session | null {
		return this.state?.kind === 'in' ? this.state.session : null;
	}

	get enabled(): boolean {
		return !!AUTH_URL;
	}

	/**
	 * Read the login (a fresh one in the URL fragment wins), tidy the address
	 * bar, and follow logins and logouts made in other tabs.
	 */
	init(): void {
		if (!this.#listening) {
			this.#listening = true;
			window.addEventListener('storage', (e) => {
				if (e.key === TOKEN_KEY || e.key === null) this.#reload();
			});
		}
		if (this.state) return;
		const s = resolveAccount(location.hash, now());
		this.state = s;
		if (s.fromFragment) {
			const url = new URL(location.href);
			url.hash = '';
			try {
				replaceState(url, {});
			} catch {
				history.replaceState(history.state, '', url.pathname + url.search);
			}
		}
	}

	owns(product: Product): boolean {
		return unlocks(this.session, product);
	}

	/**
	 * Log in in a new tab that closes itself once done; this tab picks the
	 * login up from storage. A blocked pop-up falls back to this tab.
	 */
	logIn(): void {
		this.#openLogin({ back: location.pathname + location.search });
	}

	logOut(): void {
		clearToken();
		this.state = { kind: 'out' };
		this.unlocked = null;
		this.waiting = null;
	}

	/**
	 * Buy was pressed: the link goes straight to Patreon's checkout. This only
	 * remembers the product, so the shop can confirm the purchase when the
	 * reader comes back (logged out, it asks them to log in to see it).
	 */
	buy(product: Product): void {
		markPending(product.id);
		this.unlocked = null;
		this.waiting = null;
	}

	/** Re-read purchases through the Worker. True when the session changed. */
	async refresh(): Promise<boolean> {
		if (this.state?.kind !== 'in') return false;
		const next = await refreshToken(this.state.token);
		if (next === null) {
			clearToken();
			this.state = { kind: 'out', expired: true };
			return false;
		}
		const session = readSession(next);
		if (!next || !session) return false;
		storeToken(next);
		this.state = { kind: 'in', token: next, session };
		return true;
	}

	/** After a Buy: see whether the purchase shows yet. Safe to call often. */
	async checkPending(products: readonly Product[]): Promise<void> {
		const pending = readPending();
		if (!pending || this.#busy) return;
		const product = products.find((p) => p.id === pending.product);
		if (!product) return clearPending();

		if (this.owns(product)) return this.#done(product.id);
		if (this.state?.kind !== 'in') {
			this.waiting = product.id;
			return;
		}

		this.#busy = true;
		this.checking = true;
		this.waiting = null;
		try {
			for (const ms of RETRY_MS) {
				await wait(ms);
				await this.refresh();
				if (this.owns(product)) return this.#done(product.id);
				if (this.state?.kind !== 'in') break;
			}
			this.waiting = product.id;
		} finally {
			this.checking = false;
			this.#busy = false;
		}
	}

	dismiss(): void {
		this.unlocked = null;
		this.waiting = null;
		clearPending();
	}

	#openLogin(opts: { next?: string; back?: string }): void {
		const url = loginUrl(authPageUrl(location.origin, base, opts));
		const tab = window.open(url, '_blank');
		if (!tab) location.href = url;
	}

	/** Another tab logged in or out. */
	#reload(): void {
		const s = resolveAccount('', now());
		this.state = s;
		if (s.kind === 'out') {
			this.unlocked = null;
			this.waiting = null;
		}
	}

	#done(id: string): void {
		clearPending();
		this.waiting = null;
		this.unlocked = id;
	}
}

const now = () => Math.floor(Date.now() / 1000);

export const account = new AccountStore();
