<script lang="ts">
	import { btnPrimary, btnSecondary } from '$lib/buttonStyles';
	import type { CardPreset } from '$lib/cardPresets';

	let {
		preset,
		activeTabName,
		replaceLabel,
		onreplace,
		onadd,
		oncancel
	}: {
		preset: CardPreset;
		activeTabName: string;
		/** Overrides `Replace "<tab>"` (the create page's tiles replace every card type). */
		replaceLabel?: string;
		onreplace: () => void;
		onadd: () => void;
		oncancel: () => void;
	} = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-[2px] p-4">
	<div class="flex w-full max-w-sm flex-col rounded-panel bg-surface shadow-raised">
		<div class="border-b border-line px-4 py-3">
			<h3 class="font-semibold text-ink">{preset.name}</h3>
			<p class="mt-0.5 text-xs text-muted">{preset.description}</p>
		</div>
		<div class="px-4 py-4">
			<p class="text-sm text-muted">Replace the current card type or add as a new one?</p>
		</div>
		<div class="flex gap-2 border-t border-line px-4 py-3">
			<button class={btnPrimary} onclick={onreplace}>
				{replaceLabel ?? `Replace "${activeTabName}"`}
			</button>
			<button class={btnSecondary} onclick={onadd}>Add new</button>
			<button class="ml-auto text-xs text-muted hover:text-ink" onclick={oncancel}>
				Cancel
			</button>
		</div>
	</div>
</div>
