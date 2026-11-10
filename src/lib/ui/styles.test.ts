import { describe, expect, it } from 'vitest';
import { buttonClass, chipClass, cx, PANEL, SOFT, STRONG, toneHue, toneText } from './styles';

describe('tones', () => {
	it('maps tones 1–4 to the old hue names', () => {
		expect([1, 2, 3, 4].map(toneHue)).toEqual(['rose', 'apricot', 'mint', 'sky']);
		expect(toneHue(5)).toBeNull();
		expect(toneHue('3')).toBe('mint');
	});
	it('gives the neutral tone and junk the grey text class', () => {
		expect(toneText(2)).toBe('text-tone-2');
		expect(toneText(5)).toBe('text-tone-5');
		expect(toneText('x')).toBe('text-tone-5');
	});
});

describe('badges', () => {
	it('keeps colour for status and Premium only', () => {
		expect(SOFT.mint).toBe('bg-ok-soft text-ok-ink');
		expect(SOFT.rose).toBe('bg-err-soft text-err-ink');
		expect(SOFT.lavender).toBe('bg-gold-soft text-gold-ink');
		expect(SOFT.sky).toBe('bg-sunk text-ink');
	});
	it('fills a strong badge with the ink, Premium with the gold', () => {
		expect(STRONG.neutral).toBe('bg-accent text-on-accent');
		expect(STRONG.lavender).toBe('bg-gold text-on-gold');
	});
});

describe('PANEL', () => {
	it('has no tinted panels: an object, a well, or an ink tile', () => {
		expect(Object.keys(PANEL)).toEqual(['plain', 'sunk', 'invert']);
		expect(PANEL.plain).toContain('shadow-object');
	});
});

describe('buttonClass', () => {
	it('fills the primary button with the accent and squishes it on press', () => {
		expect(buttonClass('primary')).toContain('bg-accent');
		expect(buttonClass('primary')).toContain('active:scale-95');
		expect(buttonClass('primary')).toContain('ease-spring');
		expect(buttonClass('primary')).toContain('min-h-11');
	});
	it('keeps a 36px+ target on small and text buttons', () => {
		expect(buttonClass('secondary', 'sm')).toContain('min-h-9');
		expect(buttonClass('text', 'sm')).toContain('min-h-9');
		expect(buttonClass('text')).not.toContain('px-5');
	});
	it('paints Premium gold and danger soft red', () => {
		expect(buttonClass('premium')).toContain('bg-gold');
		expect(buttonClass('danger')).toContain('bg-err-soft');
		expect(buttonClass('ghost')).toContain('hover:bg-sunk');
	});
	it('fills a soft button sunk, or with a status tint', () => {
		expect(buttonClass('soft')).toContain('bg-sunk');
		expect(buttonClass('soft', 'md', 'apricot')).toContain('bg-warn-soft');
		expect(buttonClass('soft', 'md', 'apricot')).toContain('text-warn-ink');
	});
	it('rings focus with the accent', () => {
		expect(buttonClass()).toContain('focus-visible:outline-accent');
	});
});

describe('chipClass', () => {
	it('raises the selected chip as a white object', () => {
		expect(chipClass(true)).toContain('bg-surface');
		expect(chipClass(true)).toContain('shadow-pop');
		expect(chipClass(false)).toContain('bg-sunk');
		expect(chipClass(false, true)).toContain('bg-surface');
	});
});

it('cx drops falsy parts', () => {
	expect(cx('a', false, null, undefined, 'b')).toBe('a b');
});
