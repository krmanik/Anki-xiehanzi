<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle = '',
		onclose,
		children
	}: {
		title: string;
		subtitle?: string;
		onclose: () => void;
		children: Snippet;
	} = $props();

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window {onkeydown} />

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
	onclick={onclose}
	role="presentation"
>
	<div
		class="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
		onclick={(e) => e.stopPropagation()}
		role="presentation"
	>
		<div class="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
			<div>
				<h3 class="font-semibold text-neutral-900">{title}</h3>
				{#if subtitle}<p class="mt-0.5 text-xs text-neutral-500">{subtitle}</p>{/if}
			</div>
			<button
				class="ml-auto rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
				onclick={onclose}
				aria-label="close"
			>
				<X size={18} />
			</button>
		</div>
		<div class="overflow-y-auto p-4">
			{@render children()}
		</div>
	</div>
</div>
