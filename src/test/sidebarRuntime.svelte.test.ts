/**
 * Runs the generated card's sidebar scripts in jsdom.
 *
 * The sidebar is plain template-string JS, so nothing else typechecks or exercises
 * it. These tests boot a real card template (fields stubbed) and assert the parts
 * that used to differ per side: the row set, and what the Front/Back switch does.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { buildNoteTemplates, type TabContent } from '$lib/deckTemplate';

const FIELDS = [
	'Simplified',
	'Traditional',
	'Pinyin',
	'Zhuyin',
	'PartOfSpeech',
	'SimpleMeaning',
	'Definitions',
	'Breakdown',
	'Radical',
	'HskLevel',
	'Frequency'
];

const card = (front: string[], back: string[]): TabContent => ({
	'Card 1': { front, back, groups: [] } as never
});

function build(front: string[], back: string[]) {
	const { tmpls } = buildNoteTemplates({
		fields: FIELDS,
		tabContent: card(front, back),
		includeAudio: false,
		template: { font: 'default' } as never
	});
	return tmpls[0];
}

/** In-memory anki-persistence stand-in, shared by both sides like Anki's is. */
function installPersistence(store: Record<string, string> = {}) {
	(window as never as Record<string, unknown>).Persistence = {
		isAvailable: () => true,
		getItem: (k: string) => (k in store ? store[k] : null),
		setItem: (k: string, v: unknown) => {
			store[k] = String(v);
		}
	};
	return store;
}

/**
 * Mount a template into jsdom and run its inline scripts. The hanzi-writer script
 * (external src) never loads here, so writer drawing is skipped — the sidebar half
 * of the template, which is what we assert on, runs fully.
 */
function mount(html: string) {
	const filled = html.replace(/\{\{([^}]+)\}\}/g, (_m, name: string) =>
		// The dictionary card ships the per-reading markup the scripts reach into.
		name === 'Definitions'
			? '<div class="reading"><span id="char-sim-id">在</span><span id="char-trad-id">在</span><span class="pinyin">zài</span><span class="zhuyin">ㄗㄞˋ</span></div>'
			: '在'
	);
	// The real engine ships as bundled media; the sidebar only needs it to exist.
	(window as never as Record<string, unknown>).HanziWriter = {
		create: () => ({
			quiz() {},
			showOutline() {},
			hideOutline() {},
			showCharacter() {},
			hideCharacter() {},
			animateCharacter() {}
		})
	};
	document.body.className = 'card';
	document.body.innerHTML = filled;
	for (const s of Array.from(document.body.querySelectorAll('script'))) {
		if (s.src || !s.textContent) continue;
		try {
			// window.eval so the template's `var`/`function` land in the page scope,
			// exactly like Anki running the card.
			window.eval(s.textContent);
		} catch {
			/* writer bits need HanziWriter / bundled media; the sidebar half still ran */
		}
	}
}

const rowLabels = () =>
	Array.from(document.querySelectorAll('#sidebar-toggles label')).map((l) => l.textContent?.trim());

const sectionTitles = () =>
	Array.from(document.querySelectorAll('#sidebar-toggles .sidebar-section-title')).map((t) =>
		t.textContent?.trim()
	);

describe('review sidebar — one side, one sidebar', () => {
	beforeEach(() => {
		installPersistence();
		document.body.innerHTML = '';
	});

	it('lists only what its own side shows', () => {
		const t = build(
			['frontSimplified', 'frontwritingComponent', 'frontControlButtons'],
			['backSimplified', 'backPinyin', 'backDefinitions', 'backRadical']
		);
		mount(t.qfmt);
		// Front is the hanzi + the writer: no rows for the back's dictionary card.
		expect(rowLabels()).toContain('Simplified');
		expect(rowLabels()).not.toContain('Radical');
		expect(rowLabels()).not.toContain('Meaning');

		document.body.innerHTML = '';
		mount(t.afmt);
		expect(rowLabels()).toContain('Radical');
		expect(rowLabels()).toContain('Meaning');
	});

	it('has no side picker on either side', () => {
		const t = build(
			['frontSimplified', 'frontwritingComponent', 'frontControlButtons'],
			['backSimplified', 'backDefinitions']
		);
		for (const side of [t.qfmt, t.afmt]) {
			document.body.innerHTML = '';
			mount(side);
			expect(document.getElementById('text-front')).toBeNull();
			expect(document.getElementById('text-back')).toBeNull();
		}
	});

	it('puts the writing controls only on the side holding the writer', () => {
		const t = build(
			['frontSimplified', 'frontwritingComponent', 'frontControlButtons'],
			['backSimplified', 'backDefinitions']
		);
		mount(t.qfmt);
		expect(document.getElementById('practice-select')).not.toBeNull();
		expect(rowLabels()).toContain('Grid');
		expect(rowLabels()).toContain('Grid size');
		expect(sectionTitles()).toContain('Writing');

		document.body.innerHTML = '';
		mount(t.afmt);
		expect(document.getElementById('practice-select')).toBeNull();
		expect(rowLabels()).not.toContain('Grid');
		expect(sectionTitles()).not.toContain('Writing');
	});

	it('non-writer card gets no writing section at all', () => {
		const t = build(
			['frontSimplified', 'frontControlButtons'],
			['backSimplified', 'backDefinitions']
		);
		mount(t.afmt);
		expect(document.getElementById('practice-select')).toBeNull();
		expect(rowLabels()).toEqual(['Simplified', 'Meaning', 'Color hanzi']);
	});
});

describe('review sidebar — per-side preferences', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('starts from this side create-page selection', () => {
		installPersistence();
		const t = build(
			['frontSimplified', 'frontPinyin', 'frontwritingComponent', 'frontControlButtons'],
			['backSimplified', 'backDefinitions']
		);
		mount(t.qfmt);
		expect((document.getElementById('text-pinyin') as HTMLInputElement).checked).toBe(true);
		expect(document.getElementById('text-meaning')).toBeNull(); // not a front field
	});

	it('writes preferences under its own side key', () => {
		const store = installPersistence();
		const t = build(
			['frontSimplified', 'frontPinyin', 'frontwritingComponent', 'frontControlButtons'],
			['backSimplified', 'backPinyin', 'backDefinitions']
		);
		mount(t.qfmt);
		const cb = document.getElementById('text-pinyin') as HTMLInputElement;
		cb.checked = false;
		(window as never as { setPrefs: (e: HTMLInputElement) => void }).setPrefs(cb);
		expect(store['fronttext-pinyin']).toBe('false');
		expect(store['backtext-pinyin']).not.toBe('false'); // the back keeps its own
	});

	it('hides a field the side deselected even though it has no row', () => {
		installPersistence();
		// Zhuyin ships (the writer page renders it) but is not selected on the back.
		const t = build(
			['frontSimplified', 'frontwritingComponent'],
			['backSimplified', 'backDefinitions', 'backwritingComponent']
		);
		mount(t.afmt);
		expect(document.getElementById('text-zhuyin')).toBeNull();
		expect((document.getElementById('char_zhuyin') as HTMLElement).style.display).toBe('none');
	});
});
