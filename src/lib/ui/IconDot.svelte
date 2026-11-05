<!--
  A white glyph (icon, digit, hanzi) on a solid pastel circle or rounded tile.
  Decorative by default; pass `label` when the dot is the only thing saying it.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cx, SOLID, type Hue } from './styles';

	let {
		hue = 'sky',
		size = 'md',
		shape = 'circle',
		label,
		class: extra = '',
		children
	}: {
		hue?: Hue;
		size?: 'sm' | 'md' | 'lg';
		shape?: 'circle' | 'tile';
		label?: string;
		class?: string;
		children: Snippet;
	} = $props();

	const dim = { sm: 'size-7 [&_svg]:size-3.5', md: 'size-9 [&_svg]:size-[18px]', lg: 'size-12 text-xl [&_svg]:size-6' };
</script>

<span
	class={cx(
		'inline-grid shrink-0 place-items-center font-bold',
		shape === 'circle' ? 'rounded-full' : 'rounded-card',
		SOLID[hue],
		dim[size],
		extra
	)}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}>{@render children()}</span
>
