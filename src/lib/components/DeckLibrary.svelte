<script lang="ts">
	/**
	 * The single HSK destination: ready-made decks first, then the browsable word
	 * lists they are built from. One scrolling page — no tabs — so both halves are
	 * discoverable. Rendered by both `/hsk` (canonical) and `/decks` (the older
	 * URL, kept working); `#decks` and `#lists` jump to each half.
	 */
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { loadHskIndex, levelLabel, type HskIndex, type HskListMeta } from '$lib/hsk';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Download from '@lucide/svelte/icons/download';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import FileText from '@lucide/svelte/icons/file-text';
	import Layers from '@lucide/svelte/icons/layers';
	import Palette from '@lucide/svelte/icons/palette';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import Sparkles from '@lucide/svelte/icons/sparkles';

	let index = $state<HskIndex | null>(null);
	let error = $state('');

	onMount(async () => {
		try {
			index = await loadHskIndex();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	});

	// New HSK first — it is the current standard.
	const lists = $derived.by(() => {
		const all = index?.lists ?? [];
		return [...all].sort((a, b) => (a.id === 'new' ? -1 : b.id === 'new' ? 1 : 0));
	});

	// One accent per level so the grid reads as a progression.
	const ACCENTS = [
		'from-rose-500 to-orange-400',
		'from-orange-500 to-amber-400',
		'from-emerald-500 to-teal-400',
		'from-sky-500 to-cyan-400',
		'from-indigo-500 to-violet-400',
		'from-fuchsia-500 to-pink-400',
		'from-neutral-800 to-neutral-500'
	];

	const TONE_LEGEND = [
		{ tone: 1, name: '1st · mā' },
		{ tone: 2, name: '2nd · má' },
		{ tone: 3, name: '3rd · mǎ' },
		{ tone: 4, name: '4th · mà' },
		{ tone: 5, name: 'neutral · ma' }
	];

	const levelHref = (list: HskListMeta, level: string) => `${base}/hsk/${list.id}/${level}`;

	const rel = 'https://github.com/krmanik/Anki-xiehanzi/releases';

	// Paid decks live on Patreon; the shop is the storefront, the post describes
	// what is in the deck.
	const premium = {
		name: 'Anki xiě hànzì 3.0 — Premium',
		desc: 'Premium HSK writing decks, prebuilt and ready to import. Supports development of the free decks and the Create tool.',
		post: 'https://www.patreon.com/krmani/posts/anki-xie-hanzi-3-166350823',
		shop: 'https://www.patreon.com/cw/krmani/shop'
	};

	const current = {
		version: '2025-11 · v2.3',
		decks: [
			{
				name: 'New HSK (2025)',
				desc: 'HSK 1–9 with simplified, traditional, pinyin, zhuyin, audio, meanings and writing.',
				href: `${rel}/download/v2.3/Anki-xiehanzi.-.New.HSK.2025.apkg`
			},
			{
				name: 'New HSK (2025) with sentences',
				desc: 'Same deck with example sentences added to each note.',
				href: `${rel}/download/v2.3/Anki-xiehanzi.-.New.HSK.2025.with.sentences.apkg`
			}
		]
	};

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
	<p class="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">HSK</p>
	<h1 class="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Decks &amp; word lists</h1>
	<p class="mt-3 max-w-2xl text-neutral-600">
		Import a ready-made Anki deck below, or open any HSK level to read it here with tone-coloured
		pinyin and take it away as CSV, Excel, Word, PDF or text.
	</p>

	<div class="mt-6 flex flex-wrap gap-2">
		<a
			href="#decks"
			class="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-900"
		>
			<Download size={13} /> Ready-made decks
		</a>
		<a
			href="#lists"
			class="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-900"
		>
			<Layers size={13} /> Word lists
		</a>
	</div>

	<!-- ------------------------------------------------------------------ -->
	<!-- Ready-made decks                                                    -->
	<!-- ------------------------------------------------------------------ -->
	<section id="decks" class="scroll-mt-20">
		<div class="mt-12 flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 pb-2">
			<h2 class="text-2xl font-bold tracking-tight">Ready-made decks</h2>
			<span class="font-mono text-xs text-neutral-400">{current.version}</span>
		</div>
		<p class="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
			Download an <code class="rounded bg-neutral-100 px-1.5 py-0.5">.apkg</code> and import it in
			Anki via <strong>File → Import</strong>. Back up your collection with scheduling information
			first.
		</p>

		<div class="mt-5 grid gap-4 sm:grid-cols-2">
			{#each current.decks as d}
				<a
					href={d.href}
					class="group flex flex-col justify-between rounded-xl border border-neutral-200 p-5 transition hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111]"
				>
					<div>
						<h3 class="font-semibold">{d.name}</h3>
						<p class="mt-1.5 text-sm leading-relaxed text-neutral-600">{d.desc}</p>
					</div>
					<span
						class="mt-4 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-neutral-900"
					>
						<Download size={14} /> Download .apkg
					</span>
				</a>
			{/each}
		</div>

		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<div class="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
				<h3 class="font-semibold">Just one level?</h3>
				<p class="mt-1.5 text-sm leading-relaxed text-neutral-600">
					Open a level in <a class="font-medium text-indigo-600 underline underline-offset-2" href="#lists">Word lists</a>
					and choose <strong>Download → Anki deck</strong>. Its words go to the deck creator with
					audio and example sentences ready to switch on.
				</p>
			</div>
			<div class="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
				<h3 class="font-semibold">Your own words?</h3>
				<p class="mt-1.5 text-sm leading-relaxed text-neutral-600">
					The <a class="font-medium text-indigo-600 underline underline-offset-2" href="{base}/create">deck creator</a>
					turns typed words, a pasted paragraph or an uploaded file into a custom deck — card
					layout, tone colours, stroke practice and all.
				</p>
			</div>
		</div>

		<div
			class="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-5"
		>
			<div class="min-w-0">
				<h3 class="flex items-center gap-2 font-semibold">
					<Sparkles size={16} class="text-indigo-600" />
					{premium.name}
				</h3>
				<p class="mt-1.5 max-w-xl text-sm leading-relaxed text-neutral-600">{premium.desc}</p>
			</div>
			<div class="flex flex-wrap gap-2">
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

		<details class="group mt-6 rounded-xl border border-neutral-200">
			<summary class="flex cursor-pointer list-none items-center justify-between p-4 font-semibold">
				Previous decks (HSK 2.0, 2021)
				<ChevronDown size={18} class="transition group-open:rotate-180" />
			</summary>
			<div class="space-y-3 border-t border-neutral-200 p-4">
				{#each previous as p}
					<div
						class="flex flex-wrap items-center justify-between gap-3 rounded border border-neutral-200 bg-neutral-50 p-4"
					>
						<div class="min-w-0">
							<div class="flex items-center gap-2">
								<h4 class="font-semibold">{p.name}</h4>
								{#if p.tag}
									<span
										class="rounded-full bg-indigo-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-indigo-700"
										>{p.tag}</span
									>
								{/if}
							</div>
							<p class="mt-1 text-sm text-neutral-600">{p.desc}</p>
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
		</details>
	</section>

	<!-- ------------------------------------------------------------------ -->
	<!-- Word lists                                                          -->
	<!-- ------------------------------------------------------------------ -->
	<section id="lists" class="scroll-mt-20">
		<div class="mt-16 flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 pb-2">
			<h2 class="text-2xl font-bold tracking-tight">Word lists</h2>
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
				<span
					class="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-neutral-400"
				>
					<Palette size={13} /> Tones
				</span>
				{#each TONE_LEGEND as t}
					<span class="font-mono text-xs tone{t.tone}">{t.name}</span>
				{/each}
			</div>
		</div>
		<p class="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
			Pick a level to read every word with tone-coloured hanzi and pinyin, zhuyin, traditional
			forms, part of speech, classifiers and frequency — then export it in the format you want.
		</p>

		{#if error}
			<p class="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
				Could not load the word lists: {error}
			</p>
		{:else if !index}
			<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{#each Array(8) as _}
					<div class="h-32 animate-pulse rounded-xl bg-neutral-100"></div>
				{/each}
			</div>
		{:else}
			{#each lists as list (list.id)}
				<div class="mt-8">
					<div class="flex flex-wrap items-baseline justify-between gap-2">
						<h3 class="text-lg font-bold">
							{list.name}
							<span class="ml-1 font-mono text-sm font-normal text-neutral-400">{list.year}</span>
						</h3>
						<span class="font-mono text-xs text-neutral-400">
							{list.levels.length} levels · {list.total.toLocaleString()} words
						</span>
					</div>
					<p class="mt-1 text-sm text-neutral-500">{list.subtitle}</p>

					<div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{#each list.levels as lvl, i (lvl.level)}
							<a
								href={levelHref(list, lvl.level)}
								class="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111]"
							>
								<span
									class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r {ACCENTS[i % ACCENTS.length]}"
								></span>
								<div class="flex items-start justify-between">
									<div>
										<div class="text-2xl font-extrabold tracking-tight">
											{levelLabel(lvl.level)}
										</div>
										<div class="mt-1 font-mono text-xs uppercase tracking-wider text-neutral-400">
											{lvl.count.toLocaleString()} words
										</div>
									</div>
									<ArrowRight
										size={18}
										class="mt-1 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-900"
									/>
								</div>
								<div
									class="mt-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-neutral-400"
								>
									<span class="inline-flex items-center gap-1"><Layers size={12} /> View</span>
									<span class="inline-flex items-center gap-1"
										><FileSpreadsheet size={12} /> Excel</span
									>
									<span class="inline-flex items-center gap-1"><FileText size={12} /> PDF</span>
									<span class="inline-flex items-center gap-1"><Download size={12} /> Anki</span>
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/each}

			<div class="mt-10 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
				<h3 class="text-lg font-bold">Which list should I learn?</h3>
				<div class="mt-3 grid gap-6 sm:grid-cols-2">
					<div>
						<h4 class="font-semibold">New HSK 3.0 (2025)</h4>
						<p class="mt-1 text-sm leading-relaxed text-neutral-600">
							The current standard: nine levels grouped 1–6 plus an advanced 7–9 band, ~11,000
							words. Use this if you are taking the exam today.
						</p>
					</div>
					<div>
						<h4 class="font-semibold">Old HSK (2012)</h4>
						<p class="mt-1 text-sm leading-relaxed text-neutral-600">
							The classic six-level syllabus, 5,000 words. Still the list most textbooks, graded
							readers and older courses are built around.
						</p>
					</div>
				</div>
			</div>

			<p class="mt-6 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
				Data updated {index.generated} · word data from CC-CEDICT and the HSK 3.0 word list
			</p>
		{/if}
	</section>
</div>
