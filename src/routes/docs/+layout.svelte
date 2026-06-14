<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	let { children } = $props();

	const docs = [
		{ href: `${base}/docs`, slug: '/docs', label: 'Introduction' },
		{ href: `${base}/docs/features`, slug: '/docs/features', label: 'Features' },
		{ href: `${base}/docs/export-deck`, slug: '/docs/export-deck', label: 'Export a Deck' },
		{ href: `${base}/docs/studying`, slug: '/docs/studying', label: 'Studying cards' },
		{ href: `${base}/docs/faq`, slug: '/docs/faq', label: 'FAQ' }
	];

	const current = $derived(page.url.pathname.replace(base, '') || '/');
	const idx = $derived(docs.findIndex((d) => d.slug === current));
	const prev = $derived(idx > 0 ? docs[idx - 1] : null);
	const next = $derived(idx >= 0 && idx < docs.length - 1 ? docs[idx + 1] : null);
</script>

<!-- lg:px-5 only — MarkdownLayout provides px-5 on mobile so we don't double it -->
<div class="mx-auto flex max-w-5xl lg:px-5">
	<!-- sidebar: lg+ only -->
	<aside class="hidden w-44 shrink-0 lg:block">
		<div class="sticky top-20 pt-14">
			<p class="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">Docs</p>
			<nav class="flex flex-col">
				{#each docs as doc}
					<a
						href={doc.href}
						class="rounded-md px-3 py-1.5 text-sm transition {doc.slug === current
							? 'bg-neutral-100 font-medium text-neutral-900'
							: 'text-neutral-500 hover:text-neutral-900'}"
					>{doc.label}</a>
				{/each}
			</nav>
		</div>
	</aside>

	<!-- main content — MarkdownLayout renders inside here with its own px-5 -->
	<div class="min-w-0 flex-1">
		<!-- mobile nav: collapsible, hidden on lg+ -->
		<details class="group mx-5 mt-10 rounded-lg border border-neutral-200 lg:hidden">
			<summary class="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
				<span class="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">Docs</span>
				<svg class="h-4 w-4 text-neutral-400 transition group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
			</summary>
			<nav class="flex flex-col border-t border-neutral-200 px-2 py-2">
				{#each docs as doc}
					<a
						href={doc.href}
						class="rounded-md px-3 py-2 text-sm transition {doc.slug === current
							? 'font-medium text-neutral-900'
							: 'text-neutral-500 hover:text-neutral-900'}"
					>{doc.label}</a>
				{/each}
			</nav>
		</details>

		{@render children()}

		<!-- prev/next: px-5 matches MarkdownLayout horizontal padding -->
		<div class="px-5 pb-16">
			<div class="flex items-center justify-between gap-4 border-t border-neutral-200 pt-8">
				{#if prev}
					<a
						href={prev.href}
						class="group flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 transition hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111]"
					>
						<ArrowLeft size={16} class="shrink-0 text-neutral-400 transition group-hover:text-neutral-900" />
						<div>
							<div class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Previous</div>
							<div class="font-semibold text-neutral-900">{prev.label}</div>
						</div>
					</a>
				{:else}
					<div></div>
				{/if}

				{#if next}
					<a
						href={next.href}
						class="group flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-right transition hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111]"
					>
						<div>
							<div class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">Next</div>
							<div class="font-semibold text-neutral-900">{next.label}</div>
						</div>
						<ArrowRight size={16} class="shrink-0 text-neutral-400 transition group-hover:text-neutral-900" />
					</a>
				{:else}
					<div></div>
				{/if}
			</div>
		</div>
	</div>
</div>
