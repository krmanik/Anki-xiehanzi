/**
 * Tone-color palettes. Each maps the five Mandarin tones (1–4 + neutral 5) to a
 * hex color.
 *   Standard  — the app's existing palette.
 *   Pleco     — red / green / blue / purple / gray (Pleco's classic scheme).
 *   MDBG      — MDBG offers three published variants (Type 1/2/3).
 *   Custom    — user picks all five colors (persisted in localStorage).
 */

export type ToneKey = '1' | '2' | '3' | '4' | '5';
export type TonePalette = Record<ToneKey, string>;

export const TONE_KEYS: ToneKey[] = ['1', '2', '3', '4', '5'];

// Exact current app colors (DECK_CSS .tone1..5).
export const STANDARD_TONES: TonePalette = {
	'1': '#f44336',
	'2': '#fbc02d',
	'3': '#4caf50',
	'4': '#03a9f4',
	'5': '#858585'
};

export interface TonePresetDef {
	id: string;
	label: string;
	colors: TonePalette;
}

export const TONE_PRESETS: TonePresetDef[] = [
	{ id: 'standard', label: 'Standard', colors: { ...STANDARD_TONES } },
	{
		// Pleco: red (1, flat), green (2, rising), blue (3, falling-rising),
		// purple (4, falling), gray (5, neutral).
		id: 'pleco',
		label: 'Pleco',
		colors: { '1': '#e10000', '2': '#02b31c', '3': '#1510f0', '4': '#8900bf', '5': '#777777' }
	},
	{
		id: 'mdbg1',
		label: 'MDBG · Type 1',
		colors: { '1': '#ff0000', '2': '#d09000', '3': '#00a000', '4': '#0044ff', '5': '#000000' }
	},
	{
		id: 'mdbg2',
		label: 'MDBG · Type 2',
		colors: { '1': '#e30000', '2': '#02b31c', '3': '#1510f0', '4': '#8900bf', '5': '#777777' }
	},
	{
		id: 'mdbg3',
		label: 'MDBG · Type 3',
		colors: { '1': '#0044ff', '2': '#00a000', '3': '#d09000', '4': '#ff0000', '5': '#000000' }
	}
];

/** Resolve the effective palette for a preset id, or the custom colors. */
export function resolvePalette(preset: string, custom: TonePalette): TonePalette {
	if (preset === 'custom') return custom;
	return TONE_PRESETS.find((p) => p.id === preset)?.colors ?? STANDARD_TONES;
}
