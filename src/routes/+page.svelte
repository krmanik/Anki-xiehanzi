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
	import Check from '@lucide/svelte/icons/check';
	import { Badge, Button, IconDot, type Hue } from '$lib/ui';
	import HeroStudyCard from '$lib/components/home/HeroStudyCard.svelte';
	import AnkiStats from '$lib/components/home/AnkiStats.svelte';
	import { anki, probeAnki } from '$lib/anki/ankiStatus.svelte';
	import { loadProgress, watchProgress } from '$lib/anki/progress.svelte';
	import { findDeck, loadHskDecks, type HskDeckEntry } from '$lib/hskDecks';

	// Word and level counts come from the deck manifest, so they never drift
	// from what the download holds.
	let deck = $state<HskDeckEntry | null>(null);
	onMount(() => {
		loadHskDecks().then((m) => (deck = findDeck(m, 'new')));
		// Stats only for a browser that has connected before — Home never asks.
		probeAnki();
		return watchProgress();
	});
	$effect(() => {
		if (anki.status === 'ready') void loadProgress();
	});

	const shots = [
		{ src: 'ankimobile0.PNG', alt: 'A card front in AnkiMobile: 今天 with its pinyin and audio', caption: 'The word, with audio', dot: 'bg-rose' },
		{ src: 'ankimobile1.PNG', alt: 'A card back in AnkiMobile: meaning, character breakdown and examples', caption: 'Meaning, breakdown, examples', dot: 'bg-sky' },
		{ src: 'ankimobile2.png', alt: 'Example sentences with audio on a card back in AnkiMobile', caption: 'Sentences you can hear', dot: 'bg-mint' }
	];

	const features: {
		title: string;
		text: string;
		hue: Hue;
		icon: typeof PenLine;
		link?: { href: string; label: string };
	}[] = [
		{ title: 'Write every character', text: 'Draw the strokes in order on the card, with the outline to trace or hidden for recall.', hue: 'rose', icon: PenLine },
		{ title: "Hear how it's said", text: 'A native recording for each HSK word, and every other reading too.', hue: 'mint', icon: Volume2 },
		{ title: 'Know what it means', text: 'The common meaning first, full dictionary definitions behind it.', hue: 'sky', icon: Languages, link: { href: `${base}/dictionary`, label: 'Open the dictionary' } },
		{ title: "See how it's built", text: 'Each character split into its parts, with its radical named.', hue: 'apricot', icon: Grid2x2 },
		{ title: 'Study anywhere', text: 'Works offline on AnkiMobile, AnkiDroid and Anki on desktop.', hue: 'lavender', icon: Smartphone },
		{ title: 'Use your own words', text: 'Paste a text or a word list and get a deck in the same design.', hue: 'sky', icon: SquarePlus, link: { href: `${base}/create`, label: 'Create a deck' } }
	];

	const PANEL: Record<Hue, string> = {
		rose: 'bg-rose-soft',
		apricot: 'bg-apricot-soft',
		mint: 'bg-mint-soft',
		sky: 'bg-sky-soft',
		lavender: 'bg-lavender-soft'
	};
</script>

