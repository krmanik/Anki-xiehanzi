/**
 * Screenshots of a deck's cards, taken from Anki itself.
 *
 *   node scripts/shoot-card-previews.mjs                 (npm run shoot:card-previews)
 *   node scripts/shoot-card-previews.mjs --set v23       one deck only
 *   node scripts/shoot-card-previews.mjs --word 学习
 *
 * `/hsk` offers three differently-shaped decks for the same words, so the page
 * has to *show* them rather than describe them. The card HTML is not rebuilt
 * here: AnkiConnect (`cardsInfo`) hands back the question and answer **as Anki
 * rendered them**, template logic, card CSS and all, for a note in the
 * collection. So this needs Anki running, with the AnkiConnect add-on, and the
 * deck of each set below imported into the open profile.
 *
 * Rendering is headless Chrome against a `<base href>` of Anki's own
 * `collection.media`, so fonts, logos and the Hanzi Writer engine resolve
 * exactly as they do in the app. Two details matter for the result:
 *
 *   - **the page is never trimmed horizontally.** A card centres its hanzi and
 *     left-aligns its prose; trimming to the ink bounding box shifts the whole
 *     thing off-centre, which is what made the first set of shots look crooked.
 *     Only the empty tail below the card is cropped.
 *   - **shot at 2× and kept at 2×.** The gallery draws these ~450px wide on a
 *     retina screen, so anything smaller than ~1000px arrives soft.
 *
 * Output: `static/img/decks/`, listed by `src/lib/deckPreviews.ts`.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = join(root, 'static', 'img', 'decks');
const workDir = join(root, 'dist-decks', 'card-shots');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/**
 * One entry per deck the site previews. `types` are the deck's card types, in
 * the order a learner meets them; each becomes a tab in the gallery, and each
 * names the (sub)deck its cards live in.
 *
 * The free deck is deliberately absent: its single card shows nearly what the
 * premium card does, so previewing it next to premium argues against the sale.
 *
 * The premium deck is built from source for this — one level is enough for one
 * note — then imported into the open Anki profile:
 *
 *   node premium/run.mjs build.ts --levels 1 --audio
 */
const SETS = {
	// Only the writing card ships: the deck's other three cards ask the same
	// entry from a different side, and the gallery says more with fewer shots.
	v23: {
		prefix: 'v23',
		types: ['Write'].map((name) => ({
			name,
			deck: `Anki-xiehanzi - New HSK (2025) with sentences::HSK 1::${name}`
		}))
	},
	premium: {
		prefix: 'premium',
		types: ['Recognition', 'Writing'].map((name) => ({
			name,
			deck: `Anki xiehanzi::HSK 1::${name}`
		}))
	}
};

const args = {};
for (let i = 2; i < process.argv.length; i++) {
	const a = process.argv[i];
	if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1]?.startsWith('--') ? true : process.argv[++i] ?? true;
}
const word = typeof args.word === 'string' ? args.word : '学习';
/** Anki renders wide; 780 CSS px is about a desktop card column. */
const width = Number(args.width ?? 780);
const scale = Number(args.scale ?? 2);
const sets = args.set && args.set !== 'all' ? String(args.set).split(',') : Object.keys(SETS);

async function anki(action, params = {}) {
	const res = await fetch('http://localhost:8765', {
		method: 'POST',
		body: JSON.stringify({ action, version: 6, params })
	});
	const json = await res.json();
	if (json.error) throw new Error(`${action}: ${json.error}`);
	return json.result;
}

const mediaDir = await anki('getMediaDirPath');

/**
 * Anki's own webview markup: the card CSS keys off `body.card`, and night mode
 * off `.card.night_mode`. `[anki:play:…]` is the app's audio placeholder — it
 * never renders as anything, so it goes.
 */
function page(html, { night }) {
	return `<!doctype html><html><head><meta charset="utf-8">
<base href="file://${mediaDir}/">
<style>html{background:${night ? '#2f2f31' : '#fff'}}
/* Anki's reviewer sets a sans base font; Chrome's default is serif, which is
   what made the first shots look like a book page. The card's own CSS is
   inlined after this and still wins. */
body{margin:0;padding:20px;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif}</style>
</head><body class="card${night ? ' night_mode nightMode' : ''}">
${html.replace(/\[anki:play:[^\]]*\]/g, '')}
</body></html>`;
}

/** Crop the blank tail off the shot without moving the card sideways. */
function cropTail(png, out) {
	const box = execFileSync('magick', [png, '-format', '%@', 'info:']).toString().trim();
	const m = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(box);
	const pageW = Number(execFileSync('magick', [png, '-format', '%w', 'info:']).toString().trim());
	const pad = 16 * scale;
	const geom = m
		? `${pageW}x${Math.min(Number(m[2]) + pad * 2, 1e6)}+0+${Math.max(0, Number(m[4]) - pad)}`
		: null;
	execFileSync('magick', [
		png,
		...(geom ? ['-crop', geom, '+repage'] : []),
		'-strip',
		'-quality',
		'94',
		out
	]);
}

rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

for (const key of sets) {
	const set = SETS[key];
	if (!set) throw new Error(`unknown set ${key} — try ${Object.keys(SETS).join(', ')}`);

	for (const type of set.types) {
		const ids = await anki('findCards', { query: `deck:"${type.deck}" Simplified:${word}` });
		if (!ids.length) {
			console.warn(`skip ${key}/${type.name}: no card for ${word} — is "${type.deck}" imported?`);
			continue;
		}
		const [card] = await anki('cardsInfo', { cards: [ids[0]] });
		for (const [side, html] of [
			['front', card.question],
			['back', card.answer]
		]) {
			const name = `${set.prefix}-${type.name.toLowerCase()}-${side}`;
			const src = join(workDir, `${name}.html`);
			const png = join(workDir, `${name}.png`);
			writeFileSync(src, page(html, { night: false }));
			execFileSync(CHROME, [
				'--headless',
				'--disable-gpu',
				'--hide-scrollbars',
				'--allow-file-access-from-files',
				`--force-device-scale-factor=${scale}`,
				`--window-size=${width},2600`,
				'--virtual-time-budget=8000',
				`--screenshot=${png}`,
				`file://${src}`
			]);
			cropTail(png, join(outDir, `${name}.jpg`));
			console.log(`${name}`);
		}
	}
}

console.log(`\nshots → static/img/decks/`);
