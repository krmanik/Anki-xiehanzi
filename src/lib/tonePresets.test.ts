import { describe, it, expect } from 'vitest';
import { TONE_PRESETS, STANDARD_TONES, resolvePalette, TONE_KEYS } from './tonePresets';

describe('tone presets', () => {
	it('lists Standard, Pleco and the three MDBG variants', () => {
		expect(TONE_PRESETS.map((p) => p.id)).toEqual(['standard', 'pleco', 'mdbg1', 'mdbg2', 'mdbg3']);
	});

	it('every preset defines all five tones with hex values', () => {
		for (const p of TONE_PRESETS) {
			for (const k of TONE_KEYS) expect(p.colors[k], `${p.id} tone ${k}`).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});

	it('wires the published MDBG Type 1 colors', () => {
		const t1 = TONE_PRESETS.find((p) => p.id === 'mdbg1')!.colors;
		expect(t1).toEqual({ '1': '#ff0000', '2': '#d09000', '3': '#00a000', '4': '#0044ff', '5': '#000000' });
	});

	it('resolvePalette returns the preset colors, or the custom palette', () => {
		const custom = { '1': '#111111', '2': '#222222', '3': '#333333', '4': '#444444', '5': '#555555' };
		expect(resolvePalette('standard', custom)).toEqual(STANDARD_TONES);
		expect(resolvePalette('custom', custom)).toEqual(custom);
		expect(resolvePalette('nope', custom)).toEqual(STANDARD_TONES); // fallback
	});
});
