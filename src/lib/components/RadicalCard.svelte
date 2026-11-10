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
	class="group relative flex cursor-pointer flex-col items-center rounded-[22px] border-0 px-3 py-4 text-center transition-[transform,box-shadow] duration-[400ms] ease-spring focus-visible:outline-3 focus-visible:outline-accent {selected
		? 'bg-surface shadow-[0_0_0_2px_var(--xhz-accent),var(--xhz-shadow-raised)]'
		: 'bg-surface shadow-object hover:-translate-y-1 hover:shadow-raised active:scale-95'}"
>
	<span class="absolute left-2 top-1.5 text-xs text-muted tabular-nums">{radical.number}</span>
	<span class="absolute right-2 top-1.5 text-xs text-muted tabular-nums">{radical.strokes}</span>

	<span class="mt-2 font-zh text-[40px] leading-none font-semibold {colorize ? `tone${tone}` : ''}" lang="zh-Hans">
		{radical.char}
	</span>

	{#if radical.variants.length}
		<span class="mt-1 text-sm leading-none text-muted" lang="zh-Hans">
			{radical.variants.join(' ')}
		</span>
	{/if}

	<span class="mt-2 text-sm font-semibold {colorize ? `tone${tone}` : ''}">{radical.pinyin}</span>
	<span class="mt-0.5 line-clamp-2 text-xs text-muted">{radical.meaning}</span>

	{#if band}
		<span class="mt-1.5 text-xs text-muted tabular-nums">
			{radical.frequency}
		</span>
	{/if}
</button>
