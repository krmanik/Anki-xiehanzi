<script lang="ts">
	import {
		CARD_STYLE_LS_KEY,
		DEFAULT_TEMPLATE,
		type CardElementId,
		type ElementStyle,
		type TemplateOpts
	} from '$lib/deck';
	import CardPreview from './CardPreview.svelte';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import X from '@lucide/svelte/icons/x';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import AlignLeft from '@lucide/svelte/icons/align-left';
	import AlignCenter from '@lucide/svelte/icons/align-center';
	import AlignRight from '@lucide/svelte/icons/align-right';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';

	let {
		template = $bindable<TemplateOpts>(),
		frontItems,
		backItems,
		onclose
	}: {
		template: TemplateOpts;
		frontItems: string[];
		backItems: string[];
		onclose?: () => void;
	} = $props();

	// Work on a local copy; Cancel discards, Save commits.
	let local = $state<TemplateOpts>(JSON.parse(JSON.stringify(template)));
	let mobilePreview = $state(false);
	let selectedElement = $state<CardElementId | null>(null);

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

	// ── Per-element helpers ───────────────────────────────────────────────────

	function getStyle(): ElementStyle {
		if (!selectedElement) return {};
		return local.elementStyles[selectedElement] ?? {};
	}

	function setStyle(patch: Partial<ElementStyle>) {
		if (!selectedElement) return;
		local = {
			...local,
			elementStyles: {
				...local.elementStyles,
				[selectedElement]: { ...(local.elementStyles[selectedElement] ?? {}), ...patch }
			}
		};
	}

	function clearStyle(key: keyof ElementStyle) {
		if (!selectedElement) return;
		const current = { ...(local.elementStyles[selectedElement] ?? {}) };
		delete current[key];
		local = {
			...local,
			elementStyles: { ...local.elementStyles, [selectedElement]: current }
		};
	}

	function isHidden(id: CardElementId): boolean {
		return local.elementStyles[id]?.visible === false;
	}

	function toggleVisible(id: CardElementId) {
		const current = local.elementStyles[id]?.visible;
		setStyleFor(id, { visible: current === false ? true : false });
	}

	function setStyleFor(id: CardElementId, patch: Partial<ElementStyle>) {
		local = {
			...local,
			elementStyles: {
				...local.elementStyles,
				[id]: { ...(local.elementStyles[id] ?? {}), ...patch }
			}
		};
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
		audio:          'button',
		hr:             'hr',
		controlButtons: 'button'
	};

	const selKind = $derived(selectedElement ? EL_KIND[selectedElement] : null);
	const selStyle = $derived(getStyle());
	const colorize = $derived(!local.mono && local.colorHanzi);

	// ── Segmented button helper ───────────────────────────────────────────────

	function segClass(active: boolean) {
		return (
			'flex-1 py-1 text-xs transition ' +
			(active ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50')
		);
	}

	// ── Save / Cancel / Reset ─────────────────────────────────────────────────

	function save() {
		template = JSON.parse(JSON.stringify(local));
		try { localStorage.setItem(CARD_STYLE_LS_KEY, JSON.stringify(template)); } catch (_) {}
		onclose?.();
	}

	function cancel() { onclose?.(); }
	function reset() { local = { ...DEFAULT_TEMPLATE, elementStyles: {} }; selectedElement = null; }
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
				<h2 class="text-base font-semibold text-neutral-900">Card Customiser</h2>
				<p class="text-xs text-neutral-400">Click any element in the preview to customise it. Mirrors exactly in the Anki export.</p>
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

		<!-- Body -->
		<div class="flex min-h-0 flex-1 overflow-hidden">

			<!-- ── Left: element list + properties ─────────────── -->
			<div class="flex w-64 shrink-0 flex-col overflow-hidden border-r border-neutral-200 xl:w-72">

				<!-- Global tone settings -->
				<div class="border-b border-neutral-100 p-3">
					<p class="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-400">Global</p>
					<div class="mb-2 inline-flex w-full overflow-hidden rounded-lg border border-neutral-200">
						<button class={segClass(!local.mono)} onclick={() => (local = { ...local, mono: false })}>Tone colors</button>
						<button class={segClass(local.mono)} onclick={() => (local = { ...local, mono: true })}>Black &amp; white</button>
					</div>
					<label class="mb-1 flex items-center gap-2 text-xs {local.mono ? 'opacity-40' : ''}">
						<input type="checkbox" class="h-3.5 w-3.5 accent-neutral-900" bind:checked={local.colorHanzi} disabled={local.mono} /> Color hanzi
					</label>
					<label class="flex items-center gap-2 text-xs {local.mono ? 'opacity-40' : ''}">
						<input type="checkbox" class="h-3.5 w-3.5 accent-neutral-900" bind:checked={local.colorPinyin} disabled={local.mono} /> Color pinyin
					</label>
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

				<!-- Properties panel for selected element -->
				<div class="flex-1 overflow-y-auto p-3">
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
													style:background={p} title={p}></button>
											{/each}
										</div>
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Text alignment</p>
									<div class="inline-flex w-full overflow-hidden rounded-lg border border-neutral-200">
										{#each [{ v: 'left', I: AlignLeft }, { v: 'center', I: AlignCenter }, { v: 'right', I: AlignRight }] as o (o.v)}
											<button class="flex flex-1 items-center justify-center py-1.5 transition {selStyle.textAlign === o.v ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:bg-neutral-50'}"
												onclick={() => setStyle({ textAlign: o.v as 'left'|'center'|'right' })}><o.I size={14} /></button>
										{/each}
									</div>
								</div>
								<div>
									<p class="mb-1 text-xs font-medium">Padding</p>
									<input type="text" placeholder="e.g. 16px or 1rem" value={selStyle.padding ?? ''}
										oninput={(e) => { const v = (e.target as HTMLInputElement).value; v ? setStyle({ padding: v }) : clearStyle('padding'); }}
										class="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs" />
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
									<input type="text" placeholder="custom e.g. 3em" value={selStyle.fontSize ?? ''}
										oninput={(e) => { const v = (e.target as HTMLInputElement).value; v ? setStyle({ fontSize: v }) : clearStyle('fontSize'); }}
										class="mt-1 w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs" />
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
									<input type="text" placeholder="custom e.g. 14px" value={selStyle.fontSize ?? ''}
										oninput={(e) => { const v = (e.target as HTMLInputElement).value; v ? setStyle({ fontSize: v }) : clearStyle('fontSize'); }}
										class="mt-1 w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs" />
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
									<p class="mb-1 text-xs font-medium">Alignment</p>
									<div class="inline-flex w-full overflow-hidden rounded-lg border border-neutral-200">
										{#each [{ v: 'left', I: AlignLeft }, { v: 'center', I: AlignCenter }, { v: 'right', I: AlignRight }] as o (o.v)}
											<button class="flex flex-1 items-center justify-center py-1.5 transition {selStyle.textAlign === o.v ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:bg-neutral-50'}"
												onclick={() => setStyle({ textAlign: o.v as 'left'|'center'|'right' })}><o.I size={14} /></button>
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
										<input type="checkbox" class="h-3.5 w-3.5 accent-neutral-900" bind:checked={local.collapseDict} /> Collapse dictionary
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
									<input type="text" placeholder="e.g. 8px or 0.5rem" value={selStyle.marginTop ?? ''}
										oninput={(e) => { const v = (e.target as HTMLInputElement).value; v ? setStyle({ marginTop: v, marginBottom: v }) : (clearStyle('marginTop'), clearStyle('marginBottom')); }}
										class="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs" />
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
									<input type="text" placeholder="e.g. 0.875em" value={selStyle.fontSize ?? ''}
										oninput={(e) => { const v = (e.target as HTMLInputElement).value; v ? setStyle({ fontSize: v }) : clearStyle('fontSize'); }}
										class="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs" />
								</div>
							{/if}

							<!-- Spacing — available for all non-card elements -->
							{#if selectedElement !== 'card'}
								<div>
									<p class="mb-1 text-xs font-medium">Spacing above / below</p>
									<div class="flex gap-1">
										<input type="text" placeholder="top" value={selStyle.marginTop ?? ''}
											oninput={(e) => { const v = (e.target as HTMLInputElement).value; v ? setStyle({ marginTop: v }) : clearStyle('marginTop'); }}
											class="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs" />
										<input type="text" placeholder="bottom" value={selStyle.marginBottom ?? ''}
											oninput={(e) => { const v = (e.target as HTMLInputElement).value; v ? setStyle({ marginBottom: v }) : clearStyle('marginBottom'); }}
											class="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs" />
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
						items={frontItems}
						colorize={colorize}
						font={local.font}
						collapseDict={local.collapseDict}
						elementStyles={local.elementStyles}
						interactive={true}
						bind:selectedElement
					/>
					<CardPreview
						label="Back"
						items={backItems}
						colorize={colorize}
						font={local.font}
						collapseDict={local.collapseDict}
						elementStyles={local.elementStyles}
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
				<RotateCcw size={13} /> Reset all to defaults
			</button>
			<div class="flex items-center gap-2">
				<button onclick={cancel} class="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50">Cancel</button>
				<button onclick={save} class="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700">Save customisation</button>
			</div>
		</div>
	</div>
</div>
