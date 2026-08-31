import { describe, expect, it } from 'vitest';

import {
	allForms,
	byStrokeCount,
	filterRadicals,
	glyphUrl,
	productivityBand,
	radicalLabel,
	radicalTone,
	premiumExtras,
	radicalDeckUrl,
	sortRadicals,
	stripTones,
	strokeCounts,
	type Radical,
	type RadicalDeckManifest
} from './radicals';

const make = (over: Partial<Radical>): Radical => ({
	number: 1,
	char: '一',
	variants: [],
	simplified: [],
	traditional: [],
	strokes: 1,
	meaning: 'one',
	pinyin: 'yī',
	colloquial: null,
	hanviet: 'nhất',
	kana: 'いち',
	romaji: 'ichi',
	hangul: '한일',
	romaja: 'hanil',
	zhuyin: 'ㄧ',
	unicode: 'U+4E00',
	kangxiForm: '⼀',
	word: null,
	frequency: 42,
	examples: [],
	evolution: [],
	compare: [],
	...over
});

const yue = make({
	number: 74,
	char: '月',
	strokes: 4,
	meaning: 'moon',
	pinyin: 'yuè',
	colloquial: { term: '月字旁', pinyin: 'yuè zì páng', english: 'moon radical' },
	hanviet: 'nguyệt',
	kana: 'つき',
	romaji: 'tsuki',
	hangul: '달월',
	romaja: 'dalweol',
	frequency: 69,
	examples: [
		{ char: '朋', pinyin: 'péng', zhuyin: 'ㄆㄥˊ', meaning: 'friend', rank: 11117, band: 'Rare' }
	]
});

const shui = make({
	number: 85,
	char: '水',
	variants: ['氵', '氺'],
	strokes: 4,
	meaning: 'water',
	pinyin: 'shuǐ',
	frequency: 486
});

const cao = make({ number: 140, char: '艸', variants: ['艹'], strokes: 6, meaning: 'grass', pinyin: 'cǎo', frequency: 606 });

describe('stripTones', () => {
	it('drops tone marks and case', () => {
		expect(stripTones('Yuè')).toBe('yue');
		expect(stripTones('nhất')).toBe('nhat');
	});
});

describe('filterRadicals', () => {
	const all = [yue, shui, cao];

	it('keeps everything for an empty query', () => {
		expect(filterRadicals(all, '   ')).toHaveLength(3);
	});

	it('matches pinyin with or without tone marks', () => {
		expect(filterRadicals(all, 'yuè').map((r) => r.char)).toEqual(['月']);
		expect(filterRadicals(all, 'yue').map((r) => r.char)).toEqual(['月']);
	});

	it('matches the English meaning', () => {
		expect(filterRadicals(all, 'water').map((r) => r.char)).toEqual(['水']);
	});

	it('matches a variant form, not just the head form', () => {
		expect(filterRadicals(all, '氵').map((r) => r.char)).toEqual(['水']);
	});

	it('matches the Kangxi number exactly', () => {
		expect(filterRadicals(all, '85').map((r) => r.char)).toEqual(['水']);
		expect(filterRadicals(all, '8')).toHaveLength(0);
	});

	it('matches Hán-Việt, romaji, romaja and kana', () => {
		expect(filterRadicals(all, 'nguyet').map((r) => r.char)).toEqual(['月']);
		expect(filterRadicals(all, 'tsuki').map((r) => r.char)).toEqual(['月']);
		expect(filterRadicals(all, 'dalweol').map((r) => r.char)).toEqual(['月']);
		expect(filterRadicals(all, 'つき').map((r) => r.char)).toEqual(['月']);
	});

	it('matches an example character', () => {
		expect(filterRadicals(all, '朋').map((r) => r.char)).toEqual(['月']);
	});

	it('matches the Chinese teaching name', () => {
		expect(filterRadicals(all, '月字旁').map((r) => r.char)).toEqual(['月']);
	});
});

describe('sortRadicals', () => {
	const all = [cao, yue, shui];

	it('defaults to Kangxi order', () => {
		expect(sortRadicals(all, 'number').map((r) => r.number)).toEqual([74, 85, 140]);
	});

	it('sorts by stroke count, Kangxi number breaking ties', () => {
		expect(sortRadicals(all, 'strokes').map((r) => r.char)).toEqual(['月', '水', '艸']);
	});

	it('sorts most productive first', () => {
		expect(sortRadicals(all, 'frequency').map((r) => r.char)).toEqual(['艸', '水', '月']);
	});

	it('sorts pinyin ignoring tone marks', () => {
		expect(sortRadicals(all, 'pinyin').map((r) => r.char)).toEqual(['艸', '水', '月']);
	});

	it('does not mutate the input', () => {
		const input = [cao, yue];
		sortRadicals(input, 'frequency');
		expect(input.map((r) => r.char)).toEqual(['艸', '月']);
	});
});

describe('strokeCounts', () => {
	it('lists each stroke count once, ascending', () => {
		expect(strokeCounts([cao, yue, shui])).toEqual([4, 6]);
	});
});

describe('byStrokeCount', () => {
	it('groups ascending, Kangxi order inside a group', () => {
		const groups = byStrokeCount([cao, shui, yue]);
		expect(groups.map((g) => g.strokes)).toEqual([4, 6]);
		expect(groups[0].radicals.map((r) => r.char)).toEqual(['月', '水']);
	});
});

