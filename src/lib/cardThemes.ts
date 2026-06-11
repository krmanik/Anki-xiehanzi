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

export const CARD_THEMES: CardTheme[] = [
	// ── 01 Minimal ───────────────────────────────────────────────────────────
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
			'--surface2': '#ffffff', '--surface3': '#f5f5f8', '--surface4': '#ececef',
			'--text1': '#17171c', '--text2': '#9a9aa2', '--accent': '#3a6df0', '--body-bg': '#e7e7ea',
			'--btn-radius': '6px', '--container-radius': '10px', '--chip-radius': '9999px'
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
			'--surface2': '#17171b', '--surface3': '#1d1d22', '--surface4': '#28282f',
			'--text1': '#f3f3f7', '--text2': '#67676f', '--accent': '#6f9bff', '--body-bg': '#111114',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#ffffff',
			'--btn-radius': '6px', '--container-radius': '10px', '--chip-radius': '9999px'
		}
	},

	// ── 02 Ink & Paper ───────────────────────────────────────────────────────
	{
		id: 'ink-paper-light',
		label: 'Ink & Rice Paper',
		description: 'Warm parchment, calligraphy feel',
		swatch: ['#f4ebd9', '#b5342a'],
		elementStyles: {
			card: { backgroundColor: '#f4ebd9', borderColor: '#d6c6a4', borderRadius: '8px', boxShadow: '0 6px 22px rgba(90,70,30,.12)' },
			simplified: { color: '#2a241c', fontFamily: 'kaiti' }, traditional: { color: '#2a241c', fontFamily: 'kaiti' },
			pinyin: { color: '#8a4632' }, zhuyin: { color: '#9c8a63' },
			simpleMeaning: { color: '#3a3026' }, definitions: { color: '#3a3026' },
			partOfSpeech: { color: '#8a4632' }, hr: { borderColor: '#cdb98f' }
		},
		cssVars: {
			'--surface2': '#f4ebd9', '--surface3': 'rgba(255,252,244,.7)', '--surface4': '#cdb98f',
			'--text1': '#2a241c', '--text2': '#9c8a63', '--accent': '#b5342a', '--body-bg': '#ede4ce',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#ffffff',
			'--btn-radius': '9999px', '--btn-border': '1px solid var(--surface4)',
			'--container-radius': '6px', '--chip-radius': '9999px'
		}
	},
	{
		id: 'ink-paper-dark',
		label: 'Ink & Paper · Dark',
		description: 'Brush on deep indigo night',
		swatch: ['#1a1712', '#b5342a'],
		elementStyles: {
			card: {
				backgroundColor: '#1a1712',
				backgroundImage: 'radial-gradient(circle at 22% 28%, rgba(190,150,80,.08), transparent 42%),radial-gradient(circle at 82% 72%, rgba(160,120,55,.07), transparent 46%)',
				borderColor: '#3a3326', borderRadius: '8px', boxShadow: '0 8px 26px rgba(0,0,0,.4)'
			},
			simplified: { color: '#e8dfc8', fontFamily: 'kaiti' }, traditional: { color: '#e8dfc8', fontFamily: 'kaiti' },
			pinyin: { color: '#d4845e' }, zhuyin: { color: '#7a6840' },
			simpleMeaning: { color: '#d4c9ab' }, definitions: { color: '#c2b89a' },
			partOfSpeech: { color: '#d4845e' }, hr: { borderColor: '#3a3326' }
		},
		cssVars: {
			'--surface2': '#1a1712', '--surface3': '#231f18', '--surface4': '#3a3326',
			'--text1': '#e8dfc8', '--text2': '#7a6840', '--accent': '#d4845e', '--body-bg': '#111009',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#ffffff',
			'--btn-radius': '9999px', '--btn-border': '1px solid var(--surface4)',
			'--container-radius': '6px', '--chip-radius': '9999px'
		}
	},

	// ── 03 OLED Dark ─────────────────────────────────────────────────────────
	{
		id: 'oled-dark',
		label: 'OLED Dark',
		description: 'True black, electric violet glow',
		swatch: ['#000000', '#a78bfa'],
		elementStyles: {
			card: { backgroundColor: '#000000', borderColor: '#1c1c24', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,.5)' },
			simplified: { color: '#f4f2ff' }, traditional: { color: '#f4f2ff' },
			pinyin: { color: '#a78bfa' }, zhuyin: { color: '#5a5a68' },
			simpleMeaning: { color: '#e8e6ff' }, definitions: { color: '#c8c6e0' },
			partOfSpeech: { color: '#c4b5fd' }, hr: { borderColor: '#1c1c24' }
		},
		cssVars: {
			'--surface2': '#000000', '--surface3': '#0c0c14', '--surface4': '#1c1c24',
			'--text1': '#f4f2ff', '--text2': '#6a6a80', '--accent': '#a78bfa', '--body-bg': '#000000',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#ffffff',
			'--btn-radius': '10px', '--container-radius': '12px', '--chip-radius': '9999px',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#ffffff'
		}
	},

	// ── 04 Soft Pastel ───────────────────────────────────────────────────────
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
			simpleMeaning: { color: '#6b3f7a' }, definitions: { color: '#5a3570' },
			partOfSpeech: { color: '#f472b6' }, hr: { borderColor: '#f7c6dd' }
		},
		cssVars: {
			'--surface2': '#fff5f8', '--surface3': '#fdf0f6', '--surface4': '#fde4ee',
			'--text1': '#5a3570', '--text2': '#c4a3d6', '--accent': '#f472b6', '--body-bg': '#f0edf8',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#ffffff',
			'--btn-radius': '9999px', '--btn-border': '1px solid var(--surface4)',
			'--container-radius': '16px', '--chip-radius': '9999px'
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
			simpleMeaning: { color: '#e2d4f0' }, definitions: { color: '#cfc0e0' },
			partOfSpeech: { color: '#ff9ecb' }, hr: { borderColor: '#3a2f50' }
		},
		cssVars: {
			'--surface2': '#2a1f3d', '--surface3': '#352847', '--surface4': '#3a2f50',
			'--text1': '#e2d4f0', '--text2': '#9d8bc4', '--accent': '#ff9ecb', '--body-bg': '#1a1228',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#1a1228',
			'--btn-radius': '9999px', '--btn-border': '1px solid var(--surface4)',
			'--container-radius': '16px', '--chip-radius': '9999px'
		}
	},

	// ── 05 Editorial ─────────────────────────────────────────────────────────
	{
		id: 'editorial-light',
		label: 'Editorial',
		description: 'Serif type, sharp keylines',
		swatch: ['#f6f3ec', '#d6402a'],
		elementStyles: {
			card: { backgroundColor: '#f6f3ec', borderColor: '#16140f', borderRadius: '2px', boxShadow: 'none' },
			simplified: { color: '#16140f', fontFamily: 'songti' }, traditional: { color: '#16140f', fontFamily: 'songti' },
			pinyin: { color: '#d6402a' }, zhuyin: { color: '#7a7060' },
			simpleMeaning: { color: '#16140f' }, definitions: { color: '#2a2820' },
			partOfSpeech: { color: '#16140f' }, hr: { borderColor: '#16140f' }
		},
		cssVars: {
			'--surface2': '#f6f3ec', '--surface3': '#ede8de', '--surface4': '#c8c4b8',
			'--text1': '#16140f', '--text2': '#6a6456', '--accent': '#d6402a', '--body-bg': '#ede8dc',
			'--chip-bg': 'var(--text1)', '--chip-fg': 'var(--surface2)',
			'--btn-radius': '0px', '--btn-border': '1px solid var(--text1)',
			'--container-radius': '0px', '--chip-radius': '3px'
		}
	},
	{
		id: 'editorial-dark',
		label: 'Editorial · Dark',
		description: 'Reverse print on deep sepia',
		swatch: ['#15120e', '#d6402a'],
		elementStyles: {
			card: { backgroundColor: '#15120e', borderColor: '#f0ebe0', borderRadius: '2px', boxShadow: 'none' },
			simplified: { color: '#f0ebe0', fontFamily: 'songti' }, traditional: { color: '#f0ebe0', fontFamily: 'songti' },
			pinyin: { color: '#e06040' }, zhuyin: { color: '#8a8070' },
			simpleMeaning: { color: '#f0ebe0' }, definitions: { color: '#d8d4c8' },
			partOfSpeech: { color: '#f0ebe0' }, hr: { borderColor: '#f0ebe0' }
		},
		cssVars: {
			'--surface2': '#15120e', '--surface3': '#1e1a14', '--surface4': '#3a3528',
			'--text1': '#f0ebe0', '--text2': '#9a9080', '--accent': '#e06040', '--body-bg': '#0d0b08',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#ffffff',
			'--btn-radius': '0px', '--btn-border': '1px solid var(--text1)',
			'--container-radius': '0px', '--chip-radius': '3px'
		}
	},

	// ── 06 Modern App UI ─────────────────────────────────────────────────────
	{
		id: 'modern-app-light',
		label: 'Modern App · Light',
		description: 'Sectioned panels, pills, soft shadows',
		swatch: ['#ffffff', '#3a6df0'],
		elementStyles: {
			card: { backgroundColor: '#ffffff', borderColor: '#dde3ec', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,.08)' },
			simplified: { color: '#0d1b2e' }, traditional: { color: '#0d1b2e' },
			pinyin: { color: '#3a6df0' }, zhuyin: { color: '#7a8a9e' },
			simpleMeaning: { color: '#0d1b2e' }, definitions: { color: '#1a2b40' },
			partOfSpeech: { color: '#0d1b2e' }, hr: { borderColor: '#dde3ec' }
		},
		cssVars: {
			'--surface2': '#ffffff', '--surface3': '#f0f4f8', '--surface4': '#dde3ec',
			'--text1': '#0d1b2e', '--text2': '#7a8a9e', '--accent': '#3a6df0', '--body-bg': '#e4ecf6',
			'--chip-bg': 'var(--text1)', '--chip-fg': '#ffffff',
			'--btn-bg': '#1c2d45', '--btn-fg': '#ffffff',
			'--btn-radius': '10px', '--container-radius': '12px', '--chip-radius': '9999px',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#ffffff'
		}
	},
	{
		id: 'modern-app-dark',
		label: 'Modern App · Dark',
		description: 'Deep navy panels, electric blue',
		swatch: ['#0c1220', '#5b8af0'],
		elementStyles: {
			card: { backgroundColor: '#0c1220', borderColor: '#1e2d4a', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,.45)' },
			simplified: { color: '#d8e8f8' }, traditional: { color: '#d8e8f8' },
			pinyin: { color: '#5b8af0' }, zhuyin: { color: '#5a7a99' },
			simpleMeaning: { color: '#d8e8f8' }, definitions: { color: '#b8cce0' },
			partOfSpeech: { color: '#d8e8f8' }, hr: { borderColor: '#1e2d4a' }
		},
		cssVars: {
			'--surface2': '#0c1220', '--surface3': '#141e34', '--surface4': '#1e2d4a',
			'--text1': '#d8e8f8', '--text2': '#5a7a99', '--accent': '#5b8af0', '--body-bg': '#080c14',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#ffffff',
			'--btn-bg': '#1a2c48', '--btn-fg': '#a0b8d0',
			'--btn-radius': '10px', '--container-radius': '12px', '--chip-radius': '9999px',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#ffffff'
		}
	},

	// ── 07 Bold / Brutalist ───────────────────────────────────────────────────
	{
		id: 'bold-brutalist-light',
		label: 'Bold · Brutalist',
		description: 'Thick keylines, hard shadows, primary color blocks',
		swatch: ['#faf5e8', '#f5c800'],
		elementStyles: {
			card: { backgroundColor: '#faf5e8', borderColor: '#111111', borderWidth: '3px', borderStyle: 'solid', borderRadius: '0px', boxShadow: '5px 5px 0 #111111' },
			simplified: { color: '#111111' }, traditional: { color: '#111111' },
			pinyin: { color: '#d42b2b' }, zhuyin: { color: '#555555' },
			simpleMeaning: { color: '#111111' }, definitions: { color: '#111111' },
			partOfSpeech: { color: '#111111' }, hr: { borderColor: '#111111' }
		},
		cssVars: {
			'--surface2': '#faf5e8', '--surface3': '#fff9f0', '--surface4': '#111111',
			'--text1': '#111111', '--text2': '#555555', '--accent': '#f5c800', '--body-bg': '#e8e0cc',
			'--chip-bg': '#f5c800', '--chip-fg': '#111111',
			'--btn-radius': '0px', '--btn-border': '2px solid var(--surface4)',
			'--container-radius': '0px', '--chip-radius': '0px',
			'--btn-next-bg': '#f5c800', '--btn-next-fg': '#111111'
		}
	},
	{
		id: 'bold-brutalist-dark',
		label: 'Bold · Brutalist Dark',
		description: 'Pure black, neon lime outlines',
		swatch: ['#0a0a0a', '#b8ff00'],
		elementStyles: {
			card: { backgroundColor: '#0a0a0a', borderColor: '#b8ff00', borderWidth: '2px', borderStyle: 'solid', borderRadius: '0px', boxShadow: '4px 4px 0 #b8ff00' },
			simplified: { color: '#b8ff00' }, traditional: { color: '#f0f0f0' },
			pinyin: { color: '#00e5ff' }, zhuyin: { color: '#888888' },
			simpleMeaning: { color: '#f0f0f0' }, definitions: { color: '#e0e0e0' },
			partOfSpeech: { color: '#f0f0f0' }, hr: { borderColor: '#b8ff00' }
		},
		cssVars: {
			'--surface2': '#0a0a0a', '--surface3': '#111111', '--surface4': '#b8ff00',
			'--text1': '#f0f0f0', '--text2': '#888888', '--accent': '#b8ff00', '--body-bg': '#000000',
			'--chip-bg': '#b8ff00', '--chip-fg': '#000000',
			'--btn-radius': '0px', '--btn-border': '2px solid var(--surface4)',
			'--container-radius': '0px', '--chip-radius': '0px',
			'--btn-next-bg': '#b8ff00', '--btn-next-fg': '#000000'
		}
	},

	// ── 08 Vintage Dictionary ─────────────────────────────────────────────────
	{
		id: 'vintage-dictionary-light',
		label: 'Vintage Dictionary',
		description: 'Aged paper, ruled senses, pocket-lexicon',
		swatch: ['#f0ead8', '#2a6b5c'],
		elementStyles: {
			card: { backgroundColor: '#f0ead8', borderColor: '#c0b490', borderRadius: '2px', boxShadow: '0 2px 10px rgba(60,50,20,.12)' },
			simplified: { color: '#2a2418', fontFamily: 'songti' }, traditional: { color: '#2a2418', fontFamily: 'songti' },
			pinyin: { color: '#8a4632' }, zhuyin: { color: '#8a7a60' },
			simpleMeaning: { color: '#2a2418' }, definitions: { color: '#2a2418' },
			partOfSpeech: { color: '#2a2418' }, hr: { borderColor: '#c0b490' }
		},
		cssVars: {
			'--surface2': '#f0ead8', '--surface3': '#e8e0c8', '--surface4': '#c0b490',
			'--text1': '#2a2418', '--text2': '#8a7a60', '--accent': '#2a6b5c', '--body-bg': '#e0d8c4',
			'--chip-bg': 'var(--text1)', '--chip-fg': 'var(--surface2)',
			'--btn-radius': '2px', '--btn-border': '1px solid var(--surface4)',
			'--container-radius': '2px', '--chip-radius': '2px',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#ffffff'
		}
	},
	{
		id: 'vintage-dictionary-dark',
		label: 'Vintage Dict · Dark',
		description: 'Deep olive night, warm gold',
		swatch: ['#1a180e', '#c8a84b'],
		elementStyles: {
			card: { backgroundColor: '#1a180e', borderColor: '#4a4430', borderRadius: '2px', boxShadow: '0 4px 16px rgba(0,0,0,.4)' },
			simplified: { color: '#e8e0c8', fontFamily: 'songti' }, traditional: { color: '#e8e0c8', fontFamily: 'songti' },
			pinyin: { color: '#c8a84b' }, zhuyin: { color: '#9a9070' },
			simpleMeaning: { color: '#e8e0c8' }, definitions: { color: '#d8d0b8' },
			partOfSpeech: { color: '#e8e0c8' }, hr: { borderColor: '#4a4430' }
		},
		cssVars: {
			'--surface2': '#1a180e', '--surface3': '#221f14', '--surface4': '#4a4430',
			'--text1': '#e8e0c8', '--text2': '#9a9070', '--accent': '#c8a84b', '--body-bg': '#100e08',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#100e08',
			'--btn-radius': '2px', '--btn-border': '1px solid var(--surface4)',
			'--container-radius': '2px', '--chip-radius': '2px',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#100e08'
		}
	},

	// ── 09 Frosted Glass · Aurora ─────────────────────────────────────────────
	{
		id: 'frosted-aurora-dark',
		label: 'Frosted Aurora · Dark',
		description: 'Translucent panels over aurora gradient',
		swatch: ['#5e35b1', '#38c9b8'],
		elementStyles: {
			card: {
				backgroundColor: 'rgba(60,40,160,0.65)',
				backgroundImage: 'linear-gradient(145deg,rgba(80,50,220,0.75) 0%,rgba(110,50,200,0.7) 40%,rgba(60,80,220,0.65) 100%)',
				borderColor: 'rgba(255,255,255,0.18)', borderRadius: '20px', boxShadow: '0 20px 60px rgba(40,20,120,0.5)'
			},
			simplified: { color: '#ffffff' }, traditional: { color: 'rgba(255,255,255,0.85)' },
			pinyin: { color: '#38c9b8' }, zhuyin: { color: 'rgba(255,255,255,0.5)' },
			simpleMeaning: { color: '#ffffff' }, definitions: { color: 'rgba(255,255,255,0.9)' },
			partOfSpeech: { color: '#ffffff' }, hr: { borderColor: 'rgba(255,255,255,0.15)' }
		},
		cssVars: {
			'--surface2': 'rgba(255,255,255,0.08)', '--surface3': 'rgba(255,255,255,0.06)', '--surface4': 'rgba(255,255,255,0.15)',
			'--text1': '#ffffff', '--text2': 'rgba(255,255,255,0.55)', '--accent': '#38c9b8', '--body-bg': '#3a2d8f',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#ffffff',
			'--btn-radius': '9999px', '--container-radius': '14px', '--chip-radius': '9999px',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#ffffff'
		}
	},
	{
		id: 'frosted-aurora-light',
		label: 'Frosted Aurora · Light',
		description: 'Pink-lavender haze, glass surface',
		swatch: ['#f8f0fc', '#0f9e8e'],
		elementStyles: {
			card: {
				backgroundColor: 'rgba(255,255,255,0.78)',
				backgroundImage: 'linear-gradient(145deg,rgba(255,248,252,0.9) 0%,rgba(248,242,255,0.88) 50%,rgba(238,255,254,0.88) 100%)',
				borderColor: 'rgba(180,160,220,0.28)', borderRadius: '20px', boxShadow: '0 20px 40px rgba(180,140,220,0.2)'
			},
			simplified: { color: '#1a1a2e' }, traditional: { color: '#2a2a40' },
			pinyin: { color: '#0f9e8e' }, zhuyin: { color: 'rgba(80,80,120,0.7)' },
			simpleMeaning: { color: '#1a1a2e' }, definitions: { color: '#1e1e36' },
			partOfSpeech: { color: '#1a1a2e' }, hr: { borderColor: 'rgba(180,160,220,0.28)' }
		},
		cssVars: {
			'--surface2': 'rgba(255,255,255,0.78)', '--surface3': 'rgba(255,255,255,0.55)', '--surface4': 'rgba(180,160,220,0.25)',
			'--text1': '#1a1a2e', '--text2': 'rgba(80,80,120,0.75)', '--accent': '#0f9e8e', '--body-bg': '#e8d8f0',
			'--chip-bg': 'var(--accent)', '--chip-fg': '#ffffff',
			'--btn-radius': '9999px', '--container-radius': '14px', '--chip-radius': '9999px',
			'--btn-next-bg': 'var(--accent)', '--btn-next-fg': '#ffffff'
		}
	},

	// ── 10 Zen · Muji ─────────────────────────────────────────────────────────
	{
		id: 'zen-muji-light',
		label: 'Zen · Muji',
		description: 'Warm neutrals, light weights, unhurried',
		swatch: ['#f7f3e8', '#5a8a78'],
		elementStyles: {
			card: { backgroundColor: '#f7f3e8', borderColor: '#e0d8c4', borderRadius: '4px', boxShadow: 'none' },
			simplified: { color: '#2a2618' }, traditional: { color: '#2a2618' },
			pinyin: { color: '#9a9080' }, zhuyin: { color: '#b0a898' },
			simpleMeaning: { color: '#2a2618' }, definitions: { color: '#2a2618' },
			partOfSpeech: { color: '#2a2618' }, hr: { borderColor: '#e0d8c4' }
		},
		cssVars: {
			'--surface2': '#f7f3e8', '--surface3': '#f0ead8', '--surface4': '#d8ceb8',
			'--text1': '#2a2618', '--text2': '#9a9080', '--accent': '#5a8a78', '--body-bg': '#ece7d8',
			'--chip-bg': 'var(--text1)', '--chip-fg': 'var(--surface2)',
			'--btn-bg': 'transparent', '--btn-fg': 'var(--text2)',
			'--btn-radius': '0px', '--container-radius': '0px', '--chip-radius': '2px',
			'--btn-next-bg': 'transparent', '--btn-next-fg': 'var(--text1)'
		}
	},
	{
		id: 'zen-muji-dark',
		label: 'Zen · Muji Dark',
		description: 'Deep charcoal, cream letterforms',
		swatch: ['#1e1c18', '#a89070'],
		elementStyles: {
			card: { backgroundColor: '#1e1c18', borderColor: '#3a3830', borderRadius: '4px', boxShadow: 'none' },
			simplified: { color: '#e0d8c8' }, traditional: { color: '#e0d8c8' },
			pinyin: { color: '#a89070' }, zhuyin: { color: '#7a7268' },
			simpleMeaning: { color: '#e0d8c8' }, definitions: { color: '#d0c8b8' },
			partOfSpeech: { color: '#e0d8c8' }, hr: { borderColor: '#3a3830' }
		},
		cssVars: {
			'--surface2': '#1e1c18', '--surface3': '#262420', '--surface4': '#3a3830',
			'--text1': '#e0d8c8', '--text2': '#8a8278', '--accent': '#a89070', '--body-bg': '#141210',
			'--chip-bg': 'var(--text1)', '--chip-fg': 'var(--surface2)',
			'--btn-bg': 'transparent', '--btn-fg': 'var(--text2)',
			'--btn-radius': '0px', '--container-radius': '0px', '--chip-radius': '2px',
			'--btn-next-bg': 'transparent', '--btn-next-fg': 'var(--text1)'
		}
	}
];

