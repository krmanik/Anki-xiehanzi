<script lang="ts">
	/**
	 * Free vs premium, shown before the free `.apkg` downloads — the same idea as
	 * `RadicalDeckModal`: a reader who only ever sees a "download" button never
	 * learns premium exists. The free HSK deck is a prebuilt release asset, so
	 * the free side is the direct download link, not a builder.
	 *
	 * Pressing it switches the modal to what to do next: import, get it onto a
	 * phone, and how to hear about updates.
	 */
	import { onMount } from 'svelte';
	import { deckSummary, deckUrl, formatBytes, type HskDeckEntry, type HskDeckManifest } from '$lib/hskDecks';
	import type { HskListMeta } from '$lib/hsk';
	import { Button, IconDot } from '$lib/ui';
	import Bell from '@lucide/svelte/icons/bell';
	import Check from '@lucide/svelte/icons/check';
	import Download from '@lucide/svelte/icons/download';
	import Minus from '@lucide/svelte/icons/minus';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import X from '@lucide/svelte/icons/x';
	import Send from '@lucide/svelte/icons/send';
	import { anki, ankiClient, checkAnki, probeAnki, ANKI_STATUS_TEXT } from '$lib/anki/ankiStatus.svelte';
	import { sendPackage, SEND_STAGE_TEXT, type SendStage } from '$lib/anki/sendDeck';

	let {
		list,
		manifest,
		deck,
		onClose
	}: {
		list: HskListMeta;
		manifest: HskDeckManifest;
		deck: HskDeckEntry;
		onClose: () => void;
	} = $props();

	// Premium links point at the deck post, not the shop front: the post says
	// what is in the deck, and a buyer arriving at a bare storefront has to work
	// out which product this modal was talking about.
	const POST = 'https://www.patreon.com/krmani/posts/anki-xie-hanzi-3-166350823';
	/** Free membership: Patreon emails followers when a post (a deck update) goes up. */
	const FOLLOW = 'https://www.patreon.com/cw/krmani';

	let step = $state<'choose' | 'done'>('choose');
	let dialog = $state<HTMLElement>();
	onMount(() => {
		dialog?.focus();
		probeAnki();
	});

	// Send to Anki: Anki downloads the release asset itself (`storeMediaFile`
	// with a url), so the 30–57 MB never passes through the page. One click:
	// connect, send, and Anki opens the deck.
	let sendStage = $state<'idle' | 'connecting' | SendStage | 'error'>('idle');
	let sendError = $state('');
	let sent = $state(false);
	const sending = $derived(['connecting', 'storing', 'importing', 'cleaning'].includes(sendStage));
	async function sendToAnki() {
		if (sending) return;
		sendError = '';
		sendStage = 'connecting';
		const status = anki.status === 'ready' ? 'ready' : await checkAnki();
		if (status !== 'ready') {
			sendStage = 'error';
			sendError = ANKI_STATUS_TEXT[status];
			return;
		}
		try {
			await sendPackage(
				ankiClient(),
				{ url: deckUrl(manifest, deck) },
				{ onStage: (st) => (sendStage = st), showDeck: `Anki xiehanzi::${list.name} (${list.year})` }
			);
			sent = true;
			step = 'done';
		} catch (e) {
			sendStage = 'error';
			const err = e as { unreachable?: boolean; message?: string };
			if (err.unreachable) anki.status = 'unreachable';
			sendError = err.unreachable ? ANKI_STATUS_TEXT.unreachable : `Anki said: ${err.message ?? e}`;
		}
	}
	const sendText = $derived(
		sendStage === 'error'
			? sendError
			: sendStage === 'connecting'
				? ANKI_STATUS_TEXT.checking
				: sendStage === 'storing'
					? `Anki is downloading the deck (${formatBytes(deck.bytes)})…`
					: sendStage === 'idle'
						? ''
						: SEND_STAGE_TEXT[sendStage]
	);

	// The comparison. `free` is what the download button actually delivers.
	const rows = $derived([
		{ label: `Every ${list.name} word (${list.total.toLocaleString()}), one file`, free: true },
		{ label: 'Native pronunciation audio', free: true },
		{ label: 'Example sentences, each with its own audio', free: true },
		{ label: 'Full definitions, character breakdown, radical, HSK band, frequency', free: true },
		{ label: 'Stroke-order practice grid', free: true },
		{ label: 'Sidebar to show or hide any field, front and back', free: true },
		{ label: 'Separate Recognition and Writing cards, reviewed independently', free: false },
		{ label: 'Redesigned card layout', free: false },
		{ label: 'Built-in dictionary: look up any word without leaving the card', free: false },
		{ label: 'The whole example-sentence corpus, "Load more" as you review', free: false }
	]);

	const allSteps = [
		{
			title: 'Open it in Anki',
			text: 'Double-click the .apkg file, or in Anki choose File → Import. Every level arrives as its own subdeck.'
		},
		{
			title: 'Put it on your phone',
			text: 'Press Sync in Anki on your computer, then sync AnkiMobile or AnkiDroid. Or open the file on the phone itself.'
		}
	];
	// A sent deck is already imported: only the phone step is left.
	const steps = $derived(sent ? allSteps.slice(1) : allSteps);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5"
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && onClose()}
>
	<div
		bind:this={dialog}
		tabindex="-1"
		class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[24px] bg-surface p-5 text-ink shadow-xl outline-none sm:rounded-[24px] sm:p-7"
		role="dialog"
		aria-modal="true"
		aria-labelledby="deck-modal-title"
	>
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 id="deck-modal-title" class="m-0 text-[22px] leading-tight font-bold">
					{step === 'done' ? (sent ? 'In Anki now' : 'Your download has started') : `${list.name} (${list.year})`}
				</h2>
				<p class="mt-1 mb-0 text-[15px] text-muted">
					{step === 'done'
						? sent
							? 'Every level is its own subdeck. Anki has it open.'
							: `${deck.file} · ${formatBytes(deck.bytes)}`
						: 'The free deck downloads right here. Premium is a different deck, sold separately.'}
				</p>
			</div>
			<button
				type="button"
				onclick={onClose}
				aria-label="Close"
				class="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-sunk hover:text-ink"
			>
				<X class="size-5" />
			</button>
		</div>

		{#if step === 'choose'}
			<div class="mt-5 overflow-hidden rounded-card ring-1 ring-line ring-inset">
				<table class="w-full border-collapse text-[15px]">
					<thead>
						<tr class="bg-sunk text-sm">
							<th class="px-4 py-2.5 text-left font-semibold text-muted">What you get</th>
							<th class="w-20 px-2 py-2.5 text-center font-semibold">Free</th>
							<th class="w-24 bg-apricot-soft px-2 py-2.5 text-center font-semibold text-apricot-ink">
								Premium
							</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row (row.label)}
							<tr class="border-t border-line">
								<td class="px-4 py-2">{row.label}</td>
								<td class="px-2 py-2 text-center">
									{#if row.free}
										<Check class="mx-auto size-[18px] text-mint-ink" aria-label="Included" />
									{:else}
										<Minus class="mx-auto size-[18px] text-muted" aria-label="Not included" />
									{/if}
								</td>
								<td class="bg-apricot-soft px-2 py-2 text-center">
									<Check class="mx-auto size-[18px] text-mint-ink" aria-label="Included" />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="mt-3 mb-0 text-sm text-muted">{deckSummary(manifest, deck)}</p>

			<!-- Premium is the filled button: the free download is right there
			     either way, and a reader who never sees the paid edition never
			     considers it. -->
			{#if sendText}
				<p
					class="mt-4 mb-0 rounded-card px-4 py-3 text-[14px] {sendStage === 'error'
						? 'bg-apricot-soft text-apricot-ink'
						: 'bg-sunk text-muted'}"
					role="status"
				>
					{sendText}
				</p>
			{/if}
			<div class="mt-6 flex flex-wrap items-center justify-end gap-2">
				<!-- Send is desktop-only (phones have no AnkiConnect). It leads once
				     Anki has answered, since it saves the import step. -->
				<div class="hidden sm:block {anki.status === 'ready' ? 'sm:order-first' : ''}">
					<Button variant="secondary" onclick={sendToAnki} disabled={sending}>
						<Send class="size-[18px]" />{sending ? 'Sending…' : 'Send to Anki'}
					</Button>
				</div>
				<Button variant="secondary" href={deckUrl(manifest, deck)} onclick={() => (step = 'done')}>
					<Download class="size-[18px]" />Download free deck
					<span class="font-medium text-muted">{formatBytes(deck.bytes)}</span>
				</Button>
				<Button href={POST} target="_blank" rel="noopener noreferrer">
					<Sparkles class="size-[18px]" />See Premium
				</Button>
			</div>
		{:else}
			<ol class="mt-5 mb-0 grid list-none gap-3 p-0">
				{#each steps as s, i (s.title)}
					<li class="flex gap-3.5 rounded-card bg-sunk p-4">
						<IconDot hue={i === 0 ? 'sky' : 'mint'} size="sm">{i + 1}</IconDot>
						<div>
							<h3 class="m-0 text-base font-semibold">{s.title}</h3>
							<p class="mt-0.5 mb-0 text-[15px] text-muted">{s.text}</p>
						</div>
					</li>
				{/each}
			</ol>

			<div class="mt-3 grid gap-3 sm:grid-cols-2">
				<div class="rounded-card bg-lavender-soft p-4">
					<h3 class="m-0 flex items-center gap-2 text-base font-semibold">
						<Bell class="size-[18px] text-lavender-ink" />Hear about updates
					</h3>
					<p class="mt-1 mb-2 text-[15px] text-muted">
						Follow on Patreon for free and get an email when a new version of the deck is out.
					</p>
					<a
						href={FOLLOW}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[15px] font-semibold text-lavender-ink no-underline hover:underline"
						>Follow for free</a
					>
				</div>
				<div class="rounded-card bg-apricot-soft p-4">
					<h3 class="m-0 flex items-center gap-2 text-base font-semibold">
						<Sparkles class="size-[18px] text-apricot-ink" />Want writing cards?
					</h3>
					<p class="mt-1 mb-2 text-[15px] text-muted">
						Premium gives each word a separate Writing card and a dictionary inside every card.
					</p>
					<a
						href={POST}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[15px] font-semibold text-apricot-ink no-underline hover:underline"
						>See Premium</a
					>
				</div>
			</div>

			<div class="mt-6 flex flex-wrap items-center justify-between gap-3">
				{#if sent}
					<span></span>
				{:else}
					<a href={deckUrl(manifest, deck)} class="text-sm font-semibold text-accent no-underline hover:underline"
						>Download didn't start? Try again</a
					>
				{/if}
				<Button variant="secondary" onclick={onClose}>Done</Button>
			</div>
		{/if}
	</div>
</div>
