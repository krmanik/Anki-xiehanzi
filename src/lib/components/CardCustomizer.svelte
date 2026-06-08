<script lang="ts">
	import {
		CARD_STYLE_LS_KEY,
		elementOrder,
		type CardElementId,
		type CardElementStyles,
		type ElementStyle,
		type TabContent,
		type TemplateOpts
	} from '$lib/deckTemplate';
	import { TONE_PRESETS, TONE_KEYS, resolvePalette } from '$lib/tonePresets';
	import CardPreview from './CardPreview.svelte';
	import UnitInput from './UnitInput.svelte';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import X from '@lucide/svelte/icons/x';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import AlignLeft from '@lucide/svelte/icons/align-left';
	import AlignCenter from '@lucide/svelte/icons/align-center';
	import AlignRight from '@lucide/svelte/icons/align-right';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let {
		template = $bindable<TemplateOpts>(),
		tabContent = $bindable<TabContent>({}),
		tabs = [],
		activeTab = $bindable<number>(0),
		order = [],
		fieldLabels = {},
		onclose
	}: {
		template: TemplateOpts;
		tabContent: TabContent;
		tabs?: string[];
		activeTab?: number;
		order?: string[];
		fieldLabels?: Record<string, string>;
		onclose?: () => void;
	} = $props();

	// Edits are applied live to `template` + `tabContent` (so the page stays in
	// sync and the per-card-type tab switcher works). A snapshot taken on open
	// lets Cancel revert everything.
	const snapshot = JSON.parse(JSON.stringify({ template, tabContent }));

	const current = $derived(tabs[activeTab] ?? '');
	const card = $derived(tabContent[current]);
	const front = $derived(card?.front ?? []);
	const back = $derived(card?.back ?? []);
	// Active card's element styles drive every property panel + the previews.
	const localES = $derived<CardElementStyles>(card?.elementStyles ?? {});
	// Backwards-compatible alias used throughout the tone/global section.
	const localT = $derived(template);

	const frontItems = $derived(order.filter((o) => front.includes(`front${o}`)));
	const backItems = $derived(order.filter((o) => back.includes(`back${o}`)));
	const previewPalette = $derived(resolvePalette(template.tonePreset, template.toneColors));

	let mobilePreview = $state(false);
	let selectedElement = $state<CardElementId | null>(null);
	let fieldsCollapsed = $state(false);

	// Mutate the active card's content immutably so bindings propagate.
	function patchCard(patch: Partial<TabContent[string]>) {
		if (!card) return;
		tabContent = { ...tabContent, [current]: { ...card, ...patch } };
	}

	// Toggle a field on the front/back directly from the designer.
	function toggleField(item: string, side: 'front' | 'back') {
		if (!card) return;
		const id = `${side}${item}`;
		const list = card[side];
		patchCard({ [side]: list.includes(id) ? list.filter((f) => f !== id) : [...list, id] } as any);
	}

	// ── Element metadata ─────────────────────────────────────────────────────

	const ALL_ELEMENTS: { id: CardElementId; label: string }[] = [
		{ id: 'card',           label: 'Card background' },
		{ id: 'simplified',     label: 'Simplified 大' },
		{ id: 'traditional',    label: 'Traditional 〔〕' },
		{ id: 'pinyin',         label: 'Pinyin' },
		{ id: 'zhuyin',         label: 'Zhuyin' },
		{ id: 'partOfSpeech',   label: 'Part of speech' },
		{ id: 'simpleMeaning',  label: 'Simple meaning' },
		{ id: 'definitions',    label: 'Definitions' },
		{ id: 'breakdown',      label: 'Char breakdown' },
		{ id: 'radical',        label: 'Radical' },
		{ id: 'hskLevel',       label: 'HSK level' },
		{ id: 'frequency',      label: 'Frequency' },
		{ id: 'audio',          label: 'Audio button' },
		{ id: 'hr',             label: 'Separator line' },
		{ id: 'controlButtons', label: 'Control buttons' }
	];

	const HANZI_SIZE_PRESETS = [
		{ label: 'XS', value: '1.5em' },
		{ label: 'S',  value: '2em'   },
		{ label: 'M',  value: '2.5em' },
		{ label: 'L',  value: '3.5em' },
		{ label: 'XL', value: '5em'   }
	];

	const TEXT_SIZE_PRESETS = [
		{ label: 'XS', value: '0.75em' },
		{ label: 'S',  value: '0.875em'},
		{ label: 'M',  value: '1em'    },
		{ label: 'L',  value: '1.25em' },
		{ label: 'XL', value: '1.5em'  }
	];

	const FONT_OPTIONS = [
		{ value: 'default', label: 'Default' },
		{ value: 'kaiti',   label: '楷体 Kaiti' },
		{ value: 'songti',  label: '宋体 Songti' }
	];

	const BG_PRESETS = ['#ffffff', '#fdf6e3', '#1e1e2e', '#f0f4f8', '#fff8f0'];

	// Field name (as used in items) → CardElementId, for position neighbours.
	const FIELD_TO_EL: Record<string, CardElementId> = {
		Simplified: 'simplified',
		Traditional: 'traditional',
		Pinyin: 'pinyin',
		Zhuyin: 'zhuyin',
		PartOfSpeech: 'partOfSpeech',
		SimpleMeaning: 'simpleMeaning',
		Definitions: 'definitions',
		Breakdown: 'breakdown',
		Radical: 'radical',
		HskLevel: 'hskLevel',
		Frequency: 'frequency',
		Audio: 'audio'
	};

	// ── Per-element helpers ───────────────────────────────────────────────────

	function getStyle(): ElementStyle {
		if (!selectedElement) return {};
		return localES[selectedElement] ?? {};
	}

	function setStyle(patch: Partial<ElementStyle>) {
		if (!selectedElement) return;
		setStyleFor(selectedElement, patch);
	}

	function clearStyle(key: keyof ElementStyle) {
		if (!selectedElement) return;
		const next = { ...(localES[selectedElement] ?? {}) };
		delete next[key];
		patchCard({ elementStyles: { ...localES, [selectedElement]: next } });
	}

	function isHidden(id: CardElementId): boolean {
		return localES[id]?.visible === false;
	}

	function toggleVisible(id: CardElementId) {
		const current = localES[id]?.visible;
		setStyleFor(id, { visible: current === false ? true : false });
	}

	function setStyleFor(id: CardElementId, patch: Partial<ElementStyle>) {
		patchCard({ elementStyles: { ...localES, [id]: { ...(localES[id] ?? {}), ...patch } } });
	}

	// Move the selected chrome element (hr / controls) up or down past a neighbour
	// by swapping their flex `order`. Neighbours come from the answer side, where
	// the controls + separator live.
	function moveElement(id: CardElementId, dir: -1 | 1) {
		const blocks: CardElementId[] = [
			'controlButtons',
			'hr',
			...backItems.map((f) => FIELD_TO_EL[f]).filter(Boolean)
		];
		const uniq = [...new Set(blocks)];
		const sorted = uniq.sort((a, b) => elementOrder(localES, a) - elementOrder(localES, b));
		const i = sorted.indexOf(id);
		const j = i + dir;
		if (i < 0 || j < 0 || j >= sorted.length) return;
		const other = sorted[j];
		const oi = elementOrder(localES, id);
		const oj = elementOrder(localES, other);
		patchCard({
			elementStyles: {
				...localES,
				[id]: { ...(localES[id] ?? {}), order: oj },
				[other]: { ...(localES[other] ?? {}), order: oi }
			}
		});
	}

	// Determine which property group to show for the selected element.
	type ElKind = 'card' | 'hanzi' | 'text' | 'chips' | 'hr' | 'button';
	const EL_KIND: Record<CardElementId, ElKind> = {
		card:           'card',
		simplified:     'hanzi',
		traditional:    'hanzi',
		pinyin:         'text',
		zhuyin:         'text',
		partOfSpeech:   'chips',
		simpleMeaning:  'text',
		definitions:    'text',
		breakdown:      'text',
		radical:        'chips',
		hskLevel:       'text',
		frequency:      'text',
		audio:          'button',
		hr:             'hr',
		controlButtons: 'button'
	};

	const selKind = $derived(selectedElement ? EL_KIND[selectedElement] : null);
	const selStyle = $derived(getStyle());
	const colorize = $derived(!localT.mono && localT.colorHanzi);
	const canMove = $derived(selectedElement === 'hr' || selectedElement === 'controlButtons');

	// ── Segmented button helper ───────────────────────────────────────────────

	function segClass(active: boolean) {
		return (
			'flex-1 py-1 text-xs transition ' +
			(active ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50')
		);
	}

	// ── Save / Cancel / Reset ─────────────────────────────────────────────────

	function save() {
		try {
			localStorage.setItem(CARD_STYLE_LS_KEY, JSON.stringify(template));
		} catch (_) {/* ignore storage errors */}
		onclose?.();
	}

	// Revert every live edit (template + all card types) to the open-time snapshot.
	function cancel() {
		template = JSON.parse(JSON.stringify(snapshot.template));
		tabContent = JSON.parse(JSON.stringify(snapshot.tabContent));
		onclose?.();
	}

	// Reset only the active card type's element styles.
	function reset() {
		patchCard({ elementStyles: {} });
		selectedElement = null;
	}

	// Mutate the deck-wide template immutably (tone palette / font / colours).
	function patchTemplate(patch: Partial<TemplateOpts>) {
		template = { ...template, ...patch };
	}
	function setToneColor(k: (typeof TONE_KEYS)[number], value: string) {
		template = { ...template, toneColors: { ...template.toneColors, [k]: value } };
	}
	function handleOverlay(e: MouseEvent) { if (e.target === e.currentTarget) cancel(); }
</script>

<div
	class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
	role="presentation"
	onclick={handleOverlay}
	onkeydown={(e) => e.key === 'Escape' && cancel()}
>
	<div
		class="absolute inset-3 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:inset-6"
		role="dialog"
		aria-label="Card Customiser"
	>
		<!-- Header -->
		<div class="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-3">
			<div>
				<h2 class="text-base font-semibold text-neutral-900">Advanced Card Designer{current ? ` — ${current}` : ''}</h2>
				<p class="text-xs text-neutral-400">Per card type. Click any element in the preview to customise it. Mirrors exactly in the Anki export.</p>
			</div>
			<div class="flex items-center gap-2">
				<div class="inline-flex overflow-hidden rounded-lg border border-neutral-200">
					<button
						class="flex items-center justify-center p-2 transition {!mobilePreview ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:bg-neutral-50'}"
						onclick={() => (mobilePreview = false)} title="Desktop"
					><Monitor size={16} /></button>
					<button
						class="flex items-center justify-center p-2 transition {mobilePreview ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:bg-neutral-50'}"
						onclick={() => (mobilePreview = true)} title="Mobile"
					><Smartphone size={16} /></button>
				</div>
				<button onclick={cancel} class="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100" aria-label="Close"><X size={18} /></button>
			</div>
		</div>

		<!-- Card-type switcher (only when there is more than one) -->
		{#if tabs.length > 1}
			<div class="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-neutral-200 bg-neutral-50 px-4 py-2">
				<span class="mr-1 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-400">Card type</span>
				{#each tabs as t, i (t)}
					<button
						class="rounded-md px-3 py-1 text-xs transition {activeTab === i
							? 'bg-neutral-900 text-white'
							: 'text-neutral-600 hover:bg-neutral-200'}"
						onclick={() => { activeTab = i; selectedElement = null; }}
					>{t}</button>
				{/each}
			</div>
		{/if}

		<!-- Body -->
		<div class="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">

			<!-- ── Left: element list + properties ─────────────── -->
			<div class="flex max-h-[45vh] w-full min-h-0 shrink-0 flex-col overflow-y-auto border-b border-neutral-200 md:max-h-none md:w-64 md:overflow-y-auto md:border-b-0 md:border-r xl:w-72">

				<!-- Global tone settings -->
				<div class="border-b border-neutral-100 p-3">
					<p class="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-400">Global (whole deck)</p>
					<div class="mb-2 inline-flex w-full overflow-hidden rounded-lg border border-neutral-200">
						<button class={segClass(!localT.mono)} onclick={() => patchTemplate({ mono: false })}>Tone colors</button>
						<button class={segClass(localT.mono)} onclick={() => patchTemplate({ mono: true })}>Black &amp; white</button>
					</div>
					<label class="mb-1 flex items-center gap-2 text-xs {localT.mono ? 'opacity-40' : ''}">
						<input type="checkbox" class="h-3.5 w-3.5 accent-neutral-900" checked={localT.colorHanzi} onchange={(e) => patchTemplate({ colorHanzi: (e.target as HTMLInputElement).checked })} disabled={localT.mono} /> Color hanzi
					</label>
					<label class="mb-2 flex items-center gap-2 text-xs {localT.mono ? 'opacity-40' : ''}">
						<input type="checkbox" class="h-3.5 w-3.5 accent-neutral-900" checked={localT.colorPinyin} onchange={(e) => patchTemplate({ colorPinyin: (e.target as HTMLInputElement).checked })} disabled={localT.mono} /> Color pinyin
					</label>

					<!-- Tone palette -->
					<div class="{localT.mono ? 'opacity-40' : ''}">
						<p class="mb-1 text-[11px] font-medium text-neutral-600">Tone palette</p>
						<select
							value={localT.tonePreset}
							disabled={localT.mono}
							onchange={(e) => patchTemplate({ tonePreset: (e.target as HTMLSelectElement).value })}
							class="mb-1.5 w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
						>
							{#each TONE_PRESETS as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
							<option value="custom">Custom…</option>
						</select>
						<div class="flex items-center gap-1">
							{#each TONE_KEYS as k (k)}
								{#if localT.tonePreset === 'custom'}
									<input type="color" value={localT.toneColors[k]} disabled={localT.mono}
										oninput={(e) => setToneColor(k, (e.target as HTMLInputElement).value)}
										class="h-6 w-6 cursor-pointer rounded border border-neutral-200 p-0.5" title={`Tone ${k}`} />
								{:else}
									<span class="inline-flex h-5 w-5 items-center justify-center rounded text-[9px] font-semibold text-white" style="background-color:{previewPalette[k]}" title={`Tone ${k}`}>{k}</span>
								{/if}
							{/each}
						</div>
					</div>
				</div>

				<!-- Element list -->
				<div class="border-b border-neutral-100 p-3">
					<p class="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-400">Elements — click to select</p>
					<div class="flex flex-wrap gap-1">
						{#each ALL_ELEMENTS as el (el.id)}
							<button
								class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition
									{selectedElement === el.id
										? 'border-blue-500 bg-blue-50 text-blue-700'
										: isHidden(el.id)
											? 'border-neutral-200 bg-neutral-50 text-neutral-300'
											: 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}"
								onclick={() => (selectedElement = selectedElement === el.id ? null : el.id)}
							>
								{el.label}
								{#if isHidden(el.id)}<EyeOff size={9} />{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Fields on front / back (so the user needn't close the dialog) -->
				{#if order.length}
					<div class="border-b border-neutral-100 p-3">
						<button
							class="mb-2 flex w-full items-center gap-1.5 text-left"
							onclick={() => (fieldsCollapsed = !fieldsCollapsed)}
							aria-expanded={!fieldsCollapsed}
						>
							<ChevronDown size={12} class="text-neutral-400 transition {fieldsCollapsed ? '-rotate-90' : ''}" />
							<span class="font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-400">Fields — front / back</span>
						</button>
						{#if !fieldsCollapsed}
							<div class="rounded-lg border border-neutral-200">
								<div class="grid grid-cols-[1fr_2rem_2rem] items-center gap-1 border-b border-neutral-100 px-2 py-1.5">
									<span class="font-mono text-[9px] uppercase tracking-wider text-neutral-400">Field</span>
									<span class="text-center font-mono text-[9px] uppercase tracking-wider text-neutral-400">F</span>
									<span class="text-center font-mono text-[9px] uppercase tracking-wider text-neutral-400">B</span>
								</div>
								{#each order as item, i (item)}
									<div class="grid grid-cols-[1fr_2rem_2rem] items-center gap-1 px-2 py-1.5 text-xs {i > 0 ? 'border-t border-neutral-50' : ''}">
										<span class="truncate text-neutral-600">{fieldLabels[item] ?? item}</span>
										<input
											type="checkbox"
											class="mx-auto h-3.5 w-3.5 accent-neutral-900"
											checked={front.includes(`front${item}`)}
											onchange={() => toggleField(item, 'front')}
											aria-label={`${fieldLabels[item] ?? item} front`}
										/>
										<input
											type="checkbox"
											class="mx-auto h-3.5 w-3.5 accent-neutral-900"
											checked={back.includes(`back${item}`)}
											onchange={() => toggleField(item, 'back')}
											aria-label={`${fieldLabels[item] ?? item} back`}
										/>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Properties panel for selected element -->
				<div class="p-3">
					{#if !selectedElement}
						<p class="mt-4 text-center text-xs text-neutral-300">Click an element chip above or click directly in the card preview to select it.</p>
					{:else}
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<p class="font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-400">
									{ALL_ELEMENTS.find(e => e.id === selectedElement)?.label}
								</p>
								<!-- Visibility toggle (skip for 'card') -->
								{#if selectedElement !== 'card'}
									<button
										class="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] transition
											{isHidden(selectedElement) ? 'bg-neutral-200 text-neutral-500' : 'bg-neutral-900 text-white'}"
										onclick={() => toggleVisible(selectedElement!)}
									>
										{#if isHidden(selectedElement)}<EyeOff size={10} /> Hidden{:else}<Eye size={10} /> Visible{/if}
									</button>
								{/if}
							</div>

							<!-- Position (hr / control buttons) -->
							{#if canMove}
								<div>
									<p class="mb-1 text-xs font-medium">Position</p>
									<div class="inline-flex w-full overflow-hidden rounded-lg border border-neutral-200">
										<button class="flex flex-1 items-center justify-center gap-1 py-1.5 text-xs text-neutral-600 transition hover:bg-neutral-50"
											onclick={() => moveElement(selectedElement!, -1)}><ChevronUp size={14} /> Up</button>
										<button class="flex flex-1 items-center justify-center gap-1 py-1.5 text-xs text-neutral-600 transition hover:bg-neutral-50 border-l border-neutral-200"
											onclick={() => moveElement(selectedElement!, 1)}><ChevronDown size={14} /> Down</button>
									</div>
									<p class="mt-1 text-[10px] text-neutral-400">Moves the element up or down on the answer side.</p>
								</div>
							{/if}

							<!-- ── Card properties ── -->
							{#if selKind === 'card'}
								<div>
									<p class="mb-1 text-xs font-medium">Background</p>
									<div class="flex items-center gap-2">
										<input type="color" value={selStyle.backgroundColor ?? '#ffffff'}
											oninput={(e) => setStyle({ backgroundColor: (e.target as HTMLInputElement).value })}
											class="h-8 w-9 cursor-pointer rounded border border-neutral-200 p-0.5" />
										<div class="flex gap-1">
											{#each BG_PRESETS as p (p)}
												<button onclick={() => setStyle({ backgroundColor: p })}
													class="h-6 w-6 rounded border-2 transition {selStyle.backgroundColor === p ? 'border-neutral-900' : 'border-neutral-200'}"
													style:background={p} title={p} aria-label={p}></button>
											{/each}
										</div>
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Text color (whole card)</p>
									<div class="flex items-center gap-2">
										<input type="color" value={selStyle.color ?? '#000000'}
											oninput={(e) => setStyle({ color: (e.target as HTMLInputElement).value })}
											class="h-8 w-9 cursor-pointer rounded border border-neutral-200 p-0.5" />
										<button onclick={() => clearStyle('color')} class="text-[10px] text-neutral-400 hover:text-neutral-700">Reset</button>
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Padding</p>
									<UnitInput value={selStyle.padding ?? ''} placeholder="16"
										onchange={(v) => (v ? setStyle({ padding: v }) : clearStyle('padding'))} />
								</div>

							<!-- ── Hanzi properties ── -->
							{:else if selKind === 'hanzi'}
								<div>
									<p class="mb-1 text-xs font-medium">Size</p>
									<div class="inline-flex w-full overflow-hidden rounded-lg border border-neutral-200">
										{#each HANZI_SIZE_PRESETS as p (p.value)}
											<button class={segClass(selStyle.fontSize === p.value)}
												onclick={() => setStyle({ fontSize: p.value })}>{p.label}</button>
										{/each}
									</div>
									<div class="mt-1">
										<UnitInput value={selStyle.fontSize ?? ''} placeholder="custom"
											onchange={(v) => (v ? setStyle({ fontSize: v }) : clearStyle('fontSize'))} />
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Font</p>
									<div class="inline-flex w-full overflow-hidden rounded-lg border border-neutral-200">
										{#each FONT_OPTIONS as f (f.value)}
											<button class={segClass(selStyle.fontFamily === f.value || (!selStyle.fontFamily && f.value === 'default'))}
												onclick={() => setStyle({ fontFamily: f.value })}>{f.label}</button>
										{/each}
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Color</p>
									<div class="flex items-center gap-2">
										<input type="color" value={selStyle.color ?? '#000000'}
											oninput={(e) => setStyle({ color: (e.target as HTMLInputElement).value })}
											class="h-8 w-9 cursor-pointer rounded border border-neutral-200 p-0.5" />
										<button onclick={() => clearStyle('color')} class="text-[10px] text-neutral-400 hover:text-neutral-700">Reset</button>
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Weight</p>
									<div class="inline-flex w-full overflow-hidden rounded-lg border border-neutral-200">
										{#each [{ l:'Regular', v:'400' }, { l:'Semibold', v:'600' }, { l:'Bold', v:'700' }] as w (w.v)}
											<button class={segClass(selStyle.fontWeight === w.v)}
												onclick={() => setStyle({ fontWeight: w.v })}>{w.l}</button>
										{/each}
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Letter spacing</p>
									<input type="text" placeholder="e.g. 0.05em" value={selStyle.letterSpacing ?? ''}
										oninput={(e) => { const v = (e.target as HTMLInputElement).value; v ? setStyle({ letterSpacing: v }) : clearStyle('letterSpacing'); }}
										class="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs" />
								</div>

							<!-- ── Text properties ── -->
							{:else if selKind === 'text'}
								<div>
									<p class="mb-1 text-xs font-medium">Size</p>
									<div class="inline-flex w-full overflow-hidden rounded-lg border border-neutral-200">
										{#each TEXT_SIZE_PRESETS as p (p.value)}
											<button class={segClass(selStyle.fontSize === p.value)}
												onclick={() => setStyle({ fontSize: p.value })}>{p.label}</button>
										{/each}
									</div>
									<div class="mt-1">
										<UnitInput value={selStyle.fontSize ?? ''} placeholder="custom"
											onchange={(v) => (v ? setStyle({ fontSize: v }) : clearStyle('fontSize'))} />
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Color</p>
									<div class="flex items-center gap-2">
										<input type="color" value={selStyle.color ?? '#000000'}
											oninput={(e) => setStyle({ color: (e.target as HTMLInputElement).value })}
											class="h-8 w-9 cursor-pointer rounded border border-neutral-200 p-0.5" />
										<button onclick={() => clearStyle('color')} class="text-[10px] text-neutral-400 hover:text-neutral-700">Reset</button>
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Weight</p>
									<div class="inline-flex w-full overflow-hidden rounded-lg border border-neutral-200">
										{#each [{ l:'Regular', v:'400' }, { l:'Semibold', v:'600' }, { l:'Bold', v:'700' }] as w (w.v)}
											<button class={segClass(selStyle.fontWeight === w.v)}
												onclick={() => setStyle({ fontWeight: w.v })}>{w.l}</button>
										{/each}
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Line height</p>
									<input type="text" placeholder="e.g. 1.5" value={selStyle.lineHeight ?? ''}
										oninput={(e) => { const v = (e.target as HTMLInputElement).value; v ? setStyle({ lineHeight: v }) : clearStyle('lineHeight'); }}
										class="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs" />
								</div>
								{#if selectedElement === 'definitions'}
									<label class="flex items-center gap-2 text-xs">
										<input type="checkbox" class="h-3.5 w-3.5 accent-neutral-900" bind:checked={localT.collapseDict} /> Collapse dictionary
									</label>
								{/if}

							<!-- ── Chips (Part of Speech) ── -->
							{:else if selKind === 'chips'}
								<div>
									<p class="mb-1 text-xs font-medium">Chip color</p>
									<div class="flex items-center gap-2">
										<input type="color" value={selStyle.color ?? '#666666'}
											oninput={(e) => setStyle({ color: (e.target as HTMLInputElement).value })}
											class="h-8 w-9 cursor-pointer rounded border border-neutral-200 p-0.5" />
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Size</p>
									<div class="inline-flex w-full overflow-hidden rounded-lg border border-neutral-200">
										{#each TEXT_SIZE_PRESETS as p (p.value)}
											<button class={segClass(selStyle.fontSize === p.value)}
												onclick={() => setStyle({ fontSize: p.value })}>{p.label}</button>
										{/each}
									</div>
								</div>

							<!-- ── HR separator ── -->
							{:else if selKind === 'hr'}
								<div>
									<p class="mb-1 text-xs font-medium">Color</p>
									<div class="flex items-center gap-2">
										<input type="color" value={selStyle.borderColor ?? '#e5e7eb'}
											oninput={(e) => setStyle({ borderColor: (e.target as HTMLInputElement).value })}
											class="h-8 w-9 cursor-pointer rounded border border-neutral-200 p-0.5" />
										<button onclick={() => clearStyle('borderColor')} class="text-[10px] text-neutral-400 hover:text-neutral-700">Reset</button>
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Thickness</p>
									<div class="inline-flex w-full overflow-hidden rounded-lg border border-neutral-200">
										{#each [{ l:'Thin', v:'1px' }, { l:'Medium', v:'2px' }, { l:'Thick', v:'4px' }] as t (t.v)}
											<button class={segClass(selStyle.borderWidth === t.v)}
												onclick={() => setStyle({ borderWidth: t.v })}>{t.l}</button>
										{/each}
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Spacing (margin)</p>
									<UnitInput value={selStyle.marginTop ?? ''} placeholder="8"
										onchange={(v) => (v ? setStyle({ marginTop: v, marginBottom: v }) : (clearStyle('marginTop'), clearStyle('marginBottom')))} />
								</div>

							<!-- ── Button ── -->
							{:else if selKind === 'button'}
								<div>
									<p class="mb-1 text-xs font-medium">Background</p>
									<div class="flex items-center gap-2">
										<input type="color" value={selStyle.backgroundColor ?? '#5b6a9e'}
											oninput={(e) => setStyle({ backgroundColor: (e.target as HTMLInputElement).value })}
											class="h-8 w-9 cursor-pointer rounded border border-neutral-200 p-0.5" />
										<button onclick={() => clearStyle('backgroundColor')} class="text-[10px] text-neutral-400 hover:text-neutral-700">Reset</button>
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Size</p>
									<UnitInput value={selStyle.fontSize ?? ''} placeholder="size"
										onchange={(v) => (v ? setStyle({ fontSize: v }) : clearStyle('fontSize'))} />
								</div>
							{/if}

							<!-- Alignment — every non-card element; positions it within the card window -->
							{#if selectedElement !== 'card'}
								<div>
									<p class="mb-1 text-xs font-medium">Alignment (in card)</p>
									<div class="inline-flex w-full overflow-hidden rounded-lg border border-neutral-200">
										{#each [{ v: 'left', I: AlignLeft }, { v: 'center', I: AlignCenter }, { v: 'right', I: AlignRight }] as o (o.v)}
											<button class="flex flex-1 items-center justify-center py-1.5 transition {selStyle.textAlign === o.v ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:bg-neutral-50'}"
												onclick={() => setStyle({ textAlign: o.v as 'left'|'center'|'right' })} aria-label={`align ${o.v}`}><o.I size={14} /></button>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Spacing — available for all non-card elements -->
							{#if selectedElement !== 'card'}
								<div>
									<p class="mb-1 text-xs font-medium">Spacing above / below</p>
									<div class="grid grid-cols-2 gap-2">
										<div>
											<p class="mb-0.5 text-[10px] text-neutral-400">Above</p>
											<UnitInput value={selStyle.marginTop ?? ''} placeholder="top"
												onchange={(v) => (v ? setStyle({ marginTop: v }) : clearStyle('marginTop'))} />
										</div>
										<div>
											<p class="mb-0.5 text-[10px] text-neutral-400">Below</p>
											<UnitInput value={selStyle.marginBottom ?? ''} placeholder="bottom"
												onchange={(v) => (v ? setStyle({ marginBottom: v }) : clearStyle('marginBottom'))} />
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- ── Right: live interactive preview ─────────────── -->
			<div class="flex flex-1 flex-col items-center overflow-y-auto bg-neutral-100 p-6">
				<div class="mb-3 inline-flex items-center gap-1.5 rounded-full bg-neutral-200 px-3 py-1 text-[10px] text-neutral-500">
					{#if mobilePreview}<Smartphone size={11} /> Mobile — 375 px{:else}<Monitor size={11} /> Desktop{/if}
				</div>

				<div class="space-y-3 transition-all duration-300 {mobilePreview ? 'w-[375px]' : 'w-full max-w-lg'}">
					<CardPreview
						label="Front"
						side="front"
						items={frontItems}
						colorize={colorize}
						font={localT.font}
						collapseDict={localT.collapseDict}
						elementStyles={localES}
						toneColors={previewPalette}
						interactive={true}
						bind:selectedElement
					/>
					<CardPreview
						label="Back"
						side="back"
						items={backItems}
						colorize={colorize}
						font={localT.font}
						collapseDict={localT.collapseDict}
						elementStyles={localES}
						toneColors={previewPalette}
						interactive={true}
						bind:selectedElement
					/>
				</div>

				<p class="mt-4 max-w-sm text-center text-[11px] text-neutral-400">
					Click any element in the preview or use the element chips to select and style it.
					Changes mirror exactly in your Anki export.
				</p>
			</div>
		</div>

		<!-- Footer -->
		<div class="flex shrink-0 items-center justify-between border-t border-neutral-200 px-5 py-3">
			<button onclick={reset} class="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700">
				<RotateCcw size={13} /> Reset this card to defaults
			</button>
			<div class="flex items-center gap-2">
				<button onclick={cancel} class="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50">Cancel</button>
				<button onclick={save} class="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700">Save customisation</button>
			</div>
		</div>
	</div>
</div>
