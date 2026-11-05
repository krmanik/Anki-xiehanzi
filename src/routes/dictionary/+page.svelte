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
	import { buttonClass, chipClass, IconDot, PageHeader } from '$lib/ui';
	import BookOpen from '@lucide/svelte/icons/book-open';
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

	const chip = 'rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted';
</script>

<svelte:head>
	<title>Dictionary · Anki-xiehanzi</title>
	<meta
		name="description"
		content="Search Chinese words and characters by hanzi, pinyin or English — readings, senses, stroke order, components, origin and example sentences."
	/>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
	<PageHeader title="Dictionary" subtitle="Hanzi, pinyin or English. Tap a character to see how it is written.">
		{#snippet lead()}
			<IconDot hue="mint" size="lg" shape="tile"><BookOpen /></IconDot>
		{/snippet}
	</PageHeader>

	<!-- Search -->
	<div class="sticky top-14 z-20 -mx-4 bg-ground/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
		<div class="flex min-h-12 items-center gap-2 rounded-card bg-sunk px-3.5 focus-within:ring-3 focus-within:ring-sky">
			<Search size={18} class="shrink-0 text-muted" />
			<input
				value={query}
				oninput={(e) => onInput(e.currentTarget.value)}
				placeholder="好 · nihao · to love"
				aria-label="Search the dictionary"
				class="w-full border-0 bg-transparent p-0 text-lg text-ink outline-none placeholder:text-muted focus:ring-0"
			/>
			{#if kindLabel}
				<span class="{chip} shrink-0">{kindLabel}</span>
			{/if}
			{#if query}
				<button
					type="button"
					onclick={() => search('')}
					aria-label="Clear search"
					class="shrink-0 text-muted/70 transition hover:text-ink"
				>
					<X size={16} />
				</button>
			{/if}
		</div>

		<div class="mt-2 flex flex-wrap items-center gap-2">
			{#if !ready && !loadError}
				<span class="text-xs text-muted">Loading the dictionary database (10 MB, once)…</span>
			{:else if loadError}
				<span class="text-xs text-rose-ink">Dictionary failed to load: {loadError}</span>
			{:else if searching}
				<span class="text-xs text-muted">Searching…</span>
			{:else if query && hits.length}
				<span class="text-xs text-muted">{hits.length} result{hits.length === 1 ? '' : 's'}</span>
			{/if}
			{#if bag.length}
				<button type="button" onclick={makeDeck} class="{buttonClass('primary', 'sm')} ml-auto">
					<Layers class="size-4" /> Make a deck ({bag.length})
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
								class="flex-1 rounded-card px-3 py-2 text-left transition
								{selected === hit.simplified ? 'bg-sky-soft' : 'hover:bg-sunk'}"
							>
								<span class="flex items-baseline gap-2">
									<!-- Tone colours on the list too, not only inside an entry: the
									     colour is half of what a learner recognizes a word by. -->
									<span class="text-xl" lang="zh-Hans">
										{#each colorizeHanzi(hit.simplified, hit.syllables) as part, i (i)}<span
												class="tone{part.tone}">{part.ch}</span
											>{/each}
									</span>
									<span class="text-[13px] text-muted">{hit.pinyin}</span>
									{#each levels.slice(0, 1) as lvl (lvl)}
										<span class="rounded-full bg-sky-soft px-2 py-0.5 text-xs font-semibold text-sky-ink">
											{lvl}
										</span>
									{/each}
								</span>
								<span class="mt-0.5 line-clamp-2 block text-sm text-muted">{hit.meaning}</span>
							</button>
							<button
								type="button"
								onclick={() => toggleBag(hit.simplified)}
								aria-label={bag.includes(hit.simplified)
									? `Remove ${hit.simplified} from the deck list`
									: `Add ${hit.simplified} to the deck list`}
								class="shrink-0 rounded-card px-2.5 text-muted transition hover:bg-sunk hover:text-ink"
							>
								{#if bag.includes(hit.simplified)}
									<Check size={15} class="text-mint-ink" />
								{:else}
									<Plus size={15} />
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{:else if query && ready && !searching}
				<p class="text-sm text-muted">
					Nothing matched “{query}”. Try pinyin without tones, or a single character.
				</p>
			{:else if !query}
				<div class="grid gap-5">
					<div>
						<h2 class="text-[13px] text-muted font-semibold">
							Try
						</h2>
						<div class="mt-2 flex flex-wrap gap-1.5">
							{#each EXAMPLES as ex (ex)}
								<button
									type="button"
									onclick={() => search(ex)}
									class={chipClass(false)}
								>
									{ex}
								</button>
							{/each}
						</div>
					</div>

					{#if recent.length}
						<div>
							<h2 class="text-[13px] text-muted font-semibold">
								Recent
							</h2>
							<div class="mt-2 flex flex-wrap gap-1.5">
								{#each recent as word (word)}
									<button
										type="button"
										onclick={() => open(word)}
										class="{chipClass(false)} font-zh text-base font-medium text-ink"
										lang="zh-Hans"
									>
										{word}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<div class="rounded-panel bg-sunk p-4 text-sm text-muted">
						<p class="m-0 font-semibold text-ink">Three ways to search</p>
						<ul class="mt-2 grid gap-1.5">
							<li><span class="font-semibold text-ink">汉字</span> — any word or character</li>
							<li><span class="font-semibold text-ink">pinyin</span> — with tones (hao3, hǎo) or without</li>
							<li><span class="font-semibold text-ink">english</span> — a meaning, e.g. “to love”</li>
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
				<p class="text-sm text-muted">Pick a result to see the full entry.</p>
			{:else}
				<div class="rounded-panel bg-sunk px-6 py-10 text-center">
					<p class="m-0 text-muted">Readings, stroke order, components, origin and example sentences.</p>
					<a href="{base}/create" class="{buttonClass('text', 'sm')} mt-2">Or build a deck from your own words →</a>
				</div>
			{/if}
		</section>
	</div>
</div>
