import { describe, expect, it } from 'vitest';
import { isActive, isLanding, LEARN, MAKE, PREMIUM, searchHref, stripBase, withBase } from './nav';
import { nextTheme, parsePref, resolveTheme } from './theme';

const hsk = LEARN.items.find((i) => i.path === '/hsk')!;
const home = LEARN.items[0];

describe('stripBase / withBase', () => {
	it('drops the Pages base and a trailing slash', () => {
		expect(stripBase('/Anki-xiehanzi/hsk/new/3', '/Anki-xiehanzi')).toBe('/hsk/new/3');
		expect(stripBase('/Anki-xiehanzi/', '/Anki-xiehanzi')).toBe('/');
		expect(stripBase('/Anki-xiehanzi', '/Anki-xiehanzi')).toBe('/');
		expect(stripBase('/radicals/', '')).toBe('/radicals');
	});
	it('prefixes the base', () => {
		expect(withBase('/', '/Anki-xiehanzi')).toBe('/Anki-xiehanzi/');
		expect(withBase('/shop', '/Anki-xiehanzi')).toBe('/Anki-xiehanzi/shop');
		expect(withBase('/', '')).toBe('/');
	});
});

describe('isActive', () => {
	it('lights a section for its sub-pages', () => {
		expect(isActive('/hsk/new/3', hsk)).toBe(true);
		expect(isActive('/hsk', hsk)).toBe(true);
	});
	it('lights HSK lists for the old /decks URL', () => {
		expect(isActive('/decks', hsk)).toBe(true);
	});
	it('does not match a longer sibling path', () => {
		expect(isActive('/hskfoo', hsk)).toBe(false);
		expect(isActive('/tools/reader', MAKE.items[1])).toBe(true);
	});
	it('matches home only on the root', () => {
		expect(isActive('/', home)).toBe(true);
		expect(isActive('/hsk', home)).toBe(false);
		expect(isActive('/shop', PREMIUM)).toBe(true);
	});
});

it('only the root is the landing page', () => {
	expect(isLanding('/')).toBe(true);
	expect(isLanding('/docs')).toBe(false);
});

it('searchHref encodes the query and ignores blanks', () => {
	expect(searchHref(' 你好 ', '/Anki-xiehanzi')).toBe('/Anki-xiehanzi/dictionary?q=%E4%BD%A0%E5%A5%BD');
	expect(searchHref('   ', '')).toBeNull();
});

describe('theme', () => {
	it('defaults to light until pages are on the tokens', () => {
		expect(parsePref(null)).toBe('light');
		expect(parsePref('purple')).toBe('light');
		expect(parsePref('dark')).toBe('dark');
	});
	it('resolves system against the OS setting', () => {
		expect(resolveTheme('system', true)).toBe('dark');
		expect(resolveTheme('system', false)).toBe('light');
		expect(resolveTheme('light', true)).toBe('light');
	});
	it('toggles between light and dark', () => {
		expect(nextTheme('light')).toBe('dark');
		expect(nextTheme('dark')).toBe('light');
	});
});
