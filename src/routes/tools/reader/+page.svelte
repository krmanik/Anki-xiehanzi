<script lang="ts">
	/**
	 * Paste-text reader: segment pasted text in reading order (unlike the deck
	 * creator's `cutParagraph`, nothing here is deduped or filtered — punctuation
	 * and non-Chinese runs are kept so the original text reads back faithfully),
	 * tone-color every Chinese word, and open a dictionary entry on click.
	 */
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { initJieba, segmentOrdered } from '$lib/deck';
	import { lookup, type CedictEntry } from '$lib/dict/cedict';
	import { colorizeHanzi } from '$lib/tone';
	import { setPendingWords } from '$lib/hskHandoff';
	import { btnPrimary, btnSecondary } from '$lib/buttonStyles';
	import PickerModal from '$lib/components/PickerModal.svelte';
	import WordEntry from '$lib/components/dict/WordEntry.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import Layers from '@lucide/svelte/icons/layers';

	const CHINESE = /[一-龥]/;

	let text = $state('');
	let tokens = $state<string[]>([]);
	let entries = $state<Map<string, CedictEntry | null>>(new Map());
	let selected = $state<string | null>(null);
	let bag = $state<Set<string>>(new Set());
	let jiebaReady = false;
	let analyzing = $state(false);
	let error = $state('');

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
			Paste any Chinese text. Every word is tone-colored and clickable — punctuation and
			everything else reads back exactly as pasted.
		</p>
	</header>

	<textarea
		bind:value={text}
		rows={6}
		placeholder="粘贴中文文本…"
		lang="zh-Hans"
		class="w-full rounded-xl border border-neutral-200 p-3 text-base text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-900"
	></textarea>

	<div class="mt-3 flex items-center gap-3">
		<button type="button" onclick={analyze} disabled={analyzing || !text.trim()} class={btnPrimary}>
			{analyzing ? 'Reading…' : 'Read'}
		</button>
		{#if error}<p class="text-sm text-red-600">{error}</p>{/if}
	</div>

	{#if tokens.length}
		<div
			class="mt-8 whitespace-pre-wrap rounded-xl border border-neutral-200 p-5 text-2xl leading-relaxed"
			lang="zh-Hans"
		>
			{#each tokens as token, i (i)}
				{@const entry = entries.get(token)}
				{#if entry !== undefined}
					{@const parts = colorizeHanzi(token, entry?.readings[0]?.syllable ?? '')}
					<button
						type="button"
						class="rounded px-0.5 transition hover:bg-neutral-100"
						onclick={() => (selected = token)}
					>
						{#each parts as part, j (j)}<span class="tone{part.tone}">{part.ch}</span>{/each}
					</button>
				{:else}
					<span>{token}</span>
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
