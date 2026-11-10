<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import Download from '@lucide/svelte/icons/download';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import Languages from '@lucide/svelte/icons/languages';
	import Grid2x2 from '@lucide/svelte/icons/grid-2x2';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import SquarePlus from '@lucide/svelte/icons/square-plus';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Check from '@lucide/svelte/icons/check';
	import { Button, PAGE, SECTION_H2 } from '$lib/ui';
	import HeroStudyCard from '$lib/components/home/HeroStudyCard.svelte';
	import { findDeck, loadHskDecks, type HskDeckEntry } from '$lib/hskDecks';

	// Word and level counts come from the deck manifest, so they never drift
	// from what the download holds.
	let deck = $state<HskDeckEntry | null>(null);
	onMount(async () => {
		deck = findDeck(await loadHskDecks(), 'new');
	});

	const shots = [
		{ src: 'ankimobile0.PNG', alt: 'A card front in AnkiMobile: 今天 with its pinyin and audio', caption: 'The word, with audio' },
		{ src: 'ankimobile1.PNG', alt: 'A card back in AnkiMobile: meaning, character breakdown and examples', caption: 'Meaning, breakdown, examples' },
		{ src: 'ankimobile2.png', alt: 'Example sentences with audio on a card back in AnkiMobile', caption: 'Sentences you can hear' }
	];

	const features: {
		title: string;
		text: string;
		icon: typeof PenLine;
		link?: { href: string; label: string };
	}[] = [
		{ title: 'Write every character', text: 'Draw the strokes in order on the card, with the outline to trace or hidden for recall.', icon: PenLine },
		{ title: "Hear how it's said", text: 'A native recording for each HSK word, and every other reading too.', icon: Volume2 },
		{ title: 'Know what it means', text: 'The common meaning first, full dictionary definitions behind it.', icon: Languages, link: { href: `${base}/dictionary`, label: 'Open the dictionary' } },
		{ title: "See how it's built", text: 'Each character split into its parts, with its radical named.', icon: Grid2x2 },
		{ title: 'Study anywhere', text: 'Works offline on AnkiMobile, AnkiDroid and Anki on desktop.', icon: Smartphone },
		{ title: 'Use your own words', text: 'Paste a text or a word list and get a deck in the same design.', icon: SquarePlus, link: { href: `${base}/create`, label: 'Create a deck' } }
	];

</script>

<svelte:head>
	<title>Anki-xiehanzi — learn to read and write Chinese in Anki</title>
</svelte:head>

