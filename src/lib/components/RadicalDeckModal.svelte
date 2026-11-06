<script lang="ts">
	import { base } from '$app/paths';
	/**
	 * One door to the radical deck: what the free deck has, what premium adds,
	 * and the build controls underneath. A reader who only ever sees a "download"
	 * button never learns there is a premium edition at all — so the comparison
	 * comes first and the free build is the thing you scroll past it to.
	 *
	 * The free `.apkg` is generated here in the browser; premium is packaged
	 * offline and sold, so its side of the table is a link.
	 */
	import { btnPrimary, btnSecondary } from '$lib/buttonStyles';
	import {
		ENGINE_FILE,
		RADICAL_CARD_TYPES,
		radicalModelProps,
		radicalOptions,
		type RadicalCardType
	} from '$lib/radicalDeck';
	import UpdateDesignModal from './UpdateDesignModal.svelte';
	import type { Radical, RadicalDeckManifest } from '$lib/radicals';
	import Check from '@lucide/svelte/icons/check';
	import Download from '@lucide/svelte/icons/download';
	import Minus from '@lucide/svelte/icons/minus';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import X from '@lucide/svelte/icons/x';

	let {
		radicals,
		visible = radicals,
		deck = null,
		onClose
	}: {
		/** the whole table */
		radicals: Radical[];
		/** what the page's filters leave on screen */
		visible?: Radical[];
		/** the prebuilt-deck manifest, for the premium column */
		deck?: RadicalDeckManifest | null;
		onClose: () => void;
	} = $props();

	// The site's own shop, product dialog open: buying there logs in once and
	// shows the deck as owned afterwards.
	const premiumUrl = `${base}/shop?p=kangxi-radicals`;
	const premiumCards = $derived(deck?.editions.premium?.cards ?? radicals.length * 2);
	const glyphCount = $derived(deck?.editions.premium?.glyphs ?? 2016);

	/** The comparison. `free` is what this modal can actually build. */
	const rows = $derived([
		{ label: `All ${radicals.length} Kangxi radicals`, free: true, premium: true },
		{ label: 'Recognition and writing cards', free: true, premium: true },
		{ label: 'Pronunciation audio', free: true, premium: true },
		{ label: 'Stroke order, animated and practisable', free: true, premium: true },
		{ label: 'Readings across Chinese, Vietnamese, Japanese, Korean', free: true, premium: true },
		{ label: 'The characters each radical builds', free: true, premium: true },
		{
			label:
				`How each glyph evolved, and how it is printed in China, Hong Kong, Taiwan, ` +
				`Japan and Korea — ${glyphCount.toLocaleString()} glyph images`,
			free: false,
			premium: true
		},
		{ label: 'Word sense, zhuyin and Unicode codepoints', free: false, premium: true },
		{
			label: 'A sidebar to show and hide any part of a card, front and back',
			free: false,
			premium: true
		},
		{ label: 'Prebuilt — no waiting on audio', free: false, premium: true },
		{
			label:
				'Print-ready PDFs — a two-sided flashcard deck, a practice sheet for every radical, ' +
				'and a poster of all 214',
			free: false,
			premium: true
		}
	]);

	let cards = $state<RadicalCardType[]>(['recognize', 'write']);
	let audio = $state(true);
	let strokeOrder = $state(true);
	let readings = $state(true);
	let colloquial = $state(true);
	let examples = $state(true);
	let toneColors = $state(true);
	let wholeTable = $state(true);
	let showOptions = $state(false);

	let busy = $state(false);
	let progress = $state(0);
	let status = $state('');
	let controller: AbortController | null = null;

	const filtered = $derived(visible.length > 0 && visible.length < radicals.length);
	const chosen = $derived(filtered && !wholeTable ? visible : radicals);
	const options = $derived(
		radicalOptions('free', { cards, audio, strokeOrder, readings, colloquial, examples, toneColors })
	);

	// Audio is one round trip per radical, so say up front what is being agreed to.
	const estimate = $derived(
		audio
			? `about ${Math.max(1, Math.round(chosen.length / 60))}–${Math.max(2, Math.round(chosen.length / 25))} min`
			: 'seconds'
	);

	const toggleCard = (value: RadicalCardType) => {
		cards = cards.includes(value) ? cards.filter((c) => c !== value) : [...cards, value];
	};

	// Update card design: a reader who built the deck before pushes today's
	// design — with the options picked above — into the note types Anki
	// already has, instead of rebuilding and re-importing. Both card types are
	// offered; one the collection lacks is skipped.
	let designing = $state(false);
	const designModels = $derived(
		RADICAL_CARD_TYPES.map((c) => radicalModelProps({ ...options, cards: ['recognize', 'write'] }, c.value))
	);

	async function build() {
		if (!cards.length) return;
		busy = true;
		progress = 0;
		status = 'Starting…';
		controller = new AbortController();
		try {
			// genanki-js, sql.js, JSZip and the TTS client are megabytes that only
			// matter once the reader actually asks for a deck — never on page load.
			const { buildRadicalDeck, radicalDeckName, saveRadicalDeck } = await import(
				'$lib/radicalDeckBuild'
			);
			const result = await buildRadicalDeck({
				radicals: chosen,
				options,
				deckName: radicalDeckName('free'),
				signal: controller.signal,
				onProgress: (p) => {
					progress = p.value;
					status = p.label;
				}
			});
			saveRadicalDeck(result);
			status =
				`Downloaded ${result.fileName} — ${result.cards} cards` +
				(options.audio ? `, ${result.audio} with audio` : '');
		} catch (e) {
			status =
				e instanceof DOMException && e.name === 'AbortError'
					? 'Cancelled.'
					: `Build failed: ${e instanceof Error ? e.message : String(e)}`;
		} finally {
			busy = false;
			controller = null;
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-5"
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && !busy && onClose()}
>
	<div
		class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-xl sm:rounded-panel"
		role="dialog"
		aria-modal="true"
		aria-label="Get the radical deck"
	>
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="m-0 text-xl font-bold text-ink">The 214 radicals, as a deck</h2>
				<p class="mt-1 text-sm text-muted">
					Two editions, one note type each — import either, or both.
				</p>
			</div>
			<button
				onclick={onClose}
				disabled={busy}
				aria-label="Close"
				class="rounded-md p-1.5 text-muted transition hover:bg-sunk hover:text-ink disabled:opacity-40"
			>
				<X size={18} />
			</button>
		</div>

		<!-- Free vs premium, one row per thing that differs. -->
		<div class="mt-5 overflow-hidden rounded-card border border-line">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-line bg-sunk">
						<th class="px-4 py-2.5 text-left font-medium text-muted"></th>
						<th class="w-24 px-2 py-2.5 text-center font-semibold">Free</th>
						<th class="w-32 bg-apricot-soft px-2 py-2.5 text-center font-semibold text-apricot-ink">
							<span class="inline-flex items-center gap-1.5"><Sparkles size={14} /> Premium</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.label)}
						<tr class="border-b border-line last:border-0">
							<td class="px-4 py-2 text-ink">{row.label}</td>
							<td class="px-2 py-2 text-center">
								{#if row.free}
									<Check size={15} class="mx-auto text-mint-ink" />
								{:else}
									<Minus size={15} class="mx-auto text-muted/70" />
								{/if}
							</td>
							<td class="bg-apricot-soft px-2 py-2 text-center">
								<Check size={15} class="mx-auto text-apricot-ink" />
							</td>
						</tr>
					{/each}
					<tr class="border-t border-line">
						<td class="px-4 py-3 text-[13px] text-muted font-semibold">
							{premiumCards} cards either way
						</td>
						<td class="px-2 py-3 text-center text-xs text-muted">Built here</td>
						<td class="bg-apricot-soft px-2 py-3 text-center">
							<a
								class="inline-flex items-center gap-1.5 text-xs font-semibold text-apricot-ink underline"
								href={premiumUrl}
							>
								Get premium
							</a>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- The free build. -->
		<div class="mt-6 flex flex-wrap items-baseline justify-between gap-2">
			<h3 class="text-[13px] text-muted font-semibold">
				Your free deck
			</h3>
			<button
				type="button"
				onclick={() => (showOptions = !showOptions)}
				class="inline-flex items-center gap-1.5 text-xs text-muted underline transition hover:text-ink"
			>
				<Settings2 size={13} />
				{showOptions ? 'Hide options' : 'Options'}
			</button>
		</div>

		<p class="mt-1.5 text-sm text-muted">
			{cards.length === 2 ? 'Recognition and writing cards' : cards.length ? `${cards[0] === 'recognize' ? 'Recognition' : 'Writing'} card only` : 'No cards picked'},
			{audio ? 'with audio' : 'silent'}, built in your browser — {estimate}. Nothing is uploaded.
		</p>

		{#if showOptions}
			<div class="mt-4 rounded-card border border-line p-4">
				<h4 class="text-[13px] text-muted font-semibold">Cards</h4>
				<div class="mt-2 grid gap-2 sm:grid-cols-2">
					{#each RADICAL_CARD_TYPES as card (card.value)}
						<button
							type="button"
							onclick={() => toggleCard(card.value)}
							aria-pressed={cards.includes(card.value)}
							class="rounded-card p-3 text-left transition {cards.includes(card.value)
								? 'bg-sky-soft text-sky-ink ring-2 ring-sky ring-inset'
								: 'bg-sunk text-ink hover:brightness-95'}"
						>
							<div class="text-sm font-semibold">{card.name}</div>
							<div
								class="mt-0.5 text-xs leading-snug text-muted"
							>
								{card.value === 'recognize'
									? 'See the radical, recall its meaning and reading.'
									: 'See the meaning, write it into an empty grid.'}
							</div>
						</button>
					{/each}
				</div>
				{#if !cards.length}
					<p class="mt-2 text-xs text-rose-ink">Pick at least one card.</p>
				{/if}

				<h4 class="mt-5 text-[13px] text-muted font-semibold">
					On the back
				</h4>
				<div class="mt-2 grid gap-2 sm:grid-cols-2">
					<label class="flex items-center gap-2 text-sm text-ink">
						<input type="checkbox" bind:checked={audio} class="h-4 w-4 accent-sky-ink" />
						Pronunciation audio
					</label>
					<label class="flex items-center gap-2 text-sm text-ink">
						<input type="checkbox" bind:checked={strokeOrder} class="h-4 w-4 accent-sky-ink" />
						Stroke order
					</label>
					<label class="flex items-center gap-2 text-sm text-ink">
						<input type="checkbox" bind:checked={readings} class="h-4 w-4 accent-sky-ink" />
						East Asian readings
					</label>
					<label class="flex items-center gap-2 text-sm text-ink">
						<input type="checkbox" bind:checked={colloquial} class="h-4 w-4 accent-sky-ink" />
						Teaching name (月字旁)
					</label>
					<label class="flex items-center gap-2 text-sm text-ink">
						<input type="checkbox" bind:checked={examples} class="h-4 w-4 accent-sky-ink" />
						Characters built with it
					</label>
					<label class="flex items-center gap-2 text-sm text-ink">
						<input type="checkbox" bind:checked={toneColors} class="h-4 w-4 accent-sky-ink" />
						Tone-coloured pinyin
					</label>
				</div>

				{#if filtered}
					<h4 class="mt-5 text-[13px] text-muted font-semibold">
						Which radicals
					</h4>
					<div class="mt-2 space-y-2">
						<label class="flex items-center gap-2 text-sm text-ink">
							<input
								type="radio"
								bind:group={wholeTable}
								value={true}
								class="h-4 w-4 accent-sky-ink"
							/>
							All {radicals.length}
						</label>
						<label class="flex items-center gap-2 text-sm text-ink">
							<input
								type="radio"
								bind:group={wholeTable}
								value={false}
								class="h-4 w-4 accent-sky-ink"
							/>
							Just the {visible.length} on screen
						</label>
					</div>
				{/if}
			</div>
		{/if}

		{#if status}
			<div class="mt-4">
				<p class="text-sm text-muted">{status}</p>
				{#if busy}
					<div class="mt-1.5 h-1 overflow-hidden rounded-full bg-sunk">
						<div
							class="h-full rounded-full bg-accent transition-all"
							style="width:{progress}%"
						></div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Premium is the filled button: the free build is right there either way,
		     and a reader who never sees the paid edition never considers it. -->
		<div class="mt-6 flex flex-wrap items-center justify-end gap-2">
			<button
				class="{btnSecondary} inline-flex items-center gap-2"
				onclick={busy ? () => controller?.abort() : build}
				disabled={!busy && !cards.length}
			>
				<Download size={15} />
				{busy ? 'Stop' : 'Build free deck'}
			</button>
			<a
				class="{btnPrimary} inline-flex items-center gap-2"
				href={premiumUrl}
			>
				<Sparkles size={15} /> Premium
			</a>
		</div>
		<!-- Desktop only, like Send: phones have no AnkiConnect. -->
		<p class="mt-3 mb-0 hidden text-right text-sm sm:block">
			<button
				type="button"
				class="border-0 bg-transparent p-0 font-semibold text-accent hover:underline"
				disabled={busy}
				onclick={() => (designing = true)}>Already have it? Update its card design</button
			>
		</p>
	</div>
</div>

{#if designing}
	<UpdateDesignModal
		wanted={designModels}
		media={[{ name: ENGINE_FILE, url: '/data/_hanzi-writer.min.js', check: 'HanziWriter' }]}
		subtitle="Puts the free deck's current card design, with the options picked here, into the deck you already have."
		onclose={() => (designing = false)}
	/>
{/if}
