/**
 * Renders the radical cards to a plain HTML file so the layout can be looked at
 * without importing an `.apkg` into Anki after every tweak.
 *
 *   node scripts/preview-radical-card.mjs                 (npm run preview:radical-card)
 *   node scripts/preview-radical-card.mjs --radical 74    a different radical
 *   node scripts/preview-radical-card.mjs --edition free
 *   node scripts/preview-radical-card.mjs --night        night mode
 *
 * It fills the real templates with a real note's fields, exactly as Anki does:
 * `{{Field}}` is replaced, `{{#Field}}…{{/Field}}` is kept only when the field
 * has content. What it cannot show is Anki's own audio player — the `[sound:…]`
 * tag stays as text — so the play button has nothing to play here.
 *
 * Output: dist-decks/radical-card.html
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { root, staticDir } from './lib/node-env.mjs';

const rd = await import('../src/lib/radicalDeck.ts');

const args = {};
for (let i = 0; i < process.argv.length; i++) {
	const a = process.argv[i];
	if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1]?.startsWith('--') ? true : process.argv[i + 1] ?? true;
}

const edition = args.edition === 'free' ? 'free' : 'premium';
const number = Number(args.radical ?? 1);

const index = JSON.parse(
	readFileSync(join(staticDir, 'data', 'radicals', 'index.json'), 'utf8')
);
const radical = index.radicals.find((r) => r.number === number) ?? index.radicals[0];
const strokes = JSON.parse(
	readFileSync(join(staticDir, 'data', 'radicals', 'strokes.json'), 'utf8')
);

const options = rd.radicalOptions(edition);
const fields = rd.buildRadicalNote(radical, {
	strokeData: strokes[radical.char] ? JSON.stringify(strokes[radical.char]) : '',
	audio: false
});

/** Anki's template syntax, as far as these cards use it. */
function render(tpl) {
	let out = tpl;
	for (const name of rd.RADICAL_FIELDS) {
		const value = fields[name] ?? '';
		out = out.replace(
			new RegExp(`\\{\\{#${name}\\}\\}([\\s\\S]*?)\\{\\{/${name}\\}\\}`, 'g'),
			value ? '$1' : ''
		);
		out = out.replace(new RegExp(`\\{\\{(text:)?${name}\\}\\}`, 'g'), () => value);
	}
	return out;
}

const cards = rd.radicalTemplates(options);
const sides = cards.flatMap((c) => [
	{ title: `${c.name} — front`, html: render(c.qfmt) },
	{ title: `${c.name} — back`, html: render(c.afmt) }
]);

const css = rd.radicalCss(options);
const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/**
 * Each side goes in its own iframe. Anki gives every card its own webview, and
 * the card scripts look their writer up by a fixed id — four sides sharing one
 * document would all drive the first grid.
 */
const sideDoc = (html) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="file://${join(root, 'dist-decks')}/">
<style>html,body{margin:0}
${css}</style></head><body class="card${args.night ? ' nightMode' : ''}">${html}</body></html>`;

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Radical card — ${radical.char} (${edition})</title>
<style>
  body { margin: 0; background: ${args.night ? '#0d0e11' : '#eceef1'}; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  .frame { max-width: 680px; margin: 28px auto; }
  .frame h1 { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #6b7280; margin: 0 0 8px 4px; }
  iframe { width: 100%; height: 620px; border: 0; border-radius: 16px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.12); display: block; }
</style>
</head>
<body>
${sides
	.map(
		(s) => `<div class="frame">
  <h1>${s.title}</h1>
  <iframe srcdoc="${escapeAttr(sideDoc(s.html))}"></iframe>
</div>`
	)
	.join('\n')}
</body>
</html>`;

mkdirSync(join(root, 'dist-decks'), { recursive: true });
// The card loads the stroke engine by its media name, relative to the page, so
// the preview needs a copy beside the HTML — the same file the deck packages.
copyFileSync(
	join(staticDir, 'data', '_hanzi-writer.min.js'),
	join(root, 'dist-decks', rd.ENGINE_FILE)
);
const out = join(root, 'dist-decks', 'radical-card.html');
writeFileSync(out, page);
console.log(`wrote ${out} — ${radical.char} (${edition}), ${sides.length} sides`);
