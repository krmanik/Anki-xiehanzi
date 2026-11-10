<!--
  The bar pinned to the bottom of the viewport on every /create step: Back on
  the left, whatever the step needs in the middle (the word pager), Next on the
  right. Pinned so the way forward never scrolls off under a long word list.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '$lib/ui';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	type Step = { label: string; short?: string; onclick: () => void; disabled?: boolean };

	let { back, next, children }: { back?: Step; next?: Step; children?: Snippet } = $props();
</script>

<div
	class="sticky bottom-3 z-30 mt-4 flex min-h-16 items-center gap-2 rounded-[22px] bg-surface/90 p-2.5 shadow-raised backdrop-blur-md sm:bottom-4 sm:gap-3 sm:p-3"
>
	{#if back}
		<Button variant="secondary" aria-label={back.label} onclick={back.onclick}>
			<ArrowLeft class="size-[18px]" /><span class="hidden sm:inline">{back.label}</span>
		</Button>
	{/if}
	<div class="flex min-w-0 flex-1 justify-center sm:justify-start">{@render children?.()}</div>
	{#if next}
		<Button aria-label={next.label} disabled={next.disabled} onclick={next.onclick}>
			<span class="hidden sm:inline">{next.label}</span><span class="sm:hidden">{next.short ?? 'Next'}</span
			><ArrowRight class="size-[18px]" />
		</Button>
	{/if}
</div>
