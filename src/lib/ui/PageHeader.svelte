<!-- Breadcrumbs, an optional leading tile, the page title, and its actions on the right. -->
<script lang="ts" module>
	export interface Crumb {
		label: string;
		href?: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle,
		crumbs = [],
		lead,
		actions
	}: {
		title: string;
		subtitle?: string;
		crumbs?: Crumb[];
		lead?: Snippet;
		actions?: Snippet;
	} = $props();
</script>

<header class="mb-5">
	{#if crumbs.length}
		<nav aria-label="Breadcrumb" class="mb-2 text-sm text-muted">
			<ol class="m-0 flex list-none flex-wrap items-center gap-1.5 p-0">
				{#each crumbs as c, i (i)}
					<li class="flex items-center gap-1.5">
						{#if i > 0}<span aria-hidden="true">›</span>{/if}
						{#if c.href && i < crumbs.length - 1}
							<a href={c.href} class="text-muted no-underline hover:text-ink">{c.label}</a>
						{:else}
							<span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>
						{/if}
					</li>
				{/each}
			</ol>
		</nav>
	{/if}
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex min-w-0 items-center gap-3.5">
			{#if lead}{@render lead()}{/if}
			<div class="min-w-0">
				<h1 class="m-0 text-[28px] leading-tight font-bold text-ink">{title}</h1>
				{#if subtitle}<p class="m-0 text-sm text-muted">{subtitle}</p>{/if}
			</div>
		</div>
		{#if actions}<div class="flex flex-wrap gap-2">{@render actions()}</div>{/if}
	</div>
</header>
