<!-- Small static label (a fact, a part of speech). Not clickable: use Chip. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cx, SOFT, STRONG, type Tint } from './styles';

	let {
		tint = 'neutral',
		strong = false,
		class: extra = '',
		children
	}: {
		tint?: Tint;
		/** Filled with the ink — for a badge over a picture, where a soft tint vanishes. */
		strong?: boolean;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<span
	class={cx(
		'inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-semibold leading-5',
		strong ? STRONG[tint] : SOFT[tint],
		extra
	)}>{@render children()}</span
>
