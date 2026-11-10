// Impure half of the theme: reads/writes storage and sets `data-theme` on <html>.
import { nextTheme, parsePref, resolveTheme, THEME_KEY, type Theme } from './theme';

let theme = $state<Theme>('light');

function systemDark(): boolean {
	return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply(t: Theme) {
	theme = t;
	document.documentElement.dataset.theme = t;
}

export function initTheme() {
	let raw: string | null = null;
	try {
		raw = localStorage.getItem(THEME_KEY);
	} catch {
		// Storage blocked (private mode, sandbox): fall back to the default.
	}
	const pref = parsePref(raw);
	apply(resolveTheme(pref, systemDark()));
	// Until the reader chooses, follow the OS as it changes (sunset switches).
	if (pref === 'system' && typeof matchMedia === 'function') {
		matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
			let chosen: string | null = null;
			try {
				chosen = localStorage.getItem(THEME_KEY);
			} catch {
				// Storage blocked: keep following the OS.
			}
			if (parsePref(chosen) === 'system') apply(e.matches ? 'dark' : 'light');
		});
	}
}

export function currentTheme(): Theme {
	return theme;
}

export function toggleTheme() {
	const t = nextTheme(theme);
	apply(t);
	try {
		localStorage.setItem(THEME_KEY, t);
	} catch {
		// The choice still holds for this page view.
	}
}
