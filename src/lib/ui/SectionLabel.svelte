<!--
  The label above a group of controls or a block of content. Sentence case,
  13px, semibold — replaces the tiny grey uppercase monospace labels.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cx } from './styles';

	let {
		as = 'h2',
		class: extra = '',
		children
	}: { as?: 'h2' | 'h3' | 'h4' | 'p' | 'span'; class?: string; children: Snippet } = $props();
</script>

<svelte:element this={as} class={cx('m-0 font-sans text-[13px] font-semibold tracking-normal text-muted', extra)}>
	{@render children()}
</svelte:element>
