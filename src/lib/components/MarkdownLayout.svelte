<script lang="ts">
	let { title, children } = $props();
</script>

<svelte:head>
	{#if title}<title>{title} — Anki xiehanzi</title>{/if}
</svelte:head>

<article class="prose-doc mx-auto max-w-3xl px-5 py-12">
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
</style>
