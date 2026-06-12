import type { CardElementId, CardElementStyles } from './deckTemplate';

export interface CardTheme {
	id: string;
	label: string;
	description: string;
	swatch: [string, string];
	elementStyles: CardElementStyles;
	cssVars: Record<string, string>;
}

export interface CardThemeGroup {
	id: string;
	label: string;
	description: string;
	swatch: [string, string]; // [bg, accent] — from light variant when available
	lightId?: string;
	darkId?: string;
}

// Every variant pins the full set of section/chip/badge vars (not just the ones
// that differ from the defaults): in auto mode the dark variant's vars override
// the light ones under .night_mode, so a key set asymmetry would leak light
// values into dark (or vice versa).
export const CARD_THEMES: CardTheme[] = [
	// ── 01 Minimal ───────────────────────────────────────────────────────────
	// Flat sections split by hairlines; underlined dominant POS; outline badges.
	{
		id: 'minimal-light',
		label: 'Minimal White',
		description: 'Hairline rules, weightless type',
		swatch: ['#ffffff', '#3a6df0'],
		elementStyles: {
			card: { backgroundColor: '#ffffff', borderColor: '#ececef', borderRadius: '22px', boxShadow: '0 1px 2px rgba(0,0,0,.03)' },
			simplified: { color: '#17171c' }, traditional: { color: '#17171c' },
			pinyin: { color: '#3a6df0' }, zhuyin: { color: '#b8b8c0' },
			simpleMeaning: { color: '#2a2a30' }, definitions: { color: '#33333a' },
			partOfSpeech: { color: '#1a1a1f' }, hr: { borderColor: '#eeeef1' }
		},
		cssVars: {
			'--surface1': '#d9d9dd',
			'--surface2': '#ffffff', '--surface3': '#f5f5f8', '--surface4': '#ececef',
			'--text1': '#17171c', '--text2': '#9a9aa2', '--accent': '#3a6df0', '--body-bg': '#ffffff',
			'--panel-border': 'none', '--panel-divider': '1px solid #eeeef1',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': '#aaaab2', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.16em', '--section-title-size': '0.62em', '--section-title-weight': '500',
			'--section-title-border': 'none',
			'--tile-bg': '#f5f5f8', '--tile-border': '1px solid #ececef',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': '1px solid #ededf0',
			'--radical-chip-radius': '10px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': 'none', '--pos-chip-fg': '#b0b0b8',
			'--pos-chip-pad': '2px 2px',
			'--chip-bg': 'transparent', '--chip-fg': '#1a1a1f',
			'--pos-dominant-underline': '1.5px solid var(--accent)',
			'--hsk-bg': 'transparent', '--hsk-fg': '#3a6df0', '--hsk-border': '#d4e0fb',
			'--freq-bg': 'transparent', '--freq-fg': '#9a9aa4', '--freq-border': '#ededf0',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '10px', '--btn-border': '1px solid #e8e8ec', '--btn-bg': '#ffffff', '--btn-fg': '#9a9aa4',
			'--btn-next-bg': '#ffffff', '--btn-next-fg': '#9a9aa4',
			'--container-radius': '10px', '--chip-radius': '9999px'
		}
	},
	{
		id: 'minimal-dark',
		label: 'Minimal Dark',
		description: 'Same structure, inverted palette',
		swatch: ['#17171b', '#6f9bff'],
		elementStyles: {
			card: { backgroundColor: '#17171b', borderColor: '#28282f', borderRadius: '22px', boxShadow: '0 10px 30px rgba(0,0,0,.35)' },
			simplified: { color: '#f3f3f7' }, traditional: { color: '#f3f3f7' },
			pinyin: { color: '#6f9bff' }, zhuyin: { color: '#6a6a76' },
			simpleMeaning: { color: '#e6e6ec' }, definitions: { color: '#cccdd6' },
			partOfSpeech: { color: '#f3f3f7' }, hr: { borderColor: '#26262d' }
		},
		cssVars: {
			'--surface1': '#0a0a0e',
			'--surface2': '#17171b', '--surface3': '#1d1d22', '--surface4': '#28282f',
			'--text1': '#f3f3f7', '--text2': '#67676f', '--accent': '#6f9bff', '--body-bg': '#17171b',
			'--panel-border': 'none', '--panel-divider': '1px solid #26262d',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': '#67676f', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.16em', '--section-title-size': '0.62em', '--section-title-weight': '500',
			'--section-title-border': 'none',
			'--tile-bg': '#1d1d22', '--tile-border': '1px solid #2c2c34',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': '1px solid #2c2c34',
			'--radical-chip-radius': '10px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': 'none', '--pos-chip-fg': '#67676f',
			'--pos-chip-pad': '2px 2px',
			'--chip-bg': 'transparent', '--chip-fg': '#f3f3f7',
			'--pos-dominant-underline': '1.5px solid var(--accent)',
			'--hsk-bg': 'transparent', '--hsk-fg': '#6f9bff', '--hsk-border': '#2f3f63',
			'--freq-bg': 'transparent', '--freq-fg': '#7a7a84', '--freq-border': '#2c2c34',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '10px', '--btn-border': '1px solid #2c2c34', '--btn-bg': '#1d1d22', '--btn-fg': '#8a8a96',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#0d0d10',
			'--container-radius': '10px', '--chip-radius': '9999px'
		}
	},

	// ── 02 Ink & Paper ───────────────────────────────────────────────────────
	// Flat parchment sections; filled HSK seal-chip; round paper buttons.
	{
		id: 'ink-paper-light',
		label: 'Ink & Rice Paper',
		description: 'Warm parchment, calligraphy feel',
		swatch: ['#f4ebd9', '#b5342a'],
		elementStyles: {
			card: {
				backgroundColor: '#f4ebd9',
				backgroundImage: 'radial-gradient(circle at 22% 28%, rgba(170,135,75,.07), transparent 42%),radial-gradient(circle at 82% 72%, rgba(150,110,55,.06), transparent 46%)',
				borderColor: '#d6c6a4', borderRadius: '8px', boxShadow: '0 6px 22px rgba(90,70,30,.12)'
			},
			simplified: { color: '#2a241c', fontFamily: 'kaiti' }, traditional: { color: '#2a241c', fontFamily: 'kaiti' },
			pinyin: { color: '#8a4632' }, zhuyin: { color: '#9c8a63' },
			simpleMeaning: { color: '#3a3026' }, definitions: { color: '#3a3026' },
			partOfSpeech: { color: '#8a4632' }, hr: { borderColor: '#cdb98f' }
		},
		cssVars: {
			'--surface1': '#ddd5bf',
			'--surface2': '#f4ebd9', '--surface3': 'rgba(255,252,244,.7)', '--surface4': '#cdb98f',
			'--text1': '#2a241c', '--text2': '#9c8a63', '--accent': '#b5342a', '--body-bg': '#f4ebd9',
			'--panel-border': 'none', '--panel-divider': '1px solid #cdb98f',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': '#8a4632', '--section-title-transform': 'none',
			'--section-title-spacing': '0.06em', '--section-title-size': '0.68em', '--section-title-weight': '600',
			'--section-title-border': 'none',
			'--tile-bg': 'rgba(255,252,244,.5)', '--tile-border': '1px solid #cbb78d',
			'--radical-chip-bg': 'rgba(255,252,244,.5)', '--radical-chip-border': '1px solid #cbb78d',
			'--radical-chip-radius': '6px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': 'none', '--pos-chip-fg': '#a99878',
			'--pos-chip-pad': '2px 2px',
			'--chip-bg': 'transparent', '--chip-fg': '#8a4632',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': 'var(--accent)', '--hsk-fg': '#fdf3ea', '--hsk-border': 'transparent',
			'--freq-bg': 'transparent', '--freq-fg': '#8a7448', '--freq-border': '#cbb78d',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '9999px', '--btn-border': '1px solid #cbb78d',
			'--btn-bg': 'rgba(255,252,244,.7)', '--btn-fg': '#8a7448',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#fdf3ea',
			'--container-radius': '6px', '--chip-radius': '3px'
		}
	},
	{
		id: 'ink-paper-dark',
		label: 'Ink & Paper · Dark',
		description: 'Brush on deep indigo night',
		swatch: ['#1a1712', '#e0654f'],
		elementStyles: {
			card: {
				backgroundColor: '#1a1712',
				backgroundImage: 'radial-gradient(circle at 22% 28%, rgba(190,150,80,.08), transparent 42%),radial-gradient(circle at 82% 72%, rgba(160,120,55,.07), transparent 46%)',
				borderColor: '#3a3326', borderRadius: '8px', boxShadow: '0 8px 26px rgba(0,0,0,.4)'
			},
			simplified: { color: '#f2e7cf', fontFamily: 'kaiti' }, traditional: { color: '#f2e7cf', fontFamily: 'kaiti' },
			pinyin: { color: '#e8a06f' }, zhuyin: { color: '#a8966c' },
			simpleMeaning: { color: '#ece0c8' }, definitions: { color: '#ece0c8' },
			partOfSpeech: { color: '#e8a06f' }, hr: { borderColor: '#5a4d33' }
		},
		cssVars: {
			'--surface1': '#0c0b07',
			'--surface2': '#1a1712', '--surface3': 'rgba(40,34,22,.6)', '--surface4': '#5a4d33',
			'--text1': '#f2e7cf', '--text2': '#a8966c', '--accent': '#e0654f', '--body-bg': '#1a1712',
			'--panel-border': 'none', '--panel-divider': '1px solid #5a4d33',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': '#e8a06f', '--section-title-transform': 'none',
			'--section-title-spacing': '0.06em', '--section-title-size': '0.68em', '--section-title-weight': '600',
			'--section-title-border': 'none',
			'--tile-bg': 'rgba(40,34,22,.5)', '--tile-border': '1px solid #5a4d33',
			'--radical-chip-bg': 'rgba(40,34,22,.5)', '--radical-chip-border': '1px solid #5a4d33',
			'--radical-chip-radius': '6px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': 'none', '--pos-chip-fg': '#8a7a54',
			'--pos-chip-pad': '2px 2px',
			'--chip-bg': 'transparent', '--chip-fg': '#e8a06f',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': 'var(--accent)', '--hsk-fg': '#1a1712', '--hsk-border': 'transparent',
			'--freq-bg': 'transparent', '--freq-fg': '#c2ad7e', '--freq-border': '#5a4d33',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '9999px', '--btn-border': '1px solid #5a4d33',
			'--btn-bg': 'rgba(40,34,22,.6)', '--btn-fg': '#c2ad7e',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#1a1712',
			'--container-radius': '6px', '--chip-radius': '3px'
		}
	},

	// ── 03 OLED Dark ─────────────────────────────────────────────────────────
	// Flat hairline sections; outline POS pills with a filled violet dominant.
	{
		id: 'oled-dark',
		label: 'OLED Dark',
		description: 'True black, electric violet glow',
		swatch: ['#000000', '#a78bfa'],
		elementStyles: {
			card: { backgroundColor: '#000000', borderColor: '#1c1c24', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,.5)' },
			simplified: { color: '#f4f2ff' }, traditional: { color: '#f4f2ff' },
			pinyin: { color: '#a78bfa' }, zhuyin: { color: '#5a5a68' },
			simpleMeaning: { color: '#e8e6f5' }, definitions: { color: '#cfcfdb' },
			partOfSpeech: { color: '#c4b5fd' }, hr: { borderColor: '#1c1c24' }
		},
		cssVars: {
			'--surface1': '#1c1c28',
			'--surface2': '#000000', '--surface3': '#0c0c14', '--surface4': '#1c1c24',
			'--text1': '#f4f2ff', '--text2': '#6a6a78', '--accent': '#a78bfa', '--body-bg': '#000000',
			'--panel-border': 'none', '--panel-divider': '1px solid #1c1c24',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': '#6a6a78', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.16em', '--section-title-size': '0.62em', '--section-title-weight': '500',
			'--section-title-border': 'none',
			'--tile-bg': '#0c0c14', '--tile-border': '1px solid #2a2a34',
			'--radical-chip-bg': '#0c0c10', '--radical-chip-border': '1px solid #2a2a34',
			'--radical-chip-radius': '10px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': '1px solid #2a2a34', '--pos-chip-fg': '#8a8a98',
			'--pos-chip-pad': '4px 13px',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#0a0a0c',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': 'var(--accent)', '--hsk-fg': '#0a0a0c', '--hsk-border': 'transparent',
			'--freq-bg': 'transparent', '--freq-fg': '#8a8a98', '--freq-border': '#2a2a34',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '12px', '--btn-border': '1px solid #26262f', '--btn-bg': '#101016', '--btn-fg': '#7a7a88',
			'--btn-next-bg': 'linear-gradient(135deg,#8b7bff,#6d5cf0)', '--btn-next-fg': '#ffffff',
			'--container-radius': '12px', '--chip-radius': '9999px'
		}
	},

	// ── 03b OLED Light ───────────────────────────────────────────────────────
	{
		id: 'oled-light',
		label: 'OLED Light',
		description: 'Crisp white, electric violet on light',
		swatch: ['#ffffff', '#7c5cf0'],
		elementStyles: {
			card: { backgroundColor: '#ffffff', borderColor: '#ece8fb', borderRadius: '24px', boxShadow: '0 12px 30px rgba(124,92,250,.1)' },
			simplified: { color: '#6d5cf0' }, traditional: { color: '#6d5cf0' },
			pinyin: { color: '#7c5cf0' }, zhuyin: { color: '#b6acdf' },
			simpleMeaning: { color: '#2e2842' }, definitions: { color: '#3a3450' },
			partOfSpeech: { color: '#2e2842' }, hr: { borderColor: '#f0edf9' }
		},
		cssVars: {
			'--surface1': '#d4d0ec',
			'--surface2': '#ffffff', '--surface3': '#faf8ff', '--surface4': '#ece8fb',
			'--text1': '#2e2842', '--text2': '#8a82a0', '--accent': '#7c5cf0', '--body-bg': '#ffffff',
			'--panel-border': 'none', '--panel-divider': '1px solid #f0edf9',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': '#a89edf', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.16em', '--section-title-size': '0.62em', '--section-title-weight': '500',
			'--section-title-border': 'none',
			'--tile-bg': '#faf8ff', '--tile-border': '1px solid #ece8fb',
			'--radical-chip-bg': '#faf8ff', '--radical-chip-border': '1px solid #ece8fb',
			'--radical-chip-radius': '10px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': '1px solid #e6e2f2', '--pos-chip-fg': '#8a82a0',
			'--pos-chip-pad': '4px 13px',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#ffffff',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': 'var(--accent)', '--hsk-fg': '#ffffff', '--hsk-border': 'transparent',
			'--freq-bg': 'transparent', '--freq-fg': '#8a82a0', '--freq-border': '#e6e2f2',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '12px', '--btn-border': '1px solid #eae6f7', '--btn-bg': '#f6f4fe', '--btn-fg': '#9a8fc4',
			'--btn-next-bg': 'linear-gradient(135deg,#8b7bff,#6d5cf0)', '--btn-next-fg': '#ffffff',
			'--container-radius': '12px', '--chip-radius': '9999px'
		}
	},

	// ── 04 Soft Pastel ───────────────────────────────────────────────────────
	// Boxed soft panels (no title bar fill); candy badges; lavender radical row.
	{
		id: 'soft-pastel-light',
		label: 'Soft Pastel',
		description: 'Candy-soft, friendly for all ages',
		swatch: ['#fff5f8', '#f472b6'],
		elementStyles: {
			card: {
				backgroundColor: '#fff5f8',
				backgroundImage: 'linear-gradient(160deg,#fff5f8 0%,#f3f0ff 55%,#eafaf4 100%)',
				borderColor: '#fde4ee', borderRadius: '34px', boxShadow: '0 18px 40px rgba(244,114,182,.14)'
			},
			simplified: { color: '#f06ba8' }, traditional: { color: '#c084bb' },
			pinyin: { color: '#f472b6' }, zhuyin: { color: '#c4a3d6' },
			simpleMeaning: { color: '#5a4b66' }, definitions: { color: '#5a4b66' },
			partOfSpeech: { color: '#f472b6' }, hr: { borderColor: '#fbe3ee' },
			radical: { backgroundColor: '#f4f1ff', borderColor: '#f4f1ff' }
		},
		cssVars: {
			'--surface1': '#e2ddf5',
			'--surface2': '#fff5f8', '--surface3': '#fffafc', '--surface4': '#fbe3ee',
			'--text1': '#5a4b66', '--text2': '#b09ec2', '--accent': '#f472b6', '--body-bg': '#fff5f8',
			'--panel-border': '1.5px solid #fbe3ee', '--panel-divider': '1.5px solid #fbe3ee',
			'--panel-bg': '#fffafc', '--panel-title-bg': 'transparent',
			'--section-title-color': 'var(--accent)', '--section-title-transform': 'none',
			'--section-title-spacing': 'normal', '--section-title-size': '0.68em', '--section-title-weight': '700',
			'--section-title-border': 'none',
			'--tile-bg': '#fffafc', '--tile-border': '1px solid #fbe3ee',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': 'none',
			'--radical-chip-radius': '18px', '--radical-rad-color': '#9b8ed6',
			'--pos-chip-bg': '#eef0ff', '--pos-chip-border': 'none', '--pos-chip-fg': '#9b8ed6',
			'--pos-chip-pad': '5px 14px',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#ffffff',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': '#62c79e', '--hsk-fg': '#ffffff', '--hsk-border': 'transparent',
			'--freq-bg': '#fff1cc', '--freq-fg': '#e2a93a', '--freq-border': 'transparent',
			'--example-item-bg': '#fffafc', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '9999px', '--btn-border': 'none', '--btn-bg': '#eef0ff', '--btn-fg': '#9b8ed6',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#ffffff',
			'--container-radius': '18px', '--chip-radius': '9999px'
		}
	},
	{
		id: 'soft-pastel-dark',
		label: 'Soft Pastel · Dark',
		description: 'Deep purple night, neon pop',
		swatch: ['#2a1f3d', '#ff9ecb'],
		elementStyles: {
			card: {
				backgroundColor: '#2a1f3d',
				backgroundImage: 'linear-gradient(160deg,#2a1f3d 0%,#241b39 55%,#1c2438 100%)',
				borderColor: '#3a2f50', borderRadius: '34px', boxShadow: '0 18px 40px rgba(20,12,40,.45)'
			},
			simplified: { color: '#ffaed6' }, traditional: { color: '#c3b3e8' },
			pinyin: { color: '#ff9ecb' }, zhuyin: { color: '#9d8bc4' },
			simpleMeaning: { color: '#f0e9f7' }, definitions: { color: '#e6def0' },
			partOfSpeech: { color: '#ff9ecb' }, hr: { borderColor: '#3a2f50' },
			radical: { backgroundColor: 'rgba(157,139,196,.12)', borderColor: 'rgba(157,139,196,.12)' }
		},
		cssVars: {
			'--surface1': '#130d1e',
			'--surface2': '#2a1f3d', '--surface3': 'rgba(255,255,255,.04)', '--surface4': '#3a2f50',
			'--text1': '#f0e9f7', '--text2': '#9d8bc4', '--accent': '#ff9ecb', '--body-bg': '#2a1f3d',
			'--panel-border': '1.5px solid #3a2f50', '--panel-divider': '1.5px solid #3a2f50',
			'--panel-bg': 'rgba(255,255,255,.04)', '--panel-title-bg': 'transparent',
			'--section-title-color': 'var(--accent)', '--section-title-transform': 'none',
			'--section-title-spacing': 'normal', '--section-title-size': '0.68em', '--section-title-weight': '700',
			'--section-title-border': 'none',
			'--tile-bg': 'rgba(255,255,255,.04)', '--tile-border': '1px solid #3a2f50',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': 'none',
			'--radical-chip-radius': '18px', '--radical-rad-color': '#c3b3e8',
			'--pos-chip-bg': 'rgba(157,139,196,.2)', '--pos-chip-border': 'none', '--pos-chip-fg': '#c3b3e8',
			'--pos-chip-pad': '5px 14px',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#2a1f3d',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': '#7fe7c0', '--hsk-fg': '#1c2438', '--hsk-border': 'transparent',
			'--freq-bg': 'rgba(255,209,102,.16)', '--freq-fg': '#ffd166', '--freq-border': 'transparent',
			'--example-item-bg': 'rgba(255,255,255,.04)', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '9999px', '--btn-border': 'none', '--btn-bg': 'rgba(157,139,196,.2)', '--btn-fg': '#c3b3e8',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#2a1f3d',
			'--container-radius': '18px', '--chip-radius': '9999px'
		}
	},

	// ── 05 Editorial ─────────────────────────────────────────────────────────
	// Flat keyline sections: red tracked titles ruled below, mono ghost numbers.
	{
		id: 'editorial-light',
		label: 'Editorial',
		description: 'Serif type, sharp keylines',
		swatch: ['#f6f3ec', '#d6402a'],
		elementStyles: {
			card: { backgroundColor: '#f6f3ec', borderColor: '#16140f', borderRadius: '2px', boxShadow: 'none' },
			simplified: { color: '#16140f', fontFamily: 'songti' }, traditional: { color: '#16140f', fontFamily: 'songti' },
			pinyin: { color: '#d6402a' }, zhuyin: { color: '#8a8378' },
			simpleMeaning: { color: '#16140f' }, definitions: { color: '#16140f' },
			partOfSpeech: { color: '#16140f' }, hr: { borderColor: '#16140f' }
		},
		cssVars: {
			'--surface1': '#ddd8cc',
			'--surface2': '#f6f3ec', '--surface3': '#ede8de', '--surface4': '#16140f',
			'--text1': '#16140f', '--text2': '#8a8378', '--accent': '#d6402a', '--body-bg': '#f6f3ec',
			'--panel-border': 'none', '--panel-divider': 'none',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': 'var(--accent)', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.22em', '--section-title-size': '0.55em', '--section-title-weight': '500',
			'--section-title-border': '1px solid #16140f',
			'--tile-bg': 'transparent', '--tile-border': '1px solid #16140f',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': 'none',
			'--radical-chip-radius': '0px', '--radical-rad-color': '#16140f',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': 'none', '--pos-chip-fg': '#8a8378',
			'--pos-chip-pad': '2px 2px', '--pos-chip-transform': 'uppercase',
			'--chip-bg': 'transparent', '--chip-fg': '#16140f',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': 'transparent', '--hsk-fg': '#16140f', '--hsk-border': 'transparent',
			'--freq-bg': 'transparent', '--freq-fg': '#16140f', '--freq-border': 'transparent',
			'--def-num-color': '#b3a98f',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '0px', '--btn-border': '1px solid #16140f', '--btn-bg': '#f6f3ec', '--btn-fg': '#16140f',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#f6f3ec',
			'--container-radius': '0px', '--chip-radius': '3px'
		}
	},
	{
		id: 'editorial-dark',
		label: 'Editorial · Dark',
		description: 'Reverse print on deep sepia',
		swatch: ['#15120e', '#ef6a4d'],
		elementStyles: {
			card: { backgroundColor: '#15120e', borderColor: '#f0ebe0', borderRadius: '2px', boxShadow: 'none' },
			simplified: { color: '#f0ebe0', fontFamily: 'songti' }, traditional: { color: '#f0ebe0', fontFamily: 'songti' },
			pinyin: { color: '#ef6a4d' }, zhuyin: { color: '#9c9482' },
			simpleMeaning: { color: '#f0ebe0' }, definitions: { color: '#f0ebe0' },
			partOfSpeech: { color: '#f0ebe0' }, hr: { borderColor: '#f0ebe0' }
		},
		cssVars: {
			'--surface1': '#080604',
			'--surface2': '#15120e', '--surface3': '#1e1a14', '--surface4': '#f0ebe0',
			'--text1': '#f0ebe0', '--text2': '#9c9482', '--accent': '#ef6a4d', '--body-bg': '#15120e',
			'--panel-border': 'none', '--panel-divider': 'none',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': 'var(--accent)', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.22em', '--section-title-size': '0.55em', '--section-title-weight': '500',
			'--section-title-border': '1px solid #f0ebe0',
			'--tile-bg': 'transparent', '--tile-border': '1px solid #f0ebe0',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': 'none',
			'--radical-chip-radius': '0px', '--radical-rad-color': '#f0ebe0',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': 'none', '--pos-chip-fg': '#9c9482',
			'--pos-chip-pad': '2px 2px', '--pos-chip-transform': 'uppercase',
			'--chip-bg': 'transparent', '--chip-fg': '#f0ebe0',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': 'transparent', '--hsk-fg': '#f0ebe0', '--hsk-border': 'transparent',
			'--freq-bg': 'transparent', '--freq-fg': '#f0ebe0', '--freq-border': 'transparent',
			'--def-num-color': '#6f6857',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '0px', '--btn-border': '1px solid #f0ebe0', '--btn-bg': '#15120e', '--btn-fg': '#f0ebe0',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#15120e',
			'--container-radius': '0px', '--chip-radius': '3px'
		}
	},

	// ── 06 Modern App UI ─────────────────────────────────────────────────────
	// Boxed panels with tinted header bars — the reference for the default look.
	{
		id: 'modern-app-light',
		label: 'Modern App · Light',
		description: 'Sectioned panels, pills, soft shadows',
		swatch: ['#ffffff', '#2f6bff'],
		elementStyles: {
			card: { backgroundColor: '#ffffff', borderColor: '#eaedf2', borderRadius: '22px', boxShadow: '0 12px 30px rgba(47,107,255,.08)' },
			simplified: { color: '#2f6bff' }, traditional: { color: '#2f6bff' },
			pinyin: { color: '#2f6bff' }, zhuyin: { color: '#aeb4c0' },
			simpleMeaning: { color: '#1f2937' }, definitions: { color: '#374151' },
			partOfSpeech: { color: '#1f2937' }, hr: { borderColor: '#eef1f6' }
		},
		cssVars: {
			'--surface1': '#d2dce8',
			'--surface2': '#ffffff', '--surface3': '#f6f8fc', '--surface4': '#eef1f6',
			'--text1': '#1f2937', '--text2': '#8b93a3', '--accent': '#2f6bff', '--body-bg': '#ffffff',
			'--panel-border': '1px solid #eef1f6', '--panel-divider': '1px solid #eef1f6',
			'--panel-bg': 'transparent', '--panel-title-bg': '#f6f8fc',
			'--section-title-color': '#8b93a3', '--section-title-transform': 'none',
			'--section-title-spacing': 'normal', '--section-title-size': '0.62em', '--section-title-weight': '600',
			'--section-title-border': 'none',
			'--tile-bg': '#f6f8fc', '--tile-border': '1px solid #eef1f6',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': '1px solid #e6e9f0',
			'--radical-chip-radius': '10px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': '#f1f3f7', '--pos-chip-border': 'none', '--pos-chip-fg': '#6b7280',
			'--pos-chip-pad': '5px 13px',
			'--chip-bg': '#1f2937', '--chip-fg': '#ffffff',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': '#e8f0ff', '--hsk-fg': '#2f6bff', '--hsk-border': 'transparent',
			'--freq-bg': '#fdf2e0', '--freq-fg': '#e08a16', '--freq-border': 'transparent',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '12px', '--btn-border': 'none', '--btn-bg': '#4d5b7c', '--btn-fg': '#ffffff',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#ffffff',
			'--container-radius': '14px', '--chip-radius': '9999px'
		}
	},
	{
		id: 'modern-app-dark',
		label: 'Modern App · Dark',
		description: 'Deep navy panels, electric blue',
		swatch: ['#14161c', '#5d93ff'],
		elementStyles: {
			card: { backgroundColor: '#14161c', borderColor: '#23262f', borderRadius: '22px', boxShadow: '0 12px 30px rgba(0,0,0,.4)' },
			simplified: { color: '#5d93ff' }, traditional: { color: '#5d93ff' },
			pinyin: { color: '#5d93ff' }, zhuyin: { color: '#5f6675' },
			simpleMeaning: { color: '#eef1f6' }, definitions: { color: '#cdd3df' },
			partOfSpeech: { color: '#eef1f6' }, hr: { borderColor: '#23262f' }
		},
		cssVars: {
			'--surface1': '#0a0c10',
			'--surface2': '#14161c', '--surface3': '#1a1d24', '--surface4': '#23262f',
			'--text1': '#eef1f6', '--text2': '#7b8395', '--accent': '#5d93ff', '--body-bg': '#14161c',
			'--panel-border': '1px solid #23262f', '--panel-divider': '1px solid #23262f',
			'--panel-bg': 'transparent', '--panel-title-bg': '#1a1d24',
			'--section-title-color': '#7b8395', '--section-title-transform': 'none',
			'--section-title-spacing': 'normal', '--section-title-size': '0.62em', '--section-title-weight': '600',
			'--section-title-border': 'none',
			'--tile-bg': '#1a1d24', '--tile-border': '1px solid #2a2e39',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': '1px solid #2a2e39',
			'--radical-chip-radius': '10px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': '#23262f', '--pos-chip-border': 'none', '--pos-chip-fg': '#9aa1b2',
			'--pos-chip-pad': '5px 13px',
			'--chip-bg': '#e6e9f0', '--chip-fg': '#0f1115',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': 'rgba(61,123,255,.16)', '--hsk-fg': '#5d93ff', '--hsk-border': 'transparent',
			'--freq-bg': 'rgba(240,169,58,.16)', '--freq-fg': '#f0a93a', '--freq-border': 'transparent',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '12px', '--btn-border': 'none', '--btn-bg': '#2a3142', '--btn-fg': '#aeb6c6',
			'--btn-next-bg': '#3d7bff', '--btn-next-fg': '#ffffff',
			'--container-radius': '14px', '--chip-radius': '9999px'
		}
	},

	// ── 07 Bold / Brutalist ───────────────────────────────────────────────────
	// Thick ruled titles, numbered yellow squares, color-bar examples, boxed radical.
	{
		id: 'bold-brutalist-light',
		label: 'Bold · Brutalist',
		description: 'Thick keylines, hard shadows, primary color blocks',
		swatch: ['#fffced', '#ffe600'],
		elementStyles: {
			card: { backgroundColor: '#fffced', borderColor: '#121212', borderWidth: '3px', borderStyle: 'solid', borderRadius: '0px', boxShadow: '8px 8px 0 #121212' },
			simplified: { color: '#121212' }, traditional: { color: '#121212' },
			pinyin: { color: '#ff3b3b' }, zhuyin: { color: '#5a5a5a' },
			simpleMeaning: { color: '#121212' }, definitions: { color: '#121212' },
			partOfSpeech: { color: '#121212' }, hr: { borderColor: '#121212' },
			radical: { borderColor: '#121212', borderWidth: '3px', borderStyle: 'solid' }
		},
		cssVars: {
			'--surface1': '#d4ccb8',
			'--surface2': '#fffced', '--surface3': '#ffffff', '--surface4': '#121212',
			'--text1': '#121212', '--text2': '#5a5a5a', '--accent': '#ffe600', '--body-bg': '#fffced',
			'--panel-border': 'none', '--panel-divider': 'none',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': '#121212', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.1em', '--section-title-size': '0.62em', '--section-title-weight': '700',
			'--section-title-border': '3px solid #121212',
			'--tile-bg': '#ffffff', '--tile-border': '2px solid #121212',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': 'none',
			'--radical-chip-radius': '0px', '--radical-rad-color': '#ff3b3b',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': '2px solid #121212', '--pos-chip-fg': '#121212',
			'--pos-chip-pad': '5px 11px', '--pos-chip-transform': 'uppercase',
			'--chip-bg': '#ffe600', '--chip-fg': '#121212',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': '#ff3b3b', '--hsk-fg': '#ffffff', '--hsk-border': 'transparent',
			'--freq-bg': '#2962ff', '--freq-fg': '#ffffff', '--freq-border': 'transparent',
			'--def-num-color': '#121212', '--def-num-bg': '#ffe600',
			'--def-num-border': '2px solid #121212', '--def-num-pad': '1px 6px', '--def-num-radius': '0',
			'--example-item-bg': 'transparent', '--example-item-border': 'none',
			'--example-item-left': '5px solid #2962ff', '--example-item-pad': '2px 0 2px 12px',
			'--btn-radius': '0px', '--btn-border': '3px solid #121212', '--btn-bg': '#fffced', '--btn-fg': '#121212',
			'--btn-next-bg': '#ffe600', '--btn-next-fg': '#121212',
			'--container-radius': '0px', '--chip-radius': '0px'
		}
	},
	{
		id: 'bold-brutalist-dark',
		label: 'Bold · Brutalist Dark',
		description: 'Pure black, neon lime outlines',
		swatch: ['#141414', '#c6ff3a'],
		elementStyles: {
			card: { backgroundColor: '#141414', borderColor: '#f4f4ec', borderWidth: '3px', borderStyle: 'solid', borderRadius: '0px', boxShadow: '8px 8px 0 #c6ff3a' },
			simplified: { color: '#c6ff3a' }, traditional: { color: '#f4f4ec' },
			pinyin: { color: '#00e5ff' }, zhuyin: { color: '#8a8a8a' },
			simpleMeaning: { color: '#f4f4ec' }, definitions: { color: '#f4f4ec' },
			partOfSpeech: { color: '#f4f4ec' }, hr: { borderColor: '#f4f4ec' },
			radical: { borderColor: '#f4f4ec', borderWidth: '3px', borderStyle: 'solid' }
		},
		cssVars: {
			'--surface1': '#000000',
			'--surface2': '#141414', '--surface3': '#0c0c0c', '--surface4': '#f4f4ec',
			'--text1': '#f4f4ec', '--text2': '#8a8a8a', '--accent': '#c6ff3a', '--body-bg': '#141414',
			'--panel-border': 'none', '--panel-divider': 'none',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': '#f4f4ec', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.1em', '--section-title-size': '0.62em', '--section-title-weight': '700',
			'--section-title-border': '3px solid #f4f4ec',
			'--tile-bg': '#0c0c0c', '--tile-border': '2px solid #f4f4ec',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': 'none',
			'--radical-chip-radius': '0px', '--radical-rad-color': '#ff3b6b',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': '2px solid #f4f4ec', '--pos-chip-fg': '#f4f4ec',
			'--pos-chip-pad': '5px 11px', '--pos-chip-transform': 'uppercase',
			'--chip-bg': '#c6ff3a', '--chip-fg': '#141414',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': '#ff3b6b', '--hsk-fg': '#ffffff', '--hsk-border': 'transparent',
			'--freq-bg': '#00e5ff', '--freq-fg': '#141414', '--freq-border': 'transparent',
			'--def-num-color': '#141414', '--def-num-bg': '#c6ff3a',
			'--def-num-border': '2px solid #f4f4ec', '--def-num-pad': '1px 6px', '--def-num-radius': '0',
			'--example-item-bg': 'transparent', '--example-item-border': 'none',
			'--example-item-left': '5px solid #00e5ff', '--example-item-pad': '2px 0 2px 12px',
			'--btn-radius': '0px', '--btn-border': '3px solid #f4f4ec', '--btn-bg': '#141414', '--btn-fg': '#f4f4ec',
			'--btn-next-bg': '#c6ff3a', '--btn-next-fg': '#141414',
			'--container-radius': '0px', '--chip-radius': '0px'
		}
	},

	// ── 08 Vintage Dictionary ─────────────────────────────────────────────────
	// Flat ruled senses, plain-text badges, left-bar citations.
	{
		id: 'vintage-dictionary-light',
		label: 'Vintage Dictionary',
		description: 'Aged paper, ruled senses, pocket-lexicon',
		swatch: ['#efe6d0', '#2c5f56'],
		elementStyles: {
			card: {
				backgroundColor: '#efe6d0',
				backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(120,95,50,.05), transparent 50%)',
				borderColor: '#c8bb98', borderRadius: '3px', boxShadow: '0 4px 16px rgba(80,65,30,.14)'
			},
			simplified: { color: '#33301f', fontFamily: 'songti' }, traditional: { color: '#33301f', fontFamily: 'songti' },
			pinyin: { color: '#2c5f56' }, zhuyin: { color: '#7a6e4d' },
			simpleMeaning: { color: '#33301f' }, definitions: { color: '#33301f' },
			partOfSpeech: { color: '#7a6e4d' }, hr: { borderColor: '#b5a87f' }
		},
		cssVars: {
			'--surface1': '#cec4b0',
			'--surface2': '#efe6d0', '--surface3': '#f3ecd9', '--surface4': '#b5a87f',
			'--text1': '#33301f', '--text2': '#7a6e4d', '--accent': '#2c5f56', '--body-bg': '#efe6d0',
			'--panel-border': 'none', '--panel-divider': '1px solid #b5a87f',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': '#7a6e4d', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.16em', '--section-title-size': '0.55em', '--section-title-weight': '500',
			'--section-title-border': 'none',
			'--tile-bg': '#f3ecd9', '--tile-border': '1px solid #b5a87f',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': 'none',
			'--radical-chip-radius': '2px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': 'none', '--pos-chip-fg': '#7a6e4d',
			'--pos-chip-pad': '2px 2px',
			'--chip-bg': 'transparent', '--chip-fg': '#7a6e4d',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': 'transparent', '--hsk-fg': '#7a6e4d', '--hsk-border': 'transparent',
			'--freq-bg': 'transparent', '--freq-fg': '#7a6e4d', '--freq-border': 'transparent',
			'--def-num-color': '#33301f',
			'--example-item-bg': 'transparent', '--example-item-border': 'none',
			'--example-item-left': '2px solid #2c5f56', '--example-item-pad': '2px 0 2px 14px',
			'--btn-radius': '3px', '--btn-border': '1px solid #6f6244', '--btn-bg': '#f3ecd9', '--btn-fg': '#5a5238',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#f3ecd9',
			'--container-radius': '2px', '--chip-radius': '2px'
		}
	},
	{
		id: 'vintage-dictionary-dark',
		label: 'Vintage Dict · Dark',
		description: 'Deep olive night, warm gold',
		swatch: ['#1b1610', '#c8a24a'],
		elementStyles: {
			card: {
				backgroundColor: '#1b1610',
				backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(200,162,74,.08), transparent 50%)',
				borderColor: '#3e3322', borderRadius: '3px', boxShadow: '0 6px 22px rgba(0,0,0,.4)'
			},
			simplified: { color: '#f3e8cc', fontFamily: 'songti' }, traditional: { color: '#f3e8cc', fontFamily: 'songti' },
			pinyin: { color: '#6fc7b4' }, zhuyin: { color: '#b79a5e' },
			simpleMeaning: { color: '#ecdfc4' }, definitions: { color: '#ecdfc4' },
			partOfSpeech: { color: '#b79a5e' }, hr: { borderColor: '#6a572f' }
		},
		cssVars: {
			'--surface1': '#0c0a06',
			'--surface2': '#1b1610', '--surface3': 'rgba(40,32,18,.6)', '--surface4': '#6a572f',
			'--text1': '#ecdfc4', '--text2': '#b79a5e', '--accent': '#6fc7b4', '--body-bg': '#1b1610',
			'--panel-border': 'none', '--panel-divider': '1px solid #6a572f',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': '#b79a5e', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.16em', '--section-title-size': '0.55em', '--section-title-weight': '500',
			'--section-title-border': 'none',
			'--tile-bg': 'rgba(40,32,18,.5)', '--tile-border': '1px solid #6a572f',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': 'none',
			'--radical-chip-radius': '2px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': 'none', '--pos-chip-fg': '#b79a5e',
			'--pos-chip-pad': '2px 2px',
			'--chip-bg': 'transparent', '--chip-fg': '#b79a5e',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': 'transparent', '--hsk-fg': '#b79a5e', '--hsk-border': 'transparent',
			'--freq-bg': 'transparent', '--freq-fg': '#b79a5e', '--freq-border': 'transparent',
			'--def-num-color': '#ecdfc4',
			'--example-item-bg': 'transparent', '--example-item-border': 'none',
			'--example-item-left': '2px solid #3a8a7a', '--example-item-pad': '2px 0 2px 14px',
			'--btn-radius': '3px', '--btn-border': '1px solid #c8a24a', '--btn-bg': 'rgba(40,32,18,.6)', '--btn-fg': '#d8c290',
			'--btn-next-bg': '#3a8a7a', '--btn-next-fg': '#f3e8cc',
			'--container-radius': '2px', '--chip-radius': '2px'
		}
	},

	// ── 09 Frosted Glass · Aurora ─────────────────────────────────────────────
	// Glass card over an aurora body; flat translucent sections inside.
	{
		id: 'frosted-aurora-dark',
		label: 'Frosted Aurora · Dark',
		description: 'Translucent panels over aurora gradient',
		swatch: ['#241a52', '#a8f0ff'],
		elementStyles: {
			card: {
				backgroundColor: 'rgba(255,255,255,0.1)',
				borderColor: 'rgba(255,255,255,0.22)', borderRadius: '26px', boxShadow: '0 10px 30px rgba(0,0,0,.2)'
			},
			simplified: { color: '#ffffff' }, traditional: { color: 'rgba(255,255,255,0.85)' },
			pinyin: { color: '#a8f0ff' }, zhuyin: { color: 'rgba(255,255,255,0.65)' },
			simpleMeaning: { color: '#ffffff' }, definitions: { color: 'rgba(255,255,255,0.92)' },
			partOfSpeech: { color: '#ffffff' }, hr: { borderColor: 'rgba(255,255,255,0.18)' }
		},
		cssVars: {
			'--surface1': '#2a2070',
			'--surface2': 'rgba(255,255,255,0.08)', '--surface3': 'rgba(255,255,255,0.06)', '--surface4': 'rgba(255,255,255,0.18)',
			'--text1': '#ffffff', '--text2': 'rgba(255,255,255,0.55)', '--accent': '#a8f0ff', '--body-bg': '#241a52',
			'--body-bg-image': 'radial-gradient(circle at 15% 20%,#5b3fd6 0%,transparent 45%),radial-gradient(circle at 85% 25%,#e0479e 0%,transparent 42%),radial-gradient(circle at 70% 90%,#1ec8c8 0%,transparent 48%),linear-gradient(140deg,#241a52,#0e2a44)',
			'--panel-border': 'none', '--panel-divider': '1px solid rgba(255,255,255,0.18)',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': 'rgba(255,255,255,0.55)', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.16em', '--section-title-size': '0.62em', '--section-title-weight': '500',
			'--section-title-border': 'none',
			'--tile-bg': 'rgba(255,255,255,0.08)', '--tile-border': '1px solid rgba(255,255,255,0.25)',
			'--radical-chip-bg': 'rgba(255,255,255,0.08)', '--radical-chip-border': '1px solid rgba(255,255,255,0.25)',
			'--radical-chip-radius': '10px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': 'rgba(255,255,255,0.14)', '--pos-chip-border': '1px solid rgba(255,255,255,0.25)', '--pos-chip-fg': '#ffffff',
			'--pos-chip-pad': '5px 13px',
			'--chip-bg': 'rgba(255,255,255,0.85)', '--chip-fg': '#1b2a4a',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': 'var(--accent)', '--hsk-fg': '#1b2a4a', '--hsk-border': 'transparent',
			'--freq-bg': 'transparent', '--freq-fg': '#ffffff', '--freq-border': 'rgba(255,255,255,0.3)',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '9999px', '--btn-border': '1px solid rgba(255,255,255,0.3)',
			'--btn-bg': 'rgba(255,255,255,0.12)', '--btn-fg': '#ffffff',
			'--btn-next-bg': 'linear-gradient(135deg,#a8f0ff,#7c9bff)', '--btn-next-fg': '#1b2a4a',
			'--container-radius': '14px', '--chip-radius': '9999px'
		}
	},
	{
		id: 'frosted-aurora-light',
		label: 'Frosted Aurora · Light',
		description: 'Pink-lavender haze, glass surface',
		swatch: ['#fdf3f8', '#3aa0a8'],
		elementStyles: {
			card: {
				backgroundColor: 'rgba(255,255,255,0.55)',
				borderColor: 'rgba(255,255,255,0.8)', borderRadius: '26px', boxShadow: '0 10px 30px rgba(120,130,180,0.18)'
			},
			simplified: { color: '#2a2e44' }, traditional: { color: '#2a2e44' },
			pinyin: { color: '#3aa0a8' }, zhuyin: { color: '#8a90ad' },
			simpleMeaning: { color: '#2a2e44' }, definitions: { color: '#3a3f57' },
			partOfSpeech: { color: '#2a2e44' }, hr: { borderColor: 'rgba(120,130,180,0.22)' }
		},
		cssVars: {
			'--surface1': '#d2c0e0',
			'--surface2': 'rgba(255,255,255,0.55)', '--surface3': 'rgba(255,255,255,0.5)', '--surface4': 'rgba(120,130,180,0.22)',
			'--text1': '#2a2e44', '--text2': '#8a90ad', '--accent': '#3aa0a8', '--body-bg': '#fdf3f8',
			'--body-bg-image': 'radial-gradient(circle at 14% 18%,#ffd9ec 0%,transparent 46%),radial-gradient(circle at 88% 22%,#cfe5ff 0%,transparent 44%),radial-gradient(circle at 72% 92%,#cdf5ec 0%,transparent 50%),linear-gradient(140deg,#fdf3f8,#eef4fb)',
			'--panel-border': 'none', '--panel-divider': '1px solid rgba(120,130,180,0.22)',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': '#8a90ad', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.16em', '--section-title-size': '0.62em', '--section-title-weight': '500',
			'--section-title-border': 'none',
			'--tile-bg': 'rgba(255,255,255,0.5)', '--tile-border': '1px solid rgba(255,255,255,0.9)',
			'--radical-chip-bg': 'rgba(255,255,255,0.5)', '--radical-chip-border': '1px solid rgba(255,255,255,0.9)',
			'--radical-chip-radius': '10px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': 'rgba(255,255,255,0.6)', '--pos-chip-border': '1px solid rgba(255,255,255,0.9)', '--pos-chip-fg': '#5a6178',
			'--pos-chip-pad': '5px 13px',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#ffffff',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': 'var(--accent)', '--hsk-fg': '#ffffff', '--hsk-border': 'transparent',
			'--freq-bg': 'transparent', '--freq-fg': '#5a6178', '--freq-border': 'rgba(120,130,180,0.4)',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '9999px', '--btn-border': '1px solid rgba(255,255,255,0.9)',
			'--btn-bg': 'rgba(255,255,255,0.5)', '--btn-fg': '#5a6178',
			'--btn-next-bg': 'linear-gradient(135deg,#5ec8cf,#7c9bff)', '--btn-next-fg': '#ffffff',
			'--container-radius': '14px', '--chip-radius': '9999px'
		}
	},

	// ── 10 Zen · Muji ─────────────────────────────────────────────────────────
	// Flat hairline sections, ghost numbers, text-only chips, chromeless buttons.
	{
		id: 'zen-muji-light',
		label: 'Zen · Muji',
		description: 'Warm neutrals, light weights, unhurried',
		swatch: ['#f3efe6', '#7d8a6a'],
		elementStyles: {
			card: { backgroundColor: '#f3efe6', borderColor: '#e6e0d2', borderRadius: '5px', boxShadow: 'none' },
			simplified: { color: '#3c3a30', fontWeight: '300' }, traditional: { color: '#3c3a30', fontWeight: '300' },
			pinyin: { color: '#7d8a6a', letterSpacing: '0.18em' }, zhuyin: { color: '#b3ac98', letterSpacing: '0.18em' },
			simpleMeaning: { color: '#3c3a30' }, definitions: { color: '#46443a' },
			partOfSpeech: { color: '#5c5a4d' }, hr: { borderColor: '#e3ddce' }
		},
		cssVars: {
			'--surface1': '#dcd7c8',
			'--surface2': '#f3efe6', '--surface3': '#ece7da', '--surface4': '#e3ddce',
			'--text1': '#3c3a30', '--text2': '#a89f88', '--accent': '#7d8a6a', '--body-bg': '#f3efe6',
			'--panel-border': 'none', '--panel-divider': '1px solid #e3ddce',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': '#a89f88', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.16em', '--section-title-size': '0.6em', '--section-title-weight': '400',
			'--section-title-border': 'none',
			'--tile-bg': 'transparent', '--tile-border': '1px solid #e0d9c8',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': 'none',
			'--radical-chip-radius': '0px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': 'none', '--pos-chip-fg': '#bdb6a2',
			'--pos-chip-pad': '2px 2px',
			'--chip-bg': 'transparent', '--chip-fg': '#5c5a4d',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': 'transparent', '--hsk-fg': '#a89f88', '--hsk-border': 'transparent',
			'--freq-bg': 'transparent', '--freq-fg': '#a89f88', '--freq-border': 'transparent',
			'--def-num-color': 'var(--accent)',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '0px', '--btn-border': 'none', '--btn-bg': 'transparent', '--btn-fg': '#a89f88',
			'--btn-next-bg': 'transparent', '--btn-next-fg': 'var(--accent)',
			'--container-radius': '0px', '--chip-radius': '2px'
		}
	},
	{
		id: 'zen-muji-dark',
		label: 'Zen · Muji Dark',
		description: 'Deep charcoal, cream letterforms',
		swatch: ['#1a1915', '#a3b389'],
		elementStyles: {
			card: { backgroundColor: '#1a1915', borderColor: '#2c2a24', borderRadius: '5px', boxShadow: 'none' },
			simplified: { color: '#ece8dc', fontWeight: '300' }, traditional: { color: '#ece8dc', fontWeight: '300' },
			pinyin: { color: '#a3b389', letterSpacing: '0.18em' }, zhuyin: { color: '#6f6a59', letterSpacing: '0.18em' },
			simpleMeaning: { color: '#ece8dc' }, definitions: { color: '#d2cdbd' },
			partOfSpeech: { color: '#cfcaba' }, hr: { borderColor: '#2e2c24' }
		},
		cssVars: {
			'--surface1': '#0e0c0a',
			'--surface2': '#1a1915', '--surface3': '#23211b', '--surface4': '#2e2c24',
			'--text1': '#ece8dc', '--text2': '#7c7666', '--accent': '#a3b389', '--body-bg': '#1a1915',
			'--panel-border': 'none', '--panel-divider': '1px solid #2e2c24',
			'--panel-bg': 'transparent', '--panel-title-bg': 'transparent',
			'--section-title-color': '#7c7666', '--section-title-transform': 'uppercase',
			'--section-title-spacing': '0.16em', '--section-title-size': '0.6em', '--section-title-weight': '400',
			'--section-title-border': 'none',
			'--tile-bg': 'transparent', '--tile-border': '1px solid #34322a',
			'--radical-chip-bg': 'transparent', '--radical-chip-border': 'none',
			'--radical-chip-radius': '0px', '--radical-rad-color': 'var(--accent)',
			'--pos-chip-bg': 'transparent', '--pos-chip-border': 'none', '--pos-chip-fg': '#6f6a59',
			'--pos-chip-pad': '2px 2px',
			'--chip-bg': 'transparent', '--chip-fg': '#cfcaba',
			'--pos-dominant-underline': 'none',
			'--hsk-bg': 'transparent', '--hsk-fg': '#7c7666', '--hsk-border': 'transparent',
			'--freq-bg': 'transparent', '--freq-fg': '#7c7666', '--freq-border': 'transparent',
			'--def-num-color': 'var(--accent)',
			'--example-item-bg': 'transparent', '--example-item-border': 'none', '--example-item-left': 'none',
			'--btn-radius': '0px', '--btn-border': 'none', '--btn-bg': 'transparent', '--btn-fg': '#7c7666',
			'--btn-next-bg': 'transparent', '--btn-next-fg': 'var(--accent)',
			'--container-radius': '0px', '--chip-radius': '2px'
		}
	}
];

