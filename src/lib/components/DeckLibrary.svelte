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
	import WriterLoop from '$lib/components/home/WriterLoop.svelte';
	import {
		findDeck,
		formatBytes,
		loadHskDecks,
		type HskDeckEntry,
		type HskDeckManifest
	} from '$lib/hskDecks';
	import { Badge, Button, buttonClass, cx, PAGE, SECTION_H2, SEG, toneText } from '$lib/ui';
	import { playHskWord } from '$lib/hskAudio';
	import Plane from '@lucide/svelte/icons/plane';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Download from '@lucide/svelte/icons/download';

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

	/** The hero's hanzi stickers, each in its tone colour. */
	const STICKERS = [
		{ c: '学', p: 'xué', tone: 'text-tone-2' },
		{ c: '写', p: 'xiě', tone: 'text-tone-3' },
		{ c: '中', p: 'zhōng', tone: 'text-tone-1' },
		{ c: '字', p: 'zì', tone: 'text-tone-4' },
		{ c: '好', p: 'hǎo', tone: 'text-tone-3' },
		{ c: '了', p: 'le', tone: 'text-tone-5' }
	];

	/** The faint glyph behind each list's tile. */
	const GLYPH: Record<string, string> = { new: '新', old: '旧' };

	const levelHref = (list: HskListMeta, level: string) => `${base}/hsk/${list.id}/${level}`;

	// "In every deck": small live demos rather than a row of labels.
	let script = $state<'pinyin' | 'zhuyin'>('pinyin');
	let offline = $state(true);
	/** 我们需要发展 with its tones. */
	const SENTENCE: [string, number][] = [
		['我', 3],
		['们', 5],
		['需', 1],
		['要', 4],
		['发', 1],
		['展', 3]
	];

	/** Which list to learn, said on the card itself rather than in a section of its own. */
	const PICK: Record<string, string> = {
		new: 'Taking the exam today? Pick this one.',
		old: 'Most textbooks still use this list.'
	};

	const more = [
		{ href: `${base}/radicals`, title: 'Kangxi radicals', text: 'The 214 building blocks of every character.', glyph: '部', peek: ['氵', '口', '木', '扌'] },
		{ href: `${base}/shop`, title: 'Premium', text: 'Writing cards and a dictionary in every card.', glyph: '写', premium: true, peek: ['写', '字'] },
		{ href: `${base}/create`, title: 'Your own words', text: 'Any word list, the same card design.', glyph: '词', peek: ['你好', '学习', '+'] }
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

	const tile = 'relative overflow-hidden rounded-[24px] bg-surface p-[22px] shadow-object sm:rounded-tile sm:p-[30px]';
	const feat = cx(tile, 'xhz-lift flex min-h-[160px] flex-col justify-between sm:min-h-[210px]');
	const featTitle = 'm-0 mt-4 text-[17px] font-semibold tracking-[-0.01em] text-ink';
</script>

<div class={PAGE}>
	<!-- Hero: a few hanzi stickers around one line. -->
	<section class="relative pt-[150px] pb-10 text-center sm:pt-24 sm:pb-[72px]">
		{#each STICKERS as st, i (st.c)}
			<div class="sticker sticker-{i + 1} xhz-float" aria-hidden="true">
				<b class="font-zh {st.tone}">{st.c}</b><small class={st.tone}>{st.p}</small>
			</div>
		{/each}
		<h1
			class="relative mx-auto mt-0 mb-[18px] max-w-[11em] text-[46px] leading-[0.98] font-bold tracking-[-0.045em] text-balance text-ink sm:text-[76px]"
		>
			Every HSK word, ready for Anki.
		</h1>
		<p class="relative mt-0 mb-[30px] text-[17px] text-muted sm:text-[19px]">Free. One file per list, every level inside.</p>
		<div class="relative flex flex-wrap justify-center gap-3">
			<a href="#decks" class={buttonClass('primary', 'lg')}><Download class="size-5" />Get the decks</a>
			<a href="{base}/hsk/new/1" class={buttonClass('secondary', 'lg')}>Browse words</a>
		</div>
	</section>

	<!-- The two free decks. -->
	<section id="decks" class="scroll-mt-24" aria-label="HSK decks">
		<span id="lists" class="block scroll-mt-24"></span>
		{#if error}
			<p class="rounded-card bg-err-soft p-4 text-err-ink">Could not load the word lists: {error}</p>
		{:else if !index}
			<div class="grid gap-3 md:grid-cols-12 md:gap-4" aria-busy="true">
				<div class="h-[440px] animate-pulse rounded-tile bg-sunk md:col-span-7"></div>
				<div class="h-[440px] animate-pulse rounded-tile bg-sunk md:col-span-5"></div>
			</div>
		{:else}
			<div class="grid gap-3 md:grid-cols-12 md:gap-4">
				{#each lists as list, li (list.id)}
					{@const deck = findDeck(decks, list.id)}
					{@const dark = li === 0}
					<article
						class={cx(
							'relative flex flex-col overflow-hidden rounded-[24px] p-[22px] shadow-object sm:rounded-tile sm:p-[30px] md:min-h-[440px]',
							dark ? 'xhz-invert bg-ink text-ground md:col-span-7' : 'bg-surface text-ink md:col-span-5'
						)}
					>
						<span
							class="pointer-events-none absolute -top-[26px] -right-2.5 font-zh text-[150px] leading-none font-extrabold opacity-[0.055] sm:text-[210px]"
							aria-hidden="true">{GLYPH[list.id] ?? '词'}</span
						>
						<span class="relative text-sm font-semibold {dark ? 'text-ground/65' : 'text-muted'}">{list.year}</span>
						<h2 class="relative mt-2 mb-2.5 text-[38px] leading-none font-bold tracking-[-0.04em] sm:text-[46px]">
							{list.name}
						</h2>
						<p class="relative m-0 mb-1 text-[17px]">{PICK[list.id] ?? list.subtitle}</p>
						<!-- The deck's own word count when there is a deck: the list total
						     differs (words with no dictionary data are left out). -->
						<p class="relative mt-0 mb-6 text-[15px] {dark ? 'text-ground/65' : 'text-muted'}">
							{(deck?.words ?? list.total).toLocaleString()} words · {list.levels.length} levels{#if deck}{' · '}<span class="font-semibold {dark ? 'text-ok' : 'text-ok-ink'}">Free</span>{/if}
						</p>

						{#if deck && decks}
							<div class="relative">
								<button
									type="button"
									class={buttonClass(dark ? 'secondary' : 'primary', 'lg')}
									onclick={() => (chosen = { list, deck })}
								>
									<Download class="size-5" />Download free deck
									<span class="font-medium opacity-60">{formatBytes(deck.bytes)}</span>
								</button>
							</div>
						{:else}
							<p class="relative m-0 text-[15px] {dark ? 'text-ground/65' : 'text-muted'}">
								Deck coming soon.
								<a href="{base}/create" class="font-semibold text-inherit underline underline-offset-4">Build it yourself</a>
							</p>
						{/if}

						<nav class="relative mt-6 flex flex-wrap gap-2" aria-label="{list.name} word lists">
							{#each list.levels as lvl (lvl.level)}
								<a
									href={levelHref(list, lvl.level)}
									class="xhz-key"
									aria-label="{levelLabel(lvl.level)}, {lvl.count.toLocaleString()} words"
									>{lvl.level.replace('-', '–')}<small>{lvl.count.toLocaleString()}</small></a
								>
							{/each}
						</nav>

						<p class="relative mt-auto mb-0 flex items-center justify-between pt-[22px] text-[15px]">
							<span class={dark ? 'text-ground/65' : 'text-muted'}>Writing cards?</span>
							<a
								href="{base}/shop"
								class="inline-flex items-center gap-1.5 font-semibold text-inherit no-underline hover:underline hover:underline-offset-4"
								><span class="size-2 rounded-full bg-gold" aria-hidden="true"></span>See Premium</a
							>
						</p>
					</article>
				{/each}
			</div>
		{/if}
	</section>

	<!-- What every deck holds, shown rather than listed. -->
	<section class="mt-14 sm:mt-[88px]" aria-labelledby="every-h">
		<h2 id="every-h" class="{SECTION_H2} mb-6">In every deck</h2>
		<div class="grid grid-cols-2 gap-2.5 md:grid-cols-12 md:gap-4">
			<div class="{feat} col-span-2 md:col-span-5">
				<button
					type="button"
					class="flex w-fit cursor-pointer items-center gap-3.5 rounded-full border-0 bg-sunk py-2.5 pr-4 pl-2.5 text-ink"
					aria-label="Play 你好"
					onclick={() => playHskWord('你好', 'ni3 hao3')}
				>
					<span class="grid size-[42px] place-items-center rounded-full bg-ink text-ground"
						><Volume2 class="size-[18px]" /></span
					>
					<span class="font-zh text-[22px] font-semibold text-tone-3" lang="zh-Hans">你好</span>
					<span class="bars" aria-hidden="true"
						>{#each [10, 22, 16, 26, 12, 20, 8] as h, i (i)}<i style:height="{h}px" style:animation-delay="{i * 0.1}s"
							></i>{/each}</span
					>
				</button>
				<h3 class={featTitle}>Native audio</h3>
			</div>
			<div class="{feat} col-span-1 md:col-span-3">
				<div class="relative size-24 rounded-[18px] bg-sunk p-1">
					<svg class="absolute inset-0 size-full text-line" viewBox="0 0 100 100" aria-hidden="true">
						<path d="M50 4 V96 M4 50 H96" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" fill="none" />
					</svg>
					<WriterLoop char="中" tone={1} size={88} />
				</div>
				<h3 class={featTitle}>Stroke order</h3>
			</div>
			<div class="{feat} col-span-1 md:col-span-4">
				<div class="flex flex-wrap items-center gap-3.5">
					<span class="font-zh text-[44px] leading-none font-semibold text-tone-1 sm:text-[52px]" lang="zh-Hans">中</span>
					<div class={SEG} role="group" aria-label="Reading">
						<button type="button" aria-pressed={script === 'pinyin'} onclick={() => (script = 'pinyin')}>zhōng</button>
						<button type="button" aria-pressed={script === 'zhuyin'} onclick={() => (script = 'zhuyin')}>ㄓㄨㄥ</button>
					</div>
				</div>
				<h3 class={featTitle}>Pinyin &amp; zhuyin</h3>
			</div>
			<div class="{feat} col-span-2 md:col-span-7">
				<div>
					<div class="font-zh text-[24px] font-semibold tracking-[0.02em] sm:text-[30px]" lang="zh-Hans">
						{#each SENTENCE as [c, t] (c)}<span class={toneText(t)}>{c}</span>{/each}。
					</div>
					<div class="mt-1 text-muted">We need to develop.</div>
				</div>
				<h3 class={featTitle}>Example sentences</h3>
			</div>
			<div class="{feat} col-span-1 md:col-span-5">
				<div class="flex items-center gap-2.5 font-zh text-[32px] font-semibold sm:text-[40px]" lang="zh-Hans">
					<span class="text-tone-3">好</span><span class="text-[22px] text-muted">=</span><span>女</span><span
						class="text-[22px] text-muted">+</span
					><span>子</span>
				</div>
				<h3 class={featTitle}>Character breakdown</h3>
			</div>
			<div class="{feat} col-span-1 md:col-span-4">
				<div class="text-[19px] leading-[1.35]">within; among;<br /><span class="text-muted">in the middle</span></div>
				<h3 class={featTitle}>Meanings</h3>
			</div>
			<div class="{feat} col-span-1 md:col-span-4">
				<label class="flex w-fit cursor-pointer items-center gap-3 text-ink">
					<Plane class="size-5" aria-hidden="true" />
					<input type="checkbox" role="switch" bind:checked={offline} class="peer sr-only" aria-label="Offline" />
					<span class="xhz-switch" aria-hidden="true"></span>
				</label>
				<h3 class={featTitle}>Works offline</h3>
			</div>
			<div class="{feat} col-span-1 md:col-span-4">
				<div class="text-[44px] leading-none font-bold tracking-[-0.04em] sm:text-[56px]">1–9</div>
				<h3 class={featTitle}>Every level, one file</h3>
			</div>
		</div>
	</section>

	<!-- What else the project makes. -->
	<section class="mt-14 sm:mt-[88px]" aria-labelledby="more-h">
		<h2 id="more-h" class="{SECTION_H2} mb-6">More decks</h2>
		<div class="grid gap-2.5 md:grid-cols-3 md:gap-4">
			{#each more as m (m.href)}
				<a
					href={m.href}
					class={cx(
						tile,
						'xhz-lift group flex min-h-[200px] flex-col justify-between text-ink no-underline sm:min-h-[230px]',
						m.premium && 'shadow-[0_0_0_1px_var(--xhz-gold-soft),var(--xhz-shadow)]'
					)}
				>
					<span
						class={cx(
							'pointer-events-none absolute -top-5 -right-3 font-zh text-[150px] leading-none font-extrabold transition-transform duration-500 ease-spring group-hover:-rotate-6',
							m.premium ? 'text-gold opacity-[0.16]' : 'opacity-[0.055]'
						)}
						aria-hidden="true">{m.glyph}</span
					>
					<span class="relative flex gap-1.5" aria-hidden="true">
						{#each m.peek as p (p)}
							<span
								class={cx(
									'grid h-10 min-w-10 place-items-center rounded-xl px-2 font-zh text-lg font-semibold',
									m.premium
										? 'border-[1.5px] border-dashed border-gold/70 text-gold-ink'
										: 'bg-sunk',
									p === '+' && 'text-muted'
								)}>{p}</span
							>
						{/each}
					</span>
					<div class="relative">
						<h3 class="m-0 flex items-center gap-1.5 text-[17px] font-semibold tracking-[-0.01em]">
							{#if m.premium}<span class="size-2 rounded-full bg-gold" aria-hidden="true"></span>{/if}{m.title}<ChevronRight
								class="size-4 text-muted transition-transform group-hover:translate-x-0.5"
								aria-hidden="true"
							/>
						</h3>
						<p class="m-0 mt-1 max-w-[30ch] text-[15px] text-muted">{m.text}</p>
					</div>
				</a>
			{/each}
		</div>
	</section>

	<!-- Always open: people mid-collection on v2.3 should find their deck without hunting. -->
	<section class="mt-14 sm:mt-[88px]" aria-labelledby="v23-h">
		<h2 id="v23-h" class="{SECTION_H2} mb-2">Previous version</h2>
		<p class="mt-0 mb-6 text-muted">v2.3 · still on the four-card deck? Keep using it.</p>
		<div class="grid gap-2.5 sm:grid-cols-2 md:gap-4">
			{#each v23 as d (d.url)}
				<div class="flex items-center justify-between gap-3 rounded-panel bg-surface p-4 pl-5 shadow-object" title={d.desc}>
					<h3 class="m-0 text-base font-semibold text-ink">{d.name}</h3>
					<Button variant="secondary" size="sm" href={d.url} aria-label="Download {d.name} (v2.3)">
						<Download class="size-4" />.apkg
					</Button>
				</div>
			{/each}
		</div>
	</section>

	<details class="group mt-4 rounded-panel bg-surface shadow-object">
		<summary class="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 font-semibold text-ink">
			Older decks (HSK 2.0, 2021)
			<ChevronDown class="size-5 text-muted transition group-open:rotate-180" />
		</summary>
		<div class="grid gap-2 px-2.5 pb-2.5">
			{#each previous as p (p.name)}
				<div class="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-sunk p-4">
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<h3 class="m-0 text-base font-semibold text-ink">{p.name}</h3>
							{#if p.tag}<Badge tint="mint">{p.tag}</Badge>{/if}
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

<style>
	/* Hero stickers: hanzi as objects scattered around the headline. */
	.sticker {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		width: 66px;
		height: 76px;
		border-radius: 20px;
		background: var(--xhz-surface);
		box-shadow: var(--xhz-shadow-raised);
		transition: transform 0.4s var(--ease-spring);
	}
	.sticker:hover {
		transform: scale(1.12);
		rotate: 0deg !important;
	}
	.sticker b {
		font-size: 32px;
		font-weight: 700;
		line-height: 1;
	}
	.sticker small {
		font-size: 11px;
		font-weight: 650;
	}
	.sticker-1 { left: 0; top: 20px; rotate: -10deg; }
	.sticker-2 { display: none; }
	.sticker-3 { right: 0; top: 28px; rotate: 9deg; animation-delay: -1s; }
	.sticker-4 { display: none; }
	.sticker-5 { left: 30%; top: 4px; width: 56px; height: 64px; rotate: 4deg; animation-delay: -4s; }
	.sticker-6 { right: 26%; top: 54px; width: 56px; height: 64px; rotate: -5deg; animation-delay: -5s; }
	.sticker-5 b,
	.sticker-6 b { font-size: 28px; }
	@media (min-width: 761px) {
		.sticker { width: 92px; height: 104px; border-radius: 26px; }
		.sticker b { font-size: 46px; }
		.sticker small { font-size: 13px; }
		.sticker-1 { left: 2%; top: 60px; }
		.sticker-2 { display: flex; left: 11%; top: 250px; rotate: 7deg; animation-delay: -2s; }
		.sticker-3 { right: 3%; top: 48px; }
		.sticker-4 { display: flex; right: 12%; top: 240px; rotate: -6deg; animation-delay: -3s; }
		.sticker-5 { left: 22%; top: 8px; width: 70px; height: 80px; }
		.sticker-6 { right: 23%; top: 6px; width: 70px; height: 80px; }
		.sticker-5 b,
		.sticker-6 b { font-size: 34px; }
	}

	.bars {
		display: flex;
		align-items: center;
		gap: 3px;
		height: 26px;
	}
	.bars i {
		width: 4px;
		border-radius: 2px;
		background: var(--xhz-ink);
		animation: xhz-bars 1s ease-in-out infinite;
	}

	@media (prefers-reduced-motion: reduce) {
		.bars i { animation: none; }
	}
</style>
