<!--
  Update card design: put the current card design into the note type(s) the
  reader's Anki already holds — no download, no re-import. Says which note type
  and which decks it touches before it writes anything, and what stays put.
  Takes one design or several — the radical deck is two note types (Recognize,
  Write); each is looked up on its own and one the collection lacks is skipped.
  The work is `$lib/anki/designSync`; this is only the confirm step around it.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { Button, SectionLabel } from '$lib/ui';
	import { anki, ankiClient, checkAnki, ANKI_STATUS_TEXT } from '$lib/anki/ankiStatus.svelte';
	import AnkiSetupLink from './AnkiSetupLink.svelte';
	import {
		applyDesign,
		blockedReason,
		describePlan,
		planDesign,
		readInstalled,
		readInstalledForDeck,
		readUsage,
		type DesignPlan,
		type MediaFile,
		type ModelUsage,
		type WantedModel
	} from '$lib/anki/designSync';
	import { hasDuplicateCards, toBase64 } from '$lib/anki/sendDeck';
	import { deckLabel, DUPLICATE_CARDS_NOTE } from '$lib/anki/sendTarget';
	import Check from '@lucide/svelte/icons/check';
	import Layers from '@lucide/svelte/icons/layers';
	import Paintbrush from '@lucide/svelte/icons/paintbrush';
	import X from '@lucide/svelte/icons/x';

	let {
		wanted,
		deckName,
		media = [],
		needsStrokeData = false,
		subtitle = 'Puts the current card design into the deck you already have. No download, no re-import.',
		onclose
	}: {
		wanted: WantedModel | WantedModel[];
		/**
		 * Find the note type through this deck's notes instead of by `wanted.id`
		 * — for `/create` decks, whose note type Anki may have re-numbered on
		 * import (see `readInstalledForDeck`).
		 */
		deckName?: string;
		/** Helper files the design loads: stored first, so the new card never points at a missing file. */
		media?: { name: string; url: string; check?: string }[];
		/** The design has a writing grid, which reads `_hanzi-writer-data.json`. */
		needsStrokeData?: boolean;
		subtitle?: string;
		onclose: () => void;
	} = $props();

	type Stage = 'loading' | 'error' | 'missing' | 'blocked' | 'current' | 'ready' | 'applying' | 'done';
	let stage = $state<Stage>('loading');
	let error = $state('');
	type Entry = { wanted: WantedModel; plan: DesignPlan; usage: ModelUsage; modelId: number; cardTypes: number };
	/** Anki made duplicate cards while taking the new templates (see `hasDuplicateCards`). */
	let duplicates = $state(false);
	/** The designs the collection holds a note type for; the rest are skipped. */
	let entries = $state<Entry[]>([]);
	const wantedList = $derived(Array.isArray(wanted) ? wanted : [wanted]);
	let strokesMissing = $state(false);
	let dialog = $state<HTMLElement>();

	async function load() {
		stage = 'loading';
		error = '';
		try {
			const status = anki.status === 'ready' ? 'ready' : await checkAnki();
			if (status !== 'ready') throw new Error(ANKI_STATUS_TEXT[status]);
			const client = ankiClient();
			const found: Entry[] = [];
			for (const w of wantedList) {
				const installed = deckName
					? await readInstalledForDeck(client, deckName)
					: await readInstalled(client, w.id);
				if (!installed) continue;
				found.push({
					wanted: w,
					plan: planDesign(installed, w),
					usage: await readUsage(client, installed.id),
					modelId: installed.id,
					cardTypes: installed.templates.length
				});
			}
			entries = found;
			if (!found.length) {
				stage = 'missing';
				return;
			}
			if (needsStrokeData) {
				const have = await client.call<string[]>('getMediaFilesNames', { pattern: '_hanzi-writer-data.json' });
				strokesMissing = !have.length;
			}
			stage = found.some((e) => e.plan.blocked)
				? 'blocked'
				: found.every((e) => e.plan.upToDate)
					? 'current'
					: 'ready';
		} catch (e) {
			stage = 'error';
			error = (e as Error).message;
		}
	}
	onMount(() => {
		dialog?.focus();
		void load();
	});

	async function fetchMedia(): Promise<MediaFile[]> {
		return Promise.all(
			media.map(async (m) => {
				const res = await fetch(`${base}${m.url}`);
				if (!res.ok) throw new Error(`Could not load ${m.name} (${res.status})`);
				const bytes = new Uint8Array(await res.arrayBuffer());
				// A dev server or CDN answering a missing file with an HTML page
				// would otherwise be stored under the script's name.
				if (m.check && !new TextDecoder().decode(bytes.subarray(0, 4000)).includes(m.check)) {
					throw new Error(`${m.name} did not load correctly — try again.`);
				}
				return { name: m.name, data: toBase64(bytes) };
			})
		);
	}

	async function apply() {
		if (stage !== 'ready') return;
		stage = 'applying';
		let files: MediaFile[];
		try {
			files = await fetchMedia();
		} catch (e) {
			stage = 'error';
			error = (e as Error).message;
			return;
		}
		try {
			const client = ankiClient();
			for (const e of entries) {
				if (e.plan.upToDate) continue;
				await applyDesign(client, e.plan, e.wanted, files);
				files = []; // one collection, one media folder: store once
			}
			// New templates can set off Anki's duplicate-card bug on a note type
			// with more than one card type; only a check, so never an error.
			for (const e of entries) {
				if (e.plan.upToDate || e.cardTypes < 2) continue;
				try {
					if (await hasDuplicateCards(client, e.modelId, e.cardTypes)) duplicates = true;
				} catch {
					/* the design is in either way */
				}
			}
			stage = 'done';
		} catch (e) {
			stage = 'error';
			const err = e as { unreachable?: boolean; message?: string };
			error = err.unreachable ? ANKI_STATUS_TEXT.unreachable : `Anki said: ${err.message ?? e}`;
		}
	}

	const changes = $derived([...new Set(entries.filter((e) => !e.plan.upToDate).flatMap((e) => describePlan(e.plan)))]);
	const manyDecks = $derived(entries.length > 1 || entries.some((e) => e.usage.decks.length > 1));
	function deckLine(usage: ModelUsage): string {
		if (!usage.decks.length) return '';
		const shown = usage.decks.slice(0, 3).map(deckLabel).join(', ');
		const more = usage.decks.length - 3;
		return more > 0 ? `${shown} and ${more} more` : shown;
	}
	const title = $derived(
		stage === 'done' ? 'Card design updated' : stage === 'current' ? 'Already up to date' : 'Update card design'
	);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && stage !== 'applying' && onclose()} />

