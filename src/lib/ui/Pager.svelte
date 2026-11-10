<!--
  ‹ 3 / 13 › plus a rows-per-page select. Holds no rows itself: the list
  binds `page` and `size` and slices its own data.
-->
<script lang="ts">
	let {
		page = $bindable(1),
		size = $bindable(25),
		total,
		sizes = [10, 25, 50, 100, 500]
	}: {
		/** 1-based. */
		page?: number;
		size?: number;
		total: number;
		sizes?: number[];
	} = $props();

	const pages = $derived(Math.max(1, Math.ceil(total / size)));
	// Deleting the last rows of the last page would leave an empty page behind.
	$effect(() => {
		if (page > pages) page = pages;
	});

	const btn =
		'grid size-9 cursor-pointer place-items-center rounded-xl border-0 bg-sunk text-lg text-ink transition-[background-color,transform] duration-300 ease-spring hover:bg-line active:scale-90 disabled:pointer-events-none disabled:opacity-40';
</script>

<div class="flex items-center gap-2 text-sm text-muted">
	<label class="flex items-center gap-2">
		<span class="hidden sm:inline">Per page</span>
		<select
			bind:value={size}
			onchange={() => (page = 1)}
			aria-label="Rows per page"
			class="min-h-9 rounded-xl border-0 bg-sunk py-0 pr-8 pl-3 text-sm text-ink"
		>
			{#each sizes as n (n)}<option value={n}>{n}</option>{/each}
		</select>
	</label>
	<button type="button" class={btn} aria-label="Previous page" disabled={page <= 1} onclick={() => (page -= 1)}
		>‹</button
	>
	<span class="min-w-12 text-center tabular-nums">{page} / {pages}</span>
	<button type="button" class={btn} aria-label="Next page" disabled={page >= pages} onclick={() => (page += 1)}
		>›</button
	>
</div>
