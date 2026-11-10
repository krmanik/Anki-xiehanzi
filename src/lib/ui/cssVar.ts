/**
 * A design token's current value, for the few places that need a literal
 * colour rather than a class: Hanzi Writer's stroke options and SVG strings
 * built in script. Reads the computed value on <html>, so it follows the
 * theme; callers that must repaint on a theme switch read `currentTheme()`
 * from `$lib/theme.svelte` in the same effect.
 */
export function cssVar(name: string, fallback: string): string {
	if (typeof document === 'undefined') return fallback;
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** The site's tone colour for tone 1–5 (anything else is tone 5). */
export function toneColor(tone: number): string {
	const t = tone >= 1 && tone <= 4 ? tone : 5;
	return cssVar(`--xhz-t${t}`, ['#d61f3d', '#b05500', '#007e48', '#0b6cd6', '#6e6e6e'][t - 1]);
}
