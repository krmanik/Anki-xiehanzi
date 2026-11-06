/**
 * Before a `/create` deck is sent again, line the note type Anki already holds
 * for it up with the one in the package, so Anki's importer **updates** the
 * deck's notes instead of skipping them.
 *
 * Anki's (legacy) importer — the one AnkiConnect's `importPackage` runs —
 * compares a note type by its field names in order plus its card names. When
 * they differ it adds a renamed copy of the note type, and every incoming note
 * whose GUID is already in the collection is **skipped**: not updated, not added
 * to the chosen deck, and nothing says so. Measured on Anki 25.09 with packages
 * the app itself built. Each deck's note type is its own (`deckNoteTypeId`) and
 * its fields are fixed (`DECK_NOTE_FIELDS`), so what is left to differ is the
 * card types — a reader who added one, or picked another style, between sends.
 *
 * The plan, all of it safe for a note type that only this deck uses:
 * - fields the package has and Anki's copy lacks are added, then put in the
 *   package's order (`modelFieldAdd`, `modelFieldReposition`); a field Anki's
 *   copy has and the package does not fill blocks the send, since updating
 *   would blank it;
 * - card types new in the package are added to Anki's copy first
 *   (`modelTemplateAdd`, which also makes their cards for the notes already
 *   there);
 * - card types the package dropped **stay**: they go into the package as Anki
 *   has them, so their cards and reviews survive. Deleting a card type deletes
 *   its cards.
 *
 * Pure apart from `alignNoteType`, which takes the injected client.
 */
import type { AnkiConnect } from './ankiConnect';
import { toInstalled, type CardTemplate, type InstalledModel } from './designSync';

export interface PackageModel {
	id: string | number;
	name: string;
	flds: { name: string }[];
	tmpls: CardTemplate[];
	css: string;
	req: any[];
}

export interface AlignPlan {
	/** The installed name — what every model action is addressed by. */
	modelName: string;
	addFields: string[];
	/** In Anki's copy, not filled by the package: the send is refused. */
	unknownFields: string[];
	/** The fields need putting in the package's order. */
	reorder: boolean;
	/** New card types, added to Anki's copy before the import. */
	addTemplates: CardTemplate[];
	/** Card types Anki's copy has and the package dropped — kept, as Anki has them. */
	keepTemplates: CardTemplate[];
	/** Card names in the order the package must list them: Anki's, then the new ones. */
	templateOrder: string[];
	/** Nothing differs in schema: the importer will update as it is. */
	same: boolean;
}

export function planAlign(installed: InstalledModel, wanted: PackageModel): AlignPlan {
	const want = wanted.flds.map((f) => f.name);
	const wantSet = new Set(want);
	const have = new Set(installed.fields);
	const addFields = want.filter((f) => !have.has(f));
	const unknownFields = installed.fields.filter((f) => !wantSet.has(f));
	const after = [...installed.fields, ...addFields];
	const reorder = !unknownFields.length && after.join('\u0000') !== want.join('\u0000');

	const wantedNames = new Set(wanted.tmpls.map((t) => t.name));
	const installedNames = new Set(installed.templates.map((t) => t.name));
	const addTemplates = wanted.tmpls.filter((t) => !installedNames.has(t.name));
	const keepTemplates = installed.templates.filter((t) => !wantedNames.has(t.name));
	const templateOrder = [...installed.templates.map((t) => t.name), ...addTemplates.map((t) => t.name)];

	return {
		modelName: installed.name,
		addFields,
		unknownFields,
		reorder,
		addTemplates,
		keepTemplates,
		templateOrder,
		same: !addFields.length && !unknownFields.length && !reorder && !addTemplates.length && !keepTemplates.length &&
			installed.templates.map((t) => t.name).join('\u0000') === wanted.tmpls.map((t) => t.name).join('\u0000')
	};
}

/** Why a send is refused, in one line; null when it can go ahead. */
export function alignBlocker(plan: AlignPlan): string | null {
	if (!plan.unknownFields.length) return null;
	const list = plan.unknownFields.map((f) => `“${f}”`).join(', ');
	return `This deck's note type in Anki (“${plan.modelName}”) has fields this site does not fill: ${list}. Sending would empty them. Remove them in Anki (Tools → Manage Note Types → Fields), or send under another deck name.`;
}

/**
 * The package's note type, reshaped to the schema Anki's copy will have once
 * the plan is applied: card types in `templateOrder`, the kept ones as Anki has
 * them. Every card type makes a card for every word (field 0 is Simplified).
 */
export function shapeToPlan<M extends PackageModel>(model: M, plan: AlignPlan): M {
	if (plan.same) return model;
	const mine = new Map(model.tmpls.map((t) => [t.name, t]));
	const kept = new Map(plan.keepTemplates.map((t) => [t.name, t]));
	const tmpls = plan.templateOrder.map((name) => mine.get(name) ?? kept.get(name)!);
	return { ...model, tmpls, req: tmpls.map((_, i) => [i, 'any', [0]]) };
}

/**
 * Read the note type Anki holds under the package's id and, if it differs,
 * bring it in line (see the header). Returns the reshape the package needs, or
 * null when Anki has no such note type yet (a first send: nothing to align).
 * Throws with a reader-facing message when the send has to be refused.
 */
export async function alignNoteType(
	client: AnkiConnect,
	wanted: PackageModel
): Promise<{ plan: AlignPlan; shape: <M extends PackageModel>(m: M) => M } | null> {
	let raw: unknown[];
	try {
		raw = await client.call<unknown[]>('findModelsById', { modelIds: [Number(wanted.id)] });
	} catch (e) {
		if (/not found/i.test((e as Error).message)) return null;
		throw e;
	}
	if (!raw?.[0]) return null;
	const plan = planAlign(toInstalled(raw[0]), wanted);
	const blocked = alignBlocker(plan);
	if (blocked) throw new Error(blocked);
	const modelName = plan.modelName;
	for (const f of plan.addFields) await client.call('modelFieldAdd', { modelName, fieldName: f });
	if (plan.reorder) {
		const order = wanted.flds.map((f) => f.name);
		for (let i = 0; i < order.length; i++) {
			await client.call('modelFieldReposition', { modelName, fieldName: order[i], index: i });
		}
	}
	for (const t of plan.addTemplates) {
		await client.call('modelTemplateAdd', { modelName, template: { Name: t.name, Front: t.qfmt, Back: t.afmt } });
	}
	return { plan, shape: (m) => shapeToPlan(m, plan) };
}