<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && stage !== 'applying' && onclose()}
>
	<div
		bind:this={dialog}
		tabindex="-1"
		class="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-surface text-ink shadow-xl outline-none sm:rounded-[24px]"
		role="dialog"
		aria-modal="true"
		aria-labelledby="design-title"
	>
		<div class="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-7">
			<div class="min-w-0">
				<h2 id="design-title" class="m-0 text-[22px] leading-tight font-bold">{title}</h2>
				<p class="mt-1 mb-0 text-[15px] text-muted">
					{stage === 'done'
						? 'You will see it on your next card. Reviews are untouched.'
						: stage === 'current'
							? 'Your Anki already has the current card design.'
							: subtitle}
				</p>
			</div>
			<button
				type="button"
				onclick={onclose}
				disabled={stage === 'applying'}
				aria-label="Close"
				class="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-sunk hover:text-ink"
			>
				<X class="size-5" />
			</button>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-1 sm:px-7">
			{#if stage === 'loading'}
				<p class="m-0 rounded-card bg-sunk px-4 py-3 text-[14px] text-muted" role="status">
					Looking for the deck in Anki… Allow it if your browser or Anki asks.
				</p>
			{:else if stage === 'error'}
				<p class="m-0 rounded-card bg-apricot-soft px-4 py-3 text-[14px] text-apricot-ink" role="status">
					{error}
					<button
						type="button"
						class="ml-1 border-0 bg-transparent p-0 font-semibold text-apricot-ink underline"
						onclick={load}>Try again</button
					>
					<AnkiSetupLink />
				</p>
			{:else if stage === 'missing'}
				<p class="m-0 rounded-card bg-sunk px-4 py-3 text-[14px] text-muted" role="status">
					This deck isn't in the Anki profile you have open. Send or download it instead.
				</p>
			{:else if entries.length}
				<SectionLabel as="h3" class="mb-2">{entries.length === 1 ? 'Note type' : 'Note types'}</SectionLabel>
				<ul class="m-0 grid list-none gap-2 p-0">
					{#each entries as e (e.plan.modelName)}
						<li class="flex items-start gap-3 rounded-card bg-sunk px-3 py-3">
							<Layers class="mt-0.5 size-[18px] shrink-0 text-muted" />
							<div class="min-w-0">
								<p class="m-0 text-[15px] font-semibold">{e.plan.modelName}</p>
								<p class="mt-0.5 mb-0 text-[13.5px] text-muted">
									{e.usage.notes.toLocaleString()} notes{deckLine(e.usage) ? ` · ${deckLine(e.usage)}` : ''}
								</p>
							</div>
						</li>
					{/each}
				</ul>

				{#if stage === 'blocked'}
					{#each entries.filter((e) => e.plan.blocked) as e (e.plan.modelName)}
						<p class="mt-4 mb-0 rounded-card bg-apricot-soft px-4 py-3 text-[14px] text-apricot-ink" role="status">
							{blockedReason(e.plan)}
						</p>
					{/each}
				{:else if changes.length && stage !== 'done'}
					<SectionLabel as="h3" class="mt-4 mb-2">Changes</SectionLabel>
					<ul class="m-0 grid list-none gap-1.5 p-0 text-[15px]">
						{#each changes as line (line)}
							<li class="flex gap-2.5">
								<Check class="mt-0.5 size-[18px] shrink-0 text-mint-ink" />{line}
							</li>
						{/each}
					</ul>
				{/if}

				{#if stage === 'ready' || stage === 'applying'}
					<p class="mt-4 mb-0 text-[13.5px] text-muted">
						Kept: your notes, what's in them, and your reviews. Replaced: any edits you made to {entries.length > 1
							? "these note types'"
							: "this note type's"} cards by hand{manyDecks ? ', in every deck above' : ''}.
					</p>
				{/if}
				{#if stage === 'done' && duplicates}
					<p class="mt-3 mb-0 rounded-card bg-apricot-soft px-4 py-3 text-[14px] text-apricot-ink" role="status">
						{DUPLICATE_CARDS_NOTE}
					</p>
				{/if}
				{#if strokesMissing}
					<p class="mt-3 mb-0 rounded-card bg-apricot-soft px-4 py-3 text-[14px] text-apricot-ink">
						The stroke-practice grid needs stroke data your collection doesn't have yet. Send the deck once to
						get it.
					</p>
				{/if}
			{/if}
		</div>

		<div class="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-7">
			{#if stage === 'done' || stage === 'current' || stage === 'missing' || stage === 'blocked'}
				<Button onclick={onclose}>Done</Button>
			{:else}
				<Button variant="secondary" onclick={onclose} disabled={stage === 'applying'}>Cancel</Button>
				<Button onclick={apply} disabled={stage !== 'ready'}>
					<Paintbrush class="size-[18px]" />{stage === 'applying' ? 'Updating…' : 'Update design'}
				</Button>
			{/if}
		</div>
	</div>
</div>
