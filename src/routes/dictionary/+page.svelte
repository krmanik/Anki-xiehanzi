<script lang="ts">
	/**
	 * The dictionary — search by hanzi, pinyin or English, and read everything
	 * the project knows about the result: readings and senses, the characters it
	 * is written with, how each of those is written and built, where the glyph
	 * came from, what else uses it, and the word in real sentences.
	 *
	 * Search runs against cedict.db (10 MB zipped), the same database the deck
	 * creator uses. It is fetched once per session, in the background, from the
	 * moment the page opens — so unlike `/hsk` and `/radicals`, this page does
	 * pull the big database, because a dictionary that only knows a word list is
	 * not a dictionary.
	 */
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import WordEntry from '$lib/components/dict/WordEntry.svelte';
	import { loadCedict, searchDictionary } from '$lib/dict/cedict';
	import { frequencyBand, levelLabels, queryKind, type SearchHit } from '$lib/dictionary';
	import { colorizeHanzi } from '$lib/tone';
	import { setPendingWords } from '$lib/hskHandoff';
	import { btnPrimary } from '$lib/buttonStyles';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import Layers from '@lucide/svelte/icons/layers';

	const BAG_KEY = 'xiehanzi:dict-bag';
	const RECENT_KEY = 'xiehanzi:dict-recent';

	const EXAMPLES = ['好', '分', '爱', 'nihao', 'xue2', 'water', 'to love'];

	let query = $state('');
	let hits = $state<SearchHit[]>([]);
	let selected = $state<string | null>(null);
	let searching = $state(false);
	let ready = $state(false);
	let loadError = $state('');
	let recent = $state<string[]>([]);
	let bag = $state<string[]>([]);

	const kind = $derived(queryKind(query));
	const KIND_LABELS: Record<string, string> = {
		hanzi: 'hanzi',
		pinyin: 'pinyin',
		english: 'english',
		both: 'pinyin + english'
	};
	const kindLabel = $derived(KIND_LABELS[kind] ?? '');

	function readList(key: string): string[] {
		try {
			const raw = localStorage.getItem(key);
			const parsed = raw ? JSON.parse(raw) : [];
			return Array.isArray(parsed) ? parsed.map(String) : [];
		} catch {
			return [];
		}
	}

	function writeList(key: string, value: string[]): void {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			/* storage disabled — the list simply does not persist */
		}
	}

	// Restore + load exactly once. Not an `$effect`: the effect would read
	// `page.url`, which this page rewrites on every keystroke, and re-run the
	// search each time it did.
	onMount(() => {
		recent = readList(RECENT_KEY);
		bag = readList(BAG_KEY);
		const initial = page.url.searchParams.get('q') ?? '';
		const word = page.url.searchParams.get('w');
		if (initial) query = initial;
		if (word) selected = word;
		loadCedict()
			.then(() => {
				ready = true;
				if (query) void run(query);
			})
			.catch((e) => (loadError = e instanceof Error ? e.message : String(e)));
	});

	let timer: ReturnType<typeof setTimeout> | null = null;
	let latest = 0;

	async function run(q: string): Promise<void> {
		const token = ++latest;
		if (!q.trim()) {
			hits = [];
			searching = false;
			return;
		}
		searching = true;
		try {
			const found = await searchDictionary(q, 60);
			if (token === latest) hits = found;
		} finally {
			if (token === latest) searching = false;
		}
	}

	function onInput(value: string): void {
		query = value;
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => ready && void run(value), 180);
		syncUrl(value, selected);
	}

	function syncUrl(q: string, word: string | null): void {
		const params = new URLSearchParams();
		if (q.trim()) params.set('q', q.trim());
		if (word) params.set('w', word);
		const search = params.toString();
		void goto(`${base}/dictionary${search ? `?${search}` : ''}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	function open(word: string): void {
		selected = word;
		recent = [word, ...recent.filter((w) => w !== word)].slice(0, 12);
		writeList(RECENT_KEY, recent);
		syncUrl(query, word);
		// On a phone the results list fills the screen, so the entry has to be
		// scrolled to; `scrollIntoView` is missing in jsdom and old webviews.
		const entry = document.getElementById('entry');
		entry?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
	}

	function search(value: string): void {
		onInput(value);
		void run(value);
	}

	function toggleBag(word: string): void {
		bag = bag.includes(word) ? bag.filter((w) => w !== word) : [...bag, word];
		writeList(BAG_KEY, bag);
	}

	/** Hand the bag to the deck creator through the sessionStorage bridge. */
	function makeDeck(): void {
		if (!bag.length) return;
		setPendingWords({
			label: `Dictionary · ${bag.length} word${bag.length === 1 ? '' : 's'}`,
			words: bag,
			options: { audio: true, examples: true }
		});
		void goto(`${base}/create`);
	}

	const chip =
		'rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] text-neutral-500';
</script>

<svelte:head>
	<title>Dictionary · Anki-xiehanzi</title>
	<meta
		name="description"
		content="Search Chinese words and characters by hanzi, pinyin or English — readings, senses, stroke order, components, origin and example sentences."
	/>
</svelte:head>

<div class="mx-auto max-w-6xl px-5 py-10">
	<header class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">Dictionary</h1>
		<p class="mt-2 max-w-2xl text-neutral-600">
			Look a word up by hanzi, pinyin or English, then click any character to see how it is
			written, what it is built from and where it came from.
		</p>
	</header>

	<!-- Search -->
	<div class="sticky top-14 z-20 -mx-5 bg-white/85 px-5 py-3 backdrop-blur">
		<div class="flex items-center gap-2 rounded-xl border border-neutral-900 bg-white px-3 py-2">
			<Search size={18} class="shrink-0 text-neutral-400" />
			<input
				value={query}
				oninput={(e) => onInput(e.currentTarget.value)}
				placeholder="好 · nihao · to love"
				aria-label="Search the dictionary"
				class="w-full bg-transparent text-lg outline-none placeholder:text-neutral-300"
			/>
			{#if kindLabel}
				<span class="{chip} shrink-0">{kindLabel}</span>
			{/if}
			{#if query}
				<button
					type="button"
					onclick={() => search('')}
					aria-label="Clear search"
					class="shrink-0 text-neutral-300 transition hover:text-neutral-900"
				>
					<X size={16} />
				</button>
			{/if}
		</div>

		<div class="mt-2 flex flex-wrap items-center gap-2">
			{#if !ready && !loadError}
				<span class="text-xs text-neutral-400">Loading the dictionary database (10 MB, once)…</span>
			{:else if loadError}
				<span class="text-xs text-red-600">Dictionary failed to load: {loadError}</span>
			{:else if searching}
				<span class="text-xs text-neutral-400">Searching…</span>
			{:else if query && hits.length}
				<span class="text-xs text-neutral-400">{hits.length} result{hits.length === 1 ? '' : 's'}</span>
			{/if}
			{#if bag.length}
				<button type="button" onclick={makeDeck} class="{btnPrimary} ml-auto !px-3 !py-1.5 !text-xs">
					<span class="flex items-center gap-1.5"><Layers size={13} /> Make a deck ({bag.length})</span>
				</button>
			{/if}
		</div>
	</div>

	<div class="mt-4 grid gap-6 lg:grid-cols-[320px_1fr]">
		<!-- Results -->
		<aside class="lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
			{#if hits.length}
				<ul class="grid gap-1">
					{#each hits as hit (hit.simplified + hit.syllables)}
						{@const levels = levelLabels(hit.level)}
						<li class="flex items-stretch gap-1">
							<button
								type="button"
								onclick={() => open(hit.simplified)}
								class="flex-1 rounded-xl border px-3 py-2 text-left transition
								{selected === hit.simplified
									? 'border-neutral-900 bg-neutral-50'
									: 'border-transparent hover:border-neutral-200'}"
							>
								<span class="flex items-baseline gap-2">
									<!-- Tone colours on the list too, not only inside an entry: the
									     colour is half of what a learner recognizes a word by. -->
									<span class="text-xl" lang="zh-Hans">
										{#each colorizeHanzi(hit.simplified, hit.syllables) as part, i (i)}<span
												class="tone{part.tone}">{part.ch}</span
											>{/each}
									</span>
									<span class="text-xs text-neutral-500">{hit.pinyin}</span>
									{#each levels.slice(0, 1) as lvl (lvl)}
										<span class="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700">
											{lvl}
										</span>
									{/each}
								</span>
								<span class="mt-0.5 line-clamp-2 block text-xs text-neutral-600">{hit.meaning}</span>
							</button>
							<button
								type="button"
								onclick={() => toggleBag(hit.simplified)}
								aria-label={bag.includes(hit.simplified)
									? `Remove ${hit.simplified} from the deck list`
									: `Add ${hit.simplified} to the deck list`}
								class="shrink-0 rounded-xl border border-transparent px-2 text-neutral-300 transition hover:border-neutral-200 hover:text-neutral-900"
							>
								{#if bag.includes(hit.simplified)}
									<Check size={15} class="text-emerald-600" />
								{:else}
									<Plus size={15} />
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{:else if query && ready && !searching}
				<p class="text-sm text-neutral-500">
					Nothing matched “{query}”. Try pinyin without tones, or a single character.
				</p>
			{:else if !query}
				<div class="grid gap-5">
					<div>
						<h2 class="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-400">
							Try
						</h2>
						<div class="mt-2 flex flex-wrap gap-1.5">
							{#each EXAMPLES as ex (ex)}
								<button
									type="button"
									onclick={() => search(ex)}
									class="rounded-full border border-neutral-200 px-3 py-1 text-sm text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-900"
								>
									{ex}
								</button>
							{/each}
						</div>
					</div>

					{#if recent.length}
						<div>
							<h2 class="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-400">
								Recent
							</h2>
							<div class="mt-2 flex flex-wrap gap-1.5">
								{#each recent as word (word)}
									<button
										type="button"
										onclick={() => open(word)}
										class="rounded-full border border-neutral-200 px-3 py-1 text-lg leading-tight transition hover:border-neutral-900"
										lang="zh-Hans"
									>
										{word}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
						<p class="font-medium text-neutral-900">Three ways to search</p>
						<ul class="mt-2 grid gap-1.5">
							<li><span class="font-mono text-xs text-neutral-400">汉字</span> — any word or character</li>
							<li><span class="font-mono text-xs text-neutral-400">pinyin</span> — with tones (hao3, hǎo) or without</li>
							<li><span class="font-mono text-xs text-neutral-400">english</span> — a meaning, e.g. “to love”</li>
						</ul>
					</div>
				</div>
			{/if}
		</aside>

		<!-- Entry -->
		<section id="entry" class="min-w-0">
			{#if selected}
				{#key selected}
					<WordEntry word={selected} onOpenWord={open} />
				{/key}
			{:else if hits.length}
				<p class="text-sm text-neutral-400">Pick a result to see the full entry.</p>
			{:else}
				<div class="rounded-2xl border border-dashed border-neutral-200 p-8 text-center">
					<p class="text-neutral-500">
						Search above to open an entry — readings, senses, stroke order, components, origin,
						related characters and example sentences.
					</p>
					<a
						href="{base}/create"
						class="mt-4 inline-block text-sm text-indigo-600 underline underline-offset-4"
					>
						Or build a deck from your own word list →
					</a>
				</div>
			{/if}
		</section>
	</div>
</div>
