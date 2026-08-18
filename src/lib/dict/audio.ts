/**
 * Pronunciation for the dictionary page, in three tiers.
 *
 *   1. the HSK 2025 recording on jsDelivr — a real speaker, but only for the
 *      ~11,000 words the list covers;
 *   2. the syllable sprite (`syllableAudio.ts`) — one clip per Mandarin
 *      syllable, scheduled back to back, which covers every one of cedict's
 *      120,000 words and every example sentence, offline after one 3 MB fetch;
 *   3. Edge TTS, imported lazily, for anything with no pinyin to work from.
 *
 * Tier 2 is why 从零开始 speaks at all: it has no recording of its own, and
 * before the sprite every such word went to a TTS call that Edge-only browsers
 * answer and the rest do not.
 *
 * Deliberately not `deck.ts#playWordAudio`: that module drags in genanki-js,
 * sql.js and jieba-wasm.
 */

import { speakSyllables, stopSyllables } from './syllableAudio';

const CDN = 'https://cdn.jsdelivr.net/gh/krmanik/HSK-3.0/New%20HSK%20(2025)/Audio';

const cache = new Map<string, string | null>();
let current: HTMLAudioElement | null = null;

function playUrl(url: string): void {
	stopSpeaking();
	current = new Audio(url);
	void current.play();
}

/** The CDN recording for a word, or null when it has none. Misses are cached. */
async function recordingFor(word: string): Promise<string | null> {
	const known = cache.get(word);
	if (known !== undefined) return known;
	let url: string | null = null;
	try {
		const res = await fetch(`${CDN}/cmn-${encodeURIComponent(word)}.mp3`);
		if (res.ok) url = URL.createObjectURL(await res.blob());
	} catch {
		/* offline or blocked — the sprite covers it */
	}
	cache.set(word, url);
	return url;
}

export interface SpeakOptions {
	/**
	 * The reading, numbered ("cong2 ling2") or tone-marked ("cóng líng"). With
	 * it, anything can be spoken from the sprite; without it, only a word the CDN
	 * has recorded or a browser with Edge TTS will make a sound.
	 */
	pinyin?: string;
	/** Silence between syllables — a sentence breathes more than a word. */
	spacing?: number;
	/** Skip the CDN lookup (sentences never have a recording). */
	skipRecording?: boolean;
}

/** Speak a word or sentence. Returns false when nothing could be played. */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<boolean> {
	const t = (text ?? '').trim();
	if (!t && !opts.pinyin) return false;

	if (t && !opts.skipRecording) {
		const url = await recordingFor(t);
		if (url) {
			playUrl(url);
			return true;
		}
	}

	if (opts.pinyin) {
		stopSpeaking();
		if (await speakSyllables(opts.pinyin, { spacing: opts.spacing })) return true;
	}

	try {
		const { default: EdgeTTSBrowser } = await import('@kingdanx/edge-tts-browser');
		const tts = new EdgeTTSBrowser();
		tts.tts.setVoiceParams({ text: t, voice: 'zh-CN-XiaoxiaoNeural' });
		const blob = await tts.ttsToFile(`cmn-${t}.mp3`);
		const url = URL.createObjectURL(blob);
		playUrl(url);
		return true;
	} catch (e) {
		console.log('TTS failed', e);
		return false;
	}
}

/** Stop whatever is playing, from either source. */
export function stopSpeaking(): void {
	current?.pause();
	current = null;
	stopSyllables();
}
