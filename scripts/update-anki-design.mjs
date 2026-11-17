/**
 * Pushes the current HSK card design into the note type installed in Anki,
 * the same thing "Update card design" does on /hsk, without the browser.
 * Notes and review history are untouched.
 *
 *   node scripts/update-anki-design.mjs           # dry run: print the plan
 *   node scripts/update-anki-design.mjs --apply   # write it
 *   --no-audio   target the no-audio note type
 *
 * Needs Anki open with AnkiConnect. Back up first.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { staticDir } from './lib/node-env.mjs';

const apply = process.argv.includes('--apply');
const audio = !process.argv.includes('--no-audio');

const { hskDeckModel } = await import('../src/lib/hskDeckLayout.ts');
const { DECK_IMG_MEDIA, deckDataMedia } = await import('../src/lib/deckTemplate.ts');
const { createAnkiConnect } = await import('../src/lib/anki/ankiConnect.ts');
const { readInstalled, readUsage, planDesign, applyDesign, describePlan, blockedReason } = await import(
	'../src/lib/anki/designSync.ts'
);

const { model, usesWriter } = hskDeckModel({ audio, examples: true });
const client = createAnkiConnect();

const installed = await readInstalled(client, model.id);
if (!installed) {
	console.log(`Anki has no note type with id ${model.id} (${model.name}).`);
	process.exit(1);
}
const usage = await readUsage(client, model.id);
const plan = planDesign(installed, model);

console.log(`Note type: "${installed.name}" — ${usage.notes} notes in ${usage.decks.join(', ') || 'no decks'}`);
if (plan.blocked) {
	console.log(blockedReason(plan));
	process.exit(1);
}
if (plan.upToDate) {
	console.log('Already up to date.');
	process.exit(0);
}
for (const line of describePlan(plan)) console.log(`  - ${line}`);

if (!apply) {
	console.log('\nDry run. Re-run with --apply to write it.');
	process.exit(0);
}

const files = [
	...DECK_IMG_MEDIA.map((name) => ({ name, path: join(staticDir, 'img', name) })),
	...deckDataMedia(usesWriter).map((name) => ({ name, path: join(staticDir, 'data', name) }))
].map(({ name, path }) => ({ name, data: readFileSync(path).toString('base64') }));

await applyDesign(client, plan, model, files);
console.log(`\nDone. Stored ${files.length} media files; template and CSS updated.`);
console.log('Reopen the card (or restart the review) to see it.');
