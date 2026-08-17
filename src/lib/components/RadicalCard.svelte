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
	class="group relative flex flex-col items-center rounded-xl border bg-white px-3 py-3.5 text-center transition hover:border-neutral-400 hover:shadow-sm {selected
		? 'border-neutral-900 shadow-sm'
		: 'border-neutral-200'}"
>
	<span class="absolute left-2 top-1.5 font-mono text-[10px] text-neutral-300">{radical.number}</span>
	<span class="absolute right-2 top-1.5 font-mono text-[10px] text-neutral-300">{radical.strokes}</span>

	<span class="mt-2 text-4xl leading-none {colorize ? `tone${tone}` : ''}" lang="zh-Hans">
		{radical.char}
	</span>

	{#if radical.variants.length}
		<span class="mt-1 text-sm leading-none text-neutral-400" lang="zh-Hans">
			{radical.variants.join(' ')}
		</span>
	{/if}

	<span class="mt-2 text-sm font-medium {colorize ? `tone${tone}` : ''}">{radical.pinyin}</span>
	<span class="mt-0.5 line-clamp-2 text-xs text-neutral-500">{radical.meaning}</span>

	{#if band}
		<span class="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-300">
			{radical.frequency}
		</span>
	{/if}
</button>
