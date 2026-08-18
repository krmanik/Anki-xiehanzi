/**
 * Speaking a word from the per-syllable clips.
 *
 * `static/data/audio/syllables/<syllable>.mp3` holds one Qwen3-TTS clip per
 * Mandarin syllable (~1,600 of them, a few KB each) and `syllables.json` lists
 * them with their lengths. Any word — 从零开始 included — is spoken by playing
 * its syllables back to back, so the ~11,000 HSK recordings stop being the
 * limit of what the dictionary can say.
 *
 * One file per syllable rather than one packed sprite: a browser decodes an
 * audio file whole, at the context's sample rate, so a single file of every
 * clip would be minutes of audio expanded to hundreds of MB of Float32 to say
 * one word. A word fetches the three or four small files it needs, the browser
 * caches them, and a decoded clip is kept for the rest of the session.
 */

import { base } from '$app/paths';
import { canSpeak, clipsFor, planSpeech, type SyllableIndex } from '$lib/syllables';

/** A decoded clip, with the silence at its edges measured off. */
interface Clip {
	buffer: AudioBuffer;
	/** seconds into the buffer where the speech starts */
	offset: number;
	/** seconds of actual speech */
	duration: number;
}

let indexPromise: Promise<SyllableIndex | null> | null = null;
const clips = new Map<string, Promise<Clip | null>>();
let context: AudioContext | null = null;
let playing: AudioBufferSourceNode[] = [];

/** The list of syllables and their lengths — small, and enough to plan with. */
export function loadSyllableIndex(): Promise<SyllableIndex | null> {
	indexPromise ??= fetch(`${base}/data/audio/syllables.json`)
		.then((r) => (r.ok ? (r.json() as Promise<SyllableIndex>) : null))
		.catch(() => null);
	return indexPromise;
}

/**
 * The AudioContext, created on the first play — a context made before any user
 * gesture starts suspended in every browser, and Safari never resumes it.
 */
function audioContext(rate: number): AudioContext | null {
	if (typeof window === 'undefined') return null;
	const Ctor =
		window.AudioContext ??
		(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!Ctor) return null;
	if (!context) {
		try {
			context = new Ctor({ sampleRate: rate });
		} catch {
			// Safari rejects some sample rates; its own is fine, just heavier.
			context = new Ctor();
		}
	}
	return context;
}

/**
 * Where the speech actually starts and ends inside a decoded clip.
 *
 * An mp3 decodes with encoder padding at both ends — tens of milliseconds of
 * silence that is *not* in the file's own duration — and the clips carry a
 * small trim guard of their own on top. Played back to back that padding is the
 * gap you hear between syllables, so it is measured off here rather than left
 * for the ear to notice.
 */
function speechBounds(buffer: AudioBuffer): { offset: number; duration: number } {
	const data = buffer.getChannelData(0);
	let peak = 0;
	for (let i = 0; i < data.length; i++) {
		const v = Math.abs(data[i]);
		if (v > peak) peak = v;
	}
	const threshold = Math.max(peak * 0.02, 1e-4);
	let start = 0;
	while (start < data.length && Math.abs(data[start]) < threshold) start++;
	let end = data.length - 1;
	while (end > start && Math.abs(data[end]) < threshold) end--;
	if (end <= start) return { offset: 0, duration: buffer.duration };
	// Give the consonant onset and the vowel's decay a few ms of room back.
	const pad = Math.round(buffer.sampleRate * 0.008);
	const from = Math.max(start - pad, 0);
	const to = Math.min(end + pad, data.length - 1);
	return { offset: from / buffer.sampleRate, duration: (to - from) / buffer.sampleRate };
}

function loadClip(syllable: string, rate: number): Promise<Clip | null> {
	let clip = clips.get(syllable);
	if (!clip) {
		clip = (async () => {
			const ctx = audioContext(rate);
			if (!ctx) return null;
			try {
				const res = await fetch(`${base}/data/audio/syllables/${syllable}.mp3`);
				if (!res.ok) return null;
				const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
				return { buffer, ...speechBounds(buffer) };
			} catch (e) {
				console.log(`syllable clip ${syllable} failed to load`, e);
				return null;
			}
		})();
		clips.set(syllable, clip);
	}
	return clip;
}

