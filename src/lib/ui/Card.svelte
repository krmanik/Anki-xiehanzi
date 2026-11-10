<!-- A panel: a white object with a soft shadow (`plain`), a sunk well, or an inverted ink tile. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cx, PANEL, type Panel } from './styles';

	let {
		tint = 'plain',
		padding = 'md',
		as = 'div',
		class: extra = '',
		children
	}: {
		tint?: Panel;
		padding?: 'none' | 'sm' | 'md' | 'lg';
		as?: 'div' | 'section' | 'article' | 'aside' | 'li';
		class?: string;
		children: Snippet;
	} = $props();

	const pad = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' };
</script>

<svelte:element this={as} class={cx('rounded-panel', PANEL[tint], pad[padding], extra)}>
	{@render children()}
</svelte:element>
