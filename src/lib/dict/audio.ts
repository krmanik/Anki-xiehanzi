/**
 * Pronunciation for the dictionary page.
 *
 * The HSK 2025 recordings on jsDelivr are real speech and cover every HSK word,
 * so they are tried first; anything else is synthesized with Edge TTS, which is
 * imported lazily — the page must not pull a TTS bundle to show a definition.
 *
 * Deliberately not `deck.ts#playWordAudio`: that module drags in genanki-js,
 * sql.js and jieba-wasm.
 */

const CDN = 'https://cdn.jsdelivr.net/gh/krmanik/HSK-3.0/New%20HSK%20(2025)/Audio';

const cache = new Map<string, string>();
let current: HTMLAudioElement | null = null;

function playUrl(url: string): void {
	current?.pause();
	current = new Audio(url);
	void current.play();
}

/** Speak a word or sentence. Returns false when nothing could be played. */
export async function speak(text: string): Promise<boolean> {
	const t = (text ?? '').trim();
	if (!t) return false;

	const cached = cache.get(t);
	if (cached) {
		playUrl(cached);
		return true;
	}

	// One recording per word, named after it. A miss is the normal case for
	// sentences and rare words, so a 404 is not worth reporting.
	try {
		const res = await fetch(`${CDN}/cmn-${encodeURIComponent(t)}.mp3`);
		if (res.ok) {
			const url = URL.createObjectURL(await res.blob());
			cache.set(t, url);
			playUrl(url);
			return true;
		}
	} catch {
		/* fall through to TTS */
	}

	try {
		const { default: EdgeTTSBrowser } = await import('@kingdanx/edge-tts-browser');
		const tts = new EdgeTTSBrowser();
		tts.tts.setVoiceParams({ text: t, voice: 'zh-CN-XiaoxiaoNeural' });
		const blob = await tts.ttsToFile(`cmn-${t}.mp3`);
		const url = URL.createObjectURL(blob);
		cache.set(t, url);
		playUrl(url);
		return true;
	} catch (e) {
		console.log('TTS failed', e);
		return false;
	}
}

/** Stop whatever is playing. */
export function stopSpeaking(): void {
	current?.pause();
	current = null;
}
