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
	import { cx } from '$lib/ui';
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
	const TILE: Record<string, { label: string; blurb: string; icon: Component<{ class?: string }> }> = {
		standard: { label: 'Standard', blurb: 'Word → every reading and meaning', icon: Layers },
		beginner: { label: 'Beginner', blurb: 'Word → pinyin and meaning', icon: Eye },
		writing: { label: 'Writing', blurb: 'Meaning → write the character', icon: PencilLine },
		reading: { label: 'Reading', blurb: 'Hanzi + pinyin → meaning', icon: BookOpen },
		examples: { label: 'Sentences', blurb: 'Word → meaning + example sentences', icon: MessageSquareText },
		hsk: { label: 'HSK Exam', blurb: 'Everything: readings, parts, level', icon: Award }
	};
</script>

<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
	{#each STYLE_PRESETS as preset (preset.id)}
		{@const t = TILE[preset.id] ?? { label: preset.name, blurb: preset.description, icon: Layers }}
		{@const on = preset.id === selected}
		<button
			type="button"
			aria-pressed={on}
			onclick={() => onpick(preset)}
			class={cx(
				'flex cursor-pointer items-start gap-3 rounded-[20px] border-0 bg-surface p-4 text-left transition-[transform,box-shadow] duration-[400ms] ease-spring focus-visible:outline-3 focus-visible:outline-accent',
				on
					? 'shadow-[0_0_0_2px_var(--xhz-accent),var(--xhz-shadow-raised)] motion-safe:animate-[xhz-pop_0.35s_var(--ease-spring)]'
					: 'shadow-object hover:-translate-y-0.5 hover:shadow-raised active:scale-[0.98]'
			)}
		>
			<span
				class={cx(
					'grid size-10 shrink-0 place-items-center rounded-xl transition-colors [&_svg]:size-5',
					on ? 'bg-accent text-on-accent' : 'bg-sunk text-ink'
				)}
				aria-hidden="true"><t.icon /></span
			>
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
