<script lang="ts">
	import { productivityBand, radicalTone, type Radical } from '$lib/radicals';

	let {
		radical,
		colorize = true,
		selected = false,
		onSelect
	}: {
		radical: Radical;
		colorize?: boolean;
		selected?: boolean;
		onSelect?: () => void;
	} = $props();

	const tone = $derived(radicalTone(radical.pinyin));
	const band = $derived(productivityBand(radical.frequency));
</script>

<button
	type="button"
	onclick={onSelect}
	aria-pressed={selected}
	class="group relative flex flex-col items-center rounded-card px-3 py-3.5 text-center transition focus-visible:outline-3 focus-visible:outline-sky {selected
		? 'bg-sky-soft ring-2 ring-sky ring-inset'
		: 'bg-surface ring-1 ring-line ring-inset hover:bg-sunk'}"
>
	<span class="absolute left-2 top-1.5 text-xs text-muted tabular-nums">{radical.number}</span>
	<span class="absolute right-2 top-1.5 text-xs text-muted tabular-nums">{radical.strokes}</span>

	<span class="mt-2 text-4xl leading-none {colorize ? `tone${tone}` : ''}" lang="zh-Hans">
		{radical.char}
	</span>

	{#if radical.variants.length}
		<span class="mt-1 text-sm leading-none text-muted" lang="zh-Hans">
			{radical.variants.join(' ')}
		</span>
	{/if}

	<span class="mt-2 text-sm font-medium {colorize ? `tone${tone}` : ''}">{radical.pinyin}</span>
	<span class="mt-0.5 line-clamp-2 text-xs text-muted">{radical.meaning}</span>

	{#if band}
		<span class="mt-1.5 text-xs text-muted tabular-nums">
			{radical.frequency}
		</span>
	{/if}
</button>
