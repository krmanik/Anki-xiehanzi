/**
 * The site's navigation, as data: the sidebar groups, the landing page's top
 * bar, and which entry a path belongs to. Pure — paths are given without the
 * GitHub Pages base, and `withBase` adds it at render time.
 */
import type { Hue } from './ui/styles';

export type NavIcon = 'home' | 'layers' | 'grid' | 'book' | 'plus' | 'wrench' | 'star';

export interface NavItem {
	label: string;
	path: string;
	icon: NavIcon;
	hue: Hue;
	/** Older paths that should light this entry too. */
	aliases?: string[];
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
		{ label: 'HSK lists', path: '/hsk', icon: 'layers', hue: 'sky', aliases: ['/decks'] },
		{ label: 'Radicals', path: '/radicals', icon: 'grid', hue: 'apricot' },
		{ label: 'Dictionary', path: '/dictionary', icon: 'book', hue: 'mint' }
	]
};

export const MAKE: NavGroup = {
	label: 'Make',
	items: [
		{ label: 'Create a deck', path: '/create', icon: 'plus', hue: 'lavender' },
		{ label: 'Tools', path: '/tools', icon: 'wrench', hue: 'mint' }
	]
};

export const PREMIUM: NavItem = { label: 'Premium', path: '/shop', icon: 'star', hue: 'apricot' };

/** The ☰ drawer's groups. */
export const SIDEBAR: NavGroup[] = [LEARN, MAKE];

/**
 * The top bar on every page (decision D1, revised: no sidebar — one top bar,
 * links inline from 1024px, the drawer below). Home is the logo.
 */
export const TOPBAR: NavItem[] = [LEARN.items[1], LEARN.items[3], LEARN.items[2], MAKE.items[0], MAKE.items[1]];

/** Drop the base path and any trailing slash: `/Anki-xiehanzi/hsk/` → `/hsk`. */
export function stripBase(pathname: string, base: string): string {
	let p = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
	if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
	return p || '/';
}

export function withBase(path: string, base: string): string {
	return path === '/' ? `${base}/` : `${base}${path}`;
}

/** Whether the current path sits under an entry (`/hsk/new/3` lights "HSK lists"). */
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
