/**
 * The dictionary page's committed character assets: etymology and stroke names.
 *
 * Both are plain JSON under `static/data/dict/` (~570 KB and ~545 KB), built by
 * `npm run build:dict` and fetched once per session the first time a character
 * is expanded — never on page load, and never from the 32 MB Hanzi Writer blob.
 */

import { base } from '$app/paths';
import type { Etymology, StrokeType } from '$lib/dictionary';

let etymology: Promise<Record<string, Etymology>> | null = null;
let strokeNames: Promise<Record<string, string[]>> | null = null;
let strokeTypes: Promise<Record<string, StrokeType>> | null = null;

function loadJson<T>(file: string, fallback: T): Promise<T> {
	return fetch(`${base}/data/dict/${file}`)
		.then((r) => (r.ok ? (r.json() as Promise<T>) : fallback))
		.catch(() => fallback);
}

/** char -> how the character was formed. */
export function loadEtymology(): Promise<Record<string, Etymology>> {
	etymology ??= loadJson<Record<string, Etymology>>('etymology.json', {});
	return etymology;
}

/** char -> its stroke names in writing order. */
export function loadStrokeNames(): Promise<Record<string, string[]>> {
	strokeNames ??= loadJson<Record<string, string[]>>('stroke-names.json', {});
	return strokeNames;
}

/** stroke name -> its glyph, abbreviation and romanization. */
export function loadStrokeTypes(): Promise<Record<string, StrokeType>> {
	strokeTypes ??= loadJson<Record<string, StrokeType>>('stroke-types.json', {});
	return strokeTypes;
}

/** Everything the character panel needs, in one await. */
export async function loadCharAssets(): Promise<{
	etymology: Record<string, Etymology>;
	strokeNames: Record<string, string[]>;
	strokeTypes: Record<string, StrokeType>;
}> {
	const [ety, names, types] = await Promise.all([
		loadEtymology(),
		loadStrokeNames(),
		loadStrokeTypes()
	]);
	return { etymology: ety, strokeNames: names, strokeTypes: types };
}
