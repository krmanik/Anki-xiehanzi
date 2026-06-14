import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import WordCard from './WordCard.svelte';
import type { Word } from '$lib/deck';

function word(over: Partial<Word> = {}): Word {
	return {
		Simplified: '中国',
		Traditional: '中國',
		Pinyin: 'Zhōng guó',
		Zhuyin: 'ㄓㄨㄥ ㄍㄨㄛˊ',
		Definitions: 'China',
		Syllable: 'Zhong1 guo2',
		SimpleMeaning: 'China',
		commonMeaning: 'China',
		pos: [],
		dominantPos: '',
		classifiers: [],
		level: 'new-1',
		rank: 50,
		readings: [],
		breakdown: [],
		...over
	};
}

describe('WordCard — metadata badges', () => {
	it('shows an HSK level badge and a frequency band badge', () => {
		const { getByText } = render(WordCard, { props: { word: word() } });
		expect(getByText('HSK 1')).toBeInTheDocument();
		expect(getByText('Top 100')).toBeInTheDocument();
	});

	it('omits the frequency badge when rank is unknown', () => {
		const { queryByText } = render(WordCard, { props: { word: word({ rank: null }) } });
		expect(queryByText(/^Top /)).toBeNull();
	});
});