describe('productivityBand', () => {
	it('bands the count logarithmically', () => {
		expect(productivityBand(606)).toBe('Very common');
		expect(productivityBand(120)).toBe('Common');
		expect(productivityBand(42)).toBe('Moderate');
		expect(productivityBand(7)).toBe('Uncommon');
		expect(productivityBand(0)).toBe('Rare');
	});
});

describe('allForms', () => {
	it('puts the head form first and never repeats it', () => {
		expect(allForms(shui)).toEqual(['水', '氵', '氺']);
		expect(allForms(make({ char: '網', variants: ['网'], simplified: ['网'] }))).toEqual(['網', '网']);
		// A simplified radical carries the traditional form it stands in for, and
		// that is a form the learner has to recognize too.
		expect(allForms(make({ char: '儿', traditional: ['兒'] }))).toEqual(['儿', '兒']);
	});
});

describe('radicalTone', () => {
	it('reads the tone off the marked pinyin', () => {
		expect(radicalTone('yuè')).toBe(4);
		expect(radicalTone('yī')).toBe(1);
	});
});

describe('radicalLabel', () => {
	it('joins the char, pinyin and meaning', () => {
		expect(radicalLabel(yue)).toBe('月 · yuè · moon');
	});
});

describe('glyphUrl', () => {
	it('resolves under the site base path', () => {
		expect(glyphUrl('kai-cn-6708.svg')).toContain('/data/radicals/glyphs/kai-cn-6708.svg');
	});
});

const manifest: RadicalDeckManifest = {
	generated: '2026-08-16',
	tag: 'radical-deck-2026-08',
	baseUrl: 'https://github.com/krmanik/Anki-xiehanzi/releases/download/radical-deck-2026-08',
	shop: 'https://www.patreon.com/cw/krmani/shop',
	radicals: 214,
	audio: 214,
	editions: {
		free: {
			file: 'Anki-xiehanzi-Kangxi-Radicals-Free.apkg',
			cards: 214,
			glyphs: 0,
			bytes: 1_500_000,
			premium: false,
			features: {
				recognitionCard: true,
				writingCard: false,
				audio: true,
				strokeOrder: true,
				glyphEvolution: false
			}
		},
		premium: {
			file: 'Anki-xiehanzi-Kangxi-Radicals.apkg',
			cards: 428,
			glyphs: 2016,
			bytes: 4_400_000,
			premium: true,
			features: {
				recognitionCard: true,
				writingCard: true,
				audio: true,
				strokeOrder: true,
				glyphEvolution: true,
				panels: true,
				wordSense: true
			}
		}
	},
	options: { audio: true, images: true }
};

describe('radicalDeckUrl', () => {
	it('downloads the free edition from the release', () => {
		expect(radicalDeckUrl(manifest, manifest.editions.free!)).toBe(
			`${manifest.baseUrl}/Anki-xiehanzi-Kangxi-Radicals-Free.apkg`
		);
	});

	it('sends the premium edition to the post when there is one', () => {
		const post = 'https://www.patreon.com/krmani/posts/kangxi-radicals-166891672';
		expect(radicalDeckUrl({ ...manifest, post }, manifest.editions.premium!)).toBe(post);
	});

	it('sends the premium edition to the shop, never to a release asset', () => {
		const url = radicalDeckUrl(manifest, manifest.editions.premium!);
		expect(url).toBe(manifest.shop);
		expect(url).not.toContain('.apkg');
	});
});

describe('premiumExtras', () => {
	// Both card types are free now — the browser builds them — so what premium
	// adds is the answer: the panels, the glyph images and the extra detail.
	it('lists what premium adds over the deck the browser builds', () => {
		const extras = premiumExtras(manifest);
		expect(extras.join(' ')).toContain('panelled');
		expect(extras.join(' ')).toContain('How the glyph evolved');
		// The block titles are English on the card and on the page: a beginner has no
		// way to read 字源演变, and the glyphs under it are the whole point.
		expect(extras.join(' ')).not.toContain('字源演变');
		expect(extras.join(' ')).not.toContain('Writing card');
	});

	it('leaves out the glyph images when that edition was built without them', () => {
		const noGlyphs = {
			...manifest,
			editions: {
				...manifest.editions,
				premium: {
					...manifest.editions.premium!,
					glyphs: 0,
					features: { ...manifest.editions.premium!.features, glyphEvolution: false }
				}
			}
		};
		expect(premiumExtras(noGlyphs).join(' ')).not.toContain('How the glyph evolved');
	});

	it('names the printable PDFs only when the edition carries them', () => {
		expect(premiumExtras(manifest).join(' ')).not.toContain('Print-ready');
		const withPrint: RadicalDeckManifest = {
			...manifest,
			editions: {
				...manifest.editions,
				premium: {
					...manifest.editions.premium!,
					features: { ...manifest.editions.premium!.features, printables: true }
				}
			}
		};
		expect(premiumExtras(withPrint).join(' ')).toContain('Print-ready PDFs');
	});

	it('is empty when there is no premium edition or no manifest', () => {
		expect(premiumExtras(null)).toEqual([]);
		expect(premiumExtras({ ...manifest, editions: { free: manifest.editions.free } })).toEqual([]);
	});
});
