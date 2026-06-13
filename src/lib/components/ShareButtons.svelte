<script lang="ts">
	import { NETWORKS, share } from '$lib/share.svelte';
</script>

<div class="flex flex-wrap justify-center gap-2.5">
	{#each NETWORKS as n (n.sharer)}
		<button
			type="button"
			title="Share on {n.label}"
			aria-label="Share on {n.label}"
			style="--brand: {n.c}"
			class="share-btn flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 transition hover:scale-110"
			onclick={() => share(n.sharer)}
		>
			<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
				<path d={n.d} />
			</svg>
		</button>
	{/each}
</div>

<style>
	.share-btn:hover {
		background-color: var(--brand);
		border-color: var(--brand);
		color: #fff;
	}
</style>
