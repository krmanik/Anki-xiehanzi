/**
 * Class builders for the base components (`src/lib/ui/*.svelte`). Pure, so the
 * variants are unit-tested in the node project. Every class is a literal
 * string here — Tailwind finds utilities by scanning source text, so a class
 * assembled from pieces (`bg-${hue}`) would never be generated.
 */

export type Hue = 'rose' | 'apricot' | 'mint' | 'sky' | 'lavender';
export type Tint = Hue | 'neutral';

export const HUES: readonly Hue[] = ['rose', 'apricot', 'mint', 'sky', 'lavender'];

/** Soft ground + deep ink text: panels, badges, selected rows. */
export const SOFT: Record<Tint, string> = {
	rose: 'bg-rose-soft text-rose-ink',
	apricot: 'bg-apricot-soft text-apricot-ink',
	mint: 'bg-mint-soft text-mint-ink',
	sky: 'bg-sky-soft text-sky-ink',
	lavender: 'bg-lavender-soft text-lavender-ink',
	neutral: 'bg-sunk text-muted'
};

/** The pastel itself under a white glyph: icon dots, level tiles. */
export const SOLID: Record<Hue, string> = {
	rose: 'bg-rose text-white',
	apricot: 'bg-apricot text-white',
	mint: 'bg-mint text-white',
	sky: 'bg-sky text-white',
	lavender: 'bg-lavender text-white'
};

/** A soft panel's ground only, for cards whose text stays ink/muted. */
export const PANEL: Record<Tint | 'plain', string> = {
	plain: 'bg-surface ring-1 ring-inset ring-line',
	neutral: 'bg-sunk',
	rose: 'bg-rose-soft',
	apricot: 'bg-apricot-soft',
	mint: 'bg-mint-soft',
	sky: 'bg-sky-soft',
	lavender: 'bg-lavender-soft'
};

/** Hue for a Mandarin tone (1–4); the neutral tone and anything else is grey. */
export function toneHue(tone: number | string): Hue | null {
	const t = Number(tone);
	return t === 1 ? 'rose' : t === 2 ? 'apricot' : t === 3 ? 'mint' : t === 4 ? 'sky' : null;
}

/** `text-tone-N` for a tone, `text-tone-5` for the neutral tone or no tone. */
export function toneText(tone: number | string): string {
	const t = Number(tone);
	return t === 1
		? 'text-tone-1'
		: t === 2
			? 'text-tone-2'
			: t === 3
				? 'text-tone-3'
				: t === 4
					? 'text-tone-4'
					: 'text-tone-5';
}

export function cx(...parts: (string | false | null | undefined)[]): string {
	return parts.filter(Boolean).join(' ');
}

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'text';
export type ButtonSize = 'md' | 'sm';

const FOCUS =
	'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
	primary: 'bg-accent text-on-accent hover:brightness-110',
	secondary: 'bg-surface text-ink ring-[1.5px] ring-inset ring-line hover:bg-sunk',
	soft: 'bg-sky-soft text-sky-ink hover:brightness-95',
	text: 'text-accent hover:underline'
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
	md: 'min-h-11 px-5 text-[15px]',
	sm: 'min-h-9 px-4 text-sm'
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
	return cx(
		'inline-flex items-center justify-center gap-2 rounded-full font-semibold no-underline',
		'transition disabled:pointer-events-none disabled:opacity-50',
		FOCUS,
		// A text button keeps the hit area but drops the pill padding.
		variant === 'text' ? (size === 'md' ? 'min-h-11 px-1 text-[15px]' : 'min-h-9 px-1 text-sm') : BUTTON_SIZE[size],
		BUTTON_VARIANT[variant]
	);
}

export function chipClass(selected: boolean): string {
	return cx(
		'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors',
		FOCUS,
		// Selected uses the ink, not the pastel: white on the pastel fails AA at 14px.
		selected ? 'bg-sky-ink text-white' : 'bg-sunk text-muted hover:text-ink'
	);
}
