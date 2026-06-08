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

const CJK = /[㐀-䶿一-鿿豈-﫿]/;

/** Tone (1-4, 5 neutral) of a tone-marked pinyin syllable like "wǒ". */
export function toneOfPinyin(syllable: string): number {
	const d = syllable.normalize('NFD');
	if (d.includes('̄')) return 1; // macron  →  1st tone
	if (d.includes('́')) return 2; // acute   →  2nd tone
	if (d.includes('̌')) return 3; // caron   →  3rd tone
	if (d.includes('̀')) return 4; // grave   →  4th tone
	return 5; // neutral
}

/**
 * Best-effort tone-coloring of a whole sentence's hanzi. Splits the sentence's
 * tone-marked pinyin into syllables and assigns them in order to the CJK
 * characters (punctuation / spaces / digits pass through uncolored). Imperfect
 * for multi-syllable characters or unusual punctuation, but good enough for an
 * example sentence. Returns HTML with `.char-toneN` spans.
 */
export function colorizeSentenceHanzi(sentence: string, pinyin: string): string {
	const sylls = (pinyin ?? '')
		.split(/\s+/)
		// keep only syllables that contain a latin letter (drop standalone punctuation)
		.filter((s) => /[a-zü]/i.test(s.normalize('NFD').replace(/[̀-ͯ]/g, '')));
	let si = 0;
	let html = '';
	for (const ch of sentence ?? '') {
		if (CJK.test(ch)) {
			const tone = si < sylls.length ? toneOfPinyin(sylls[si]) : 5;
			si++;
			html += `<span class="char-tone${tone}">${ch}</span>`;
		} else {
			html += ch;
		}
	}
	return html;
}

/**
 * Tone-color a tone-marked pinyin string by syllable. Splits on whitespace /
 * commas (preserving them) and wraps each syllable in a `.toneN` span;
 * punctuation-only tokens pass through. Mirrors the card's runtime colorPinyin.
 */
export function colorizePinyinString(pinyin: string): string {
	return (pinyin ?? '')
		.split(/(\s+|,)/)
		.map((p) => {
			if (p === '' || p === ',' || /^\s+$/.test(p)) return p;
			const hasLetter = /[a-zü]/i.test(p.normalize('NFD').replace(/[̀-ͯ]/g, ''));
			return hasLetter ? `<span class="tone${toneOfPinyin(p)}">${p}</span>` : p;
		})
		.join('');
}