/** Warm the index up without fetching any audio. */
export function preloadSyllables(): void {
	void loadSyllableIndex();
}

/** Can this reading be spoken from the clips? Loads only the index. */
export async function canSpeakPinyin(pinyin: string): Promise<boolean> {
	const index = await loadSyllableIndex();
	return !!index && canSpeak(pinyin, index.syllables);
}

/** Stop whatever the clips are currently saying. */
export function stopSyllables(): void {
	for (const node of playing) {
		try {
			node.stop();
		} catch {
			/* already finished */
		}
	}
	playing = [];
}

export interface SpeakOptions {
	/** silence between syllables, seconds (a word is tighter than a sentence) */
	spacing?: number;
	/** playback speed, 1 = as recorded */
	rate?: number;
}

/**
 * Speak a reading. Returns false when the clips cannot cover it, so the caller
 * can fall back to a recording or to TTS.
 *
 * Every clip is fetched and decoded before anything starts, then each syllable
 * is scheduled against the context clock rather than fired from a timer — that
 * is what makes separate recordings read as one word instead of a stutter.
 */
export async function speakSyllables(pinyin: string, opts: SpeakOptions = {}): Promise<boolean> {
	const index = await loadSyllableIndex();
	if (!index) return false;
	const plan = planSpeech(pinyin, index.syllables, { spacing: opts.spacing, rate: opts.rate });
	if (!plan) return false;

	const rate = index.rate ?? 22050;
	const ctx = audioContext(rate);
	if (!ctx) return false;

	const needed = clipsFor(plan);
	const decoded = new Map<string, Clip>();
	await Promise.all(
		needed.map(async (syllable) => {
			const clip = await loadClip(syllable, rate);
			if (clip) decoded.set(syllable, clip);
		})
	);
	if (needed.some((syllable) => !decoded.has(syllable))) return false;

	if (ctx.state === 'suspended') await ctx.resume();
	stopSyllables();

	// The plan's timing comes from the index's durations, which include each
	// clip's padding. Now that the real speech length is known, the syllables are
	// laid out again from the measured lengths — otherwise the gap the padding
	// creates is still there, just moved.
	const speed = opts.rate ?? 1;
	const spacing = opts.spacing ?? 0.02;
	const startAt = ctx.currentTime + 0.06;
	let at = 0;
	for (const segment of plan.segments) {
		const clip = decoded.get(segment.syllable);
		if (!clip) continue;
		const source = ctx.createBufferSource();
		source.buffer = clip.buffer;
		source.playbackRate.value = speed;

		// Two unrelated recordings, normalized to their own peaks, rarely meet at
		// zero — spliced straight together that jump is an audible click at every
		// syllable boundary, which is what reads as "disconnected" rather than
		// spoken. A few ms of gain ramp at each edge hides the seam.
		const segStart = startAt + at;
		const segDuration = clip.duration / speed;
		const segEnd = segStart + segDuration;
		const fade = Math.min(0.008, segDuration / 2);
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0, segStart);
		gain.gain.linearRampToValueAtTime(1, segStart + fade);
		gain.gain.setValueAtTime(1, segEnd - fade);
		gain.gain.linearRampToValueAtTime(0, segEnd);
		source.connect(gain);
		gain.connect(ctx.destination);

		source.start(segStart, clip.offset, clip.duration);
		source.onended = () => {
			playing = playing.filter((n) => n !== source);
		};
		playing.push(source);
		at += segDuration + spacing;
	}
	return true;
}

/** Which character a syllable was recorded through — for the "how" question. */
export async function syllableSource(syllable: string): Promise<string | null> {
	const index = await loadSyllableIndex();
	return index?.spokenThrough?.[syllable] ?? null;
}

export type { SyllableIndex };
