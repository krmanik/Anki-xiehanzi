<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { TONE_PRESETS, TONE_KEYS } from '$lib/tonePresets';
	import { CARD_THEME_GROUPS } from '$lib/cardThemes';
	import PickerModal from '$lib/components/PickerModal.svelte';
	import type { TemplateOpts } from '$lib/deck';

	let {
		template = $bindable(),
		palette,
		examplesUsed,
		open = $bindable(true),
		loadingPreview = false,
		onpreview
	}: {
		template: TemplateOpts;
		palette: Record<string, string>;
		examplesUsed: boolean;
		open?: boolean;
		loadingPreview?: boolean;
		onpreview: () => void;
	} = $props();

	let showThemePicker = $state(false);
	let showPalettePicker = $state(false);

	// Currently-selected theme group (undefined = None).
	const currentTheme = $derived(CARD_THEME_GROUPS.find((g) => g.id === template.cardTheme));
	// Label for the currently-selected tone palette trigger.
	const currentPaletteLabel = $derived(
		template.tonePreset === 'custom'
			? 'Custom'
			: (TONE_PRESETS.find((p) => p.id === template.tonePreset)?.label ?? 'Standard')
	);
</script>

<div class="mt-6 flex items-center gap-2 border-b border-line pb-2">
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		class="flex flex-1 items-center gap-2 text-left"
	>
		<ChevronDown size={18} class="text-muted transition {open ? '' : '-rotate-90'}" />
		<span class="text-xl font-semibold">Customize appearance</span>
		<span class="text-sm font-normal text-muted">tone colors, font, definitions — optional</span>
	</button>
	<button
		type="button"
		onclick={onpreview}
		disabled={loadingPreview}
		class="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted transition hover:border-accent hover:text-ink disabled:opacity-40"
	>
		{loadingPreview ? 'Loading…' : 'Preview'}
	</button>
</div>

