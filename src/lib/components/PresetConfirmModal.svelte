<script lang="ts">
	import { btnPrimary, btnSecondary } from '$lib/buttonStyles';
	import type { CardPreset } from '$lib/cardPresets';

	let {
		preset,
		activeTabName,
		onreplace,
		onadd,
		oncancel
	}: {
		preset: CardPreset;
		activeTabName: string;
		onreplace: () => void;
		onadd: () => void;
		oncancel: () => void;
	} = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
	<div class="flex w-full max-w-sm flex-col rounded-xl bg-white shadow-2xl">
		<div class="border-b border-neutral-200 px-4 py-3">
			<h3 class="font-semibold text-neutral-900">{preset.name}</h3>
			<p class="mt-0.5 text-xs text-neutral-500">{preset.description}</p>
		</div>
		<div class="px-4 py-4">
			<p class="text-sm text-neutral-700">Replace the current card type or add as a new one?</p>
		</div>
		<div class="flex gap-2 border-t border-neutral-200 px-4 py-3">
			<button class={btnPrimary} onclick={onreplace}>
				Replace "{activeTabName}"
			</button>
			<button class={btnSecondary} onclick={onadd}>Add new</button>
			<button class="ml-auto text-xs text-neutral-500 hover:text-neutral-900" onclick={oncancel}>
				Cancel
			</button>
		</div>
	</div>
</div>
