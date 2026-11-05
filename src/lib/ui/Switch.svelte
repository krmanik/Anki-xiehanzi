<!--
  An on/off row: label and one muted line on the left, the switch on the right.
  A real checkbox underneath (role="switch"), so it is keyboard- and
  screen-reader-correct without script.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		checked = $bindable(false),
		label,
		hint,
		extra
	}: {
		checked?: boolean;
		label: string;
		hint?: string;
		/** Shown between the text and the switch (e.g. tone swatches). */
		extra?: Snippet;
	} = $props();
</script>

<label class="flex cursor-pointer items-center gap-3.5 py-3">
	<span class="min-w-0 flex-1">
		<span class="block text-[15px] font-semibold text-ink">{label}</span>
		{#if hint}<span class="block text-[13.5px] text-muted">{hint}</span>{/if}
	</span>
	{#if extra}{@render extra()}{/if}
	<input type="checkbox" role="switch" bind:checked class="peer sr-only" />
	<span
		aria-hidden="true"
		class="relative h-7 w-[46px] shrink-0 rounded-full bg-line transition-colors peer-checked:bg-mint peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky after:absolute after:top-[3px] after:left-[3px] after:size-[22px] after:rounded-full after:bg-white after:shadow after:transition-[left] peer-checked:after:left-[21px]"
	></span>
</label>
