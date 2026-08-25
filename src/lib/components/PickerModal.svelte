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
	class="fixed inset-0 z-50 flex bg-black/40 sm:items-center sm:justify-center sm:p-4"
	onclick={onclose}
	role="presentation"
>
	<div
		class="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:rounded-2xl"
		onclick={(e) => e.stopPropagation()}
		role="presentation"
	>
		<div
			class="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 sm:py-3"
			style="padding-top: max(0.75rem, env(safe-area-inset-top))"
		>
			<div class="min-w-0">
				<h3 class="truncate font-semibold text-neutral-900">{title}</h3>
				{#if subtitle}<p class="mt-0.5 truncate text-xs text-neutral-500">{subtitle}</p>{/if}
			</div>
			<button
				class="ml-auto shrink-0 rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
				onclick={onclose}
				aria-label="close"
			>
				<X size={18} />
			</button>
		</div>
		<div class="overflow-y-auto p-4" style="padding-bottom: max(1rem, env(safe-area-inset-bottom))">
			{@render children()}
		</div>
	</div>
</div>
