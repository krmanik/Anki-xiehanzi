<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	let {
		page = $bindable(),
		maxPage = 2,
		labels
	}: {
		page: number;
		maxPage?: number;
		labels: string[];
	} = $props();
</script>

<nav class="mt-10 flex items-center justify-between gap-4 border-t border-neutral-200 pt-6">
	{#if page > 1}
		<button
			class="group flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 transition hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111]"
			onclick={() => (page = page - 1)}
		>
			<ArrowLeft size={16} class="shrink-0 text-neutral-400 transition group-hover:text-neutral-900" />
			<div class="text-left">
				<div class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Previous</div>
				<div class="font-semibold text-neutral-900">{labels[page - 1]}</div>
			</div>
		</button>
	{:else}
		<div></div>
	{/if}

	{#if page < maxPage}
		<button
			class="group flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 transition hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111]"
			onclick={() => (page = page + 1)}
		>
			<div class="text-right">
				<div class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Next</div>
				<div class="font-semibold text-neutral-900">{labels[page + 1]}</div>
			</div>
			<ArrowRight size={16} class="shrink-0 text-neutral-400 transition group-hover:text-neutral-900" />
		</button>
	{:else}
		<div></div>
	{/if}
</nav>
