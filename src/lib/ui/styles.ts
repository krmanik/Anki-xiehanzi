/**
 * Class builders for the base components (`src/lib/ui/*.svelte`). Pure, so the
 * variants are unit-tested in the node project. Every class is a literal
 * string here — Tailwind finds utilities by scanning source text, so a class
 * assembled from pieces (`bg-${hue}`) would never be generated.
 *
 * The look is "Objects": one accent (the ink), black pills that squish when
 * pressed, white objects with soft shadows. Colour is kept for meaning —
 * status (ok · warn · err), Premium (gold) and the tones on hanzi.
 */

/**
 * The older hue names, kept so data that still carries one (nav entries, shop
 * products) type-checks. In CSS they are aliases of roles:
 * sky → accent · lavender → premium gold · apricot → warn · rose → err · mint → ok.
 */
export type Hue = 'rose' | 'apricot' | 'mint' | 'sky' | 'lavender';
export type Tint = Hue | 'neutral';

export const HUES: readonly Hue[] = ['rose', 'apricot', 'mint', 'sky', 'lavender'];

/** Soft ground + deep ink text: status badges and notes. */
export const SOFT: Record<Tint, string> = {
	rose: 'bg-err-soft text-err-ink',
	apricot: 'bg-warn-soft text-warn-ink',
	mint: 'bg-ok-soft text-ok-ink',
	sky: 'bg-sunk text-ink',
	lavender: 'bg-gold-soft text-gold-ink',
	neutral: 'bg-sunk text-muted'
};

/**
 * Filled badge: a label laid over a picture, where a soft tint vanishes into a
 * white screenshot. Premium is the gold; everything else is the ink.
 */
export const STRONG: Record<Tint, string> = {
	rose: 'bg-err-ink text-ground',
	apricot: 'bg-warn-ink text-ground',
	mint: 'bg-ok-ink text-ground',
	sky: 'bg-accent text-on-accent',
	lavender: 'bg-gold text-on-gold',
	neutral: 'bg-accent text-on-accent'
};

/** A panel's ground: a white object, a sunk well, or an inverted ink tile. */
export type Panel = 'plain' | 'sunk' | 'invert';
export const PANEL: Record<Panel, string> = {
	plain: 'bg-surface shadow-object',
	sunk: 'bg-sunk',
	invert: 'xhz-invert bg-ink text-ground'
};

/** Hue for a Mandarin tone (1–4); the neutral tone and anything else is null. */
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

/**
 * primary — the black pill · secondary — a white pill on a hairline ·
 * ghost — text until hovered · danger — soft red · premium — gold, for
 * Premium only · soft — a sunk pill (status tints via `tint`) · text — a link.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'premium' | 'soft' | 'text';
export type ButtonSize = 'lg' | 'md' | 'sm';

export const FOCUS = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent';

/** Grows a hair on hover, squishes on press, springs back. */
const SQUISH =
	'transition-[transform,box-shadow,background-color,color] duration-[350ms] ease-spring hover:scale-[1.035] active:scale-95 active:duration-100';

const BUTTON_VARIANT: Record<Exclude<ButtonVariant, 'soft'>, string> = {
	primary: cx('bg-accent text-on-accent shadow-press', SQUISH),
	secondary: cx('bg-surface text-ink shadow-[0_0_0_1px_var(--xhz-line),var(--xhz-shadow)]', SQUISH),
	ghost: 'bg-transparent text-ink transition-colors hover:bg-sunk active:scale-95',
	danger: cx('bg-err-soft text-err-ink', SQUISH),
	premium: cx(
		'bg-gold text-on-gold shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_8px_18px_-10px_rgb(160_110_0/0.7)]',
		SQUISH
	),
	text: 'bg-transparent text-ink underline-offset-4 hover:underline'
};

/** A soft button: a sunk pill, or a status tint for a status action. */
const SOFT_BUTTON: Record<Tint, string> = {
	rose: cx('bg-err-soft text-err-ink', SQUISH),
	apricot: cx('bg-warn-soft text-warn-ink', SQUISH),
	mint: cx('bg-ok-soft text-ok-ink', SQUISH),
	sky: cx('bg-sunk text-ink', SQUISH),
	lavender: cx('bg-gold-soft text-gold-ink', SQUISH),
	neutral: cx('bg-sunk text-ink', SQUISH)
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
	lg: 'min-h-[50px] px-6 text-base',
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
	tint: Tint = 'neutral'
): string {
	return cx(
		'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-0 font-semibold whitespace-nowrap no-underline',
		'disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40',
		FOCUS,
		// A text button keeps the hit area but drops the pill padding.
		variant === 'text' ? TEXT_SIZE[size] : BUTTON_SIZE[size],
		variant === 'soft' ? SOFT_BUTTON[tint] : BUTTON_VARIANT[variant]
	);
}

/**
 * A filter chip. Unselected sits sunk; selected is raised — a white object with
 * a soft shadow that pops in, the segmented control's selected item. `onTint`
 * is for a chip on a sunk ground, where the sunk fill would vanish.
 */
export function chipClass(selected: boolean, onTint = false): string {
	return cx(
		'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border-0 px-3.5 text-sm font-semibold no-underline transition-colors',
		FOCUS,
		selected
			? 'bg-surface text-ink shadow-pop ring-1 ring-line motion-safe:animate-[xhz-pop_0.35s_var(--ease-spring)]'
			: onTint
				? 'bg-surface text-muted hover:text-ink'
				: 'bg-sunk text-muted hover:text-ink'
	);
}

/** A row of chips that reads as one segmented control: the sunk track. */
export const SEG = 'xhz-seg';

/** The round checkbox (a native input; see `.xhz-check` in app.css). */
export const CHECK = 'xhz-check';

/** A search / text field: sunk at rest, white with an ink ring on focus. */
export const FIELD =
	'flex min-h-12 items-center gap-2.5 rounded-card bg-sunk px-4 text-muted transition-[background-color,box-shadow] focus-within:bg-surface focus-within:shadow-[0_0_0_2px_var(--xhz-accent)]';
/** The bare input inside a FIELD. */
export const FIELD_INPUT =
	'w-full border-0 bg-transparent p-0 text-[15px] text-ink placeholder:text-muted focus:ring-0 focus:outline-none';

/** A round icon button (the top bar's, a row's play button). */
export const ICON_BUTTON =
	'grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border-0 bg-transparent text-muted transition-[background-color,color,transform] duration-300 ease-spring hover:bg-sunk hover:text-ink active:scale-90 focus-visible:outline-3 focus-visible:outline-accent';

/** The modal backdrop, one token for every dialog. */
export const SCRIM = 'bg-scrim backdrop-blur-[2px]';

/** A modal / dialog panel. */
export const DIALOG = 'rounded-tile bg-surface text-ink shadow-raised';

/** Buttons inside the selection island, which is dark in both themes. */
export const ISLAND_PRIMARY =
	'inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-white px-4 text-sm font-semibold whitespace-nowrap text-black no-underline transition-transform duration-300 ease-spring hover:scale-[1.035] active:scale-95 focus-visible:outline-3 focus-visible:outline-white';
export const ISLAND_GHOST =
	'inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-3.5 text-sm font-semibold whitespace-nowrap text-white no-underline transition-colors hover:bg-white/12 focus-visible:outline-3 focus-visible:outline-white';

/** A section heading on a landing page. */
export const SECTION_H2 = 'm-0 text-[32px] leading-none font-bold tracking-[-0.04em] text-ink sm:text-[44px]';

/** The page column, lined up with the floating nav. */
export const PAGE = 'mx-auto max-w-[1180px] px-4 sm:px-7';