<svelte:head>
	<title>Anki-xiehanzi — learn to read and write Chinese in Anki</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 sm:px-6">
	<!-- hero -->
	<section class="grid items-center gap-10 py-8 md:grid-cols-[1.1fr_0.9fr] md:gap-14 md:py-14">
		<div>
			<h1 class="m-0 text-[clamp(34px,4.6vw,54px)] leading-[1.1] font-bold tracking-tight text-ink">
				Learn to read and <span class="text-rose-ink">write</span> Chinese in&nbsp;Anki.
			</h1>
			<p class="mt-4 mb-7 max-w-[34ch] text-lg text-muted">
				Free HSK decks with stroke-order practice, native audio and full dictionary meanings.
			</p>
			<div class="flex flex-wrap items-center gap-x-5 gap-y-2">
				<Button href="{base}/hsk#decks"><Download class="size-[18px]" />Download free HSK deck</Button>
				<Button variant="text" href="{base}/shop">See Premium<ChevronRight class="size-4" /></Button>
				<Button variant="text" href="{base}/create">Create your own<ChevronRight class="size-4" /></Button>
			</div>
			<div class="mt-6 flex flex-wrap gap-1.5">
				<Badge tint="sky"
					>{deck ? `${deck.words.toLocaleString()} words` : 'Every HSK word'} · HSK 1–9</Badge
				>
				<Badge tint="mint">Audio for every word</Badge>
				<Badge tint="lavender">iPhone · Android · desktop</Badge>
				<Badge tint="rose">Free and open source</Badge>
			</div>
		</div>
		<div class="flex justify-center md:justify-end">
			<HeroStudyCard />
		</div>
	</section>

	<AnkiStats />

	<!-- real screenshots -->
	<section class="py-10" aria-labelledby="shots-h">
		<h2 id="shots-h" class="m-0 text-[28px] font-bold text-ink">What a card looks like</h2>
		<p class="mt-1 mb-6 text-muted">Real screenshots from AnkiMobile.</p>
		<div
			class="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0"
		>
			{#each shots as s (s.src)}
				<figure class="m-0 w-[78%] shrink-0 snap-start rounded-[22px] bg-sunk p-4 pb-3 sm:w-auto">
					<img
						src="{base}/img/{s.src}"
						alt={s.alt}
						loading="lazy"
						width="1290"
						height="2796"
						class="block h-auto w-full rounded-[18px]"
					/>
					<figcaption class="mt-2.5 flex items-center gap-2 text-[15px] font-semibold text-ink">
						<span class="size-2.5 rounded-full {s.dot}" aria-hidden="true"></span>{s.caption}
					</figcaption>
				</figure>
			{/each}
		</div>
	</section>

	<!-- outcomes -->
	<section class="py-10" aria-labelledby="feat-h">
		<h2 id="feat-h" class="m-0 text-[28px] font-bold text-ink">What you'll be able to do</h2>
		<p class="mt-1 mb-6 text-muted">Every word comes with what you need to learn it.</p>
		<div class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as f (f.title)}
				{@const Icon = f.icon}
				<div class="rounded-panel p-5 {PANEL[f.hue]}">
					<IconDot hue={f.hue}><Icon /></IconDot>
					<h3 class="mt-3.5 mb-1 text-lg font-semibold text-ink">{f.title}</h3>
					<p class="m-0 text-[15px] text-muted">{f.text}</p>
					{#if f.title === "See how it's built"}
						<div class="mt-3.5 flex items-center gap-2.5 font-zh font-bold" aria-label="好 is 女 plus 子">
							<IconDot hue="mint" size="lg">好</IconDot>
							<span class="text-muted" aria-hidden="true">=</span>
							<IconDot hue="mint" class="size-10 text-lg">女</IconDot>
							<span class="text-muted" aria-hidden="true">+</span>
							<IconDot hue="mint" class="size-10 text-lg">子</IconDot>
						</div>
					{/if}
					{#if f.link}
						<a href={f.link.href} class="mt-3 inline-flex items-center gap-0.5 text-[15px] font-semibold text-accent no-underline hover:underline"
							>{f.link.label}<ChevronRight class="size-4" /></a
						>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<!-- premium -->
	<section class="py-10">
		<div class="grid items-center gap-8 rounded-[24px] bg-apricot-soft p-6 sm:p-9 md:grid-cols-[1fr_1.1fr]">
			<div>
				<span class="inline-block rounded-full bg-apricot px-2.5 py-0.5 text-[13px] font-bold text-[#4a2a00]">Premium</span>
				<h2 class="mt-3 mb-0 text-[28px] leading-tight font-bold text-ink">
					Separate writing cards, a dictionary inside every card
				</h2>
				<ul class="my-5 grid list-none gap-2.5 p-0">
					{#each [['rose', 'Recognition and Writing cards for each word'], ['mint', 'Sentence audio for every example'], ['sky', 'Show or hide any field from a sidebar']] as [hue, line] (line)}
						<li class="flex items-center gap-2.5 text-ink">
							<IconDot hue={hue as Hue} size="sm"><Check /></IconDot>{line}
						</li>
					{/each}
				</ul>
				<Button href="{base}/shop">See Premium</Button>
			</div>
			<img
				src="{base}/img/shop/hsk-word-decks.jpg"
				alt="The premium HSK card: hanzi beside its readings, meaning, breakdown and example sentences"
				loading="lazy"
				class="block h-auto w-full rounded-card shadow-[0_6px_24px_rgba(120,70,0,.12)]"
			/>
		</div>
	</section>
</div>
