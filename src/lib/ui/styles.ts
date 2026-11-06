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

/**
 * Deep ink ground + page-coloured text: a badge laid over a picture, where a
 * soft tint vanishes into a white screenshot. `text-ground` is white in light
 * mode and near-black in dark, where the ink turns light.
 */
export const STRONG: Record<Tint, string> = {
	rose: 'bg-rose-ink text-ground',
	apricot: 'bg-apricot-ink text-ground',
	mint: 'bg-mint-ink text-ground',
	sky: 'bg-sky-ink text-ground',
	lavender: 'bg-lavender-ink text-ground',
	neutral: 'bg-ink text-ground'
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
export type ButtonSize = 'lg' | 'md' | 'sm';

const FOCUS =
	'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky';

const BUTTON_VARIANT: Record<Exclude<ButtonVariant, 'soft'>, string> = {
	primary:
		'bg-accent text-on-accent shadow-[0_6px_16px_-6px_var(--color-accent)] hover:-translate-y-px hover:brightness-110 hover:shadow-[0_10px_22px_-8px_var(--color-accent)]',
	secondary: 'bg-surface text-ink ring-[1.5px] ring-inset ring-line hover:bg-sunk',
	text: 'text-accent hover:underline'
};

/** A soft button in any hue: the pastel ground of a badge, but pressable. */
const SOFT_BUTTON: Record<Tint, string> = {
	rose: 'bg-rose-soft text-rose-ink ring-1 ring-inset ring-rose/25 hover:ring-rose/60',
	apricot: 'bg-apricot-soft text-apricot-ink ring-1 ring-inset ring-apricot/25 hover:ring-apricot/60',
	mint: 'bg-mint-soft text-mint-ink ring-1 ring-inset ring-mint/25 hover:ring-mint/60',
	sky: 'bg-sky-soft text-sky-ink ring-1 ring-inset ring-sky/25 hover:ring-sky/60',
	lavender: 'bg-lavender-soft text-lavender-ink ring-1 ring-inset ring-lavender/25 hover:ring-lavender/60',
	neutral: 'bg-sunk text-ink ring-1 ring-inset ring-line hover:ring-muted/40'
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
	lg: 'min-h-12 px-5 text-base',
	md: 'min-h-11 px-5 text-[15px]',
	sm: 'min-h-9 px-4 text-sm'
};

const TEXT_SIZE: Record<ButtonSize, string> = {
	lg: 'min-h-12 px-1 text-base',
	md: 'min-h-11 px-1 text-[15px]',
	sm: 'min-h-9 px-1 text-sm'
};

export function buttonClass(
	variant: ButtonVariant = 'primary',
	size: ButtonSize = 'md',
	tint: Tint = 'sky'
): string {
	return cx(
		'inline-flex items-center justify-center gap-2 rounded-full font-semibold no-underline',
		'transition active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
		FOCUS,
		// A text button keeps the hit area but drops the pill padding.
		variant === 'text' ? TEXT_SIZE[size] : BUTTON_SIZE[size],
		variant === 'soft' ? SOFT_BUTTON[tint] : BUTTON_VARIANT[variant]
	);
}

/** `onTint`: the chip sits on a soft panel, where grey would vanish — white instead. */
export function chipClass(selected: boolean, onTint = false): string {
	return cx(
		'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors',
		FOCUS,
		// Selected uses the ink, not the pastel: white on the pastel fails AA at 14px.
		selected
			? 'bg-sky-ink text-white'
			: onTint
				? 'bg-surface text-ink hover:brightness-95'
				: 'bg-sunk text-muted hover:text-ink'
	);
}
