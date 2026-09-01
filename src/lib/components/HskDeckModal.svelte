<script lang="ts">
	/**
	 * Free vs premium, shown before the free `.apkg` actually downloads — the
	 * same idea as `RadicalDeckModal`: a reader who only ever sees a "download"
	 * button never learns premium exists. Unlike the radical deck, the free HSK
	 * deck isn't built in the browser — it's already a prebuilt release asset —
	 * so this modal's free side is just the direct download link, not a builder.
	 */
	import { btnPrimary, btnSecondary } from '$lib/buttonStyles';
	import { deckSummary, deckUrl, formatBytes, type HskDeckEntry, type HskDeckManifest } from '$lib/hskDecks';
	import type { HskListMeta } from '$lib/hsk';
	import Check from '@lucide/svelte/icons/check';
	import Download from '@lucide/svelte/icons/download';
	import Minus from '@lucide/svelte/icons/minus';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import X from '@lucide/svelte/icons/x';

	let {
		list,
		manifest,
		deck,
		onClose
	}: {
		list: HskListMeta;
		manifest: HskDeckManifest;
		deck: HskDeckEntry;
		onClose: () => void;
	} = $props();

	// Both premium links point at the deck post, not the shop front: the post is
	// what says what is in the deck, and a buyer arriving at a bare storefront
	// has to work out which product this modal was talking about.
	const POST = 'https://www.patreon.com/krmani/posts/anki-xie-hanzi-3-166350823';

	// The comparison. `free` is what the button below actually downloads.
	const rows = $derived([
		{ label: `Every ${list.name} word (${list.total.toLocaleString()}), one file`, free: true, premium: true },
		{ label: 'Native pronunciation audio', free: true, premium: true },
		{ label: 'Example sentences, each with its own sentence audio', free: true, premium: true },
		{
			label: 'Full definitions, character breakdown, radical, HSK band, frequency',
			free: true,
			premium: true
		},
		{ label: 'Stroke-order practice grid', free: true, premium: true },
		{ label: 'Sidebar to show or hide any field, front and back', free: true, premium: true },
		{
			label: 'Separate Recognition and Writing cards, reviewed independently',
			free: false,
			premium: true
		},
		{ label: 'Redesigned card layout', free: false, premium: true },
		{
			label: 'Built-in dictionary — look up any word without leaving the card',
			free: false,
			premium: true
		},
		{ label: 'The whole example-sentence corpus, "Load more" as you review', free: false, premium: true }
	]);
</script>

<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5"
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && onClose()}
>
	<div
		class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
		role="dialog"
		aria-modal="true"
		aria-label="Get the {list.name} deck"
	>
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="text-xl font-bold tracking-tight">
					{list.name} <span class="font-mono text-base font-normal text-neutral-400">{list.year}</span>
				</h2>
				<p class="mt-1 text-sm text-neutral-500">
					Two editions of the same word list. Free downloads right here; premium is prebuilt and sold
					separately.
				</p>
			</div>
			<button
				onclick={onClose}
				aria-label="Close"
				class="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
			>
				<X size={18} />
			</button>
		</div>

		<!-- Free vs premium, one row per thing that differs. -->
		<div class="mt-5 overflow-hidden rounded-xl border border-neutral-200">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-neutral-200 bg-neutral-50">
						<th class="px-4 py-2.5 text-left font-medium text-neutral-500"></th>
						<th class="w-24 px-2 py-2.5 text-center font-semibold">Free</th>
						<th class="w-32 px-2 py-2.5 text-center font-semibold">
							<span class="inline-flex items-center gap-1.5"><Sparkles size={14} /> Premium</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.label)}
						<tr class="border-b border-neutral-100 last:border-0">
							<td class="px-4 py-2 text-neutral-700">{row.label}</td>
							<td class="px-2 py-2 text-center">
								{#if row.free}
									<Check size={15} class="mx-auto text-neutral-900" />
								{:else}
									<Minus size={15} class="mx-auto text-neutral-300" />
								{/if}
							</td>
							<td class="bg-neutral-50 px-2 py-2 text-center">
								<Check size={15} class="mx-auto text-neutral-900" />
							</td>
						</tr>
					{/each}
					<tr class="border-t border-neutral-200">
						<td class="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
							{deckSummary(manifest, deck)}
						</td>
						<td class="px-2 py-3 text-center text-xs text-neutral-500">Ready now</td>
						<td class="bg-neutral-50 px-2 py-3 text-center">
							<a
								class="inline-flex items-center gap-1.5 text-xs font-medium underline"
								href={POST}
								target="_blank"
								rel="noopener noreferrer"
							>
								Get premium
							</a>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<p class="mt-4 text-xs text-neutral-400">
			Premium restructures the deck itself — separate Recognition/Writing cards, a redesigned
			layout, a searchable in-card dictionary — rather than adding fields the free deck lacks. Read
			more in the
			<a href={POST} target="_blank" rel="noopener noreferrer" class="underline">deck post</a>.
		</p>

		<!-- Premium is the filled button: the free download is right there either
		     way, and a reader who never sees the paid edition never considers it. -->
		<div class="mt-6 flex flex-wrap items-center justify-end gap-2">
			<a
				class="{btnSecondary} inline-flex items-center gap-2"
				href={deckUrl(manifest, deck)}
				onclick={onClose}
			>
				<Download size={15} /> Download free deck
				<span class="font-mono text-xs text-neutral-400">{formatBytes(deck.bytes)}</span>
			</a>
			<a
				class="{btnPrimary} inline-flex items-center gap-2"
				href={POST}
				target="_blank"
				rel="noopener noreferrer"
			>
				<Sparkles size={15} /> Premium
			</a>
		</div>
	</div>
</div>
