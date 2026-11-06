/**
 * Update card design: push the current templates and CSS into a note type
 * the reader's collection already holds, without re-importing the deck.
 *
 * Why re-importing is not enough: Anki's importer only refreshes a note type
 * whose schema — field names and card names — matches the incoming one
 * exactly. Otherwise it keeps the old note type, adds a renamed copy beside it
 * and leaves the existing notes (same GUIDs) where they were. So a deck whose
 * fields changed between releases keeps its old card design forever, which is
 * what CLAUDE.md calls "templates in a collection are sticky".
 *
 * What it does, all additive, checked against the add-on's source
 * (`__init__.py`):
 * - reads the installed note type **by id** (`findModelsById`), so a renamed
 *   note type is still found; every later call uses the installed *name*,
 *   because the add-on's model actions look note types up by name;
 * - stores the card's helper files first (`storeMediaFile`), so the new
 *   template never points at a file the collection lacks;
 * - adds fields the new design reads and the note type has not got
 *   (`modelFieldAdd`, appended — never removes or renames one, which would
 *   lose the reader's data);
 * - rewrites the front and back of each card type both sides share
 *   (`updateModelTemplates`, matched by card name), then the CSS
 *   (`updateModelStyling`).
 * - Card types the design has and the note type has not are **left out**:
 *   adding one makes a new card for every note of that type, a change in what
 *   the reader reviews rather than how a card looks.
 * - **A note type with a card type the design does not know is not touched.**
 *   The CSS is one sheet for the whole note type, so replacing it restyles that
 *   card too — measured on a real collection, where the no-audio note type held
 *   a `/create` deck's "Standard" card and the HSK design's "Card 1" matched
 *   nothing. Same when no card type is shared at all: that is a different
 *   design on the same id, not an older version of this one.
 *
 * Notes, their fields' content, scheduling and review history are never
 * touched. Hand edits to the templates are replaced — the confirm step says so.
 *
 * Pure apart from the injected client, so it runs in the node test project.
 */
import type { AnkiConnect } from './ankiConnect';

export interface CardTemplate {
	name: string;
	qfmt: string;
	afmt: string;
}

/** What the current code would build (a genanki `Model`'s props, more or less). */
export interface WantedModel {
	id: string | number;
	name: string;
	flds: { name: string }[];
	tmpls: CardTemplate[];
	css: string;
}

/** The note type as the collection holds it. */
export interface InstalledModel {
	id: number;
	name: string;
	fields: string[];
	templates: CardTemplate[];
	css: string;
}

export interface DesignPlan {
	/** The installed name — what every model action is addressed by. */
	modelName: string;
	addFields: string[];
	/** Card types whose front or back will change. */
	updateTemplates: string[];
	/** In the design, not in the note type: left out (see the header). */
	skippedTemplates: string[];
	/** In the note type, not in the design: the plan is `blocked` (see the header). */
	foreignTemplates: string[];
	css: boolean;
	upToDate: boolean;
	/** Applying would restyle cards this design does not describe; nothing is written. */
	blocked: boolean;
}

/** `findModelsById`'s raw model dict → the parts that matter here. */
export function toInstalled(raw: unknown): InstalledModel {
	const m = raw as {
		id: number;
		name: string;
		flds?: { name: string }[];
		tmpls?: CardTemplate[];
		css?: string;
	};
	return {
		id: Number(m.id),
		name: m.name,
		fields: (m.flds ?? []).map((f) => f.name),
		templates: (m.tmpls ?? []).map((t) => ({ name: t.name, qfmt: t.qfmt ?? '', afmt: t.afmt ?? '' })),
		css: m.css ?? ''
	};
}

export function planDesign(installed: InstalledModel, wanted: WantedModel): DesignPlan {
	const have = new Set(installed.fields);
	const addFields = wanted.flds.map((f) => f.name).filter((f) => !have.has(f));
	const byName = new Map(installed.templates.map((t) => [t.name, t]));
	const updateTemplates: string[] = [];
	const skippedTemplates: string[] = [];
	for (const t of wanted.tmpls) {
		const cur = byName.get(t.name);
		if (!cur) skippedTemplates.push(t.name);
		else if (cur.qfmt !== t.qfmt || cur.afmt !== t.afmt) updateTemplates.push(t.name);
	}
	const wantedNames = new Set(wanted.tmpls.map((t) => t.name));
	const foreignTemplates = installed.templates.map((t) => t.name).filter((n) => !wantedNames.has(n));
	const css = installed.css !== wanted.css;
	const upToDate = !addFields.length && !updateTemplates.length && !css;
	return {
		modelName: installed.name,
		addFields,
		updateTemplates,
		skippedTemplates,
		foreignTemplates,
		css,
		upToDate,
		blocked: !upToDate && foreignTemplates.length > 0
	};
}

