/**
 * Real neural Mandarin speech for the reader's passage-level read-aloud, via
 * anki-tts's Piper engine — offline, on-device ONNX, the same library the
 * exported decks load for sentence audio (see `dict/contants.ts`'s
 * ANKI_TTS_SCRIPT) — loaded here straight from its own CDN build instead of
 * the dictionary's three-tier `speak()`.
 *
 * `speak()` is built for single words and short examples, where the syllable
 * sprite's ~1,600 recorded syllables are usually enough. A passage only needs
 * one word outside that set — 喜欢's neutral-tone "huan5" has no clip — to
 * fail the *entire* plan and fall through to Edge TTS, which 403s outside the
 * real Edge browser (see reader/+page.svelte's history). Piper synthesizes
 * arbitrary text directly, so there is no such set to fall outside of.
 */

const BASE = 'https://cdn.jsdelivr.net/gh/krmanik/anki-tts@latest/src';
const VOICE = 'zh_CN-huayan-medium';

export type StatusCallback = (msg: string, percent?: number) => void;

interface PiperModule {
	piperTtsPlay: (
		text: string,
		voiceKey: string,
		speakerId: number | undefined,
		onStatus: StatusCallback | undefined
	) => Promise<void>;
}
interface PlayerModule {
	stopPlayback: () => void;
}

let piperMod: Promise<PiperModule> | null = null;
let playerMod: Promise<PlayerModule> | null = null;

function loadPiper(): Promise<PiperModule> {
	if (!piperMod) piperMod = import(/* @vite-ignore */ `${BASE}/providers/piper.js`);
	return piperMod;
}

function loadPlayer(): Promise<PlayerModule> {
	if (!playerMod) playerMod = import(/* @vite-ignore */ `${BASE}/player.js`);
	return playerMod;
}

/**
 * Speak `text` with Piper. The first call for this voice downloads its model
 * (~60MB for the medium quality used here); the library caches it in
 * CacheStorage, so every later call — any voice, any page on this origin —
 * is instant. `onStatus` reports download percent / phonemizing / synthesizing
 * so a caller can show real progress instead of a plain spinner.
 */
export async function speakPiper(text: string, onStatus?: StatusCallback): Promise<void> {
	const { piperTtsPlay } = await loadPiper();
	await piperTtsPlay(text, VOICE, undefined, onStatus);
}

export async function stopPiper(): Promise<void> {
	const { stopPlayback } = await loadPlayer();
	stopPlayback();
}
