import { describe, it, expect } from 'vitest';
import { frequencyBand, hskLevels, lowestHskLevel, hskLevelLabel } from './meta';

describe('frequencyBand', () => {
	it('returns null for missing / non-positive rank', () => {
		expect(frequencyBand(null)).toBeNull();
		expect(frequencyBand(undefined)).toBeNull();
		expect(frequencyBand(0)).toBeNull();
		expect(frequencyBand(-5)).toBeNull();
	});

	it('buckets ranks into bands (inclusive upper edges)', () => {
		expect(frequencyBand(1)).toBe('Top 100');
		expect(frequencyBand(100)).toBe('Top 100');
		expect(frequencyBand(101)).toBe('Top 500');
		expect(frequencyBand(500)).toBe('Top 500');
		expect(frequencyBand(1000)).toBe('Top 1000');
		expect(frequencyBand(2000)).toBe('Top 2000');
		expect(frequencyBand(5000)).toBe('Top 5000');
		expect(frequencyBand(10000)).toBe('Top 10000');
		expect(frequencyBand(10001)).toBe('10000+');
		expect(frequencyBand(75532)).toBe('10000+');
	});
});

describe('hskLevels', () => {
	it('returns [] for empty input', () => {
		expect(hskLevels(null)).toEqual([]);
		expect(hskLevels('')).toEqual([]);
	});

	it('strips the new- prefix and splits on commas', () => {
		expect(hskLevels('new-1')).toEqual(['1']);
		expect(hskLevels('new-1,new-2')).toEqual(['1', '2']);
		expect(hskLevels('new-2, new-4, new-5')).toEqual(['2', '4', '5']);
		expect(hskLevels('new-7+')).toEqual(['7+']);
	});
});

describe('lowestHskLevel', () => {
	it('picks the numerically lowest token regardless of order', () => {
		expect(lowestHskLevel('new-2,new-4,new-5')).toBe('2');
		expect(lowestHskLevel('new-5,new-1')).toBe('1');
		expect(lowestHskLevel('new-7+')).toBe('7+');
		expect(lowestHskLevel(null)).toBeNull();
	});
});

describe('hskLevelLabel', () => {
	it('formats the lowest level as an HSK label', () => {
		expect(hskLevelLabel('new-1')).toBe('HSK 1');
		expect(hskLevelLabel('new-2,new-4')).toBe('HSK 2');
		expect(hskLevelLabel('new-7+')).toBe('HSK 7+');
		expect(hskLevelLabel(null)).toBeNull();
		expect(hskLevelLabel('')).toBeNull();
	});
});
