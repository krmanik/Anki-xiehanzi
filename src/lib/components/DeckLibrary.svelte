<script lang="ts">
	/**
	 * The single HSK destination, ordered by what a visitor came for:
	 *
	 *   1. the two free HSK decks — **one click per list**, each `.apkg` holding
	 *      every level as a subdeck (see `$lib/hskDecks`); level chips link into
	 *      the word-list browser, not into downloads;
	 *      Each card says in one line which list to learn; a row of chips says
	 *      what every deck holds. Kept short on purpose — readers scan this page;
	 *   2. what else the project makes — radicals, premium, the deck creator;
	 *   3. the v2.3 downloads (always open) and the 2021 AnkiWeb decks (folded).
	 *
	 * Rendered by both `/hsk` (canonical) and `/decks` (the older URL, kept
	 * working); `#decks` and `#lists` still resolve.
	 */
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { loadHskIndex, levelLabel, type HskIndex, type HskListMeta } from '$lib/hsk';
	import HskDeckModal from '$lib/components/HskDeckModal.svelte';
	import {
		findDeck,
		formatBytes,
		loadHskDecks,
		type HskDeckEntry,
		type HskDeckManifest
	} from '$lib/hskDecks';
	import { Badge, Button, chipClass, IconDot, PageHeader, SectionLabel, type Hue } from '$lib/ui';
		import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Download from '@lucide/svelte/icons/download';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import SquarePlus from '@lucide/svelte/icons/square-plus';

	let index = $state<HskIndex | null>(null);
	let decks = $state<HskDeckManifest | null>(null);
	let error = $state('');
	let chosen = $state<{ list: HskListMeta; deck: HskDeckEntry } | null>(null);

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

	const LIST_LOOK: Record<string, { hue: Hue; glyph: string }> = {
		new: { hue: 'rose', glyph: '新' },
		old: { hue: 'sky', glyph: '旧' }
	};
	const look = (id: string) => LIST_LOOK[id] ?? { hue: 'lavender' as Hue, glyph: '词' };

	const levelHref = (list: HskListMeta, level: string) => `${base}/hsk/${list.id}/${level}`;

	/** What every free deck carries, as chips: the reader scans, not reads. */
	const contents = [
		'Native audio',
		'Pinyin & zhuyin',
		'Meanings',
		'Character breakdown',
		'Example sentences',
		'Stroke order',
		'Works offline'
	];

	/** Which list to learn, said on the card itself rather than in a section of its own. */
	const PICK: Record<string, string> = {
		new: 'Taking the exam today? Pick this one.',
		old: 'Most textbooks still use this list.'
	};

	const more = [
		{
			href: `${base}/radicals`,
			title: 'Kangxi radicals',
			text: 'The 214 building blocks of every character.',
			hue: 'mint' as Hue,
			tint: 'bg-mint-soft',
			glyph: '部'
		},
		{
			href: `${base}/shop`,
			title: 'Premium',
			text: 'Writing cards and a dictionary in every card.',
			hue: 'apricot' as Hue,
			tint: 'bg-apricot-soft',
			glyph: null
		},
		{
			href: `${base}/create`,
			title: 'Your own words',
			text: 'Any word list, the same card design.',
			hue: 'lavender' as Hue,
			tint: 'bg-lavender-soft',
			glyph: null
		}
	];

	const rel = 'https://github.com/krmanik/Anki-xiehanzi/releases';

	// The v2.3 release, still the deck a lot of people are studying: four card
	// types per level, built by the legacy main.ipynb pipeline. Kept as a direct
	// download because the current deck is a different shape, not a strict
	// improvement for someone mid-collection.
	const v23 = [
		{
			name: 'New HSK (2025)',
			desc: 'HSK 1–9 with simplified, traditional, pinyin, zhuyin, audio, meanings and writing.',
			url: 'https://github.com/krmanik/Anki-xiehanzi/releases/download/v2.3/Anki-xiehanzi.-.New.HSK.2025.apkg'
		},
		{
			name: 'New HSK (2025) with sentences',
			desc: 'The same deck with example sentences added to each note.',
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

	const h2 = 'm-0 text-[24px] leading-tight font-bold text-ink';
	const textLink =
		'inline-flex items-center gap-0.5 text-[15px] font-semibold text-accent no-underline hover:underline';
</script>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
	<PageHeader title="HSK decks" subtitle="Free. One file per list, every level inside." />

	<!-- The two free decks. -->
	<section id="decks" class="scroll-mt-20" aria-label="HSK decks">
		<span id="lists" class="block scroll-mt-20"></span>
		{#if error}
			<p class="rounded-card bg-rose-soft p-4 text-rose-ink">Could not load the word lists: {error}</p>
		{:else if !index}
			<div class="grid gap-4 md:grid-cols-2" aria-busy="true">
				{#each Array(2) as _, i (i)}
					<div class="h-72 animate-pulse rounded-panel bg-sunk"></div>
				{/each}
			</div>
		{:else}
			<div class="grid gap-4 md:grid-cols-2">
				{#each lists as list (list.id)}
					{@const deck = findDeck(decks, list.id)}
					{@const l = look(list.id)}
					<article class="flex flex-col rounded-panel bg-surface p-5 ring-1 ring-line ring-inset sm:p-6">
						<div class="flex items-center gap-3.5">
							<IconDot hue={l.hue} size="lg" shape="tile" class="font-zh">{l.glyph}</IconDot>
							<div class="min-w-0">
								<h2 class="m-0 text-[22px] leading-tight font-bold text-ink">
									{list.name} <span class="font-semibold text-muted">({list.year})</span>
								</h2>
								<p class="m-0 text-[15px] text-muted">{PICK[list.id] ?? list.subtitle}</p>
							</div>
						</div>
						<!-- The deck's own word count when there is a deck: the list total
						     differs (words with no dictionary data are left out). -->
						<div class="mt-4 flex flex-wrap gap-1.5">
							<Badge tint={l.hue}>{(deck?.words ?? list.total).toLocaleString()} words</Badge>
							<Badge tint={l.hue}>{list.levels.length} levels</Badge>
							{#if deck}<Badge tint="mint">Free</Badge>{/if}
						</div>

						{#if deck && decks}
							<Button class="mt-5 w-full" onclick={() => (chosen = { list, deck })}>
								<Download class="size-[18px]" />Download free deck
								<span class="font-medium opacity-80">{formatBytes(deck.bytes)}</span>
							</Button>
						{:else}
							<p class="mt-5 mb-0 rounded-card bg-sunk px-4 py-3 text-center text-muted">
								Deck coming soon.
								<a href="{base}/create" class="font-semibold text-accent">Build it yourself</a>
							</p>
						{/if}

						<div class="mt-5 border-t border-line pt-4">
							<SectionLabel as="h3">Word lists</SectionLabel>
							<div class="mt-2 flex flex-wrap gap-1.5">
								{#each list.levels as lvl (lvl.level)}
									<a href={levelHref(list, lvl.level)} class="{chipClass(false)} no-underline"
										>{levelLabel(lvl.level)}</a
									>
								{/each}
							</div>
						</div>

						<p class="mt-auto mb-0 pt-4 text-[15px] text-muted">
							Writing cards?
							<a href="{base}/shop" class={textLink}>See Premium<ChevronRight class="size-4" /></a>
						</p>
					</article>
				{/each}
			</div>

			<div class="mt-5 flex flex-wrap items-center gap-1.5" aria-label="In every deck">
				<span class="mr-1 text-[15px] font-semibold text-ink">In every deck</span>
				{#each contents as c (c)}<Badge>{c}</Badge>{/each}
			</div>
		{/if}
	</section>

	<!-- What else the project makes. -->
	<section class="mt-12" aria-labelledby="more-h">
		<h2 id="more-h" class={h2}>More decks</h2>
		<div class="mt-4 grid gap-3.5 md:grid-cols-3">
			{#each more as m (m.href)}
				<a href={m.href} class="group flex items-center gap-3.5 rounded-panel p-4 text-ink no-underline {m.tint}">
					<IconDot hue={m.hue} class="font-zh">
						{#if m.glyph}{m.glyph}{:else if m.hue === 'apricot'}<Sparkles />{:else}<SquarePlus />{/if}
					</IconDot>
					<div class="min-w-0 flex-1">
						<h3 class="m-0 text-base font-semibold group-hover:underline">{m.title}</h3>
						<p class="m-0 text-[15px] text-muted">{m.text}</p>
					</div>
					<ChevronRight class="size-5 shrink-0 text-muted" />
				</a>
			{/each}
		</div>
	</section>

	<!-- Always open: people mid-collection on v2.3 should find their deck without hunting. -->
	<section class="mt-12" aria-labelledby="v23-h">
		<h2 id="v23-h" class={h2}>Previous version (v2.3)</h2>
		<p class="mt-1 mb-4 text-muted">Still on the four-card deck? Keep using it.</p>
		<div class="grid gap-2.5 sm:grid-cols-2">
			{#each v23 as d (d.url)}
				<div class="flex items-center justify-between gap-3 rounded-card bg-sunk p-4" title={d.desc}>
					<h3 class="m-0 text-base font-semibold text-ink">{d.name}</h3>
					<Button variant="secondary" size="sm" href={d.url} aria-label="Download {d.name} (v2.3)">
						<Download class="size-4" />.apkg
					</Button>
				</div>
			{/each}
		</div>
	</section>

	<details class="group mt-8 rounded-card ring-1 ring-line ring-inset">
		<summary class="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-ink">
			Older decks (HSK 2.0, 2021)
			<ChevronDown class="size-5 text-muted transition group-open:rotate-180" />
		</summary>
		<div class="grid gap-2.5 border-t border-line p-4">
			{#each previous as p (p.name)}
				<div class="flex flex-wrap items-center justify-between gap-3 rounded-card bg-sunk p-4">
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<h3 class="m-0 text-base font-semibold text-ink">{p.name}</h3>
							{#if p.tag}<Badge tint="sky">{p.tag}</Badge>{/if}
						</div>
						<p class="mt-0.5 mb-0 text-[15px] text-muted">{p.desc}</p>
					</div>
					<div class="flex gap-2">
						<Button variant="secondary" size="sm" href={p.ankiweb}>AnkiWeb</Button>
						<Button variant="secondary" size="sm" href={rel}>GitHub</Button>
					</div>
				</div>
			{/each}
		</div>
	</details>

	{#if chosen && decks}
		<HskDeckModal
			list={chosen.list}
			manifest={decks}
			deck={chosen.deck}
			onClose={() => (chosen = null)}
		/>
	{/if}
</div>
