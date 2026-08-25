<script lang="ts">
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
	import { speak, stopSpeaking } from '$lib/dict/audio';
	import { canSpeakPinyin } from '$lib/dict/syllableAudio';
	import { toneDigits } from '$lib/tone';
	import { setPendingWords } from '$lib/hskHandoff';
	import { btnPrimary, btnSecondary } from '$lib/buttonStyles';
	import PickerModal from '$lib/components/PickerModal.svelte';
	import WordEntry from '$lib/components/dict/WordEntry.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import Layers from '@lucide/svelte/icons/layers';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import X from '@lucide/svelte/icons/x';

	const CHINESE = /[一-龥]/;
	const PREFS_KEY = 'xhz.reader.prefs';
	const SIZES = [
		{ id: 'sm', label: 'A', cls: 'text-lg', rt: 'text-[10px]' },
		{ id: 'md', label: 'A', cls: 'text-2xl', rt: 'text-xs' },
		{ id: 'lg', label: 'A', cls: 'text-3xl', rt: 'text-sm' }
	] as const;

	let text = $state('');
	let tokens = $state<string[]>([]);
	let entries = $state<Map<string, CedictEntry | null>>(new Map());
	let selected = $state<string | null>(null);
	let bag = $state<Set<string>>(new Set());
	let jiebaReady = false;
	let analyzing = $state(false);
	let speaking = $state(false);
	let speakTimer: ReturnType<typeof setTimeout> | undefined;
	let error = $state('');

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
		clearTimeout(speakTimer);
		stopSpeaking();
		speaking = false;
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

	async function readAloud() {
		clearTimeout(speakTimer);
		if (speaking) {
			stopSpeaking();
			speaking = false;
			return;
		}
		const candidates = tokens
			.filter((t) => CHINESE.test(t))
			.map((t) => entries.get(t)?.readings[0]?.syllable)
			.filter((s): s is string => !!s);
		// A word missing even one syllable from the sprite (喜欢's neutral-tone
		// "huan5" has no clip) fails the whole plan, not just that word — checked
		// per word first so one gap drops that word instead of silencing the
		// entire passage or falling through to Edge TTS, which 403s outside Edge.
		const speakable = await Promise.all(candidates.map((s) => canSpeakPinyin(s)));
		const sylls = candidates.filter((_, i) => speakable[i]).join(' ');
		if (!sylls) return;
		speaking = true;
		try {
			await speak(text, { pinyin: sylls, spacing: 0.05, skipRecording: true });
			speakTimer = setTimeout(() => (speaking = false), text.length * 400);
		} catch {
			speaking = false;
		}
	}

	function toggleBag(word: string) {
		const next = new Set(bag);
		next.has(word) ? next.delete(word) : next.add(word);
		bag = next;
	}

	function sendToCreator() {
		if (!bag.size) return;
		setPendingWords({
			label: `Reader · ${bag.size} word${bag.size === 1 ? '' : 's'}`,
			words: [...bag],
			options: { audio: true, examples: true }
		});
		goto(`${base}/create`);
	}
</script>

