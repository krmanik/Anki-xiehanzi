import { describe, expect, it } from 'vitest';
import { authPageUrl, safeBack, safeNext } from './account';

describe('login hand-back', () => {
	it('builds the /auth page with its next step', () => {
		const u = new URL(authPageUrl('https://krmanik.github.io', '/Anki-xiehanzi', { next: 'https://www.patreon.com/checkout/krmani?pvid=1', back: '/Anki-xiehanzi/shop' }));
		expect(u.pathname).toBe('/Anki-xiehanzi/auth');
		expect(u.searchParams.get('next')).toBe('https://www.patreon.com/checkout/krmani?pvid=1');
		expect(u.searchParams.get('back')).toBe('/Anki-xiehanzi/shop');
		expect(authPageUrl('http://localhost:5173', '')).toBe('http://localhost:5173/auth');
	});

	it('only continues to Patreon', () => {
		expect(safeNext('https://www.patreon.com/checkout/krmani?pvid=5027349')).toBe('https://www.patreon.com/checkout/krmani?pvid=5027349');
		expect(safeNext('https://www.patreon.com.evil.example/x')).toBeNull();
		expect(safeNext('https://evil.example/?https://www.patreon.com/')).toBeNull();
		expect(safeNext('javascript:alert(1)')).toBeNull();
		expect(safeNext(null)).toBeNull();
	});

	it('only goes back to this site', () => {
		expect(safeBack('/shop?p=hsk', 'http://localhost:5173')).toBe('/shop?p=hsk');
		expect(safeBack('https://evil.example/shop', 'http://localhost:5173')).toBeNull();
		expect(safeBack('//evil.example/shop', 'http://localhost:5173')).toBeNull();
		expect(safeBack('', 'http://localhost:5173')).toBeNull();
	});
});