<div class={PAGE}>
	<!-- hero -->
	<section class="grid items-center gap-10 pt-10 pb-8 md:grid-cols-[1fr_auto] md:gap-14 md:pt-20 md:pb-16">
		<div>
			<h1 class="m-0 text-[44px] leading-[0.98] font-bold tracking-[-0.045em] text-balance text-ink sm:text-[64px]">
				Learn to read and write Chinese in&nbsp;Anki.
			</h1>
			<p class="mt-5 mb-8 max-w-[34ch] text-[17px] text-muted sm:text-[19px]">
				Free HSK decks with stroke-order practice, native audio and full dictionary meanings.
			</p>
			<div class="flex flex-wrap items-center gap-3">
				<Button size="lg" href="{base}/hsk#decks"><Download class="size-5" />Download free HSK deck</Button>
				<Button size="lg" variant="secondary" href="{base}/create"
					><SquarePlus class="size-[18px]" />Create your own</Button
				>
				<Button size="lg" variant="premium" href="{base}/shop"
					><Sparkles class="size-[18px]" />Premium</Button
				>
			</div>
			<p class="mt-6 mb-0 text-[15px] text-muted">
				{deck ? `${deck.words.toLocaleString()} words` : 'Every HSK word'} · HSK 1–9 · iPhone, Android, desktop · Free
				and open source
			</p>
		</div>
		<div class="flex justify-center md:justify-end">
			<HeroStudyCard />
		</div>
	</section>

	<!-- real screenshots -->
	<section class="mt-14 sm:mt-[88px]" aria-labelledby="shots-h">
		<h2 id="shots-h" class="{SECTION_H2} mb-6">What a card looks like</h2>
		<div
			class="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0"
		>
			{#each shots as s (s.src)}
				<figure class="xhz-lift m-0 w-[78%] shrink-0 snap-start rounded-tile bg-surface p-3 pb-4 shadow-object sm:w-auto">
					<img
						src="{base}/img/{s.src}"
						alt={s.alt}
						loading="lazy"
						width="1290"
						height="2796"
						class="block h-auto w-full rounded-[22px]"
					/>
					<figcaption class="mt-3 px-1 text-[15px] font-semibold text-ink">{s.caption}</figcaption>
				</figure>
			{/each}
		</div>
	</section>

	<!-- outcomes -->
	<section class="mt-14 sm:mt-[88px]" aria-labelledby="feat-h">
		<h2 id="feat-h" class="{SECTION_H2} mb-6">What you'll be able to do</h2>
		<div class="grid gap-2.5 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
			{#each features as f (f.title)}
				{@const Icon = f.icon}
				<div class="xhz-lift flex flex-col rounded-[24px] bg-surface p-[22px] shadow-object sm:rounded-tile sm:p-[30px]">
					{#if f.title === "See how it's built"}
						<div class="flex items-center gap-2.5 font-zh text-[34px] leading-none font-semibold" aria-label="好 is 女 plus 子">
							<span class="text-tone-3">好</span>
							<span class="text-[20px] text-muted" aria-hidden="true">=</span>
							<span>女</span>
							<span class="text-[20px] text-muted" aria-hidden="true">+</span>
							<span>子</span>
						</div>
					{:else}
						<span class="grid size-11 place-items-center rounded-xl bg-sunk text-ink [&_svg]:size-5" aria-hidden="true"
							><Icon /></span
						>
					{/if}
					<h3 class="mt-5 mb-1 text-[17px] font-semibold tracking-[-0.01em] text-ink">{f.title}</h3>
					<p class="m-0 text-[15px] text-muted">{f.text}</p>
					{#if f.link}
						<a
							href={f.link.href}
							class="mt-3 inline-flex items-center gap-0.5 text-[15px] font-semibold text-ink underline-offset-4 hover:underline"
							>{f.link.label}<ChevronRight class="size-4" /></a
						>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<!-- premium -->
	<section class="mt-14 sm:mt-[88px]">
		<div
			class="grid items-center gap-8 rounded-[24px] bg-surface p-6 shadow-object sm:rounded-tile sm:p-10 md:grid-cols-[1fr_1.1fr]"
		>
			<div>
				<span class="inline-flex items-center gap-2 text-sm font-semibold text-ink"
					><span class="size-2 rounded-full bg-gold shadow-[0_0_0_3px_var(--xhz-gold-soft)]" aria-hidden="true"
					></span>Premium</span
				>
				<h2 class="mt-3 mb-0 text-[30px] leading-[1.05] font-bold tracking-[-0.035em] text-ink sm:text-[38px]">
					Separate writing cards, a dictionary inside every card
				</h2>
				<ul class="my-6 grid list-none gap-2.5 p-0">
					{#each ['Recognition and Writing cards for each word', 'Sentence audio for every example', 'Show or hide any field from a sidebar'] as line (line)}
						<li class="flex items-center gap-2.5 text-ink">
							<Check class="size-[18px] shrink-0 text-ok-ink" aria-hidden="true" />{line}
						</li>
					{/each}
				</ul>
				<Button variant="premium" href="{base}/shop"><Sparkles class="size-[18px]" />See Premium</Button>
			</div>
			<img
				src="{base}/img/shop/hsk-word-decks.jpg"
				alt="The premium HSK card: hanzi beside its readings, meaning, breakdown and example sentences"
				loading="lazy"
				class="block h-auto w-full rounded-[22px] shadow-raised"
			/>
		</div>
	</section>
</div>
