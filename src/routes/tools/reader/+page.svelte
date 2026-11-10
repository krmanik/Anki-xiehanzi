<script lang="ts">
	import { PageHeader } from '$lib/ui';
	/**
	 * Paste-text reader: segment pasted text in reading order (unlike the deck
	 * creator's `cutParagraph`, nothing here is deduped or filtered — punctuation
	 * and non-Chinese runs are kept so the original text reads back faithfully),
	 * tone-color every Chinese word, and open a dictionary entry on click.
	 *
	 * Pinyin/colorize/size are read-time toggles, not analysis options — they
	 * flip instantly over the already-segmented `tokens`, so `analyze()` never
	 * reruns for them.
	 */
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { initJieba, segmentOrdered } from '$lib/deck';
	import { lookup, type CedictEntry } from '$lib/dict/cedict';
	import { speakPiper, stopPiper } from '$lib/dict/piperTts';
	import { toneDigits } from '$lib/tone';
	import { setPendingWords } from '$lib/hskHandoff';
	import { buildHskLookup, wordsAbove } from '$lib/hskCoverage';
	import { btnPrimary, btnSecondary } from '$lib/buttonStyles';
	import PickerModal from '$lib/components/PickerModal.svelte';
	import WordEntry from '$lib/components/dict/WordEntry.svelte';
	import WordPopup from '$lib/components/dict/WordPopup.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import Layers from '@lucide/svelte/icons/layers';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import Square from '@lucide/svelte/icons/square';
	import Loader from '@lucide/svelte/icons/loader-circle';
	import Captions from '@lucide/svelte/icons/captions';
	import Palette from '@lucide/svelte/icons/palette';
	import Pencil from '@lucide/svelte/icons/pencil';
	import X from '@lucide/svelte/icons/x';

	const CHINESE = /[一-龥]/;
	const PREFS_KEY = 'xhz.reader.prefs';
	const SAMPLE =
		'我每天都在学习中文，因为我喜欢中国的文化和历史。今天老师教了我们十个新的汉字，虽然有点难，但是很有意思！';
	const SIZES = [
		{ id: 'sm', label: 'S', cls: 'text-lg', rt: 'text-xs' },
		{ id: 'md', label: 'M', cls: 'text-2xl', rt: 'text-xs' },
		{ id: 'lg', label: 'L', cls: 'text-3xl', rt: 'text-sm' }
	] as const;

	let text = $state('');
	let tokens = $state<string[]>([]);
	let entries = $state<Map<string, CedictEntry | null>>(new Map());
	let selected = $state<string | null>(null);
	let anchor = $state<DOMRect | null>(null);
	let fullWord = $state<string | null>(null);
	let bag = $state<Set<string>>(new Set());
	let jiebaReady = false;
	let analyzing = $state(false);
	let speaking = $state(false);
	let ttsStatus = $state('');
	let error = $state('');
	let inputCollapsed = $state(false);

	let showPinyin = $state(true);
	let colorize = $state(true);
	let sizeId = $state<(typeof SIZES)[number]['id']>('md');
	const size = $derived(SIZES.find((s) => s.id === sizeId) ?? SIZES[1]);

	try {
		const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
		if (typeof saved.pinyin === 'boolean') showPinyin = saved.pinyin;
		if (typeof saved.colorize === 'boolean') colorize = saved.colorize;
		if (SIZES.some((s) => s.id === saved.size)) sizeId = saved.size;
	} catch {
		/* first visit, or storage blocked — defaults stand */
	}

	$effect(() => {
		try {
			localStorage.setItem(
				PREFS_KEY,
				JSON.stringify({ pinyin: showPinyin, colorize, size: sizeId })
			);
		} catch {
			/* storage full or blocked — reading still works, just won't stick */
		}
	});

	async function analyze() {
		if (!text.trim() || analyzing) return;
		analyzing = true;
		error = '';
		try {
			if (!jiebaReady) {
				await initJieba();
				jiebaReady = true;
			}
			const cut = segmentOrdered(text);
			const unique = [...new Set(cut.filter((t) => CHINESE.test(t)))];
			const looked = await Promise.all(unique.map((w) => lookup(w).catch(() => null)));
			const map = new Map<string, CedictEntry | null>();
			unique.forEach((w, i) => map.set(w, looked[i]));
			entries = map;
			tokens = cut;
			inputCollapsed = true;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			analyzing = false;
		}
	}

	function clear() {
		text = '';
		tokens = [];
		entries = new Map();
		inputCollapsed = false;
		void stopPiper();
		speaking = false;
		ttsStatus = '';
	}

	function loadSample() {
		text = SAMPLE;
		analyze();
	}

	/** Per-character tone + pinyin syllable for a token, for ruby annotation. */
	function tokenChars(token: string, entry: CedictEntry | null) {
		const reading = entry?.readings[0];
		const tones = reading ? toneDigits(reading.syllable) : [];
		const sylls = (reading?.pinyinPlain ?? '').trim().split(/\s+/);
		return [...token].map((ch, i) => ({
			ch,
			tone: tones[i] ?? null,
			py: reading ? (sylls[i] ?? '') : ''
		}));
	}

	/**
	 * Real speech via Piper (`piperTts.ts`) instead of the dictionary's syllable
	 * sprite: a passage only needs one word outside the sprite's ~1,600 clips
	 * (喜欢's neutral-tone "huan5" has none) to fail the whole plan and fall
	 * through to Edge TTS, which 403s outside the real Edge browser. Piper
	 * synthesizes the text directly, so there's no fixed clip set to fall
	 * outside of — at the cost of a one-time ~60MB voice download, cached
	 * forever after via CacheStorage.
	 */
	async function readAloud() {
		if (speaking || ttsStatus) {
			await stopPiper();
			speaking = false;
			ttsStatus = '';
			return;
		}
		if (!text.trim()) return;
		ttsStatus = 'Starting…';
		try {
			// The library's own status strings already carry a trailing "N%"
			// while downloading (see anki-tts's `reportProgress`) — the percent
			// argument itself is unused here, so it isn't appended a second time.
			await speakPiper(text, (msg) => {
				ttsStatus = msg;
			});
			ttsStatus = '';
			speaking = true;
			const audio = (window as unknown as { __ttsAudio?: HTMLAudioElement }).__ttsAudio;
			audio?.addEventListener('ended', () => (speaking = false), { once: true });
		} catch (e) {
			speaking = false;
			ttsStatus = '';
			error = e instanceof Error ? e.message : String(e);
		}
	}

	function openWord(w: string, rect: DOMRect) {
		selected = w;
		anchor = rect;
	}

	function showMore() {
		fullWord = selected;
		selected = null;
	}

	function toggleBag(word: string) {
		const next = new Set(bag);
		next.has(word) ? next.delete(word) : next.add(word);
		bag = next;
	}

	/**
	 * "I know up to HSK n": put every word of the text above that level (and
	 * off the list) in the bag at once — tapping thirty words one by one is
	 * the step this saves. `known` 0 = only words on no HSK level.
	 */
	let addingNew = $state(false);
	async function addAbove(known: number) {
		addingNew = true;
		try {
			const lookupMap = await buildHskLookup('new');
			const words = [...entries.keys()].filter((w) => entries.get(w));
			const next = new Set(bag);
			for (const w of wordsAbove(words, lookupMap, known)) next.add(w);
			bag = next;
		} finally {
			addingNew = false;
		}
	}

	function sendToCreator() {
		if (!bag.size) return;
		setPendingWords({
			label: `Reader · ${bag.size} word${bag.size === 1 ? '' : 's'}`,
			words: [...bag],
			options: { audio: true, examples: true },
			then: 'export'
		});
		goto(`${base}/create`);
	}
