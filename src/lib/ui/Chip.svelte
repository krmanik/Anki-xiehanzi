<!-- A toggle in a row of filters (level, part of speech). `aria-pressed` carries the state. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { chipClass, cx } from './styles';

	let {
		selected = false,
		count,
		onTint = false,
		onclick,
		class: extra = '',
		children
	}: {
		selected?: boolean;
		count?: number;
		/** On a soft panel, where the grey chip would vanish. */
		onTint?: boolean;
		onclick?: (e: MouseEvent) => void;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<button type="button" class={cx(chipClass(selected, onTint), extra)} aria-pressed={selected} {onclick}>
	{@render children()}
	{#if count !== undefined}<span class="font-medium opacity-75">{count.toLocaleString()}</span>{/if}
</button>
