import { describe, expect, it } from 'vitest';
import { isActive, LEARN, SHOP, searchHref, SIDEBAR, stripBase, TOOLS, TOPBAR, withBase } from './nav';
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
	it('lights HSK for the old /decks URL', () => {
		expect(isActive('/decks', hsk)).toBe(true);
	});
	it('does not match a longer sibling path', () => {
		expect(isActive('/hskfoo', hsk)).toBe(false);
		expect(isActive('/tools/reader', TOOLS)).toBe(true);
	});
	it('matches home only on the root', () => {
		expect(isActive('/', home)).toBe(true);
		expect(isActive('/hsk', home)).toBe(false);
		expect(isActive('/shop', SHOP)).toBe(true);
	});
});

it('the top bar carries the main destinations, home being the logo', () => {
	expect(TOPBAR.map((i) => i.path)).toEqual(['/create', '/hsk', '/dictionary', '/radicals', '/tools', '/words']);
});

it('Tools is a submenu in the top bar and a group in the drawer', () => {
	const tools = TOPBAR.find((i) => i.path === '/tools')!;
	expect(tools.children?.map((c) => c.path)).toEqual([
		'/tools/reader',
		'/tools/coverage',
		'/tools/worksheets',
		'/tools/flashcards'
	]);
	expect(tools.children!.every((c) => c.blurb)).toBe(true);
	expect(SIDEBAR.find((g) => g.label === 'Tools')?.items).toBe(tools.children);
	expect(SIDEBAR[0].items[0].path).toBe('/create');
});

it('searchHref encodes the query and ignores blanks', () => {
	expect(searchHref(' 你好 ', '/Anki-xiehanzi')).toBe('/Anki-xiehanzi/dictionary?q=%E4%BD%A0%E5%A5%BD');
	expect(searchHref('   ', '')).toBeNull();
});

describe('theme', () => {
	it('follows the OS until the reader picks a theme', () => {
		expect(parsePref(null)).toBe('system');
		expect(parsePref('purple')).toBe('system');
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
