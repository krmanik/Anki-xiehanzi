<script lang="ts">
	import { base } from '$app/paths';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Gauge from '@lucide/svelte/icons/gauge';
	import PencilLine from '@lucide/svelte/icons/pencil-line';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';

	const card =
		'group rounded-xl border border-neutral-200 p-5 transition hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111]';
	const cta =
		'mt-3 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-neutral-900';

	const tools = [
		{
			href: `${base}/tools/reader`,
			icon: BookOpen,
			title: 'Paste-text reader',
			desc: 'Paste any Chinese text and read it with tone-colored words, click-through dictionary lookups, and a bag to send words straight to the deck creator.',
			label: 'Open the reader'
		},
		{
			href: `${base}/tools/coverage`,
			icon: Gauge,
			title: 'HSK coverage analyzer',
			desc: 'Paste a paragraph and see how much of it falls inside an HSK list — a level-by-level breakdown plus every word that falls outside it.',
			label: 'Check coverage'
		},
		{
			href: `${base}/tools/worksheets`,
			icon: PencilLine,
			title: 'Worksheet generator',
			desc: 'Turn a word list into a printable PDF of stroke-practice grids, guide glyph included, ready to trace on paper.',
			label: 'Build a worksheet'
		},
		{
			href: `${base}/tools/flashcards`,
			icon: LayoutGrid,
			title: 'Printable flashcards',
			desc: 'A two-sided flashcard PDF — hanzi on the front, pinyin and meaning on the back — laid out so duplex printing lines the sides up.',
			label: 'Print flashcards'
		}
	];
</script>

<svelte:head>
	<title>Tools · Anki xiehanzi</title>
	<meta
		name="description"
		content="Study utilities for Mandarin learners: a paste-text reader, an HSK coverage analyzer, a stroke-practice worksheet generator and a printable flashcard PDF."
	/>
</svelte:head>

<div class="mx-auto max-w-6xl px-5 py-12">
	<p class="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">Tools</p>
	<h1 class="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Study tools</h1>
	<p class="mt-3 max-w-2xl text-neutral-600">
		Ad-hoc utilities that don't end in an .apkg — read pasted text, check how much of it is
		within an HSK level, or print something on paper.
	</p>

	<div class="mt-10 grid gap-4 sm:grid-cols-2">
		{#each tools as tool (tool.href)}
			<a href={tool.href} class={card}>
				<h3 class="flex items-center gap-2 font-semibold">
					<tool.icon size={16} />
					{tool.title}
				</h3>
				<p class="mt-1.5 text-sm leading-relaxed text-neutral-600">{tool.desc}</p>
				<span class={cta}>
					{tool.label}
					<ArrowRight size={14} class="transition group-hover:translate-x-0.5" />
				</span>
			</a>
		{/each}
	</div>
</div>