/** The installed note type with this id, or `null` when the collection has none. */
export async function readInstalled(client: AnkiConnect, id: string | number): Promise<InstalledModel | null> {
	try {
		const [raw] = await client.call<unknown[]>('findModelsById', { modelIds: [Number(id)] });
		return raw ? toInstalled(raw) : null;
	} catch (e) {
		if (/model was not found/i.test((e as Error)?.message ?? '')) return null;
		throw e;
	}
}

export interface ModelUsage {
	notes: number;
	/** Deck names cut to their first two levels ("Anki xiehanzi::New HSK (2025)"), most cards first. */
	decks: string[];
}

/** Two `::` levels: enough to tell an HSK list from a reader's own deck, short enough to list. */
export function deckRoot(name: string): string {
	return name.split('::').slice(0, 2).join('::');
}

/** Which decks hold this note type's cards, so the confirm step can say what changes. */
export async function readUsage(client: AnkiConnect, id: string | number): Promise<ModelUsage> {
	const notes = await client.call<number[]>('findNotes', { query: `mid:${Number(id)}` });
	if (!notes.length) return { notes: 0, decks: [] };
	const cards = await client.call<number[]>('findCards', { query: `mid:${Number(id)}` });
	const byDeck = await client.call<Record<string, number[]>>('getDecks', { cards });
	const counts = new Map<string, number>();
	for (const [deck, ids] of Object.entries(byDeck)) {
		const root = deckRoot(deck);
		counts.set(root, (counts.get(root) ?? 0) + ids.length);
	}
	return {
		notes: notes.length,
		decks: [...counts].sort((a, b) => b[1] - a[1]).map(([d]) => d)
	};
}

export interface MediaFile {
	name: string;
	/** Base64 bytes (no data-URL prefix). */
	data: string;
}

/** Card names → the shape `updateModelTemplates` takes. */
export function templatesParam(wanted: WantedModel, names: string[]): Record<string, { Front: string; Back: string }> {
	const out: Record<string, { Front: string; Back: string }> = {};
	for (const t of wanted.tmpls) if (names.includes(t.name)) out[t.name] = { Front: t.qfmt, Back: t.afmt };
	return out;
}

/**
 * Apply a plan. Media first, then fields, then templates, then CSS — so at no
 * point does the collection hold a template that reads a field or a file it
 * has not got.
 */
export async function applyDesign(
	client: AnkiConnect,
	plan: DesignPlan,
	wanted: WantedModel,
	media: MediaFile[] = []
): Promise<void> {
	if (plan.blocked) throw new Error(blockedReason(plan));
	for (const f of media) {
		await client.call('storeMediaFile', { filename: f.name, data: f.data });
	}
	for (const field of plan.addFields) {
		await client.call('modelFieldAdd', { modelName: plan.modelName, fieldName: field });
	}
	if (plan.updateTemplates.length) {
		await client.call('updateModelTemplates', {
			model: { name: plan.modelName, templates: templatesParam(wanted, plan.updateTemplates) }
		});
	}
	if (plan.css) {
		await client.call('updateModelStyling', { model: { name: plan.modelName, css: wanted.css } });
	}
}

/** Why a blocked plan writes nothing, in the reader's terms. */
export function blockedReason(plan: DesignPlan): string {
	const names = plan.foreignTemplates.map((n) => `“${n}”`).join(', ');
	return `This note type has ${plan.foreignTemplates.length === 1 ? 'a card' : 'cards'} the design doesn't know (${names}), probably from another deck you made. Updating would restyle ${plan.foreignTemplates.length === 1 ? 'it' : 'them'} too, so it is left as it is.`;
}

/** One line per change, for the confirm step. Empty when the plan is up to date. */
export function describePlan(plan: DesignPlan): string[] {
	const out: string[] = [];
	if (plan.updateTemplates.length || plan.css) out.push('New card layout and styling');
	if (plan.addFields.length) {
		out.push(`Adds ${plan.addFields.length === 1 ? 'a field' : `${plan.addFields.length} fields`}: ${plan.addFields.join(', ')} (empty on existing notes)`);
	}
	if (plan.skippedTemplates.length) {
		out.push(`Leaves out card type${plan.skippedTemplates.length === 1 ? '' : 's'} ${plan.skippedTemplates.join(', ')} — your note type has no such card`);
	}
	return out;
}
