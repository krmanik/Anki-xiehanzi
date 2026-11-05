<!-- A panel: white with a hairline (`plain`), or a soft tint of one hue. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cx, PANEL, type Tint } from './styles';

	let {
		tint = 'plain',
		padding = 'md',
		as = 'div',
		class: extra = '',
		children
	}: {
		tint?: Tint | 'plain';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		as?: 'div' | 'section' | 'article' | 'aside' | 'li';
		class?: string;
		children: Snippet;
	} = $props();

	const pad = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6 sm:p-8' };
</script>

<svelte:element this={as} class={cx('rounded-panel', PANEL[tint], pad[padding], extra)}>
	{@render children()}
</svelte:element>
