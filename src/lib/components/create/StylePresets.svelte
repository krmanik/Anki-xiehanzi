<!--
  "How do you want to study them?" — one tile per ready-made card. The tile
  that matches the deck is lit; none is once the reader has edited fields
  under Advanced.
-->
<script lang="ts">
	import type { Component } from 'svelte';
	import Layers from '@lucide/svelte/icons/layers';
	import Eye from '@lucide/svelte/icons/eye';
	import PencilLine from '@lucide/svelte/icons/pencil-line';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import MessageSquareText from '@lucide/svelte/icons/message-square-text';
	import Award from '@lucide/svelte/icons/award';
	import { IconDot, type Hue } from '$lib/ui';
	import { STYLE_PRESETS, type CardPreset } from '$lib/cardPresets';

	let {
		selected,
		onpick
	}: {
		/** Id of the preset the deck matches, or null for a custom card. */
		selected: string | null;
		onpick: (preset: CardPreset) => void;
	} = $props();

	// Shorter than the presets' own descriptions, which the Advanced picker keeps.
	const TILE: Record<string, { label: string; blurb: string; icon: Component<{ class?: string }>; hue: Hue }> = {
		standard: { label: 'Standard', blurb: 'Word → every reading and meaning', icon: Layers, hue: 'sky' },
		beginner: { label: 'Beginner', blurb: 'Word → pinyin, meaning, audio', icon: Eye, hue: 'mint' },
		writing: { label: 'Writing', blurb: 'Meaning → write the character', icon: PencilLine, hue: 'rose' },
		reading: { label: 'Reading', blurb: 'Hanzi + pinyin → meaning', icon: BookOpen, hue: 'apricot' },
		examples: { label: 'Sentences', blurb: 'Word → meaning + example sentences', icon: MessageSquareText, hue: 'lavender' },
		hsk: { label: 'HSK Exam', blurb: 'Everything: readings, parts, level', icon: Award, hue: 'sky' }
	};
</script>

<div class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
	{#each STYLE_PRESETS as preset (preset.id)}
		{@const t = TILE[preset.id] ?? { label: preset.name, blurb: preset.description, icon: Layers, hue: 'sky' as Hue }}
		{@const on = preset.id === selected}
		<button
			type="button"
			aria-pressed={on}
			onclick={() => onpick(preset)}
			class="flex items-start gap-3 rounded-card border-0 p-3.5 text-left transition-colors focus-visible:outline-3 focus-visible:outline-sky {on
				? 'bg-sky-soft ring-2 ring-sky-ink ring-inset'
				: 'bg-sunk hover:bg-line'}"
		>
			<IconDot hue={t.hue}><t.icon /></IconDot>
			<span class="min-w-0">
				<span class="block text-base font-semibold text-ink">{t.label}</span>
				<span class="block text-[13.5px] leading-snug text-muted">{t.blurb}</span>
			</span>
		</button>
	{/each}
</div>
{#if !selected}
	<p class="mt-2 mb-0 text-[13.5px] text-muted">Custom card — pick a tile to start over.</p>
{/if}