{#if open}
<div class="mt-4 grid gap-3">

	<!-- Theme -->
	<div class="rounded-lg border border-line bg-sunk p-4">
		<div class="mb-3 flex items-center gap-3">
			<p class="text-[13px] text-muted font-semibold">Card Theme</p>
			{#if template.cardTheme}
				<div class="ml-auto inline-flex overflow-hidden rounded-lg border border-line">
					{#each (['auto', 'light', 'dark'] as const) as m}
						<button
							class="px-3 py-1.5 text-sm capitalize transition {template.cardThemeMode === m ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink'}"
							onclick={() => (template.cardThemeMode = m)}
						>{m}</button>
					{/each}
				</div>
			{/if}
		</div>
		<button
			type="button"
			onclick={() => (showThemePicker = true)}
			class="flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm transition hover:border-accent"
		>
			{#if currentTheme}
				<span class="relative flex h-5 w-5 shrink-0 overflow-hidden rounded-full border border-line">
					<span class="absolute inset-0 w-1/2" style="background:{currentTheme.swatch[0]}"></span>
					<span class="absolute inset-0 left-1/2" style="background:{currentTheme.swatch[1]}"></span>
				</span>
				<span class="font-medium text-ink">{currentTheme.label}</span>
			{:else}
				<span class="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-[13px] text-muted">–</span>
				<span class="font-medium text-ink">No theme</span>
			{/if}
			<ChevronDown size={16} class="ml-auto -rotate-90 text-muted" />
		</button>
	</div>

	{#if showThemePicker}
		<PickerModal
			title="Card theme"
			subtitle="Sets colors, type and layout for every card."
			onclose={() => (showThemePicker = false)}
		>
			<div class="grid gap-2 sm:grid-cols-2">
				<button
					class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition {!template.cardTheme ? 'border-accent ring-1 ring-accent' : 'border-line hover:border-accent'}"
					onclick={() => {
						template.cardTheme = '';
						showThemePicker = false;
					}}
				>
					<span class="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-[13px] text-muted">–</span>
					None
				</button>
				{#each CARD_THEME_GROUPS as g (g.id)}
					<button
						class="flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition {template.cardTheme === g.id ? 'border-accent ring-1 ring-accent' : 'border-line hover:border-accent'}"
						onclick={() => {
							template.cardTheme = g.id;
							showThemePicker = false;
						}}
					>
						<span class="relative flex h-5 w-5 shrink-0 overflow-hidden rounded-full border border-line">
							<span class="absolute inset-0 w-1/2" style="background:{g.swatch[0]}"></span>
							<span class="absolute inset-0 left-1/2" style="background:{g.swatch[1]}"></span>
						</span>
						<span>
							<span class="block font-medium text-ink">{g.label}</span>
							<span class="block text-[13px] leading-snug text-muted">{g.description}</span>
						</span>
					</button>
				{/each}
			</div>
		</PickerModal>
	{/if}

	<!-- Colors -->
	<div class="rounded-lg border border-line bg-sunk p-4">
		<p class="mb-3 text-[13px] text-muted font-semibold">Colors</p>
		<div class="inline-flex overflow-hidden rounded-lg border border-line">
			<button
				class="px-3 py-1.5 text-sm transition {!template.mono ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink'}"
				onclick={() => (template.mono = false)}>Tone colors</button>
			<button
				class="px-3 py-1.5 text-sm transition {template.mono ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink'}"
				onclick={() => (template.mono = true)}>Black & white</button>
		</div>

		{#if !template.mono}
			<div class="mt-3 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-x-6">
				<span class="text-sm font-medium text-muted">Palette</span>
				<button
					type="button"
					onclick={() => (showPalettePicker = true)}
					class="flex w-fit items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm transition hover:border-accent"
				>
					<span class="flex gap-0.5">
						{#each TONE_KEYS as k (k)}
							<span class="h-4 w-4 rounded-sm" style="background-color:{palette[k]}" title={`Tone ${k}`}></span>
						{/each}
					</span>
					<span class="font-medium text-ink">{currentPaletteLabel}</span>
					<ChevronDown size={14} class="-rotate-90 text-muted" />
				</button>

				<span class="text-sm font-medium text-muted">Apply to</span>
				<div class="flex flex-wrap items-center gap-x-5 gap-y-2">
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" class="h-4 w-4 accent-accent" bind:checked={template.colorHanzi} /> Hanzi
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" class="h-4 w-4 accent-accent" bind:checked={template.colorPinyin} /> Pinyin
					</label>
				</div>

				{#if template.tonePreset === 'custom'}
					<span class="self-start pt-1.5 text-sm font-medium text-muted">Custom colors</span>
					<div class="flex flex-wrap items-center gap-3">
						{#each TONE_KEYS as k (k)}
							<label class="flex items-center gap-1 text-xs text-muted">
								Tone {k}
								<input type="color" bind:value={template.toneColors[k]} class="h-7 w-8 cursor-pointer rounded border border-line p-0.5" />
							</label>
						{/each}
					</div>
				{/if}
			</div>

			{#if showPalettePicker}
				<PickerModal
					title="Tone color palette"
					subtitle="Colors for the five Mandarin tones."
					onclose={() => (showPalettePicker = false)}
				>
					<div class="grid gap-2">
						{#each TONE_PRESETS as p (p.id)}
							<button
								class="flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition {template.tonePreset === p.id ? 'border-accent ring-1 ring-accent' : 'border-line hover:border-accent'}"
								onclick={() => {
									template.tonePreset = p.id;
									showPalettePicker = false;
								}}
							>
								<span class="flex gap-0.5">
									{#each TONE_KEYS as k (k)}
										<span class="h-4 w-4 rounded-sm" style="background-color:{p.colors[k]}"></span>
									{/each}
								</span>
								<span class="font-medium text-ink">{p.label}</span>
							</button>
						{/each}
						<button
							class="flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition {template.tonePreset === 'custom' ? 'border-accent ring-1 ring-accent' : 'border-line hover:border-accent'}"
							onclick={() => {
								template.tonePreset = 'custom';
								showPalettePicker = false;
							}}
						>
							<span class="flex gap-0.5">
								{#each TONE_KEYS as k (k)}
									<span class="h-4 w-4 rounded-sm" style="background-color:{template.toneColors[k]}"></span>
								{/each}
							</span>
							<span class="font-medium text-ink">Custom…</span>
						</button>
					</div>
				</PickerModal>
			{/if}
		{/if}
	</div>

	<!-- Typography & Display -->
	<div class="rounded-lg border border-line bg-sunk p-4">
		<p class="mb-3 text-[13px] text-muted font-semibold">Typography & Display</p>
		<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
			<label class="flex items-center gap-2 text-sm">
				Hanzi font
				<select bind:value={template.font} class="min-w-[10rem] rounded-lg border border-line px-2 py-1.5 text-sm">
					<option value="default">Default (sans)</option>
					<option value="kaiti">Kaiti 楷体</option>
					<option value="songti">Songti 宋体</option>
				</select>
			</label>
			<label class="flex items-center gap-2 text-sm" title="Multi-reading characters show only their most common reading (the one with the longest definition)">
				<input type="checkbox" class="h-4 w-4 accent-accent" bind:checked={template.commonPinyinOnly} /> Most common pinyin only
			</label>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" class="h-4 w-4 accent-accent" bind:checked={template.collapseDict} /> Collapse dictionary definitions
			</label>
		</div>
	</div>

	<!-- Example Sentences (conditional) -->
	{#if examplesUsed}
		<div class="rounded-lg border border-line bg-sunk p-4">
			<p class="mb-3 text-[13px] text-muted font-semibold">Example Sentences</p>
			<div class="flex flex-wrap items-end gap-4">
				<label class="flex flex-col gap-1 text-xs text-muted">
					How many
					<input type="number" min="1" max="10" bind:value={template.exampleOptions.count}
						class="w-20 rounded-lg border border-line px-2 py-1.5 text-sm" />
				</label>
				<label class="flex flex-col gap-1 text-xs text-muted">
					Min length (chars)
					<input type="number" min="1" max="50" bind:value={template.exampleOptions.minChars}
						class="w-24 rounded-lg border border-line px-2 py-1.5 text-sm" />
				</label>
				<label class="flex flex-col gap-1 text-xs text-muted">
					Max length (chars)
					<input type="number" min="1" max="80" bind:value={template.exampleOptions.maxChars}
						class="w-24 rounded-lg border border-line px-2 py-1.5 text-sm" />
				</label>
			</div>
			<div class="mt-3 border-t border-line pt-3">
				<p class="mb-2 text-[13px] text-muted">Show</p>
				<div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
					<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-accent" bind:checked={template.exampleOptions.showSimplified} /> Simplified</label>
					<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-accent" bind:checked={template.exampleOptions.showTraditional} /> Traditional</label>
					<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-accent" bind:checked={template.exampleOptions.showPinyin} /> Pinyin</label>
					<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-accent" bind:checked={template.exampleOptions.showTranslation} /> Translation</label>
				</div>
			</div>
			{#if !template.mono}
				<div class="mt-3 border-t border-line pt-3">
					<p class="mb-2 text-[13px] text-muted">Colorize</p>
					<div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
						<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-accent" bind:checked={template.exampleOptions.colorizeHanzi} /> Hanzi</label>
						<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-accent" bind:checked={template.exampleOptions.colorizePinyin} /> Pinyin</label>
					</div>
				</div>
			{/if}
			<p class="mt-3 border-t border-line pt-3 text-[13px] text-muted">Examples show as a collapsible card (tap the bar to expand), like Definitions.</p>
		</div>
	{/if}

</div>
{/if}