export const CARD_THEME_MAP = new Map<string, CardTheme>(CARD_THEMES.map((t) => [t.id, t]));

export const CARD_THEME_GROUPS: CardThemeGroup[] = [
	{ id: 'minimal',            label: 'Minimal',            description: 'Clean, weightless type',             swatch: ['#ffffff', '#3a6df0'], lightId: 'minimal-light',            darkId: 'minimal-dark' },
	{ id: 'ink-paper',          label: 'Ink & Paper',        description: 'Warm parchment, calligraphy feel',   swatch: ['#f4ebd9', '#b5342a'], lightId: 'ink-paper-light',          darkId: 'ink-paper-dark' },
	{ id: 'oled-dark',          label: 'OLED · Violet',      description: 'True black / crisp white, electric violet', swatch: ['#ffffff', '#7c5cf0'], lightId: 'oled-light',           darkId: 'oled-dark' },
	{ id: 'soft-pastel',        label: 'Soft Pastel',        description: 'Candy-soft, friendly',               swatch: ['#fff5f8', '#f472b6'], lightId: 'soft-pastel-light',        darkId: 'soft-pastel-dark' },
	{ id: 'editorial',          label: 'Editorial',          description: 'Serif type, sharp keylines',         swatch: ['#f6f3ec', '#d6402a'], lightId: 'editorial-light',          darkId: 'editorial-dark' },
	{ id: 'modern-app',         label: 'Modern App',         description: 'Sectioned panels, pills',            swatch: ['#ffffff', '#2f6bff'], lightId: 'modern-app-light',         darkId: 'modern-app-dark' },
	{ id: 'bold-brutalist',     label: 'Bold Brutalist',     description: 'Thick keylines, primary blocks',     swatch: ['#fffced', '#ffe600'], lightId: 'bold-brutalist-light',     darkId: 'bold-brutalist-dark' },
	{ id: 'vintage-dictionary', label: 'Vintage Dictionary', description: 'Aged paper, ruled senses',          swatch: ['#efe6d0', '#2c5f56'], lightId: 'vintage-dictionary-light', darkId: 'vintage-dictionary-dark' },
	{ id: 'frosted-aurora',     label: 'Frosted Aurora',     description: 'Translucent panels, gradient haze', swatch: ['#fdf3f8', '#3aa0a8'], lightId: 'frosted-aurora-light',     darkId: 'frosted-aurora-dark' },
	{ id: 'zen-muji',           label: 'Zen · Muji',         description: 'Warm neutrals, unhurried',          swatch: ['#f3efe6', '#7d8a6a'], lightId: 'zen-muji-light',           darkId: 'zen-muji-dark' }
];

