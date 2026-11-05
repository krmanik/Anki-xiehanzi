/**
 * Light / dark preference, pure half. The stored value lives under
 * `localStorage['xhz.theme']`; `src/app.html` reads the same key before first
 * paint so a dark page never flashes white. Keep the two in step.
 */

export type ThemePref = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'xhz.theme';

/**
 * What an unset preference means. `light` until every page is on the design
 * tokens: pages not yet redesigned hardcode white panels and grey text, so
 * following a dark OS setting would put them on a dark ground half-styled.
 */
export const DEFAULT_PREF: ThemePref = 'light';

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
