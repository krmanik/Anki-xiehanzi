<script lang="ts">
	let { title, children } = $props();
</script>

<svelte:head>
	{#if title}<title>{title} — Anki xiehanzi</title>{/if}
</svelte:head>

{#if title}
	<div class="mx-auto max-w-3xl px-5 pt-12">
		<p class="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">{title}</p>
	</div>
{/if}

<article class="prose-doc mx-auto max-w-3xl px-5 {title ? 'pt-3' : 'pt-12'} pb-12">
	{@render children()}
</article>

<style>
	.prose-doc :global(h1) {
		font-size: 2.25rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin-bottom: 1.5rem;
	}
	.prose-doc :global(h2) {
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		margin: 2.5rem 0 1rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid #e5e5e5;
	}
	.prose-doc :global(h3) {
		font-size: 1.15rem;
		font-weight: 600;
		margin: 1.75rem 0 0.6rem;
	}
	.prose-doc :global(p),
	.prose-doc :global(li) {
		line-height: 1.75;
		color: #3f3f46;
	}
	.prose-doc :global(ul),
	.prose-doc :global(ol) {
		margin: 0.75rem 0 0.75rem 1.25rem;
		list-style: revert;
	}
	.prose-doc :global(a) {
		color: #4f46e5;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.prose-doc :global(img) {
		max-width: 100%;
		border: 1px solid #e5e5e5;
		border-radius: 0.5rem;
		margin: 1rem 0;
	}
	.prose-doc :global(details) {
		margin: 1rem 0;
		border: 1px solid #e5e5e5;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
	}
	.prose-doc :global(summary) {
		cursor: pointer;
		font-weight: 600;
	}
	.prose-doc :global(code) {
		background: #f4f4f5;
		padding: 0.1rem 0.35rem;
		border-radius: 0.25rem;
		font-size: 0.9em;
	}
	.prose-doc :global(table) {
		width: 100%;
		margin: 1.25rem 0;
		border-collapse: collapse;
		font-size: 0.95rem;
	}
	.prose-doc :global(th),
	.prose-doc :global(td) {
		padding: 0.5rem 0.85rem;
		text-align: left;
		vertical-align: top;
		border: 1px solid #e5e5e5;
		line-height: 1.6;
		color: #3f3f46;
	}
	.prose-doc :global(thead th) {
		background: #f4f4f5;
		font-weight: 600;
		color: #18181b;
	}
	.prose-doc :global(tbody tr:nth-child(even)) {
		background: #fafafa;
	}
</style>
