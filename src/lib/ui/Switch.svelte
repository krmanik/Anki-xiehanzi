<!--
  An on/off row: label and one muted line on the left, the switch on the right.
  A real checkbox underneath (role="switch"), so it is keyboard- and
  screen-reader-correct without script. The knob springs across and stretches
  while pressed.
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
	<span aria-hidden="true" class="xhz-switch"></span>
</label>
