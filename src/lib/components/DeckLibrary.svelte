<script lang="ts">
	/**
	 * The single HSK destination.
	 *
	 * Top of the page is what the project makes — the radical deck, the premium
	 * decks, the deck creator. Below that, the two ready-made HSK decks: **one
	 * click per list**, each `.apkg` holding every level as a subdeck (see
	 * `$lib/hskDecks`). Levels are not separate downloads any more; they are only
	 * links into the word-list browser.
	 *
	 * Rendered by both `/hsk` (canonical) and `/decks` (the older URL, kept
	 * working); `#decks` and `#lists` still resolve.
	 */
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { loadHskIndex, levelLabel, type HskIndex, type HskListMeta } from '$lib/hsk';
	import HskDeckModal from '$lib/components/HskDeckModal.svelte';
	import {
		deckSummary,
		findDeck,
		formatBytes,
		loadHskDecks,
		type HskDeckEntry,
		type HskDeckManifest
	} from '$lib/hskDecks';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Download from '@lucide/svelte/icons/download';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import Wand2 from '@lucide/svelte/icons/wand-2';

	let index = $state<HskIndex | null>(null);
	let decks = $state<HskDeckManifest | null>(null);
	let error = $state('');
	let compareDeck = $state<{ list: HskListMeta; deck: HskDeckEntry } | null>(null);

	onMount(async () => {
		try {
			const [idx, manifest] = await Promise.all([loadHskIndex(), loadHskDecks()]);
			index = idx;
			decks = manifest;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	});

	// New HSK first — it is the current standard.
	const lists = $derived.by(() => {
		const all = index?.lists ?? [];
		return [...all].sort((a, b) => (a.id === 'new' ? -1 : b.id === 'new' ? 1 : 0));
	});

	const levelHref = (list: HskListMeta, level: string) => `${base}/hsk/${list.id}/${level}`;

	const rel = 'https://github.com/krmanik/Anki-xiehanzi/releases';

	// Paid decks live on Patreon; the shop is the storefront, the post describes
	// what is in the deck.
	const premium = {
		name: 'Anki xiě hànzì 3.0 — Premium',
		desc: 'Premium HSK writing decks and the 214-radical deck, prebuilt and ready to import. Supports development of the free decks and the Create tool.',
		post: 'https://www.patreon.com/krmani/posts/anki-xie-hanzi-3-166350823',
		shop: 'https://www.patreon.com/cw/krmani/shop'
	};

	// The v2.3 deck, a second shape of the same New HSK 2025 word list: four card
	// types per word (meaning · pinyin & zhuyin · audio · writing), each its own
	// subdeck, built by the legacy main.ipynb pipeline. It is not a superseded
	// version to be filed away — it is the deck a lot of people are studying and a
	// genuinely different way to learn the list, so it lives *inside* the New HSK
	// card next to the one-card-per-word deck.
	const v23 = [
		{
			name: 'Four card types',
			desc: 'HSK 1–9 with simplified, traditional, pinyin, zhuyin, audio, meanings and writing.',
			url: 'https://github.com/krmanik/Anki-xiehanzi/releases/download/v2.3/Anki-xiehanzi.-.New.HSK.2025.apkg'
		},
		{
			name: 'With example sentences',
			desc: 'The same four card types, with example sentences added to every note.',
			url: 'https://github.com/krmanik/Anki-xiehanzi/releases/download/v2.3/Anki-xiehanzi.-.New.HSK.2025.with.sentences.apkg'
		}
	];

	const previous = [
		{
			name: 'Type 1',
			tag: 'Recommended',
			desc: 'Separate decks per type: strokes, meaning, pinyin/zhuyin, audio. Frequency sorted.',
			ankiweb: 'https://ankiweb.net/shared/info/1351435439'
		},
		{
			name: 'Type 2',
			tag: 'Recommended',
			desc: 'Five card types per HSK level note, incl. tone marks. Frequency sorted.',
			ankiweb: 'https://ankiweb.net/shared/info/239300382'
		},
		{
			name: 'Type 3',
			tag: '',
			desc: 'Five card types, sorted in alphabetical pinyin order (not frequency).',
			ankiweb: 'https://ankiweb.net/shared/info/1063372083'
		},
		{
			name: 'Type 4',
			tag: '',
			desc: 'Single note type. Front: pinyin + meaning. Back: writing component.',
			ankiweb: 'https://ankiweb.net/shared/info/536858343'
		}
	];
</script>

<div class="mx-auto max-w-6xl px-5 py-12">
	<p class="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">Decks</p>
	<h1 class="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Decks &amp; word lists</h1>
	<p class="mt-3 max-w-2xl text-neutral-600">
		The 214 radicals, your own words, the premium decks — and the two HSK decks, each a single
		download with every level inside.
	</p>

	<!-- ------------------------------------------------------------------ -->
	<!-- What the project makes: radicals, your own words, premium.          -->
	<!-- ------------------------------------------------------------------ -->
	<div class="mt-10 grid gap-4 sm:grid-cols-2">
		<a
			href="{base}/radicals"
			class="group rounded-xl border border-neutral-200 p-5 transition hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111]"
		>
			<h3 class="flex items-center gap-2 font-semibold">
				<span class="text-lg leading-none" lang="zh-Hans">部</span> The 214 Kangxi radicals
			</h3>
			<p class="mt-1.5 text-sm leading-relaxed text-neutral-600">
				The building blocks every character is filed under — meanings, readings across East Asia,
				stroke order, how each glyph evolved, and the characters it builds. Free to browse, and the
				deck builds in your browser: recognition and writing cards, audio, stroke order.
			</p>
			<span
				class="mt-3 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-neutral-900"
			>
				Browse the radicals
				<ArrowRight size={14} class="transition group-hover:translate-x-0.5" />
			</span>
		</a>

		<div class="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
			<h3 class="flex items-center gap-2 font-semibold">
				<Sparkles size={16} class="text-indigo-600" />
				{premium.name}
			</h3>
			<p class="mt-1.5 text-sm leading-relaxed text-neutral-600">{premium.desc}</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<a
					href={premium.post}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 rounded bg-neutral-900 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-white transition hover:bg-neutral-700"
				>
					<Sparkles size={14} /> Get the deck
				</a>
				<a
					href={premium.shop}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 rounded border border-neutral-300 bg-white px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-neutral-700 transition hover:border-neutral-900"
				>
					<ShoppingBag size={14} /> Shop
				</a>
			</div>
		</div>

		<a
			href="{base}/create"
			class="group rounded-xl border border-neutral-200 p-5 transition hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111] sm:col-span-2"
		>
			<h3 class="flex items-center gap-2 font-semibold"><Wand2 size={16} /> Your own words</h3>
			<p class="mt-1.5 text-sm leading-relaxed text-neutral-600">
				Turn typed words, a pasted paragraph or an uploaded file into a custom deck — card layout,
				tone colours, stroke practice and all.
			</p>
			<span
				class="mt-3 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-neutral-900"
			>
				Open the deck creator
				<ArrowRight size={14} class="transition group-hover:translate-x-0.5" />
			</span>
		</a>
	</div>

	<!-- ------------------------------------------------------------------ -->
	<!-- The HSK decks: one download per list, levels as subdecks inside.    -->
	<!-- ------------------------------------------------------------------ -->
	<section id="decks" class="mt-14 scroll-mt-20">
		<span id="lists" class="block scroll-mt-20"></span>

		<div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 pb-2">
			<h2 class="text-2xl font-bold tracking-tight">HSK decks</h2>
			<span class="font-mono text-xs text-neutral-400">Free · one file per list</span>
		</div>
		<p class="mt-2 text-xs text-neutral-400">
			Separate writing cards, a redesigned card layout and a built-in offline dictionary are in the
			<a href={premium.post} target="_blank" rel="noopener noreferrer" class="underline">premium deck</a>.
		</p>
		<p class="mt-2 max-w-2xl text-sm text-neutral-500">
			One note and one card per word — hanzi and native audio on the front; pinyin, zhuyin,
			traditional form, common meaning, full definitions, character breakdown, radical, part of
			speech, HSK band, frequency, example sentences and a stroke-practice grid on the back. The
			card's sidebar switches any field on or off, and the stroke data ships inside the deck, so
			everything works offline. Every level is a subdeck of the one import.
		</p>

		{#if error}
			<p class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
				Could not load the word lists: {error}
			</p>
		{:else if !index}
			<div class="mt-6 grid gap-4 sm:grid-cols-2">
				{#each Array(2) as _}
					<div class="h-44 animate-pulse rounded-xl bg-neutral-100"></div>
				{/each}
			</div>
		{:else}
			<div class="mt-6 grid gap-4 sm:grid-cols-2 sm:items-start">
				{#each lists as list (list.id)}
					{@const deck = findDeck(decks, list.id)}
					<div class="relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5">
						<span
							class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r {list.id === 'new'
								? 'from-rose-500 to-orange-400'
								: 'from-sky-500 to-cyan-400'}"
						></span>
						<div class="flex items-baseline justify-between gap-2">
							<h3 class="text-xl font-extrabold tracking-tight">
								{list.name}
								<span class="ml-1 font-mono text-sm font-normal text-neutral-400">{list.year}</span>
							</h3>
							<span class="font-mono text-xs uppercase tracking-wider text-neutral-400">
								{list.total.toLocaleString()} words
							</span>
						</div>
						<p class="mt-1.5 text-sm text-neutral-500">{list.subtitle}</p>

						{#if deck && decks}
							<button
								type="button"
								onclick={() => (compareDeck = { list, deck })}
								class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700"
							>
								<Download size={16} /> Download the deck
								<span class="font-mono text-xs text-neutral-400">{formatBytes(deck.bytes)}</span>
							</button>
							<p class="mt-2 text-center font-mono text-[11px] text-neutral-400">
								{deckSummary(decks, deck)}
							</p>
						{:else}
							<p
								class="mt-4 rounded-lg border border-dashed border-neutral-200 px-4 py-3 text-center text-sm text-neutral-400"
							>
								Deck coming soon
							</p>
						{/if}

						{#if list.id === 'new'}
							<!-- Same word list, the other card design: the v2.3 deck, four cards per
							     word. Screenshots rather than prose — it is a layout, not a feature
							     list — taken from Anki itself by scripts/shoot-v23-cards.mjs. -->
							<div class="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3.5">
								<h4 class="text-sm font-semibold">Four cards per word (v2.3)</h4>
								<p class="mt-1.5 text-sm leading-relaxed text-neutral-600">
									The other deck for this list, and still a favourite: every word becomes four
									cards in four subdecks — meaning, pinyin &amp; zhuyin, audio, and writing on a
									stroke grid — so each skill comes up on its own schedule.
								</p>
								<div class="mt-3 space-y-1.5">
									{#each v23 as d (d.url)}
										<a
											href={d.url}
											class="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 transition hover:border-neutral-900"
										>
											<span class="min-w-0">
												<span class="block text-sm font-medium">{d.name}</span>
												<span class="block text-xs text-neutral-500">{d.desc}</span>
											</span>
											<Download size={15} class="shrink-0 text-neutral-500" />
										</a>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Levels are not separate downloads; they open the word list. -->
						<div class="mt-4 border-t border-neutral-100 pt-3">
							<p class="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
								Word lists &amp; exports
							</p>
							<div class="mt-2 flex flex-wrap gap-1.5">
								{#each list.levels as lvl (lvl.level)}
									<a
										href={levelHref(list, lvl.level)}
										class="rounded-lg border border-neutral-200 px-2.5 py-1 font-mono text-xs text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-900"
									>
										{levelLabel(lvl.level)}
									</a>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<p class="mt-6 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
				Import an .apkg with <strong class="font-semibold text-neutral-500">File → Import</strong> in
				Anki · word data updated {index.generated}{#if decks}
					· decks built {decks.generated}{/if}
			</p>
		{/if}
	</section>

	<!-- ------------------------------------------------------------------ -->
	<!-- Always open: which list to learn, and the v2.3 downloads. Both are  -->
	<!-- things a first-time visitor needs, and nobody opens a disclosure to -->
	<!-- find out which of two decks applies to them.                        -->
	<!-- ------------------------------------------------------------------ -->
	<section class="mt-12">
		<h2 class="border-b border-neutral-200 pb-2 text-2xl font-bold tracking-tight">
			Which list should I learn?
		</h2>
		<div class="mt-4 grid gap-6 sm:grid-cols-2">
			<div>
				<h3 class="font-semibold">New HSK 3.0 (2025)</h3>
				<p class="mt-1 text-sm leading-relaxed text-neutral-600">
					The current standard: nine levels grouped 1–6 plus an advanced 7–9 band, ~11,000 words. Use
					this if you are taking the exam today.
				</p>
			</div>
			<div>
				<h3 class="font-semibold">Old HSK (2012)</h3>
				<p class="mt-1 text-sm leading-relaxed text-neutral-600">
					The classic six-level syllabus, 5,000 words. Still the list most textbooks, graded readers
					and older courses are built around.
				</p>
			</div>
		</div>
	</section>

	<details class="group mt-10 rounded-xl border border-neutral-200">
		<summary class="flex cursor-pointer list-none items-center justify-between p-4 font-semibold">
			Older decks (HSK 2.0, 2021)
			<ChevronDown size={18} class="transition group-open:rotate-180" />
		</summary>
		<div class="border-t border-neutral-200 p-4">
			<div class="space-y-2">
				{#each previous as p}
					<div
						class="flex flex-wrap items-center justify-between gap-3 rounded border border-neutral-200 bg-neutral-50 p-3"
					>
						<div class="min-w-0">
							<div class="flex items-center gap-2">
								<h5 class="font-semibold">{p.name}</h5>
								{#if p.tag}
									<span
										class="rounded-full bg-indigo-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-indigo-700"
										>{p.tag}</span
									>
								{/if}
							</div>
							<p class="mt-0.5 text-sm text-neutral-600">{p.desc}</p>
						</div>
						<div class="flex gap-2">
							<a
								href={p.ankiweb}
								class="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:border-neutral-900"
								>AnkiWeb</a
							>
							<a
								href={rel}
								class="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:border-neutral-900"
								>GitHub</a
							>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</details>

	{#if compareDeck && decks}
		<HskDeckModal
			list={compareDeck.list}
			manifest={decks}
			deck={compareDeck.deck}
			onClose={() => (compareDeck = null)}
		/>
	{/if}
</div>
