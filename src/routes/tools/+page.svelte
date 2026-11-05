<!--
  The Tools entry is a submenu in the top bar; this page only catches old
  links to /tools, so it is the same four rows, not a page to read.
-->
<script lang="ts">
	import { base } from '$app/paths';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { IconDot, PageHeader } from '$lib/ui';
	import { TOOLS, withBase } from '$lib/nav';
	import { NAV_ICONS } from '$lib/components/shell/navIcons';
</script>

<svelte:head>
	<title>Tools · Anki-xiehanzi</title>
	<meta
		name="description"
		content="Study tools for Mandarin learners: a paste-text reader, an HSK coverage check, stroke-practice worksheets and printable flashcards."
	/>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
	<PageHeader title="Tools" />
	<ul class="m-0 flex list-none flex-col gap-2 p-0">
		{#each TOOLS.children ?? [] as tool (tool.path)}
			{@const Icon = NAV_ICONS[tool.icon]}
			<li>
				<a
					href={withBase(tool.path, base)}
					class="group flex items-center gap-3.5 rounded-panel p-3.5 no-underline ring-1 ring-line ring-inset transition-colors hover:bg-sunk focus-visible:outline-3 focus-visible:outline-sky"
				>
					<IconDot hue={tool.hue}><Icon /></IconDot>
					<span class="min-w-0 flex-1">
						<span class="block text-base font-semibold text-ink">{tool.label}</span>
						<span class="block text-[15px] text-muted">{tool.blurb}</span>
					</span>
					<ChevronRight class="size-5 shrink-0 text-muted" />
				</a>
			</li>
		{/each}
	</ul>
</div>
