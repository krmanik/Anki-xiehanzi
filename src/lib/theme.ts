/**
 * Light / dark preference, pure half. The stored value lives under
 * `localStorage['xhz.theme']`; `src/app.html` reads the same key before first
 * paint so a dark page never flashes white. Keep the two in step.
 */

export type ThemePref = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'xhz.theme';

/** An unset preference follows the OS until the reader picks one. */
export const DEFAULT_PREF: ThemePref = 'system';

export function parsePref(raw: string | null | undefined): ThemePref {
	return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : DEFAULT_PREF;
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
	return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;
}

/** The toggle's next state: light → dark → light (system is chosen by leaving it unset). */
export function nextTheme(current: Theme): Theme {
	return current === 'dark' ? 'light' : 'dark';
}
