/**
 * Pronunciation for the HSK word lists.
 *
 * Lighter than `dict/audio.ts` on purpose: that module decides whether a word
 * has a recording by loading `hsk_words.json` (1 MB) through `dict/cedict.ts`,
 * which also bundles sql.js. A word list already knows its words are HSK words,
 * so it asks the CDN directly and falls back to the syllable clips — which
 * speak any reading — when the CDN has no recording (most Old HSK-only words).
 */

/** The New HSK (2025) recordings, one `cmn-<word>.mp3` per word. */
export const HSK_AUDIO_CDN = 'https://cdn.jsdelivr.net/gh/krmanik/HSK-3.0/New%20HSK%20(2025)/Audio';

export function hskRecordingUrl(word: string): string {
	return `${HSK_AUDIO_CDN}/cmn-${encodeURIComponent(word.trim())}.mp3`;
}

let current: HTMLAudioElement | null = null;

/**
 * Speak one list word: its recording when the CDN has one, else its reading
 * (numbered or tone-marked pinyin) from the syllable clips. Resolves false when
 * neither made a sound.
 */
export async function playHskWord(word: string, pinyin: string): Promise<boolean> {
	const { speakSyllables, stopSyllables } = await import('./dict/syllableAudio');
	current?.pause();
	stopSyllables();
	const audio = new Audio(hskRecordingUrl(word));
	current = audio;
	try {
		await audio.play();
		return true;
	} catch {
		// A 404 rejects play(); so does a blocked network.
		if (current !== audio) return false;
		current = null;
		return speakSyllables(pinyin);
	}
}
