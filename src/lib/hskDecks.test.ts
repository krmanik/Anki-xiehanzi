import { describe, expect, it } from 'vitest';
import {
	deckSummary,
	deckUrl,
	findDeck,
	formatBytes,
	type HskDeckManifest
} from './hskDecks';

const manifest: HskDeckManifest = {
	generated: '2026-08-16',
	tag: 'hsk-decks-2026-08',
	baseUrl: 'https://github.com/krmanik/Anki-xiehanzi/releases/download/hsk-decks-2026-08',
	options: { audio: true, examples: true },
	decks: [
		{
			list: 'new',
			file: 'Anki-xiehanzi-New-HSK-2025.apkg',
			words: 10900,
			levels: 7,
			audio: 10880,
			bytes: 62_000_000
		},
		{
			list: 'old',
			file: 'Anki-xiehanzi-Old-HSK-2012.apkg',
			words: 5000,
			levels: 6,
			audio: 4900,
			bytes: 800_000
		}
	]
};

describe('findDeck', () => {
	it('finds the one deck of a list', () => {
		expect(findDeck(manifest, 'new')?.words).toBe(10900);
		expect(findDeck(manifest, 'old')?.audio).toBe(4900);
	});

	it('returns null for a list with no prebuilt deck, or no manifest at all', () => {
		expect(findDeck(manifest, 'yct')).toBeNull();
		expect(findDeck(null, 'new')).toBeNull();
	});
});

describe('deckUrl', () => {
	it('joins the release base with the asset name', () => {
		expect(deckUrl(manifest, manifest.decks[0])).toBe(
			'https://github.com/krmanik/Anki-xiehanzi/releases/download/hsk-decks-2026-08/Anki-xiehanzi-New-HSK-2025.apkg'
		);
	});

	it('does not double the slash when the base ends in one', () => {
		const trailing = { ...manifest, baseUrl: `${manifest.baseUrl}/` };
		expect(deckUrl(trailing, manifest.decks[1])).not.toContain('//Anki');
	});
});

describe('formatBytes', () => {
	it('uses KB below a megabyte and MB above it', () => {
		expect(formatBytes(800_000)).toBe('781 KB');
		expect(formatBytes(6_500_000)).toBe('6.2 MB');
		expect(formatBytes(62_000_000)).toBe('59 MB');
	});

	it('renders nothing for a missing size', () => {
		expect(formatBytes(0)).toBe('');
	});
});

describe('deckSummary', () => {
	it('lists what the deck contains', () => {
		expect(deckSummary(manifest, manifest.decks[0])).toBe(
			'10,900 words · 7 levels · audio · example sentences · stroke order'
		);
	});

	it('drops audio and examples when the build had neither', () => {
		const silent: HskDeckManifest = { ...manifest, options: { audio: false, examples: false } };
		expect(deckSummary(silent, manifest.decks[0])).toBe('10,900 words · 7 levels · stroke order');
	});
});
