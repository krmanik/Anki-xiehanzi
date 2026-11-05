<!--
  One button for the whole site. With `href` it is a link styled as a button
  (navigation), without it a real <button> (action) — never a div.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { buttonClass, cx, type ButtonSize, type ButtonVariant } from './styles';

	type Props = {
		variant?: ButtonVariant;
		size?: ButtonSize;
		href?: string;
		class?: string;
		children: Snippet;
	} & Omit<HTMLButtonAttributes & HTMLAnchorAttributes, 'class' | 'children'>;

	let {
		variant = 'primary',
		size = 'md',
		href,
		class: extra = '',
		type = 'button',
		children,
		...rest
	}: Props = $props();

	const cls = $derived(cx(buttonClass(variant, size), extra));
</script>

{#if href}
	<a {href} class={cls} {...rest}>{@render children()}</a>
{:else}
	<button {type} class={cls} {...rest}>{@render children()}</button>
{/if}
