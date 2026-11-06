/**
 * The site's navigation, as data: the sidebar groups, the landing page's top
 * bar, and which entry a path belongs to. Pure — paths are given without the
 * GitHub Pages base, and `withBase` adds it at render time.
 */
import type { Hue } from './ui/styles';

export type NavIcon = 'home' | 'layers' | 'grid' | 'book' | 'plus' | 'wrench' | 'star' | 'bookmark';
/** The tools submenu's icons. */
export type ToolIcon = 'reader' | 'gauge' | 'pencil' | 'cards';

export interface NavItem {
	label: string;
	path: string;
	icon: NavIcon | ToolIcon;
	hue: Hue;
	/** Older paths that should light this entry too. */
	aliases?: string[];
	/** One line under the label, in a submenu. */
	blurb?: string;
	/** A submenu: the top bar opens these instead of following `path`. */
	children?: NavItem[];
}

export interface NavGroup {
	label: string;
	items: NavItem[];
}

export const LEARN: NavGroup = {
	label: 'Learn',
	items: [
		{ label: 'Home', path: '/', icon: 'home', hue: 'rose' },
		// `/decks` is the older URL of the HSK landing page and renders the same page.
		{ label: 'HSK', path: '/hsk', icon: 'layers', hue: 'sky', aliases: ['/decks'] },
		{ label: 'Radicals', path: '/radicals', icon: 'grid', hue: 'apricot' },
		{ label: 'Dictionary', path: '/dictionary', icon: 'book', hue: 'mint' }
	]
};

/** The study tools — a submenu, not a page of cards to read first. */
export const TOOLS: NavItem = {
	label: 'Tools',
	path: '/tools',
	icon: 'wrench',
	hue: 'mint',
	children: [
		{ label: 'Reader', path: '/tools/reader', icon: 'reader', hue: 'sky', blurb: 'Paste text, tap any word' },
		{ label: 'HSK coverage', path: '/tools/coverage', icon: 'gauge', hue: 'mint', blurb: 'How much of a text you know' },
		{ label: 'Worksheets', path: '/tools/worksheets', icon: 'pencil', hue: 'apricot', blurb: 'Stroke practice to print' },
		{ label: 'Flashcards', path: '/tools/flashcards', icon: 'cards', hue: 'rose', blurb: 'Two-sided cards to print' }
	]
};

export const MAKE: NavGroup = {
	label: 'Make',
	items: [
		{ label: 'Create', path: '/create', icon: 'plus', hue: 'lavender' },
		{ label: 'My words', path: '/words', icon: 'bookmark', hue: 'rose' }
	]
};

export const SHOP: NavItem = { label: 'Premium', path: '/shop', icon: 'star', hue: 'apricot' };

/** The ☰ drawer's groups: the tools are listed out, there is no hover there. */
export const SIDEBAR: NavGroup[] = [MAKE, LEARN, { label: 'Tools', items: TOOLS.children! }];

/**
 * The top bar on every page (decision D1, revised: no sidebar — one top bar,
 * links inline from 1024px, the drawer below). Home is the logo.
 */
// Create leads: making a deck is what the site is for.
export const TOPBAR: NavItem[] = [MAKE.items[0], LEARN.items[1], LEARN.items[3], LEARN.items[2], TOOLS];

/** Drop the base path and any trailing slash: `/Anki-xiehanzi/hsk/` → `/hsk`. */
export function stripBase(pathname: string, base: string): string {
	let p = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
	if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
	return p || '/';
}

export function withBase(path: string, base: string): string {
	return path === '/' ? `${base}/` : `${base}${path}`;
}

/** Whether the current path sits under an entry (`/hsk/new/3` lights "HSK"). */
export function isActive(current: string, item: Pick<NavItem, 'path' | 'aliases'>): boolean {
	return [item.path, ...(item.aliases ?? [])].some((p) =>
		p === '/' ? current === '/' : current === p || current.startsWith(`${p}/`)
	);
}

/** The dictionary page reads its query from `?q=`. */
export function searchHref(query: string, base: string): string | null {
	const q = query.trim();
	return q ? `${base}/dictionary?q=${encodeURIComponent(q)}` : null;
}
