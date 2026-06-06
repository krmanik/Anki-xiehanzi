/** Helpers for tone-colored hanzi/pinyin in the app UI. */

/** Tone digit (1-5) for each syllable in a numbered-pinyin string like "ni3 hao3". */
export function toneDigits(syllable: string): number[] {
	return syllable
		.trim()
		.split(/\s+/)
		.map((s) => {
			const m = s.match(/([1-5])\D*$/);
			return m ? Number(m[1]) : 5;
		});
}

/** Wrap each character of `chars` in a tone-colored span using `syllable` tones. */
export function colorizeHanzi(chars: string, syllable: string): { ch: string; tone: number }[] {
	const tones = toneDigits(syllable);
	return chars.split('').map((ch, i) => ({ ch, tone: tones[i] ?? tones[tones.length - 1] ?? 5 }));
}
