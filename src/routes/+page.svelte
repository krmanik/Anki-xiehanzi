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

	const repo = 'https://github.com/krmanik/Anki-xiehanzi';
	const tagline = 'Learn, read, write and practice Mandarin by drawing strokes in Anki';

	let logoEl: HTMLDivElement;

	onMount(async () => {
		const HanziWriter = (await import('hanzi-writer')).default;
		const xiehanzi = ['写', '汉', '字'];
		for (const hanzi of xiehanzi) {
			const target = document.createElement('div');
			logoEl.appendChild(target);
			const writer = HanziWriter.create(target, hanzi, {
				width: 80,
				height: 80,
				padding: 5,
				strokeColor: hanzi == '写' ? '#4caf50' : '#2196f3'
			});
			writer.loopCharacterAnimation();
		}
	});

	const features = [
		{ title: 'HSK 3.0', icon: Shapes, description: 'Learn, read and write HSK 3.0 (HSK 1-9) characters in Anki.' },
		{ title: 'Meanings', icon: Languages, description: 'Learn definitions of characters with audio and detailed meaning.' },
		{ title: 'Pinyin', icon: SpellCheck, description: 'Learn pronunciations of character with Pinyin and Zhuyin.' },
		{ title: 'Strokes', icon: Brush, description: 'Practice strokes order of simplified and traditional characters by drawing strokes.' },
		{ title: 'Audio', icon: AudioLines, description: 'Learn definitions of characters with audio and detailed meaning.' },
		{ title: 'Zhuyin', icon: SpellCheck, description: 'Learn pronunciations of character with Pinyin and Zhuyin.' }
	];

	const cards = [
		{ title: 'Import', icon: Download, link: `${base}/decks`, description: 'Import HSK 3.0 decks in Anki with simplified, traditional, pinyin, zhuyin, audio and meanings.' },
		{ title: 'Create', icon: SquarePen, link: `${base}/create`, description: 'Create your own xiehanzi decks for Anki with simplified, traditional, pinyin, zhuyin, audio and meanings.' },
		{ title: 'Guide', icon: Book, link: `${base}/features`, description: 'Follow documentations on how to customize and update the Anki xiehanzi decks.' }
	];
</script>

<svelte:head>
	<title>Anki xiehanzi</title>
</svelte:head>

<header class="relative overflow-hidden py-16 text-center">
	<div class="container mx-auto px-4">
		<div bind:this={logoEl} class="flex justify-center gap-2"></div>
		<h1 class="mt-4 text-4xl font-bold">Anki xiehanzi</h1>
		<p class="mt-2 text-lg text-gray-600">{tagline}</p>
		<div class="mt-6 flex flex-wrap justify-center gap-3">
			<a
				href="{base}/features"
				class="rounded border border-sky-500 px-5 py-2 font-medium text-sky-600 hover:bg-sky-50"
				>Getting Started</a
			>
			<a
				href="{base}/create"
				class="rounded border border-sky-500 px-5 py-2 font-medium text-sky-600 hover:bg-sky-50"
				>Create Deck</a
			>
			<a
				href="{base}/decks"
				class="rounded border border-green-500 px-5 py-2 font-medium text-green-600 hover:bg-green-50"
				>Download Decks</a
			>
		</div>
	</div>
</header>

<section class="py-8">
	<div class="container mx-auto px-4">
		<div class="mb-8 text-center text-3xl font-bold">Features</div>
		<div class="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
			{#each features as f}
				<div class="px-2 text-center">
					<div class="flex justify-center text-indigo-600">
						<f.icon size={36} />
					</div>
					<h3 class="mt-2 text-xl font-semibold">{f.title}</h3>
					<p class="text-gray-600">{f.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="px-4">
	<div class="my-12 flex flex-col items-center bg-indigo-600 p-12 text-center">
		<div class="p-4 text-3xl font-bold text-white">
			Want to generate your own Anki xiehanzi decks?
		</div>
		<a
			href="{base}/create"
			class="m-2 rounded bg-white px-6 py-3 font-semibold text-indigo-600 hover:bg-gray-100"
			>Create Now</a
		>
	</div>
</section>

<section class="py-8">
	<div class="mb-8 text-center text-4xl font-bold">Ready to dive in?</div>
	<div class="container mx-auto px-4">
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			{#each cards as c}
				<a
					href={c.link}
					class="group rounded border border-gray-200 p-4 transition hover:bg-indigo-600 hover:text-white"
				>
					<div class="mt-4 flex justify-center text-indigo-600 group-hover:text-white">
						<c.icon size={36} />
					</div>
					<h3 class="mt-2 text-center text-xl font-semibold">{c.title}</h3>
					<p class="mt-2 text-gray-600 group-hover:text-white">{c.description}</p>
				</a>
			{/each}
		</div>
	</div>
</section>
