<script lang="ts">
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
	import { RADICAL_CARD_TYPES, radicalOptions, type RadicalCardType } from '$lib/radicalDeck';
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

	const SHOP = 'https://www.patreon.com/cw/krmani/shop';
	const POST = 'https://www.patreon.com/krmani/posts/kangxi-radicals-166891672?source=storefront';
	// The post for this product, not the shop front: a reader who clicks "Get
	// premium" should land on the page describing the radical deck, not on
	// everything that is for sale.
	const premiumUrl = $derived(deck?.post || deck?.shop || POST || SHOP);
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
		class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
		role="dialog"
		aria-modal="true"
		aria-label="Get the radical deck"
	>
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="text-xl font-bold tracking-tight">The 214 radicals, as a deck</h2>
				<p class="mt-1 text-sm text-neutral-500">
					Two editions, one note type each — import either, or both.
				</p>
			</div>
			<button
				onclick={onClose}
				disabled={busy}
				aria-label="Close"
				class="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"
			>
				<X size={18} />
			</button>
		</div>

		<!-- Free vs premium, one row per thing that differs. -->
		<div class="mt-5 overflow-hidden rounded-xl border border-neutral-200">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-neutral-200 bg-neutral-50">
						<th class="px-4 py-2.5 text-left font-medium text-neutral-500"></th>
						<th class="w-24 px-2 py-2.5 text-center font-semibold">Free</th>
						<th class="w-32 px-2 py-2.5 text-center font-semibold">
							<span class="inline-flex items-center gap-1.5"><Sparkles size={14} /> Premium</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.label)}
						<tr class="border-b border-neutral-100 last:border-0">
							<td class="px-4 py-2 text-neutral-700">{row.label}</td>
							<td class="px-2 py-2 text-center">
								{#if row.free}
									<Check size={15} class="mx-auto text-neutral-900" />
								{:else}
									<Minus size={15} class="mx-auto text-neutral-300" />
								{/if}
							</td>
							<td class="bg-neutral-50 px-2 py-2 text-center">
								<Check size={15} class="mx-auto text-neutral-900" />
							</td>
						</tr>
					{/each}
					<tr class="border-t border-neutral-200">
						<td class="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
							{premiumCards} cards either way
						</td>
						<td class="px-2 py-3 text-center text-xs text-neutral-500">Built here</td>
						<td class="bg-neutral-50 px-2 py-3 text-center">
							<a
								class="inline-flex items-center gap-1.5 text-xs font-medium underline"
								href={premiumUrl}
								target="_blank"
								rel="noopener noreferrer"
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
			<h3 class="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
				Your free deck
			</h3>
			<button
				type="button"
				onclick={() => (showOptions = !showOptions)}
				class="inline-flex items-center gap-1.5 text-xs text-neutral-500 underline transition hover:text-neutral-900"
			>
				<Settings2 size={13} />
				{showOptions ? 'Hide options' : 'Options'}
			</button>
		</div>

		<p class="mt-1.5 text-sm text-neutral-500">
			{cards.length === 2 ? 'Recognition and writing cards' : cards.length ? `${cards[0] === 'recognize' ? 'Recognition' : 'Writing'} card only` : 'No cards picked'},
			{audio ? 'with audio' : 'silent'}, built in your browser — {estimate}. Nothing is uploaded.
		</p>

		{#if showOptions}
			<div class="mt-4 rounded-xl border border-neutral-200 p-4">
				<h4 class="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">Cards</h4>
				<div class="mt-2 grid gap-2 sm:grid-cols-2">
					{#each RADICAL_CARD_TYPES as card (card.value)}
						<button
							type="button"
							onclick={() => toggleCard(card.value)}
							aria-pressed={cards.includes(card.value)}
							class="rounded-lg border p-3 text-left transition {cards.includes(card.value)
								? 'border-neutral-900 bg-neutral-900 text-white'
								: 'border-neutral-200 hover:border-neutral-900'}"
						>
							<div class="text-sm font-semibold">{card.name}</div>
							<div
								class="mt-0.5 text-[11px] leading-snug {cards.includes(card.value)
									? 'text-neutral-300'
									: 'text-neutral-500'}"
							>
								{card.value === 'recognize'
									? 'See the radical, recall its meaning and reading.'
									: 'See the meaning, write it into an empty grid.'}
							</div>
						</button>
					{/each}
				</div>
				{#if !cards.length}
					<p class="mt-2 text-xs text-red-600">Pick at least one card.</p>
				{/if}

				<h4 class="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
					On the back
				</h4>
				<div class="mt-2 grid gap-2 sm:grid-cols-2">
					<label class="flex items-center gap-2 text-sm text-neutral-700">
						<input type="checkbox" bind:checked={audio} class="h-4 w-4 accent-neutral-900" />
						Pronunciation audio
					</label>
					<label class="flex items-center gap-2 text-sm text-neutral-700">
						<input type="checkbox" bind:checked={strokeOrder} class="h-4 w-4 accent-neutral-900" />
						Stroke order
					</label>
					<label class="flex items-center gap-2 text-sm text-neutral-700">
						<input type="checkbox" bind:checked={readings} class="h-4 w-4 accent-neutral-900" />
						East Asian readings
					</label>
					<label class="flex items-center gap-2 text-sm text-neutral-700">
						<input type="checkbox" bind:checked={colloquial} class="h-4 w-4 accent-neutral-900" />
						Teaching name (月字旁)
					</label>
					<label class="flex items-center gap-2 text-sm text-neutral-700">
						<input type="checkbox" bind:checked={examples} class="h-4 w-4 accent-neutral-900" />
						Characters built with it
					</label>
					<label class="flex items-center gap-2 text-sm text-neutral-700">
						<input type="checkbox" bind:checked={toneColors} class="h-4 w-4 accent-neutral-900" />
						Tone-coloured pinyin
					</label>
				</div>

				{#if filtered}
					<h4 class="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
						Which radicals
					</h4>
					<div class="mt-2 space-y-2">
						<label class="flex items-center gap-2 text-sm text-neutral-700">
							<input
								type="radio"
								bind:group={wholeTable}
								value={true}
								class="h-4 w-4 accent-neutral-900"
							/>
							All {radicals.length}
						</label>
						<label class="flex items-center gap-2 text-sm text-neutral-700">
							<input
								type="radio"
								bind:group={wholeTable}
								value={false}
								class="h-4 w-4 accent-neutral-900"
							/>
							Just the {visible.length} on screen
						</label>
					</div>
				{/if}
			</div>
		{/if}

		{#if status}
			<div class="mt-4">
				<p class="text-sm text-neutral-500">{status}</p>
				{#if busy}
					<div class="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-100">
						<div
							class="h-full rounded-full bg-neutral-900 transition-all"
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
				target="_blank"
				rel="noopener noreferrer"
			>
				<Sparkles size={15} /> Premium
			</a>
		</div>
	</div>
</div>