export const CARD_THEME_GROUP_MAP = new Map<string, CardThemeGroup>(CARD_THEME_GROUPS.map((g) => [g.id, g]));

/**
 * Resolve the CardTheme to use given a group id, mode, and optional system dark preference.
 * Falls back to whichever variant exists if the preferred one is missing.
 */
export function resolveTheme(
	groupId: string,
	mode: 'auto' | 'light' | 'dark',
	systemDark = false
): CardTheme | undefined {
	const group = CARD_THEME_GROUP_MAP.get(groupId);
	if (!group) return undefined;
	const wantDark = mode === 'dark' || (mode === 'auto' && systemDark);
	if (wantDark && group.darkId) return CARD_THEME_MAP.get(group.darkId);
	if (!wantDark && group.lightId) return CARD_THEME_MAP.get(group.lightId);
	return CARD_THEME_MAP.get(group.darkId ?? group.lightId ?? '');
}

/** Merge theme elementStyles (base) with card-level overrides (wins). */
export function mergeElementStyles(
	base: CardElementStyles,
	overrides: CardElementStyles
): CardElementStyles {
	const result: CardElementStyles = { ...base };
	for (const [key, val] of Object.entries(overrides)) {
		const k = key as CardElementId;
		result[k] = { ...(base[k] ?? {}), ...(val ?? {}) };
	}
	return result;
}
