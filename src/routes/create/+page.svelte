<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import AppearancePanel from '$lib/components/AppearancePanel.svelte';
	import CardTypeEditor from '$lib/components/CardTypeEditor.svelte';
	import LivePreview from '$lib/components/LivePreview.svelte';
	import WordSourceInput from '$lib/components/WordSourceInput.svelte';
	import WordReviewTable from '$lib/components/WordReviewTable.svelte';
	import CreateSteps from '$lib/components/create/CreateSteps.svelte';
	import StylePresets from '$lib/components/create/StylePresets.svelte';
	import StepBar from '$lib/components/create/StepBar.svelte';
	import PresetConfirmModal from '$lib/components/PresetConfirmModal.svelte';
	import { Button, buttonClass, Badge, IconDot, PageHeader, Switch } from '$lib/ui';
	import Pager from '$lib/ui/Pager.svelte';
	import Download from '@lucide/svelte/icons/download';
	import Eye from '@lucide/svelte/icons/eye';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import Send from '@lucide/svelte/icons/send';
	import { anki, ankiClient, checkAnki, probeAnki, ANKI_STATUS_TEXT } from '$lib/anki/ankiStatus.svelte';
	import { sendPackage, SEND_STAGE_TEXT, type SendStage } from '$lib/anki/sendDeck';
	import { loadSendPrefs } from '$lib/anki/sendTarget';
	import SendToAnkiModal from '$lib/components/SendToAnkiModal.svelte';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import SquarePlus from '@lucide/svelte/icons/square-plus';
	import Plus from '@lucide/svelte/icons/plus';
	import {
		defaultDeckName,
		matchPreset,
		presetNeedsAudio,
		presetToCard,
		type CardPreset
	} from '$lib/cardPresets';
	import { peekPendingWords, type PendingThen, type PendingWords } from '$lib/hskHandoff';
	import { lastSettings, loadDecks, loadDraft, saveDeck, saveDraft, type DeckSettings } from '$lib/myWords';
	import CardCustomizer from '$lib/components/CardCustomizer.svelte';
	import ExportPreview from '$lib/components/ExportPreview.svelte';
	import ExportSuccess from '$lib/components/ExportSuccess.svelte';
	import { popupHidden } from '$lib/share.svelte';
	import {
		CARD_STYLE_LS_KEY,
		CARD_TABS_LS_KEY,
		DEFAULT_TEMPLATE,
		type CardElementStyles,
		type TemplateOpts
	} from '$lib/deck';
	import { deckFieldsFromOrder } from '$lib/deckTemplate';
	import { FIELDS, WRITING, DEFAULT_ORDER, newCard, fieldLabels } from '$lib/cardEditorModel';
	import { resolvePalette } from '$lib/tonePresets';
	import { posDisplay } from '$lib/dict/cedict';
	import { frequencyBand, hskLevelLabel } from '$lib/dict/meta';
	import {
		generateDeck,
		generateDeckBlob,
		initJieba,
		loadDict,
		loadHskWordsDict,
		lookupWord,
		setupSql,
		getSmartSentences,
		type TabContent,
		type Word,
		type ExampleSentence
	} from '$lib/deck';

	let words = $state<Word[]>([]);
	let deckName = $state(defaultDeckName(new Date()));
	// Ordered list of card items: note fields + the writing component, all
	// reorderable. `fields` (the apkg note fields) is derived from it.
	let order = $state<string[]>([...DEFAULT_ORDER]);
	// Layout tokens are positioning-only; note fields exclude the writing component
	// and the chrome tokens (control buttons / separator).
	let fields = $derived(deckFieldsFromOrder(order));
	let includeAudio = $state(false);
	let template = $state<TemplateOpts>({ ...DEFAULT_TEMPLATE });
	// Words → Card style → Export. Words come first: the card is easier to
	// pick once you know what you are studying.
	const STEPS = ['Words', 'Card style', 'Export'];
	let step = $state(1);
	let wordPage = $state(1);
	let wordPageSize = $state(25);
	let showCustomizer = $state(false);
	let showPreview = $state(false);
	let showSettingsPreview = $state(false);
	let settingsPreviewWords = $state<Word[]>([]);
	let loadingSettingsPreview = $state(false);
	let appearanceOpen = $state(false);
	let hskWordsDict = $state<Set<string>>(new Set());

	let activeTab = $state(0);
	let tabs = $state<string[]>(['Card 1']);
	let tabContent = $state<TabContent>({
		'Card 1': newCard()
	});

	// active card preview: ordered ids (fields + writing) selected on each side
	const frontItems = $derived(
		order.filter((o) => tabContent[tabs[activeTab]]?.front.includes(`front${o}`))
	);
	const backItems = $derived(
		order.filter((o) => tabContent[tabs[activeTab]]?.back.includes(`back${o}`))
	);
	// Per-card-type element styles for the active tab (drives the live previews).
	const activeStyles = $derived(tabContent[tabs[activeTab]]?.elementStyles ?? {});
	const activeGroups = $derived(tabContent[tabs[activeTab]]?.groups ?? []);
	// Resolved tone palette (preset or custom) for the live previews.
	const palette = $derived(resolvePalette(template.tonePreset, template.toneColors));

	// Example-sentence options + UI show only when a card type uses the field.
	const examplesUsed = $derived(
		tabs.some((t) => {
			const c = tabContent[t];
			return !!c && (c.front.includes('frontExamples') || c.back.includes('backExamples'));
		})
	);


	// Sync Audio field with includeAudio checkbox (Audio sits before the writing component)
	$effect(() => {
		if (includeAudio && !order.includes(FIELDS.AUDIO)) {
			const wi = order.indexOf(WRITING);
			const next = [...order];
			next.splice(wi === -1 ? next.length : wi, 0, FIELDS.AUDIO);
			order = next;
		} else if (!includeAudio && order.includes(FIELDS.AUDIO)) {
			order = order.filter((o) => o !== FIELDS.AUDIO);
		}
	});

	// Turn the Examples field on for every card type. Membership in `back` only
	// decides visibility — where it renders comes from `order` — so appending is
	// enough. Used by the HSK hand-off; the card editor drives it manually.
	function showExamplesOnEveryCard() {
		if (!order.includes(FIELDS.EXAMPLES)) {
			const ai = order.indexOf(FIELDS.AUDIO);
			const next = [...order];
			next.splice(ai === -1 ? next.length : ai, 0, FIELDS.EXAMPLES);
			order = next;
		}
		const id = `back${FIELDS.EXAMPLES}`;
		const next: TabContent = { ...tabContent };
		for (const name of tabs) {
			const card = next[name];
			if (card && !card.back.includes(id)) next[name] = { ...card, back: [...card.back, id] };
		}
		tabContent = next;
	}

	// Persist the deck-wide template (tone palette + custom colors, font, etc.)
	// so choices — including a custom palette — survive a page refresh.
	let stylesRestored = $state(false);
	$effect(() => {
		JSON.stringify(template); // track deep changes
		if (!stylesRestored) return;
		try {
			localStorage.setItem(CARD_STYLE_LS_KEY, JSON.stringify(template));
		} catch (_) {/* ignore storage errors */}
	});

	// Persist per-card-type element styles whenever they change.
	$effect(() => {
		const map: Record<string, CardElementStyles> = {};
		for (const name of tabs) map[name] = tabContent[name]?.elementStyles ?? {};
		if (!stylesRestored) return; // don't overwrite storage before the restore pass
		try {
			localStorage.setItem(CARD_TABS_LS_KEY, JSON.stringify(map));
		} catch (_) {/* ignore storage errors */}
	});

	onMount(async () => {
		// Restore saved card style from localStorage.
		try {
			const saved = localStorage.getItem(CARD_STYLE_LS_KEY);
			if (saved) {
				const parsed = JSON.parse(saved) as Partial<typeof DEFAULT_TEMPLATE>;
				template = { ...DEFAULT_TEMPLATE, ...parsed };
			}
		} catch (_) {/* ignore parse/storage errors */}

		// Restore saved per-card-type element styles, merged onto existing tabs.
		try {
			const savedTabs = localStorage.getItem(CARD_TABS_LS_KEY);
			if (savedTabs) {
				const parsed = JSON.parse(savedTabs) as Record<string, CardElementStyles>;
				const next = { ...tabContent };
				for (const name of Object.keys(next)) {
					if (parsed[name]) next[name] = { ...next[name], elementStyles: parsed[name] };
				}
				tabContent = next;
			}
		} catch (_) {/* ignore parse/storage errors */}

		// Migrate legacy deck-wide element styles onto the first card type so older
		// customisations aren't lost now that styling is per card type.
		if (template.elementStyles && Object.keys(template.elementStyles).length) {
			const first = tabs[0];
			if (first && tabContent[first] && Object.keys(tabContent[first].elementStyles).length === 0) {
				tabContent = {
					...tabContent,
					[first]: { ...tabContent[first], elementStyles: { ...template.elementStyles } }
				};
			}
		}
		stylesRestored = true;
		// A fresh deck starts from the card built last time; a draft or a
		// reopened deck brings its own settings and overrides this.
		const last = !leftover && !pendingImport?.settings ? lastSettings(loadDecks()) : undefined;
		// The look (palette, font) is already restored above and newer.
		if (last) applySettings({ ...last, template: $state.snapshot(template) });

		if (pendingImport) applyImport(pendingImport);
		// Nothing handed over: pick up the words left here last time.
		else if (leftover && words.length === 0) {
			restoredDraft = true;
			void wordInput?.importPending({
				label: 'your unfinished list',
				words: leftover.words,
				options: { audio: false, examples: false },
				deckName: leftover.deckName || undefined,
				settings: leftover.settings
			});
		}

		loadDict();
		initJieba();
		hskWordsDict = await loadHskWordsDict();
	});

	// A list handed over from /hsk or the dictionary. WordSourceInput consumes
	// it in its own onMount, which runs before this page's — so the options are
	// parked and applied after the localStorage restores, which would otherwise
	// overwrite them.
	let pendingImport: PendingWords | null = null;
	/** Where to go once the handed-over words are in (`hskHandoff`). */
	let afterImport: PendingThen | null = null;
	let deckSource = '';
	function onimport(pending: PendingWords) {
		deckName = pending.deckName ?? defaultDeckName(new Date(), pending.label);
		afterImport = pending.then ?? null;
		if (!restoredDraft) deckSource = pending.label;
		if (stylesRestored) applyImport(pending);
		else pendingImport = pending;
	}
	function applyImport(pending: PendingWords) {
		pendingImport = null;
		if (pending.settings) {
			applySettings(pending.settings);
			return;
		}
		if (pending.options.audio) includeAudio = true;
		if (pending.options.examples) showExamplesOnEveryCard();
	}
	/** A saved deck or a draft: the card exactly as it was built. */
	function applySettings(saved: DeckSettings) {
		template = { ...DEFAULT_TEMPLATE, ...saved.template };
		tabs = [...saved.tabs];
		tabContent = saved.tabContent;
		order = [...saved.order];
		includeAudio = saved.includeAudio;
		activeTab = 0;
	}
	function onAddDone() {
		addOpen = false;
		const then = afterImport;
		afterImport = null;
		if (!then || words.length === 0) return;
		step = 3;
		if (then === 'send') pressSend();
	}

	// ---- My words: the draft, and every built deck ----
	// Read before the children mount: WordSourceInput takes the hand-off in its
	// own onMount. An unfinished list about to be replaced by a hand-off is
	// kept as a saved deck rather than thrown away.
	const arriving = peekPendingWords();
	const leftover = loadDraft();
	if (leftover && arriving) {
		saveDeck({
			name: leftover.deckName || defaultDeckName(new Date(leftover.savedAt)),
			words: leftover.words,
			savedAt: leftover.savedAt,
			settings: leftover.settings
		});
		saveDraft(null);
	}
	let wordInput = $state<ReturnType<typeof WordSourceInput>>();
	let restoredDraft = $state(false);
	let savedToMyWords = $state(false);
	const currentSettings = (): DeckSettings =>
		$state.snapshot({ includeAudio, tabs, tabContent, order, template }) as DeckSettings;

	// Keep the words on this page in the draft; clear it when they are all removed.
	let draftArmed = false;
	$effect(() => {
		const list = words.map((w) => w.Simplified);
		const name = deckName;
		const settings = currentSettings();
		if (!stylesRestored) return;
		if (list.length) {
			draftArmed = true;
			saveDraft({ words: list, deckName: name, savedAt: Date.now(), settings });
		} else if (draftArmed) saveDraft(null);
	});

	/** A deck was built: keep it under its name, the draft is no longer needed. */
	function rememberDeck() {
		saveDeck({
			name: deckName,
			words: words.map((w) => w.Simplified),
			savedAt: Date.now(),
			source: deckSource || undefined,
			settings: currentSettings()
		});
		// Built and kept: nothing unfinished any more, until the next edit.
		saveDraft(null);
		draftArmed = false;
		savedToMyWords = true;
	}

	function startOver() {
		words = [];
		restoredDraft = false;
		deckSource = '';
		deckName = defaultDeckName(new Date());
		saveDraft(null);
		addOpen = true;
	}

	// ---- card style tiles ----
	const preset = $derived(matchPreset(tabs.map((t) => tabContent[t]).filter(Boolean)));
	let confirmPreset = $state<CardPreset | null>(null);

	function uniqueTabName(name: string) {
		if (!tabs.includes(name)) return name;
		let n = 2;
		while (tabs.includes(`${name} ${n}`)) n++;
		return `${name} ${n}`;
	}

	/** Make the deck this preset: one card type. Audio is the switch's call, not the tile's. */
	function usePreset(p: CardPreset) {
		tabs = [p.name];
		tabContent = { [p.name]: presetToCard(p) };
		activeTab = 0;
	}

	function addPresetCard(p: CardPreset) {
		const name = uniqueTabName(p.name);
		tabs = [...tabs, name];
		tabContent = { ...tabContent, [name]: presetToCard(p) };
		activeTab = tabs.length - 1;
		if (presetNeedsAudio(p) && !includeAudio) includeAudio = true;
	}

	// A tile replaces a preset without asking; a hand-edited card asks first.
	function pickPreset(p: CardPreset) {
		if (preset) usePreset(p);
		else confirmPreset = p;
	}

	async function openSettingsPreview() {
		loadingSettingsPreview = true;
		const defaults = ['写', '汉字', '的', '比如', '好'];
		settingsPreviewWords = await Promise.all(defaults.map(lookupWord));
		showSettingsPreview = true;
		loadingSettingsPreview = false;
	}

	// Plain-text value for a CSV column. Field display names (FIELDS.*) don't all
	// map 1:1 to Word props — derived fields (Breakdown, Radical, HskLevel,
	// Frequency, Examples, PartOfSpeech) are computed here so they aren't blank.
	function csvCell(w: Word, col: string, examples: ExampleSentence[]): string {
		switch (col) {
			case FIELDS.SIMPLIFIED:
				return w.Simplified;
			case FIELDS.TRADITIONAL:
				return w.Traditional;
			case FIELDS.PINYIN:
				return w.Pinyin;
			case FIELDS.ZHUYIN:
				return w.Zhuyin;
			case FIELDS.PART_OF_SPEECH:
				return w.pos.map((p) => posDisplay(p)).join('; ');
			case FIELDS.SIMPLE_MEANING:
				return w.SimpleMeaning ?? '';
			case FIELDS.DEFINITIONS:
				return w.Definitions ?? '';
			case FIELDS.BREAKDOWN:
				return w.breakdown.length > 1
					? w.breakdown.map((c) => `${c.character}(${c.pinyin}: ${c.definition})`).join('; ')
					: '';
			case FIELDS.RADICAL: {
				const seen = new Set<string>();
				return w.breakdown
					.filter((c) => c.radical && !seen.has(c.character) && seen.add(c.character))
					.map((c) => `${c.character}→${c.radical}`)
					.join('; ');
			}
			case FIELDS.HSK_LEVEL:
				return hskLevelLabel(w.level) ?? '';
			case FIELDS.FREQUENCY:
				return frequencyBand(w.rank) ?? '';
			case FIELDS.EXAMPLES:
				return examples
					.map((s) => [s.simplified, s.pinyin, s.translation].filter(Boolean).join(' | '))
					.join('\n');
			default:
				return (w as any)[col] ?? '';
		}
	}

	async function exportCSV() {
		const cols = fields.filter((f) => f !== FIELDS.AUDIO);
		// Fetch example sentences (simplified + pinyin + translation) per word when
		// the Examples column is included, matching the deck's example options.
		const exMap = new Map<string, ExampleSentence[]>();
		if (cols.includes(FIELDS.EXAMPLES)) {
			const o = template.exampleOptions ?? DEFAULT_TEMPLATE.exampleOptions;
			const args = { limit: o.count, minChars: o.minChars, maxChars: o.maxChars };
			await Promise.all(
				words.map(async (w) => {
					try {
						exMap.set(w.Simplified, await getSmartSentences(w.Simplified, args));
					} catch (_) {
						exMap.set(w.Simplified, []);
					}
				})
			);
		}
		const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
		const header = cols.map(escape).join(',');
		const rows = words.map((w) =>
			cols.map((c) => escape(csvCell(w, c, exMap.get(w.Simplified) ?? []))).join(',')
		);
		const csv = [header, ...rows].join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${deckName}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	let isGenerating = $state(false);
	let showSuccess = $state(false);
	let exportedDeckName = $state('');
	let progressbarValue = $state(0);
	async function doGenerateDeck() {
		if (isGenerating || words.length === 0) return;
		isGenerating = true;
		try {
			// Fresh SQLite db per export — genanki runs CREATE TABLE without
			// IF NOT EXISTS, so reusing a db throws "table col already exists" on
			// the second click.
			const exportDb = await setupSql();
			await generateDeck({
				words,
				deckName,
				includeAudio,
				fields,
				order,
				tabContent,
				hskWordsDict,
				db: exportDb,
				template,
				onProgress: (v) => (progressbarValue = v)
			});
			rememberDeck();
			exportedDeckName = deckName;
			if (!popupHidden()) showSuccess = true;
		} finally {
			isGenerating = false;
			showPreview = false;
		}
	}

	// Send to Anki: connect (may pop the browser's and Anki's prompts), build
	// the same package Download builds, hand it to AnkiConnect.
	let sendStage = $state<'idle' | 'connecting' | 'building' | SendStage | 'error'>('idle');
	let sendError = $state('');
	const sending = $derived(['connecting', 'building', 'storing', 'importing', 'cleaning'].includes(sendStage));
	// Anki already answered (this visit, or a quiet check because this browser
	// has connected before): Send is the one-click path, so it gets the filled button.
	const sendFirst = $derived(anki.status === 'ready');
	$effect(() => {
		if (step === 3) probeAnki();
	});
	// Send asks where the deck goes (unless the reader switched that off); the
	// settings button beside it always asks.
	let showSend = $state(false);
	function pressSend() {
		const prefs = loadSendPrefs();
		if (prefs.ask) showSend = true;
		else void doSendToAnki(prefs.openAfter);
	}
	/** Connect (prompts on a first visit), then Anki's own deck list. */
	async function loadAnkiDecks(): Promise<string[]> {
		const status = anki.status === 'ready' ? 'ready' : await checkAnki();
		if (status !== 'ready') throw new Error(ANKI_STATUS_TEXT[status]);
		return ankiClient().call<string[]>('deckNames');
	}
	async function doSendToAnki(openAfter = true) {
		if (sending || isGenerating || words.length === 0) return;
		sendError = '';
		sendStage = 'connecting';
		const status = anki.status === 'ready' ? 'ready' : await checkAnki();
		if (status !== 'ready') {
			sendStage = 'error';
			sendError = ANKI_STATUS_TEXT[status];
			return;
		}
		isGenerating = true;
		sendStage = 'building';
		try {
			const blob = await generateDeckBlob({
				words,
				deckName,
				includeAudio,
				fields,
				order,
				tabContent,
				hskWordsDict,
				db: await setupSql(),
				template,
				onProgress: (v) => (progressbarValue = Math.min(v, 99))
			});
			await sendPackage(ankiClient(), { data: blob }, {
				onStage: (s) => (sendStage = s),
				showDeck: openAfter ? deckName : undefined
			});
			rememberDeck();
			progressbarValue = 0;
		} catch (e) {
			sendStage = 'error';
			const err = e as { unreachable?: boolean; message?: string };
			if (err.unreachable) anki.status = 'unreachable';
			sendError = err.unreachable ? ANKI_STATUS_TEXT.unreachable : `Anki said: ${err.message ?? e}`;
			progressbarValue = 0;
		} finally {
			isGenerating = false;
		}
	}

	// The "Add words" panel: open until words arrive, then folded behind a button.
	let addOpen = $state(true);
	let addBusy = $state(false);
	const showAdd = $derived(addOpen || addBusy || words.length === 0);

	const panel = 'rounded-panel bg-surface p-5 ring-1 ring-line ring-inset sm:p-6';
	const h2 = 'm-0 mb-4 text-[20px] leading-tight font-bold text-ink';
</script>

<svelte:head>
	<title>Create a deck · Anki-xiehanzi</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
	<PageHeader title="Create a deck" subtitle="Your words, the same card design as the HSK decks.">
		{#snippet lead()}
			<IconDot hue="lavender" size="lg" shape="tile"><SquarePlus /></IconDot>
		{/snippet}
	</PageHeader>

	<CreateSteps bind:step steps={STEPS} done={(n) => (n === 1 ? words.length > 0 : n === 2 ? step === 3 : false)} />

	<!-- 1 · Words. Kept mounted (hidden) so a running import or the
	     hand-off from /hsk is not cut off by switching steps. -->
	<section class={step === 1 ? '' : 'hidden'} aria-label="Words">
		<!-- Folds away once a batch lands, so the words get the screen; it stays
		     mounted (hidden) so a running import keeps going. -->
		<div class="{panel} mb-4 {showAdd ? '' : 'hidden'}">
			<div class="mb-4 flex items-center justify-between gap-3">
				<h2 class="{h2} mb-0">Add words</h2>
				{#if words.length && !addBusy}
					<button type="button" class={buttonClass('text', 'sm')} onclick={() => (addOpen = false)}>Done</button>
				{/if}
			</div>
			<WordSourceInput bind:this={wordInput} bind:words bind:busy={addBusy} {onimport} ondone={onAddDone} />
		</div>
		<WordReviewTable bind:words bind:page={wordPage} bind:pageSize={wordPageSize} {template} {palette} {hskWordsDict}>
			{#snippet actions()}
				{#if restoredDraft && !addBusy}
					<button type="button" class={buttonClass('text', 'sm')} onclick={startOver}>Start over</button>
				{/if}
				{#if !showAdd}
					<button type="button" class={buttonClass('soft', 'sm')} onclick={() => (addOpen = true)}>
						<Plus class="size-4" />Add words
					</button>
				{/if}
			{/snippet}
		</WordReviewTable>
		<StepBar next={{ label: 'Next: card style', short: 'Card style', onclick: () => (step = 2), disabled: words.length === 0 }}>
			{#if words.length > 10}
				<Pager bind:page={wordPage} bind:size={wordPageSize} total={words.length} />
			{/if}
		</StepBar>
	</section>

	{#if step === 2}
		<section class="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]" aria-label="Card style">
			<div class="min-w-0">
				<div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-panel bg-sunk p-4">
					<div class="min-w-0">
						<p class="m-0 font-semibold text-ink">
							{words.length.toLocaleString()} word{words.length === 1 ? '' : 's'}
						</p>
						{#if words.length}
							<p class="m-0 mt-1 truncate font-zh text-lg text-muted">
								{words
									.slice(0, 16)
									.map((w) => w.Simplified)
									.join(' ')}{words.length > 16 ? ' …' : ''}
							</p>
						{/if}
					</div>
					<button type="button" class={buttonClass('text', 'sm')} onclick={() => (step = 1)}
						>{words.length ? 'Edit words' : 'Add words'}</button
					>
				</div>

				<div class={panel}>
					<h2 class={h2}>How do you want to study them?</h2>
					<StylePresets selected={preset?.id ?? null} onpick={pickPreset} />

					<div class="mt-4 divide-y divide-line border-t border-line">
						<Switch
							bind:checked={includeAudio}
							label="Audio"
							hint="A recording for each word. Slower to build; best in Edge."
						/>
						<Switch
							bind:checked={() => !template.mono, (v) => (template.mono = !v)}
							label="Tone colours"
							hint="Colour hanzi and pinyin by tone"
						>
							{#snippet extra()}
								<span class="flex gap-1" aria-hidden="true">
									{#each ['1', '2', '3', '4'] as const as t (t)}
										<i class="size-4 rounded-full" style="background:{palette[t]}"></i>
									{/each}
								</span>
							{/snippet}
						</Switch>
					</div>

					<details class="group mt-1 border-t border-line pt-3">
						<summary class="cursor-pointer py-1 text-[15px] font-semibold text-ink">
							Advanced: fields, order, look
						</summary>
						<div class="mt-3">
							<AppearancePanel
								bind:template
								bind:open={appearanceOpen}
								{palette}
								{examplesUsed}
								loadingPreview={loadingSettingsPreview}
								onpreview={openSettingsPreview}
							/>
							<CardTypeEditor
								bind:tabs
								bind:tabContent
								bind:activeTab
								bind:order
								bind:includeAudio
								onshowcustomizer={() => (showCustomizer = true)}
							/>
						</div>
					</details>
				</div>
			</div>

			<!-- Live preview: right column from lg, under the panel on phones. -->
			<aside class="space-y-3 p-px lg:sticky lg:top-20 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
				{#if tabContent[tabs[activeTab]]}
					<LivePreview
						{words}
						tabName={tabs[activeTab]}
						{tabContent}
						{fields}
						{includeAudio}
						{template}
						{palette}
						{order}
						{frontItems}
						{backItems}
						elementStyles={activeStyles}
						groups={activeGroups}
					/>
				{/if}
			</aside>
		</section>
		<StepBar back={{ label: 'Words', onclick: () => (step = 1) }} next={{ label: 'Next: export', short: 'Export', onclick: () => (step = 3) }} />
	{/if}

	{#if step === 3}
		<section class="max-w-2xl" aria-label="Export">
			<div class={panel}>
				<label class="block">
					<span class="mb-1.5 block text-sm font-semibold text-ink">Deck name</span>
					<input
						class="block min-h-11 w-full rounded-card border-0 bg-sunk px-3.5 text-[15px] text-ink focus:ring-3 focus:ring-sky"
						bind:value={deckName}
					/>
				</label>

				<div class="mt-4 flex flex-wrap gap-1.5">
					<Badge tint="sky">{words.length.toLocaleString()} words</Badge>
					<Badge tint="lavender">{preset ? preset.name : `${tabs.length} card type${tabs.length === 1 ? '' : 's'}`}</Badge>
					<Badge tint={includeAudio ? 'mint' : 'neutral'}>{includeAudio ? 'Audio' : 'No audio'}</Badge>
					{#if savedToMyWords}
						<a href="{base}/words" class="ml-auto self-center text-[13.5px] font-semibold text-accent no-underline hover:underline"
							>Saved in My words</a
						>
					{/if}
				</div>

				{#if words.length === 0}
					<p class="mt-5 mb-0 rounded-card bg-apricot-soft px-4 py-3 text-apricot-ink">
						No words yet.
						<button type="button" class="border-0 bg-transparent p-0 font-semibold underline" onclick={() => (step = 1)}
							>Add words</button
						>
					</p>
				{:else}
					<!-- Send is desktop-only: phones have no AnkiConnect, and Download stays the default. -->
					<div class="mt-5 grid gap-2 sm:grid-cols-2">
						<Button
							variant={sendFirst ? 'secondary' : 'primary'}
							class="w-full {sendFirst ? 'sm:order-2' : 'sm:order-1'}"
							onclick={doGenerateDeck}
							disabled={isGenerating}
						>
							<Download class="size-[18px]" />{isGenerating && !sending ? 'Building…' : 'Download .apkg'}
						</Button>
						<div class="hidden gap-2 sm:flex {sendFirst ? 'sm:order-1' : 'sm:order-2'}">
							<Button variant={sendFirst ? 'primary' : 'secondary'} class="flex-1" onclick={pressSend} disabled={isGenerating || sending}>
								<Send class="size-[18px]" />{sending ? 'Sending…' : 'Send to Anki'}
							</Button>
							<button
								type="button"
								class="grid size-11 shrink-0 place-items-center rounded-full text-muted ring-[1.5px] ring-line ring-inset hover:bg-sunk hover:text-ink disabled:opacity-50"
								aria-label="Send settings"
								title="Which deck, and send settings"
								onclick={() => (showSend = true)}
								disabled={isGenerating || sending}
							>
								<Settings2 class="size-[18px]" />
							</button>
						</div>
					</div>
					{#if sendStage !== 'idle' && sendStage !== 'building'}
						<p
							class="mt-3 mb-0 rounded-card px-4 py-3 text-[14px] {sendStage === 'error'
								? 'bg-apricot-soft text-apricot-ink'
								: sendStage === 'done'
									? 'bg-mint-soft text-mint-ink'
									: 'bg-sunk text-muted'}"
							role="status"
						>
							{sendStage === 'error'
								? sendError
								: sendStage === 'connecting'
									? ANKI_STATUS_TEXT.checking
									: sendStage === 'done'
										? `In Anki now: “${deckName}”.`
										: SEND_STAGE_TEXT[sendStage]}
						</p>
					{/if}
					{#if isGenerating || progressbarValue > 0}
						<div class="mt-3" role="status">
							<div class="mb-1 flex justify-between text-[13px] text-muted">
								<span
									>{sending && sendStage !== 'building'
										? 'Sending…'
										: isGenerating
											? includeAudio
												? 'Building, with audio…'
												: 'Building…'
											: 'Done'}</span
								>
								<span>{progressbarValue.toFixed(0)}%</span>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-sunk">
								<div class="h-full rounded-full bg-mint transition-[width]" style="width:{progressbarValue}%"></div>
							</div>
						</div>
					{/if}
					<div class="mt-3 flex flex-wrap gap-2">
						<Button variant="secondary" size="sm" onclick={() => (showPreview = true)} disabled={isGenerating}>
							<Eye class="size-4" />Preview every card
						</Button>
						<Button variant="secondary" size="sm" onclick={exportCSV}>
							<FileSpreadsheet class="size-4" />CSV
						</Button>
					</div>
					<p class="mt-4 mb-0 text-[13.5px] text-muted">
						Open the file in Anki, or on a phone tap it to import.
						<span class="hidden sm:inline">Send to Anki needs Anki open with AnkiConnect.</span>
					</p>
				{/if}
			</div>
		</section>
		<StepBar back={{ label: 'Card style', onclick: () => (step = 2) }} />
	{/if}

	{#if showCustomizer && tabContent[tabs[activeTab]]}
		<CardCustomizer
			bind:template
			bind:tabContent
			{tabs}
			bind:activeTab
			bind:order
			{fieldLabels}
			onclose={() => (showCustomizer = false)}
		/>
	{/if}

	{#if confirmPreset}
		<PresetConfirmModal
			preset={confirmPreset}
			activeTabName={tabs[activeTab]}
			replaceLabel={tabs.length > 1 ? 'Replace all card types' : `Replace "${tabs[0]}"`}
			onreplace={() => {
				usePreset(confirmPreset!);
				confirmPreset = null;
			}}
			onadd={() => {
				addPresetCard(confirmPreset!);
				confirmPreset = null;
			}}
			oncancel={() => (confirmPreset = null)}
		/>
	{/if}

	{#if showPreview}
		<ExportPreview
			{words}
			{tabs}
			{tabContent}
			{template}
			{fields}
			{order}
			{includeAudio}
			{palette}
			{isGenerating}
			onGenerate={doGenerateDeck}
			onclose={() => (showPreview = false)}
		/>
	{/if}

	{#if showSettingsPreview}
		<ExportPreview
			words={settingsPreviewWords}
			{tabs}
			{tabContent}
			{template}
			{fields}
			{order}
			{includeAudio}
			{palette}
			isGenerating={false}
			onclose={() => (showSettingsPreview = false)}
		/>
	{/if}

	{#if showSend}
		<SendToAnkiModal
			{deckName}
			subtitle="{words.length.toLocaleString()} word{words.length === 1 ? '' : 's'}"
			loadDecks={loadAnkiDecks}
			onsend={(name, prefs) => {
				showSend = false;
				deckName = name;
				void doSendToAnki(prefs.openAfter);
			}}
			onclose={() => (showSend = false)}
		/>
	{/if}

	{#if showSuccess}
		<ExportSuccess deckName={exportedDeckName} onClose={() => (showSuccess = false)} />
	{/if}
</div>