export const CARD_THEME_MAP = new Map<string, CardTheme>(CARD_THEMES.map((t) => [t.id, t]));

export const CARD_THEME_GROUPS: CardThemeGroup[] = [
	{ id: 'minimal',            label: 'Minimal',            description: 'Clean, weightless type',             swatch: ['#ffffff', '#3a6df0'], lightId: 'minimal-light',            darkId: 'minimal-dark' },
	{ id: 'ink-paper',          label: 'Ink & Paper',        description: 'Warm parchment, calligraphy feel',   swatch: ['#f4ebd9', '#b5342a'], lightId: 'ink-paper-light',          darkId: 'ink-paper-dark' },
	{ id: 'oled-dark',          label: 'OLED Dark',          description: 'True black, electric violet',        swatch: ['#000000', '#a78bfa'],                                      darkId: 'oled-dark' },
	{ id: 'soft-pastel',        label: 'Soft Pastel',        description: 'Candy-soft, friendly',               swatch: ['#fff5f8', '#f472b6'], lightId: 'soft-pastel-light',        darkId: 'soft-pastel-dark' },
	{ id: 'editorial',          label: 'Editorial',          description: 'Serif type, sharp keylines',         swatch: ['#f6f3ec', '#d6402a'], lightId: 'editorial-light',          darkId: 'editorial-dark' },
	{ id: 'modern-app',         label: 'Modern App',         description: 'Sectioned panels, pills',            swatch: ['#ffffff', '#3a6df0'], lightId: 'modern-app-light',         darkId: 'modern-app-dark' },
	{ id: 'bold-brutalist',     label: 'Bold Brutalist',     description: 'Thick keylines, primary blocks',     swatch: ['#faf5e8', '#f5c800'], lightId: 'bold-brutalist-light',     darkId: 'bold-brutalist-dark' },
	{ id: 'vintage-dictionary', label: 'Vintage Dictionary', description: 'Aged paper, ruled senses',          swatch: ['#f0ead8', '#2a6b5c'], lightId: 'vintage-dictionary-light', darkId: 'vintage-dictionary-dark' },
	{ id: 'frosted-aurora',     label: 'Frosted Aurora',     description: 'Translucent panels, gradient haze', swatch: ['#f8f0fc', '#0f9e8e'], lightId: 'frosted-aurora-light',     darkId: 'frosted-aurora-dark' },
	{ id: 'zen-muji',           label: 'Zen · Muji',         description: 'Warm neutrals, unhurried',          swatch: ['#f7f3e8', '#5a8a78'], lightId: 'zen-muji-light',           darkId: 'zen-muji-dark' }
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
