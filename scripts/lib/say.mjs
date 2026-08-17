/**
 * Speech synthesis for the offline deck builders — macOS `say`, plus the checks
 * that tell a real clip from a valid-but-silent one.
 *
 * Edge TTS is a browser API: under Node it fails every time with "the file
 * buffer is empty", so nothing here goes near it. `say` needs no network at all,
 * which is what makes it the fallback for the words the audio CDN has never
 * recorded.
 *
 * Shared by `build-radical-deck.mjs` and `build-hsk-decks.mjs` — both learned
 * the same lessons about valid-but-silent files the hard way.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';

/**
 * Every installed Mandarin voice, the ones that always work first.
 *
 * The Siri voices macOS lists as `Eddy (Chinese (China mainland))` are only
 * *offered*: until the user downloads one, `say` writes a valid, well-formed,
 * 0.01-second file of nothing at all — which is how 56 radicals shipped silent.
 * Tingting and the other classic voices are installed with the language.
 */
let sayVoices;
export function macSayVoices() {
	if (sayVoices !== undefined) return sayVoices;
	if (process.platform !== 'darwin') return (sayVoices = []);
	try {
		const listed = execFileSync('say', ['-v', '?'], { encoding: 'utf8' });
		const names = listed
			.split('\n')
			.filter((l) => /\bzh_CN\b/.test(l))
			.map((l) => l.split(/\s{2,}/)[0].trim())
			.filter(Boolean);
		// Classic voices (no parenthesised locale) before the downloadable ones.
		sayVoices = [...names.filter((n) => !n.includes('(')), ...names.filter((n) => n.includes('('))];
	} catch {
		sayVoices = [];
	}
	return sayVoices;
}

/** Seconds of audio in a file, per `afinfo`; null when it cannot tell. */
export function clipSeconds(path) {
	if (process.platform !== 'darwin') return null;
	try {
		const out = execFileSync('afinfo', [path], { encoding: 'utf8' });
		const m = /estimated duration:\s*([\d.]+)\s*sec/.exec(out);
		return m ? Number(m[1]) : null;
	} catch {
		return null;
	}
}

/**
 * A syllable takes a fifth of a second to say. Anything shorter is a container
 * with no speech in it, which every earlier check (exit code, file size) passes.
 */
export const MIN_SECONDS = 0.2;

export function tooShort(path) {
	const seconds = clipSeconds(path);
	return seconds !== null && seconds < MIN_SECONDS;
}

/** `lame`, when it is installed — a spoken syllable is ~4 KB as mp3, 13 KB as WAV. */
export const LAME = (() => {
	try {
		execFileSync('which', ['lame'], { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
})();

export function toMp3(wav, mp3) {
	try {
		execFileSync('lame', ['--quiet', '-b', '48', '-m', 'm', wav, mp3], { stdio: 'ignore' });
		return existsSync(mp3) && readFileSync(mp3).byteLength > 500 && !tooShort(mp3);
	} catch {
		return false;
	}
}

/**
 * `say`, written as a WAV and then transcoded to mp3 where an encoder exists.
 *
 * It used to write AAC in an `.m4a`: valid files, the right length, playable in
 * QuickTime — and silent in Anki, which is how 14 radicals (犬, 竹, 耳, 皿, …)
 * shipped with a play button that did nothing. WAV and mp3 are what the rest of
 * a deck's clips are and what every client, desktop and mobile, plays.
 *
 * `destBase` is a path without an extension; the file it returns is
 * `${destBase}.mp3` or `${destBase}.wav`.
 */
export function fromSay(text, destBase) {
	const wav = `${destBase}.wav`;
	for (const voice of macSayVoices()) {
		try {
			execFileSync('say', ['-v', voice, '--data-format=LEI16@22050', '-o', wav, text]);
			if (readFileSync(wav).byteLength <= 500 || tooShort(wav)) continue;
			const mp3 = `${destBase}.mp3`;
			if (LAME && toMp3(wav, mp3)) {
				rmSync(wav, { force: true });
				return { buf: readFileSync(mp3), ext: 'mp3', voice };
			}
			return { buf: readFileSync(wav), ext: 'wav', voice };
		} catch {
			/* try the next voice */
		}
	}
	rmSync(wav, { force: true });
	return null;
}
