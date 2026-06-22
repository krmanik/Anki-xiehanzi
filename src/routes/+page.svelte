<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import Shapes from '@lucide/svelte/icons/shapes';
	import Languages from '@lucide/svelte/icons/languages';
	import AudioLines from '@lucide/svelte/icons/audio-lines';
	import Brush from '@lucide/svelte/icons/brush';
	import SpellCheck from '@lucide/svelte/icons/spell-check';
	import Download from '@lucide/svelte/icons/download';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import Book from '@lucide/svelte/icons/book';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	const repo = 'https://github.com/krmanik/Anki-xiehanzi';

	let logoEl: HTMLDivElement;

	onMount(async () => {
		const HanziWriter = (await import('hanzi-writer')).default;
		const xiehanzi = ['写', '汉', '字'];
		for (const hanzi of xiehanzi) {
			const target = document.createElement('div');
			logoEl.appendChild(target);
			const writer = HanziWriter.create(target, hanzi, {
				width: 72,
				height: 72,
				padding: 4,
				strokeColor: hanzi == '写' ? '#4f46e5' : '#171717'
			});
			writer.loopCharacterAnimation();
		}
	});

	const features = [
		{ title: 'HSK 3.0', icon: Shapes, description: 'Learn, read and write HSK 1–9 characters in Anki.' },
		{ title: 'Meanings', icon: Languages, description: 'Common meanings plus full dictionary definitions.' },
		{ title: 'Pinyin', icon: SpellCheck, description: 'Tone-marked pinyin with matching tone colors.' },
		{ title: 'Strokes', icon: Brush, description: 'Practice stroke order for simplified and traditional.' },
		{ title: 'Audio', icon: AudioLines, description: 'HSK recordings and text-to-speech audio.' },
		{ title: 'Zhuyin', icon: SpellCheck, description: 'Bopomofo (zhuyin) alongside every word.' }
	];

	const cards = [
		{ title: 'Download', icon: Download, link: `${base}/decks`, description: 'Get ready-made HSK 1–9 decks for Anki.' },
		{ title: 'Guide', icon: Book, link: `${base}/docs`, description: 'See features and how to use the decks.' }
	];
</script>

<svelte:head>
	<title>Anki xiehanzi — learn to write Chinese</title>
</svelte:head>

<!-- hero -->
<header class="border-b border-neutral-200">
	<div class="mx-auto max-w-3xl px-5 py-20 text-center">
		<div bind:this={logoEl} class="flex justify-center gap-2"></div>
		<p class="mt-6 font-mono text-xs uppercase tracking-[0.3em] text-neutral-400">
			Mandarin · Anki · open source
		</p>
		<h1 class="mt-3 text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl">
			Learn to <span class="text-indigo-600">write</span> Chinese.
		</h1>
		<p class="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
			Read, write and practice Mandarin by drawing strokes in Anki — with pinyin, zhuyin, audio and
			rich dictionary meanings.
		</p>
		<div class="mt-8 flex flex-wrap justify-center gap-3">
			<a
				href="{base}/create"
				class="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
			>
				Create a deck <ArrowRight size={16} />
			</a>
			<a
				href="{base}/decks"
				class="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-800 transition hover:border-neutral-900"
				>Download decks</a
			>
		</div>
	</div>
</header>

<!-- features -->
<section class="mx-auto max-w-6xl px-5 py-16">
	<p class="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">What you get</p>
	<h2 class="mt-2 text-2xl font-bold tracking-tight">Everything to practice hanzi</h2>
	<div class="mt-8 grid gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2 lg:grid-cols-3">
		{#each features as f}
			<div class="bg-white p-6 transition hover:bg-neutral-50">
				<f.icon size={22} class="text-indigo-600" />
				<h3 class="mt-3 font-semibold">{f.title}</h3>
				<p class="mt-1 text-sm leading-relaxed text-neutral-600">{f.description}</p>
			</div>
		{/each}
	</div>
</section>

<!-- download banner -->
<section class="mx-auto max-w-6xl px-5 pb-16">
	<div class="flex flex-col items-center gap-4 rounded-2xl bg-neutral-900 px-6 py-12 text-center">
		<h2 class="max-w-xl text-2xl font-bold tracking-tight text-white sm:text-3xl">
			Download ready-made HSK decks
		</h2>
		<p class="max-w-md text-neutral-400">
			Get pre-built Anki decks covering HSK 1–9 with audio, pinyin, zhuyin and stroke order.
		</p>
		<a
			href="{base}/decks"
			class="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200"
		>
			Browse decks <ArrowRight size={16} />
		</a>
	</div>
</section>

<!-- get started cards -->
<section class="mx-auto max-w-6xl px-5 pb-20">
	<p class="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">Get started</p>
	<div class="mt-6 grid gap-4 md:grid-cols-3">
		{#each cards as c}
			<a
				href={c.link}
				class="group rounded-xl border border-neutral-200 p-6 transition hover:-translate-y-0.5 hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111]"
			>
				<c.icon size={22} class="text-indigo-600" />
				<h3 class="mt-3 flex items-center gap-1 font-semibold">
					{c.title}
					<ArrowRight size={15} class="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
				</h3>
				<p class="mt-1 text-sm leading-relaxed text-neutral-600">{c.description}</p>
			</a>
		{/each}
	</div>
</section>
