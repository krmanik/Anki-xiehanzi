<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { TONE_PRESETS, TONE_KEYS } from '$lib/tonePresets';
	import { CARD_THEME_GROUPS } from '$lib/cardThemes';
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
</script>

<div class="mt-6 flex items-center gap-2 border-b border-neutral-200 pb-2">
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		class="flex flex-1 items-center gap-2 text-left"
	>
		<ChevronDown size={18} class="text-neutral-400 transition {open ? '' : '-rotate-90'}" />
		<span class="text-xl font-semibold">Customize appearance</span>
		<span class="text-sm font-normal text-neutral-400">tone colors, font, definitions — optional</span>
	</button>
	<button
		type="button"
		onclick={onpreview}
		disabled={loadingPreview}
		class="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-40"
	>
		{loadingPreview ? 'Loading…' : 'Preview'}
	</button>
</div>

{#if open}
<div class="mt-4 grid gap-3">

	<!-- Theme -->
	<div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
		<div class="mb-3 flex items-center gap-3">
			<p class="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">Card Theme</p>
			{#if template.cardTheme}
				<div class="ml-auto inline-flex overflow-hidden rounded-lg border border-neutral-300">
					{#each (['auto', 'light', 'dark'] as const) as m}
						<button
							class="px-3 py-1.5 text-sm capitalize transition {template.cardThemeMode === m ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'}"
							onclick={() => (template.cardThemeMode = m)}
						>{m}</button>
					{/each}
				</div>
			{/if}
		</div>
		<div class="flex flex-wrap gap-2">
			<button
				class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition {!template.cardTheme ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}"
				onclick={() => (template.cardTheme = '')}
			>
				<span class="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 bg-white text-[9px] text-neutral-400">–</span>
				None
			</button>
			{#each CARD_THEME_GROUPS as g (g.id)}
				<button
					class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition {template.cardTheme === g.id ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200 hover:border-neutral-400'}"
					onclick={() => (template.cardTheme = g.id)}
					title={g.description}
				>
					<span class="relative flex h-5 w-5 shrink-0 overflow-hidden rounded-full border border-neutral-200">
						<span class="absolute inset-0 w-1/2" style="background:{g.swatch[0]}"></span>
						<span class="absolute inset-0 left-1/2" style="background:{g.swatch[1]}"></span>
					</span>
					{g.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Colors -->
	<div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
		<p class="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">Colors</p>
		<div class="inline-flex overflow-hidden rounded-lg border border-neutral-300">
			<button
				class="px-3 py-1.5 text-sm transition {!template.mono ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'}"
				onclick={() => (template.mono = false)}>Tone colors</button>
			<button
				class="px-3 py-1.5 text-sm transition {template.mono ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'}"
				onclick={() => (template.mono = true)}>Black & white</button>
		</div>

		{#if !template.mono}
			<div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.colorHanzi} /> Color hanzi
				</label>
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.colorPinyin} /> Color pinyin
				</label>
				<label class="flex items-center gap-2 text-sm">
					Palette
					<select bind:value={template.tonePreset} class="min-w-[9rem] rounded-lg border border-neutral-300 px-2 py-1.5 text-sm">
						{#each TONE_PRESETS as p (p.id)}
							<option value={p.id}>{p.label}</option>
						{/each}
						<option value="custom">Custom…</option>
					</select>
				</label>
			</div>
			<div class="mt-3 flex flex-wrap items-center gap-4">
				<div class="flex items-center gap-1.5">
					<span class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Tones</span>
					{#each TONE_KEYS as k (k)}
						<span
							class="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold text-white"
							style="background-color:{palette[k]}"
							title={`Tone ${k}`}>{k}</span>
					{/each}
				</div>
				{#if template.tonePreset === 'custom'}
					<div class="flex flex-wrap items-center gap-3">
						{#each TONE_KEYS as k (k)}
							<label class="flex items-center gap-1 text-xs text-neutral-600">
								Tone {k}
								<input type="color" bind:value={template.toneColors[k]} class="h-7 w-8 cursor-pointer rounded border border-neutral-200 p-0.5" />
							</label>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Typography & Display -->
	<div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
		<p class="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">Typography & Display</p>
		<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
			<label class="flex items-center gap-2 text-sm">
				Hanzi font
				<select bind:value={template.font} class="min-w-[10rem] rounded-lg border border-neutral-300 px-2 py-1.5 text-sm">
					<option value="default">Default (sans)</option>
					<option value="kaiti">Kaiti 楷体</option>
					<option value="songti">Songti 宋体</option>
				</select>
			</label>
			<label class="flex items-center gap-2 text-sm" title="Multi-reading characters show only their most common reading (the one with the longest definition)">
				<input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.commonPinyinOnly} /> Most common pinyin only
			</label>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.collapseDict} /> Collapse dictionary definitions
			</label>
		</div>
	</div>

	<!-- Example Sentences (conditional) -->
	{#if examplesUsed}
		<div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
			<p class="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">Example Sentences</p>
			<div class="flex flex-wrap items-end gap-4">
				<label class="flex flex-col gap-1 text-xs text-neutral-600">
					How many
					<input type="number" min="1" max="10" bind:value={template.exampleOptions.count}
						class="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
				</label>
				<label class="flex flex-col gap-1 text-xs text-neutral-600">
					Min length (chars)
					<input type="number" min="1" max="50" bind:value={template.exampleOptions.minChars}
						class="w-24 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
				</label>
				<label class="flex flex-col gap-1 text-xs text-neutral-600">
					Max length (chars)
					<input type="number" min="1" max="80" bind:value={template.exampleOptions.maxChars}
						class="w-24 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
				</label>
			</div>
			<div class="mt-3 border-t border-neutral-200 pt-3">
				<p class="mb-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">Show</p>
				<div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
					<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.exampleOptions.showSimplified} /> Simplified</label>
					<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.exampleOptions.showTraditional} /> Traditional</label>
					<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.exampleOptions.showPinyin} /> Pinyin</label>
					<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.exampleOptions.showTranslation} /> Translation</label>
				</div>
			</div>
			{#if !template.mono}
				<div class="mt-3 border-t border-neutral-200 pt-3">
					<p class="mb-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">Colorize</p>
					<div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
						<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.exampleOptions.colorizeHanzi} /> Hanzi</label>
						<label class="flex items-center gap-1.5"><input type="checkbox" class="h-4 w-4 accent-neutral-900" bind:checked={template.exampleOptions.colorizePinyin} /> Pinyin</label>
					</div>
				</div>
			{/if}
			<p class="mt-3 border-t border-neutral-200 pt-3 text-[11px] text-neutral-400">Examples show as a collapsible card (tap the bar to expand), like Definitions.</p>
		</div>
	{/if}

</div>
{/if}