</script>

<svelte:head>
	<title>Paste-text reader · Anki-xiehanzi</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 pb-28">
	<PageHeader title="Paste-text reader" subtitle="Paste Chinese text; tap any word for its entry." />

	{#if inputCollapsed && tokens.length}
		<button
			type="button"
			onclick={() => (inputCollapsed = false)}
			class="flex w-full items-center gap-2 rounded-card bg-surface shadow-object px-4 py-2.5 text-left shadow-sm transition hover:bg-sunk"
		>
			<Pencil size={14} class="shrink-0 text-muted" />
			<span class="min-w-0 flex-1 truncate text-sm text-muted" lang="zh-Hans">{text}</span>
			<span class="shrink-0 text-sm font-medium text-accent">Edit</span>
		</button>
	{:else}
		<div class="rounded-[24px] bg-surface p-5 shadow-object sm:rounded-tile sm:p-6">
			<textarea
				bind:value={text}
				rows={6}
				placeholder="粘贴中文文本…"
				lang="zh-Hans"
				class="w-full resize-y rounded-card border-0 bg-sunk p-3 text-base text-ink outline-none placeholder:text-muted/70 transition-[background-color,box-shadow] focus:bg-surface focus:ring-2 focus:ring-accent"
			></textarea>

			<div class="mt-3 flex flex-wrap items-center gap-3">
				<button type="button" onclick={analyze} disabled={analyzing || !text.trim()} class={btnPrimary}>
					{analyzing ? 'Reading…' : 'Read'}
				</button>
				{#if text}
					<button type="button" onclick={clear} class="{btnSecondary} inline-flex items-center gap-1">
						<X size={14} /> Clear
					</button>
				{:else}
					<button type="button" onclick={loadSample} class="text-sm font-medium text-accent hover:text-ink">
						Try a sample →
					</button>
				{/if}
				{#if error}<p class="text-sm text-err-ink">{error}</p>{/if}
			</div>
		</div>
	{/if}

	{#if tokens.length}
		<div
			class="no-scrollbar sticky top-[84px] z-20 mt-4 flex items-center gap-1.5 overflow-x-auto rounded-full bg-surface/90 shadow-object p-1.5 whitespace-nowrap shadow-sm backdrop-blur font-semibold"
		>
			<button
				type="button"
				aria-pressed={showPinyin}
				title="Toggle pinyin"
				onclick={() => (showPinyin = !showPinyin)}
				class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition {showPinyin
					? 'bg-accent text-on-accent'
					: 'text-muted hover:bg-sunk'}"
			>
				<Captions size={15} /> <span class="hidden sm:inline">Pinyin</span>
			</button>
			<button
				type="button"
				aria-pressed={colorize}
				title="Toggle tone colors"
				onclick={() => (colorize = !colorize)}
				class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition {colorize
					? 'bg-accent text-on-accent'
					: 'text-muted hover:bg-sunk'}"
			>
				<Palette size={15} /> <span class="hidden sm:inline">Colorize</span>
			</button>

			<div class="mx-0.5 h-5 w-px shrink-0 bg-line"></div>

			<div class="flex shrink-0 items-center gap-0.5 rounded-full bg-sunk p-1">
				{#each SIZES as s (s.id)}
					<button
						type="button"
						aria-pressed={sizeId === s.id}
						title="{s.label === 'S' ? 'Small' : s.label === 'M' ? 'Medium' : 'Large'} text"
						onclick={() => (sizeId = s.id)}
						class="rounded-full px-3 py-1.5 text-xs font-semibold transition {sizeId === s.id
							? 'bg-surface text-ink shadow-sm'
							: 'text-muted hover:text-ink'}"
					>
						{s.label}
					</button>
				{/each}
			</div>

			<div class="mx-0.5 h-5 w-px shrink-0 bg-line"></div>

			<button
				type="button"
				onclick={readAloud}
				disabled={!!ttsStatus && !speaking}
				class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition {speaking
					? 'bg-accent text-on-accent'
					: 'text-muted hover:bg-sunk'}"
			>
				{#if ttsStatus}
					<Loader size={15} class="animate-spin" />
					<span class="whitespace-nowrap">{ttsStatus}</span>
				{:else if speaking}
					<Square size={13} class="fill-current" /> Stop
				{:else}
					<Volume2 size={15} /> <span class="hidden sm:inline">Read aloud</span><span class="sm:hidden">Listen</span>
				{/if}
			</button>

			<div class="mx-0.5 h-5 w-px shrink-0 bg-line"></div>

			<label class="flex shrink-0 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted">
				<Plus size={15} />
				<span class="sr-only">Add new words to the deck</span>
				<select
					disabled={addingNew}
					class="cursor-pointer rounded-full border-0 bg-transparent py-1.5 pr-7 pl-1 text-sm font-medium text-muted transition-[background-color,box-shadow] focus:bg-surface focus:ring-2 focus:ring-accent"
					onchange={(e) => {
						const el = e.currentTarget;
						if (el.value !== '') void addAbove(Number(el.value));
						el.value = '';
					}}
				>
					<option value="">Add new words…</option>
					{#each [1, 2, 3, 4, 5, 6] as n (n)}<option value={n}>Above HSK {n}</option>{/each}
					<option value="0">Not in HSK</option>
				</select>
			</label>
		</div>

		<div
			class="mt-4 whitespace-pre-wrap rounded-[24px] bg-surface p-5 leading-loose shadow-object sm:rounded-tile sm:p-8 {size.cls}"
			lang="zh-Hans"
		>
			{#each tokens as token, i (i)}
				{@const entry = entries.get(token)}
				{#if entry === undefined}
					<span>{token}</span>
				{:else}
					<button
						type="button"
						class="rounded px-0.5 align-bottom underline decoration-line decoration-dotted underline-offset-4 transition hover:bg-sunk hover:decoration-accent {bag.has(token)
							? 'bg-warn-soft'
							: ''} {entry ===
						null
							? 'text-muted decoration-line decoration-dashed hover:decoration-muted'
							: ''}"
						onclick={(e) => openWord(token, (e.currentTarget as HTMLElement).getBoundingClientRect())}
					>
						{#each tokenChars(token, entry) as part, j (j)}
							{#if showPinyin && part.py}
								<ruby
									>{part.ch}<rt
										class="font-sans font-normal {size.rt} {colorize && part.tone
											? `tone${part.tone}`
											: 'text-muted'}">{part.py}</rt
									></ruby
								>
							{:else}
								<span class={colorize && part.tone ? `tone${part.tone}` : ''}>{part.ch}</span>
							{/if}
						{/each}
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</div>

{#if bag.size}
	<div
		class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur"
		style="padding-bottom: env(safe-area-inset-bottom)"
	>
		<div class="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3">
			<span class="flex items-center gap-1.5 text-sm text-muted">
				<Layers size={15} /> {bag.size} word{bag.size === 1 ? '' : 's'} selected
			</span>
			<button type="button" onclick={sendToCreator} class={btnPrimary}>
				Send to deck creator
			</button>
		</div>
	</div>
{/if}

<style>
	.no-scrollbar {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
</style>

{#if selected && anchor}
	{#key selected}
		<WordPopup
			word={selected}
			{anchor}
			onclose={() => (selected = null)}
			onMore={showMore}
			onOpenWord={(w) => (selected = w)}
			saved={bag.has(selected)}
			onToggleSave={() => selected && toggleBag(selected)}
			{colorize}
		/>
	{/key}
{/if}

{#if fullWord}
	<PickerModal title={fullWord} onclose={() => (fullWord = null)}>
		<button
			type="button"
			onclick={() => fullWord && toggleBag(fullWord)}
			class="{btnSecondary} mb-3 inline-flex items-center gap-1.5 text-xs"
		>
			{#if fullWord && bag.has(fullWord)}
				<Check size={13} /> In word list
			{:else}
				<Plus size={13} /> Add to word list
			{/if}
		</button>
		<WordEntry word={fullWord} onOpenWord={(w) => (fullWord = w)} />
	</PickerModal>
{/if}
