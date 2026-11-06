<!--
  Where a send lands. Opens on every Send — there is no way to skip it, because
  a send can overwrite notes already in Anki. One choice at the top, New deck or
  a deck already in Anki, then one line saying what this send does to it, the
  overwrite warning, and the confirm button. The deck list comes from Anki
  itself (`deckNames`). `fixed`: a prebuilt deck whose name is inside the file —
  nothing to pick, the modal only says where it goes and whether it is already
  there.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/ui';
	import {
		deckLabel,
		filterDecks,
		findDeck,
		heldNote,
		loadSendPrefs,
		FIXED_OVERWRITE_WARNING,
		OVERWRITE_WARNING,
		resolveTarget,
		targetProblem,
		saveSendPrefs,
		sortDecks,
		suggestTarget,
		targetNote,
		type SendPrefs,
		type Target
	} from '$lib/anki/sendTarget';
	import Send from '@lucide/svelte/icons/send';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import Layers from '@lucide/svelte/icons/layers';
	import Check from '@lucide/svelte/icons/check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import AnkiSetupLink from './AnkiSetupLink.svelte';

	let {
		deckName,
		subtitle = '',
		fixed = false,
		loadDecks,
		countNotes,
		checkTarget,
		onsend,
		onclose
	}: {
		/** The page's deck name: the suggestion, or (fixed) the deck inside the file. */
		deckName: string;
		subtitle?: string;
		fixed?: boolean;
		/** Anki's decks; `filtered` ones are left out of the list and refused as a target. */
		loadDecks: () => Promise<string[] | { decks: string[]; filtered?: string[] }>;
		/** Notes in a deck already in Anki — the check shown before confirming. */
		countNotes?: (deck: string) => Promise<number>;
		/** One more thing worth saying about this deck before confirming, or null. */
		checkTarget?: (deck: string) => Promise<string | null>;
		onsend: (name: string, prefs: SendPrefs) => void;
		onclose: () => void;
	} = $props();

	let names = $state<string[] | null>(null);
	let filtered = $state<string[]>([]);
	let loadError = $state('');
	let mode = $state<'new' | 'existing'>('new');
	// svelte-ignore state_referenced_locally
	let newName = $state(deckName);
	let picked = $state('');
	let query = $state('');
	let prefs = $state<SendPrefs>(loadSendPrefs());
	let dialog = $state<HTMLElement>();

	async function load() {
		loadError = '';
		names = null;
		try {
			const raw = await loadDecks();
			const got = sortDecks(Array.isArray(raw) ? raw : raw.decks);
			filtered = Array.isArray(raw) ? [] : (raw.filtered ?? []);
			names = got;
			const t = suggestTarget(deckName, got);
			mode = t.kind;
			if (t.kind === 'existing') picked = t.name;
		} catch (e) {
			loadError = (e as Error).message;
		}
	}
	onMount(() => {
		dialog?.focus();
		void load();
	});

	const target = $derived<Target>(mode === 'new' ? { kind: 'new', name: newName } : { kind: 'existing', name: picked });
	const resolved = $derived(resolveTarget(target, names ?? []));
	const shown = $derived(filterDecks(names ?? [], query));
	const problem = $derived(!names || fixed || !resolved.name ? null : targetProblem(resolved.name, filtered));
	const canSend = $derived(!!names && (fixed || (!!resolved.name.trim() && !problem)));
	/** The deck Anki already has that this send goes into, if any. */
	const into = $derived(
		!names ? null : fixed ? (findDeck(names, deckName) ?? null) : resolved.kind === 'existing' ? resolved.name : null
	);
	const note = $derived(
		!names
			? null
			: fixed
				? into
					? 'Already in your Anki: updates it in place.'
					: 'A new deck; every level is its own subdeck.'
				: targetNote(resolved)
	);

	// What that deck holds now, looked up whenever the choice settles on it.
	let held = $state<{ name: string; count: number } | null>(null);
	let checkSeq = 0;
	$effect(() => {
		const name = into;
		const seq = ++checkSeq;
		held = null;
		if (!name || !countNotes) return;
		countNotes(name).then(
			(count) => seq === checkSeq && (held = { name, count }),
			() => {}
		);
	});

	// Same for the caller's own check, on the deck this send goes into.
	let caveat = $state<{ name: string; text: string } | null>(null);
	let caveatSeq = 0;
	$effect(() => {
		// Only a deck Anki already has (no call per keystroke on a new name); a
		// prebuilt deck is checked whether it is there or not.
		const name = fixed ? deckName : into;
		const seq = ++caveatSeq;
		caveat = null;
		if (!name || !names || !checkTarget) return;
		checkTarget(name).then(
			(text) => seq === caveatSeq && text && (caveat = { name, text }),
			() => {}
		);
	});

	function send() {
		if (!canSend) return;
		saveSendPrefs($state.snapshot(prefs));
		onsend(fixed ? deckName : resolved.name, $state.snapshot(prefs));
	}

	const seg = (on: boolean) =>
		`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-colors ${
			on ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
		}`;
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && onclose()}
>
	<div
		bind:this={dialog}
		tabindex="-1"
		class="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-surface text-ink shadow-xl outline-none sm:rounded-[24px]"
		role="dialog"
		aria-modal="true"
		aria-labelledby="send-title"
	>
		<div class="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
			<div class="min-w-0">
				<h2 id="send-title" class="m-0 text-[22px] leading-tight font-bold">Send to Anki</h2>
				{#if subtitle}<p class="mt-1 mb-0 text-[15px] text-muted">{subtitle}</p>{/if}
			</div>
			<button
				type="button"
				onclick={onclose}
				aria-label="Close"
				class="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-sunk hover:text-ink"
			>
				<X class="size-5" />
			</button>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-1 sm:px-7">
			{#if loadError}
				<p class="m-0 rounded-card bg-apricot-soft px-4 py-3 text-[14px] text-apricot-ink" role="status">
					{loadError}
					<button type="button" class="ml-1 border-0 bg-transparent p-0 font-semibold text-apricot-ink underline" onclick={load}
						>Try again</button
					>
					<AnkiSetupLink />
				</p>
			{:else if !names}
				<p class="m-0 rounded-card bg-sunk px-4 py-3 text-[14px] text-muted" role="status">
					Looking for Anki… Allow it if your browser or Anki asks.
				</p>
			{:else if fixed}
				<p class="m-0 flex items-center gap-3 rounded-card bg-sunk px-4 py-3 text-[15px] font-semibold">
					<Layers class="size-[18px] shrink-0 text-muted" />{deckLabel(deckName)}
				</p>
			{:else}
				{#if names.length}
					<div class="mb-3 flex gap-1 rounded-full bg-sunk p-1" role="group" aria-label="Send to">
						<button type="button" class={seg(mode === 'new')} aria-pressed={mode === 'new'} onclick={() => (mode = 'new')}>
							<Plus class="size-4" />New deck
						</button>
						<button
							type="button"
							class={seg(mode === 'existing')}
							aria-pressed={mode === 'existing'}
							onclick={() => (mode = 'existing')}
						>
							<Layers class="size-4" />Existing deck
						</button>
					</div>
				{/if}

				{#if mode === 'new'}
					<input
						class="min-h-12 w-full rounded-card border-0 bg-sunk px-4 text-[16px] text-ink focus:ring-3 focus:ring-sky"
						aria-label="New deck name"
						placeholder="Deck name"
						bind:value={newName}
					/>
				{:else}
					{#if names.length > 6}
						<input
							type="search"
							class="mb-2 min-h-10 w-full rounded-full border-0 bg-sunk px-4 text-[15px] text-ink focus:ring-3 focus:ring-sky"
							placeholder="Search your decks"
							aria-label="Search your decks"
							bind:value={query}
						/>
					{/if}
					<div role="radiogroup" aria-label="Your decks in Anki" class="grid max-h-64 gap-0.5 overflow-y-auto rounded-card border border-line p-1">
						{#each shown as name (name)}
							{@const on = picked === name}
							{@const parts = name.split('::')}
							<label
								class="flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] px-3 text-left text-[15px] {on
									? 'bg-sky-soft text-sky-ink'
									: 'hover:bg-sunk'}"
							>
								<input type="radio" name="send-deck" class="sr-only" checked={on} onchange={() => (picked = name)} />
								<span class="min-w-0 flex-1 truncate">
									{#if parts.length > 1}<span class="{on ? 'text-sky-ink/70' : 'text-muted'}">{parts.slice(0, -1).join(' › ') + ' › '}</span>{/if}<span
										class="font-semibold">{parts.at(-1)}</span
									>
								</span>
								{#if on}<Check class="size-[18px] shrink-0" />{/if}
							</label>
						{:else}
							<p class="m-0 px-3 py-2 text-[14px] text-muted">No deck matches.</p>
						{/each}
					</div>
				{/if}
			{/if}

			{#if problem}
				<p class="mt-3 mb-0 text-[14px] font-semibold text-apricot-ink" role="alert">{problem}</p>
			{:else if note || (held && held.name === into)}
				<p class="mt-3 mb-0 text-[14px] text-muted" role="status">
					{note}
					{#if held && held.name === into}<strong class="font-semibold text-ink">{heldNote(held.name, held.count)}</strong>{/if}
				</p>
			{/if}
			{#if caveat && !problem}
				<p class="mt-3 mb-0 text-[14px] font-semibold text-apricot-ink" role="status">{caveat.text}</p>
			{/if}
			{#if names}
				<p class="mt-3 mb-0 flex gap-2.5 rounded-card bg-apricot-soft px-4 py-3 text-[14px] text-apricot-ink" role="note">
					<TriangleAlert class="mt-0.5 size-[18px] shrink-0" />
					<span><strong>May overwrite.</strong> {fixed ? FIXED_OVERWRITE_WARNING : OVERWRITE_WARNING}</span>
				</p>
			{/if}
			<label class="mt-3 mb-3 flex cursor-pointer items-center gap-2 text-[14px] text-muted">
				<input type="checkbox" class="size-4 accent-sky-ink" bind:checked={prefs.openAfter} />
				Open in Anki after
			</label>
		</div>

		<div class="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-7">
			<Button variant="secondary" onclick={onclose}>Cancel</Button>
			<Button onclick={send} disabled={!canSend}>
				<Send class="size-[18px]" />{into || (!fixed && mode === 'existing') ? 'Confirm and send' : 'Create and send'}
			</Button>
		</div>
	</div>
</div>
