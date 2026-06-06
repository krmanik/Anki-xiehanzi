<script lang="ts">
	import { base } from '$app/paths';
	import Download from '@lucide/svelte/icons/download';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	const rel = 'https://github.com/krmanik/Anki-xiehanzi/releases';

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

<svelte:head>
	<title>Download Decks — Anki xiehanzi</title>
</svelte:head>

<section class="mx-auto max-w-4xl px-5 py-12">
	<p class="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">Prebuilt decks</p>
	<h1 class="mt-2 text-4xl font-extrabold tracking-tight">Download Decks</h1>
	<p class="mt-3 max-w-2xl text-neutral-600">
		Download a ready-made <code class="rounded bg-neutral-100 px-1.5 py-0.5 text-sm">.apkg</code>,
		then import it in Anki via <strong>File → Import</strong>. Back up your collection with
		scheduling information first. Or
		<a class="text-indigo-600 underline underline-offset-2" href="{base}/create">build your own</a>.
	</p>

	<div class="mt-10 flex items-baseline justify-between border-b border-neutral-200 pb-2">
		<h2 class="text-xl font-bold">New HSK</h2>
		<span class="font-mono text-xs text-neutral-400">{current.version}</span>
	</div>

	<div class="mt-5 grid gap-4 sm:grid-cols-2">
		{#each current.decks as d}
			<a
				href={d.href}
				class="group flex flex-col justify-between rounded-lg border border-neutral-200 p-5 transition hover:border-neutral-900 hover:shadow-[4px_4px_0_0_#111]"
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

	<details class="group mt-12 rounded-lg border border-neutral-200">
		<summary
			class="flex cursor-pointer list-none items-center justify-between p-4 font-semibold"
		>
			Previous decks (HSK 2.0, 2021)
			<ChevronDown size={18} class="transition group-open:rotate-180" />
		</summary>
		<div class="space-y-3 border-t border-neutral-200 p-4">
			{#each previous as p}
				<div class="flex flex-wrap items-center justify-between gap-3 rounded border border-neutral-200 bg-neutral-50 p-4">
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<h4 class="font-semibold">{p.name}</h4>
							{#if p.tag}
								<span class="rounded-full bg-indigo-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-indigo-700">{p.tag}</span>
							{/if}
						</div>
						<p class="mt-1 text-sm text-neutral-600">{p.desc}</p>
					</div>
					<div class="flex gap-2">
						<a href={p.ankiweb} class="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:border-neutral-900">AnkiWeb</a>
						<a href={rel} class="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:border-neutral-900">GitHub</a>
					</div>
				</div>
			{/each}
		</div>
	</details>
</section>
