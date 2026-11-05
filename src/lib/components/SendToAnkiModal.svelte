<!--
  Where a send lands, and the send settings. Opens on Send (unless "Ask every
  time" is off) and from the settings button beside it. The deck list comes
  from Anki itself (`deckNames`), so the reader picks a deck they can see in
  Anki or names a new one. `fixed`: a prebuilt deck whose name is inside the
  file — nothing to pick, the modal only says where it goes and whether it is
  already there.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, SectionLabel, Switch } from '$lib/ui';
	import {
		deckLabel,
		filterDecks,
		findDeck,
		loadSendPrefs,
		resolveTarget,
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

	let {
		deckName,
		subtitle = '',
		fixed = false,
		loadDecks,
		onsend,
		onclose
	}: {
		/** The page's deck name: the suggestion, or (fixed) the deck inside the file. */
		deckName: string;
		subtitle?: string;
		fixed?: boolean;
		loadDecks: () => Promise<string[]>;
		onsend: (name: string, prefs: SendPrefs) => void;
		onclose: () => void;
	} = $props();

	let names = $state<string[] | null>(null);
	let loadError = $state('');
	// svelte-ignore state_referenced_locally
	let target = $state<Target>({ kind: 'new', name: deckName });
	let query = $state('');
	let prefs = $state<SendPrefs>(loadSendPrefs());
	let dialog = $state<HTMLElement>();

	async function load() {
		loadError = '';
		names = null;
		try {
			const got = sortDecks(await loadDecks());
			names = got;
			target = suggestTarget(deckName, got);
		} catch (e) {
			loadError = (e as Error).message;
		}
	}
	onMount(() => {
		dialog?.focus();
		void load();
	});

	const resolved = $derived(resolveTarget(target, names ?? []));
	const shown = $derived(filterDecks(names ?? [], query));
	const note = $derived(
		fixed
			? names && findDeck(names, deckName)
				? `Already in your Anki: updates it in place. Reviews are kept.`
				: names
					? 'A new deck; every level is its own subdeck.'
					: null
			: targetNote(resolved)
	);
	const canSend = $derived(!!names && !!resolved.name);

	function send() {
		if (!canSend) return;
		saveSendPrefs($state.snapshot(prefs));
		onsend(fixed ? deckName : resolved.name, $state.snapshot(prefs));
	}

	const row =
		'flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-card px-3 text-left text-[15px] transition-colors';
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
		<div class="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-7">
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

		<div class="min-h-0 flex-1 overflow-y-auto px-5 pt-4 sm:px-7">
			{#if loadError}
				<p class="m-0 rounded-card bg-apricot-soft px-4 py-3 text-[14px] text-apricot-ink" role="status">
					{loadError}
					<button type="button" class="ml-1 border-0 bg-transparent p-0 font-semibold text-apricot-ink underline" onclick={load}
						>Try again</button
					>
				</p>
			{:else if !names}
				<p class="m-0 rounded-card bg-sunk px-4 py-3 text-[14px] text-muted" role="status">
					Looking for Anki… Allow it if your browser or Anki asks.
				</p>
			{:else if fixed}
				<SectionLabel as="h3" class="mb-2">Goes into</SectionLabel>
				<p class="m-0 flex items-center gap-3 rounded-card bg-sunk px-3 py-3 text-[15px] font-semibold">
					<Layers class="size-[18px] text-muted" />{deckLabel(deckName)}
				</p>
			{:else}
				<SectionLabel as="h3" class="mb-2">Deck</SectionLabel>
				<div role="radiogroup" aria-label="Deck" class="grid gap-1">
					<label class="{row} {target.kind === 'new' ? 'bg-sky-soft ring-2 ring-sky-ink ring-inset' : 'bg-sunk'}">
						<input
							type="radio"
							name="send-target"
							class="size-4 accent-sky-ink"
							checked={target.kind === 'new'}
							onchange={() => (target = { kind: 'new', name: target.kind === 'new' ? target.name : deckName })}
						/>
						<Plus class="size-[18px] shrink-0 text-muted" />
						<span class="sr-only">New deck</span>
						<input
							class="min-h-9 min-w-0 flex-1 rounded-full border-0 bg-surface px-3 text-[15px] text-ink focus:ring-3 focus:ring-sky"
							aria-label="New deck name"
							placeholder="New deck name"
							value={target.kind === 'new' ? target.name : ''}
							onfocus={() => target.kind !== 'new' && (target = { kind: 'new', name: deckName })}
							oninput={(e) => (target = { kind: 'new', name: e.currentTarget.value })}
						/>
					</label>

					{#if names.length}
						<SectionLabel as="h3" class="mt-4 mb-1">Your decks in Anki</SectionLabel>
						{#if names.length > 8}
							<input
								type="search"
								class="mb-1 min-h-10 rounded-full border-0 bg-sunk px-4 text-[15px] text-ink focus:ring-3 focus:ring-sky"
								placeholder="Filter decks"
								aria-label="Filter decks"
								bind:value={query}
							/>
						{/if}
						<div class="grid max-h-64 gap-0.5 overflow-y-auto">
							{#each shown as name (name)}
								{@const on = target.kind === 'existing' && target.name === name}
								{@const depth = name.split('::').length - 1}
								<label
									class="{row} {on ? 'bg-sky-soft font-semibold text-sky-ink ring-2 ring-sky-ink ring-inset' : 'hover:bg-sunk'}"
									style="padding-left:{0.75 + depth * 1.25}rem"
								>
									<input
										type="radio"
										name="send-target"
										class="size-4 accent-sky-ink"
										checked={on}
										onchange={() => (target = { kind: 'existing', name })}
									/>
									<span class="min-w-0 truncate">{name.split('::').at(-1)}</span>
								</label>
							{:else}
								<p class="m-0 px-3 py-2 text-[14px] text-muted">No deck matches.</p>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			{#if note}
				<p class="mt-3 mb-0 text-[13.5px] text-muted">{note}</p>
			{/if}

			<details class="group mt-4 border-t border-line pt-2" open={!prefs.ask}>
				<summary class="cursor-pointer py-2 text-[15px] font-semibold text-ink">Settings</summary>
				<div class="divide-y divide-line">
					<Switch bind:checked={prefs.openAfter} label="Open it in Anki" hint="Show the deck once it is in" />
					{#if !fixed}
						<Switch
							bind:checked={prefs.ask}
							label="Ask every time"
							hint="Off: Send goes straight to the deck name on the page"
						/>
					{/if}
				</div>
			</details>
		</div>

		<div class="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-7">
			<Button variant="secondary" onclick={onclose}>Cancel</Button>
			<Button onclick={send} disabled={!canSend}>
				<Send class="size-[18px]" />{resolved.kind === 'existing' || fixed ? 'Send' : 'Create and send'}
			</Button>
		</div>
	</div>
</div>
