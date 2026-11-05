import { describe, expect, it } from 'vitest';
import { buttonClass, chipClass, cx, toneHue, toneText } from './styles';

describe('tones', () => {
	it('maps tones 1–4 to rose, apricot, mint, sky', () => {
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

describe('buttonClass', () => {
	it('fills the primary button with the accent', () => {
		expect(buttonClass('primary')).toContain('bg-accent');
		expect(buttonClass('primary')).toContain('min-h-11');
	});
	it('keeps a 36px+ target on small and text buttons', () => {
		expect(buttonClass('secondary', 'sm')).toContain('min-h-9');
		expect(buttonClass('text', 'sm')).toContain('min-h-9');
		expect(buttonClass('text')).not.toContain('px-5');
	});
});

describe('chipClass', () => {
	it('uses the ink, not the pastel, when selected', () => {
		expect(chipClass(true)).toContain('bg-sky-ink');
		expect(chipClass(false)).toContain('bg-sunk');
		expect(chipClass(false, true)).toContain('bg-surface');
	});
});

it('cx drops falsy parts', () => {
	expect(cx('a', false, null, undefined, 'b')).toBe('a b');
});
