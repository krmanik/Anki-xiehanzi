<!-- Small static label (a fact, a part of speech). Not clickable: use Chip. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cx, SOFT, type Tint } from './styles';

	let {
		tint = 'neutral',
		class: extra = '',
		children
	}: { tint?: Tint; class?: string; children: Snippet } = $props();
</script>

<span
	class={cx(
		'inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-semibold leading-5',
		SOFT[tint],
		extra
	)}>{@render children()}</span
>
