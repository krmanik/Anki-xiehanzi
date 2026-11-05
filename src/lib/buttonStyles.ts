// Legacy button class tokens, kept as names so older components need no edit.
// They now resolve to the redesign's `buttonClass` (src/lib/ui/styles.ts), so
// every page draws the same pill buttons in the theme's colours.
import { buttonClass, cx } from '$lib/ui/styles';

export const btnPrimary = buttonClass('primary', 'sm');
export const btnSecondary = buttonClass('secondary', 'sm');
export const btnDanger = cx(
	buttonClass('secondary', 'sm'),
	'bg-rose-soft text-rose-ink ring-0 hover:bg-rose-soft hover:brightness-95'
);