<svelte:head>
	<title>Paste-text reader · Anki xiehanzi</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-5 py-10 pb-28">
	<header class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
			Paste-text reader
		</h1>
		<p class="mt-2 max-w-2xl text-neutral-600">
			Paste any Chinese text — an article, a chat, a book excerpt. Every word is tone-colored,
			shows its pinyin, and opens a full dictionary entry on tap. Punctuation and everything else
			reads back exactly as pasted.
		</p>
	</header>

	<div class="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
		<textarea
			bind:value={text}
			rows={6}
			placeholder="粘贴中文文本…"
			lang="zh-Hans"
			class="w-full resize-y rounded-xl border border-neutral-200 p-3 text-base text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-900"
		></textarea>

		<div class="mt-3 flex flex-wrap items-center gap-3">
			<button type="button" onclick={analyze} disabled={analyzing || !text.trim()} class={btnPrimary}>
				{analyzing ? 'Reading…' : 'Read'}
			</button>
			{#if text}
				<button type="button" onclick={clear} class="{btnSecondary} inline-flex items-center gap-1">
					<X size={14} /> Clear
				</button>
			{/if}
			{#if error}<p class="text-sm text-red-600">{error}</p>{/if}
		</div>
	</div>

	{#if tokens.length}
		<div
			class="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 p-2.5"
		>
			<button
				type="button"
				aria-pressed={showPinyin}
				onclick={() => (showPinyin = !showPinyin)}
				class="rounded-md px-3 py-1.5 text-sm font-medium transition {showPinyin
					? 'bg-neutral-900 text-white'
					: 'bg-white text-neutral-600 hover:bg-neutral-100'}"
			>
				Pinyin
			</button>
			<button
				type="button"
				aria-pressed={colorize}
				onclick={() => (colorize = !colorize)}
				class="rounded-md px-3 py-1.5 text-sm font-medium transition {colorize
					? 'bg-neutral-900 text-white'
					: 'bg-white text-neutral-600 hover:bg-neutral-100'}"
			>
				Colorize
			</button>

			<div class="ml-auto flex items-center gap-1 rounded-md bg-white p-1">
				{#each SIZES as s (s.id)}
					<button
						type="button"
						aria-pressed={sizeId === s.id}
						onclick={() => (sizeId = s.id)}
						class="rounded px-2.5 py-1 font-semibold transition {s.id === 'sm'
							? 'text-xs'
							: s.id === 'lg'
								? 'text-base'
								: 'text-sm'} {sizeId === s.id
							? 'bg-neutral-900 text-white'
							: 'text-neutral-500 hover:bg-neutral-100'}"
					>
						{s.label}
					</button>
				{/each}
			</div>

			<button
				type="button"
				onclick={readAloud}
				class="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
			>
				<Volume2 size={15} class={speaking ? 'animate-pulse text-neutral-900' : ''} />
				{speaking ? 'Stop' : 'Read aloud'}
			</button>
		</div>

		<div
			class="mt-4 whitespace-pre-wrap rounded-2xl border border-neutral-200 bg-white p-5 leading-loose shadow-sm sm:p-6 {size.cls}"
			lang="zh-Hans"
		>
			{#each tokens as token, i (i)}
				{@const entry = entries.get(token)}
				{#if entry === undefined}
					<span>{token}</span>
				{:else}
					<button
						type="button"
						class="rounded px-0.5 align-bottom transition hover:bg-neutral-100 {entry === null
							? 'text-neutral-400 decoration-neutral-300 decoration-dashed underline-offset-4 hover:underline'
							: ''}"
						onclick={() => (selected = token)}
					>
						{#each tokenChars(token, entry) as part, j (j)}
							{#if showPinyin && part.py}
								<ruby
									>{part.ch}<rt
										class="font-sans font-normal {size.rt} {colorize && part.tone
											? `tone${part.tone}`
											: 'text-neutral-400'}">{part.py}</rt
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
	<div class="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur">
		<div class="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3">
			<span class="flex items-center gap-1.5 text-sm text-neutral-600">
				<Layers size={15} /> {bag.size} word{bag.size === 1 ? '' : 's'} selected
			</span>
			<button type="button" onclick={sendToCreator} class={btnPrimary}>
				Send to deck creator
			</button>
		</div>
	</div>
{/if}

{#if selected}
	<PickerModal title={selected} onclose={() => (selected = null)}>
		<button
			type="button"
			onclick={() => selected && toggleBag(selected)}
			class="{btnSecondary} mb-3 inline-flex items-center gap-1.5 text-xs"
		>
			{#if selected && bag.has(selected)}
				<Check size={13} /> In word list
			{:else}
				<Plus size={13} /> Add to word list
			{/if}
		</button>
		<WordEntry word={selected} onOpenWord={(w) => (selected = w)} />
	</PickerModal>
{/if}
