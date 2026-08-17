#!/usr/bin/env node
/**
 * Build the dictionary page's committed character assets.
 *
 * `/dictionary` shows everything the hanzi-slides deck knows about a character:
 * its readings and senses (cedict.db, loaded at runtime), its components and
 * how it was formed (etymology, here), and the name of every stroke in order
 * (here). The first comes out of the database the app already ships; the other
 * two have no source in this repo, so they are extracted once, committed, and
 * fetched as plain JSON — the dictionary must never pull a 32 MB blob to name
 * four strokes.
 *
 * Sources live in the hanzi-slides project (a separate checkout):
 *   <source>/src/lib/assets/dictionary.json   makemeahanzi — etymology per char
 *   <source>/src/lib/assets/stroke_order.json char -> ordered stroke names
 *   <source>/static/chinese_strokes.json      stroke name -> glyph, romanization
 *
 * Usage:
 *   node scripts/build-dict-data.mjs [--source ~/Desktop/hanzi-slides-svelte]
 *
 * Output (committed):
 *   static/data/dict/etymology.json    {char: {type, hint, phonetic, semantic}}
 *   static/data/dict/stroke-names.json {char: ["横", "竖", …]}
 *   static/data/dict/stroke-types.json {name: {glyph, abbr, romanization, unicode}}
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'static', 'data', 'dict');

const args = process.argv.slice(2);
const sourceArg = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;
const SOURCE = path.resolve(
	(sourceArg || path.join(homedir(), 'Desktop', 'hanzi-slides-svelte')).replace(/^~/, homedir())
);

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

function writeJson(name, value) {
	const file = path.join(OUT_DIR, name);
	writeFileSync(file, JSON.stringify(value));
	const kb = (Buffer.byteLength(JSON.stringify(value)) / 1024).toFixed(0);
	console.log(`  ${name.padEnd(20)} ${String(Object.keys(value).length).padStart(6)} entries  ${kb} KB`);
}

function buildEtymology() {
	// makemeahanzi's dictionary is a JSON array, one object per character. Only
	// `etymology` is taken: definition/pinyin/decomposition/radical are already in
	// cedict.db's `character` table, which the app loads anyway.
	const entries = readJson(path.join(SOURCE, 'src', 'lib', 'assets', 'dictionary.json'));
	const out = {};
	for (const e of entries) {
		const ety = e?.etymology;
		if (!e?.character || !ety) continue;
		const slim = {};
		// Short keys: this file is fetched by the browser and the four names
		// repeat once per character.
		if (ety.type) slim.t = ety.type;
		if (ety.hint) slim.h = ety.hint;
		if (ety.phonetic) slim.p = ety.phonetic;
		if (ety.semantic) slim.s = ety.semantic;
		if (Object.keys(slim).length) out[e.character] = slim;
	}
	writeJson('etymology.json', out);
}

function buildStrokes() {
	const order = readJson(path.join(SOURCE, 'src', 'lib', 'assets', 'stroke_order.json'));
	const types = readJson(path.join(SOURCE, 'static', 'chinese_strokes.json'));

	const typeMap = {};
	for (const t of types) {
		if (!t?.name_chinese) continue;
		typeMap[t.name_chinese] = {
			glyph: t.character || '',
			abbr: t.abbreviation || '',
			romanization: t.full_name || '',
			unicode: t.unicode || ''
		};
	}
	writeJson('stroke-types.json', typeMap);

	// char -> ordered stroke names, dropping characters with no names at all.
	const names = {};
	for (const [char, list] of Object.entries(order)) {
		if (Array.isArray(list) && list.length) names[char] = list;
	}
	writeJson('stroke-names.json', names);

	const unknown = new Set();
	for (const list of Object.values(names)) for (const n of list) if (!typeMap[n]) unknown.add(n);
	if (unknown.size) {
		// Not fatal — the page prints the Chinese name and skips the glyph row.
		console.log(`  note: ${unknown.size} stroke name(s) with no type entry: ${[...unknown].join(' ')}`);
	}
}

mkdirSync(OUT_DIR, { recursive: true });
console.log(`source: ${SOURCE}`);
buildEtymology();
buildStrokes();
console.log(`written to ${path.relative(ROOT, OUT_DIR)}/`);
