import { describe, expect, it } from 'vitest';
import { hskRecordingUrl } from './hskAudio';

describe('hskRecordingUrl', () => {
	it('names the CDN recording of a word, URL-encoded', () => {
		expect(hskRecordingUrl('发展')).toBe(
			'https://cdn.jsdelivr.net/gh/krmanik/HSK-3.0/New%20HSK%20(2025)/Audio/cmn-%E5%8F%91%E5%B1%95.mp3'
		);
	});
});
