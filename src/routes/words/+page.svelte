<!--
  My words: every deck built on /create (reopen → Export, one click to send
  again, which updates the same deck in Anki), the unfinished list, and the
  dictionary's word bag. All of it lives in this browser (`$lib/myWords`), so
  a backup file is the way to move it or keep it past a storage wipe.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { Button, buttonClass, PageHeader } from '$lib/ui';
	import { setPendingWords, type PendingThen } from '$lib/hskHandoff';
	import {
		deleteDeck,
		loadBag,
		loadDecks,
		loadDraft,
		makeBackup,
		mergeBag,
		mergeDecks,
		parseBackup,
		savedDate,
		storeBag,
		storeDecks,
		wordPreview,
		type Draft,
		type SavedDeck
	} from '$lib/myWords';
	import UpdateDesignModal from '$lib/components/UpdateDesignModal.svelte';
	import type { WantedModel } from '$lib/anki/designSync';
	import Paintbrush from '@lucide/svelte/icons/paintbrush';
	import Download from '@lucide/svelte/icons/download';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import Send from '@lucide/svelte/icons/send';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Upload from '@lucide/svelte/icons/upload';
	import X from '@lucide/svelte/icons/x';

	let decks = $state<SavedDeck[]>([]);
	let draft = $state<Draft | null>(null);
	let bag = $state<string[]>([]);
	let confirming = $state<string | null>(null);
	let note = $state<{ ok: boolean; text: string } | null>(null);
	let fileInput = $state<HTMLInputElement>();

	onMount(() => {
		decks = loadDecks();
		draft = loadDraft();
		bag = loadBag();
	});

	const empty = $derived(!decks.length && !draft && !bag.length);
	const count = (n: number) => `${n.toLocaleString()} word${n === 1 ? '' : 's'}`;

	/** Back into the creator, straight to Export; `send` presses Send there too. */
	function open(deck: SavedDeck, then: PendingThen) {
		setPendingWords({
			label: deck.source ?? deck.name,
			words: deck.words,
			options: { audio: deck.settings?.includeAudio ?? true, examples: !deck.settings },
			then,
			deckName: deck.name,
			settings: deck.settings
		});
		void goto(`${base}/create`);
	}

	// Update card design: push this deck's card design (rebuilt from its saved
	// settings) into the note type its notes use in Anki. The template builder
	// is imported on click, so My words does not carry it.
	let design = $state<{ deckName: string; wanted: WantedModel; media: { name: string; url: string }[]; strokes: boolean } | null>(
		null
	);
	async function openDesign(deck: SavedDeck) {
		if (!deck.settings) return;
		const { savedDeckModel, DECK_IMG_MEDIA, deckDataMedia } = await import('$lib/deckTemplate');
		const { model, usesWriter } = savedDeckModel({ ...deck.settings, deckName: deck.name });
		design = {
			deckName: deck.name,
			wanted: model,
			media: [
				...DECK_IMG_MEDIA.map((name) => ({ name, url: `/img/${name}` })),
				...deckDataMedia(usesWriter).map((name) => ({ name, url: `/data/${name}` }))
			],
			strokes: usesWriter
		};
	}

	function remove(name: string) {
		decks = deleteDeck(name);
		confirming = null;
	}

	function makeFromBag() {
		setPendingWords({
			label: `Dictionary · ${count(bag.length)}`,
			words: bag,
			options: { audio: true, examples: true },
			then: 'export'
		});
		void goto(`${base}/create`);
	}

	function unbag(word: string) {
		bag = bag.filter((w) => w !== word);
		storeBag(bag);
	}

	function backup() {
		const blob = new Blob([JSON.stringify(makeBackup(decks, bag), null, 1)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `anki-xiehanzi-my-words-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	/** Restore merges: a deck in both keeps the newer copy, the bag gains what it lacks. */
	async function restore(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		try {
			const got = parseBackup(await file.text());
			decks = mergeDecks(decks, got.decks);
			bag = mergeBag(bag, got.bag);
			storeDecks(decks);
			storeBag(bag);
			note = { ok: true, text: `Restored ${got.decks.length} deck${got.decks.length === 1 ? '' : 's'}, ${count(got.bag.length)} in the bag.` };
		} catch (err) {
			note = { ok: false, text: (err as Error).message };
		}
	}

	const panel = 'rounded-[24px] bg-surface p-5 shadow-object sm:rounded-tile sm:p-7';
	const h2 = 'm-0 mb-3 text-[20px] leading-tight font-bold text-ink';
	const iconBtn =
		'grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-sunk hover:text-ink focus-visible:outline-3 focus-visible:outline-accent';
</script>

<svelte:head>
	<title>My words · Anki-xiehanzi</title>
	<meta name="description" content="The decks you built and the words you saved, kept in this browser." />
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<PageHeader title="My words" subtitle="Kept in this browser.">
		{#snippet actions()}
			{#if !empty}
				<Button size="sm" variant="secondary" onclick={backup}><Download class="size-4" />Backup</Button>
			{/if}
			<Button size="sm" variant="secondary" onclick={() => fileInput?.click()}><Upload class="size-4" />Restore</Button>
			<input
				bind:this={fileInput}
				type="file"
				accept="application/json,.json"
				class="hidden"
				aria-label="Restore from a backup file"
				onchange={restore}
			/>
		{/snippet}
	</PageHeader>

	{#if note}
		<p
			class="mt-0 mb-4 rounded-card px-4 py-3 text-[14px] {note.ok ? 'bg-ok-soft text-ok-ink' : 'bg-warn-soft text-warn-ink'}"
			role="status"
		>
			{note.text}
		</p>
	{/if}

	{#if empty}
		<div class="{panel} text-center">
			<p class="m-0 mb-4 text-muted">Nothing yet. Decks you build and words you star land here.</p>
			<div class="flex flex-wrap justify-center gap-2">
				<a href="{base}/create" class={buttonClass('primary', 'sm')}>Create a deck</a>
				<a href="{base}/dictionary" class={buttonClass('secondary', 'sm')}>Dictionary</a>
			</div>
		</div>
	{/if}

	{#if draft}
		<div class="mb-4 flex flex-wrap items-center gap-3 rounded-panel bg-warn-soft p-4">
			<div class="min-w-0 flex-1">
				<p class="m-0 font-semibold text-warn-ink">Unfinished · {count(draft.words.length)} · {savedDate(draft.savedAt)}</p>
				<p class="m-0 mt-0.5 truncate font-zh text-lg text-warn-ink/80" lang="zh-Hans">{wordPreview(draft.words)}</p>
			</div>
			<a href="{base}/create" class={buttonClass('primary', 'sm')}>Continue</a>
		</div>
	{/if}

	{#if decks.length}
		<section class="{panel} mb-4" aria-labelledby="decks-h">
			<h2 id="decks-h" class={h2}>Decks</h2>
			<ul class="m-0 list-none divide-y divide-line p-0">
				{#each decks as deck (deck.name)}
					<li class="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
						<div class="w-full min-w-0 sm:w-auto sm:flex-1">
							<p class="m-0 truncate font-semibold text-ink">{deck.name}</p>
							<p class="m-0 truncate text-[14px] text-muted">
								{count(deck.words.length)} · {savedDate(deck.savedAt)}{deck.source && deck.source !== deck.name
									? ` · ${deck.source}`
									: ''}
							</p>
							<p class="m-0 truncate font-zh text-lg text-muted" lang="zh-Hans">{wordPreview(deck.words)}</p>
						</div>
						{#if confirming === deck.name}
							<div class="flex gap-2">
								<button type="button" class={buttonClass('secondary', 'sm')} onclick={() => (confirming = null)}>Keep</button>
								<button
									type="button"
									class={buttonClass('danger', 'sm')}
									onclick={() => remove(deck.name)}>Delete</button
								>
							</div>
						{:else}
							<div class="ml-auto flex items-center gap-1.5">
								<button type="button" class={buttonClass('secondary', 'sm')} onclick={() => open(deck, 'export')}>
									<FolderOpen class="size-4" />Open
								</button>
								<!-- Desktop only: phones have no AnkiConnect. A wrapper, because
								     buttonClass's inline-flex would beat `hidden`. -->
								<span class="hidden items-center gap-1.5 sm:inline-flex">
									<button
										type="button"
										class={buttonClass('soft', 'sm')}
										onclick={() => open(deck, 'send')}
										title="Sending again updates this deck in Anki"
									>
										<Send class="size-4" />Send to Anki
									</button>
									{#if deck.settings}
										<button
											type="button"
											class={iconBtn}
											aria-label="Update card design of {deck.name} in Anki"
											title="Update its card design in Anki"
											onclick={() => openDesign(deck)}
										>
											<Paintbrush class="size-[18px]" />
										</button>
									{/if}
								</span>
								<button type="button" class={iconBtn} aria-label="Delete {deck.name}" onclick={() => (confirming = deck.name)}>
									<Trash2 class="size-[18px]" />
								</button>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if bag.length}
		<section class={panel} aria-labelledby="bag-h">
			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<h2 id="bag-h" class="{h2} mb-0">Word bag <span class="text-base font-semibold text-muted">· {count(bag.length)}</span></h2>
				<Button size="sm" onclick={makeFromBag}>Make a deck</Button>
			</div>
			<ul class="m-0 flex list-none flex-wrap gap-1.5 p-0">
				{#each bag as word (word)}
					<li class="inline-flex items-center gap-0.5 rounded-full bg-sunk py-0.5 pr-1 pl-3">
						<a href="{base}/dictionary?q={encodeURIComponent(word)}" class="font-zh text-lg text-ink no-underline" lang="zh-Hans"
							>{word}</a
						>
						<button
							type="button"
							class="grid size-7 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink"
							aria-label="Remove {word}"
							onclick={() => unbag(word)}
						>
							<X class="size-3.5" />
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

{#if design}
	<UpdateDesignModal
		wanted={design.wanted}
		deckName={design.deckName}
		media={design.media}
		needsStrokeData={design.strokes}
		subtitle="Puts this deck's card design into Anki. No re-send."
		onclose={() => (design = null)}
	/>
{/if}
