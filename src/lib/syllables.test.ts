import { describe, expect, it } from 'vitest';
import {
	canSpeak,
	clipsFor,
	planSpeech,
	speechTokens,
	toNumberedSyllable,
	type ClipLength
} from './syllables';

// syllable -> clip length in seconds, the shape of syllables.json
const index: Record<string, ClipLength> = {
	cong2: 0.4,
	ling2: 0.35,
	kai1: 0.3,
	shi3: 0.45,
	ma5: 0.2,
	nv3: 0.3,
	qi1: 0.3,
	shi2: 0.3,
	san1: 0.3,
	fen1: 0.3,
	dian3: 0.3
};

describe('toNumberedSyllable', () => {
	it('reads tone marks', () => {
		expect(toNumberedSyllable('cóng')).toBe('cong2');
		expect(toNumberedSyllable('shǐ')).toBe('shi3');
		expect(toNumberedSyllable('kāi')).toBe('kai1');
		expect(toNumberedSyllable('lì')).toBe('li4');
	});

	it('treats an unmarked syllable as neutral', () => {
		expect(toNumberedSyllable('ma')).toBe('ma5');
	});

	it('keeps a numbered syllable as it is, with 0 meaning neutral', () => {
		expect(toNumberedSyllable('cong2')).toBe('cong2');
		expect(toNumberedSyllable('ma0')).toBe('ma5');
	});

	it('folds every spelling of ü to v', () => {
		// NFD spells ǚ as u + diaeresis + caron; dropping the marks first would
		// leave "nu3", a different syllable that is not in the sprite.
		expect(toNumberedSyllable('nǚ')).toBe('nv3');
		expect(toNumberedSyllable('nu:3')).toBe('nv3');
		expect(toNumberedSyllable('nü3')).toBe('nv3');
	});

	it('rejects anything that is not a syllable', () => {
		expect(toNumberedSyllable('。')).toBe('');
		expect(toNumberedSyllable('7')).toBe('');
	});
});

describe('speechTokens', () => {
	it('splits a whole reading', () => {
		expect(speechTokens('cóng líng kāi shǐ').map((t) => t.syllable)).toEqual([
			'cong2',
			'ling2',
			'kai1',
			'shi3'
		]);
	});

	it('keeps punctuation as a pause', () => {
		const tokens = speechTokens('cóng ， shǐ 。');
		expect(tokens.map((t) => (t.kind === 'pause' ? '|' : t.syllable))).toEqual([
			'cong2',
			'|',
			'shi3',
			'|'
		]);
	});

	it('drops erhua, which is not a syllable of its own', () => {
		expect(speechTokens('wan2 r5').map((t) => t.syllable)).toEqual(['wan2']);
	});

	it('marks a token that is not pinyin, rather than dropping it', () => {
		// Dropping it would speak the reading with a hole in it and call that a
		// success; the caller has to be able to fall back instead.
		expect(speechTokens('cong2 zzz9').map((t) => t.kind)).toEqual(['syllable', 'unknown']);
	});

	it('reads the digits the sentence corpus leaves in its pinyin', () => {
		expect(speechTokens('7 diǎn').map((t) => t.syllable)).toEqual(['qi1', 'dian3']);
		expect(speechTokens('30 fēn').map((t) => t.syllable)).toEqual(['san1', 'shi2', 'fen1']);
		expect(speechTokens('15').map((t) => t.syllable)).toEqual(['shi2', 'wu3']);
		expect(speechTokens('10').map((t) => t.syllable)).toEqual(['shi2']);
		// Three digits need 零 in the right places — left to the fallback.
		expect(speechTokens('100').map((t) => t.kind)).toEqual(['unknown']);
	});
});

describe('canSpeak', () => {
	it('is true only when every syllable is in the sprite', () => {
		expect(canSpeak('cóng líng kāi shǐ', index)).toBe(true);
		expect(canSpeak('cong2 zzz9', index)).toBe(false);
		expect(canSpeak('', index)).toBe(false);
	});
});

describe('planSpeech', () => {
	it('lays the syllables end to end with an even spacing', () => {
		const plan = planSpeech('cóng líng', index, { spacing: 0.05 })!;
		expect(plan.segments.map((s) => s.syllable)).toEqual(['cong2', 'ling2']);
		expect(plan.segments[0].at).toBe(0);
		// 0.4s of speech, then the spacing.
		expect(plan.segments[1].at).toBeCloseTo(0.45, 5);
		expect(plan.segments[1].duration).toBeCloseTo(0.35, 5);
		expect(plan.duration).toBeCloseTo(0.8, 5);
	});

	it('waits longer at punctuation', () => {
		const plan = planSpeech('cóng ， líng', index, { spacing: 0.05, pause: 0.2 })!;
		expect(plan.segments[1].at).toBeCloseTo(0.65, 5);
	});

	it('does not pause before the first syllable', () => {
		const plan = planSpeech('， cóng', index, { spacing: 0.05, pause: 0.2 })!;
		expect(plan.segments[0].at).toBe(0);
	});

	it('shortens everything when asked to speak faster', () => {
		const plan = planSpeech('cóng líng', index, { spacing: 0, rate: 2 })!;
		expect(plan.segments[1].at).toBeCloseTo(0.2, 5);
	});

	it('names each clip once, so the player fetches no file twice', () => {
		const plan = planSpeech('shí shí sān', index)!;
		expect(plan.segments).toHaveLength(3);
		expect(clipsFor(plan)).toEqual(['shi2', 'san1']);
	});

	it('plans a sentence with digits in its pinyin', () => {
		// The sentence corpus writes "xiàn zài 7 diǎn 30 fēn"; the numbers are
		// read out of the same clips as everything else.
		const plan = planSpeech('7 diǎn 30 fēn', index)!;
		expect(clipsFor(plan)).toEqual(['qi1', 'dian3', 'san1', 'shi2', 'fen1']);
	});

	it('returns null when a syllable is missing, so the caller can fall back', () => {
		expect(planSpeech('cóng zzz9', index)).toBeNull();
		expect(planSpeech('。', index)).toBeNull();
	});
});
