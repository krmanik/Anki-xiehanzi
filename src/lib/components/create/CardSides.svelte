<!--
  What is on the card: a Front column and a Back column of the items each side
  prints, top to bottom, and a row of what can still be added to the side in
  focus. The preview beside it shows that same side (`side` is bound).

  - Drag a row (pointer events, so it works on touch) to reorder it or to move
    it to the other column. Order is the deck's one shared `order` — see
    `cardSides.ts` — so a reorder shows on both sides.
  - Keyboard: ↑ ↓ reorder, ← → move to Front / Back, Delete removes.
  - × removes from this side only; the item stays on the other side.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import CONSTANTS from '$lib/dict/contants';
	import type { TabContent } from '$lib/deck';
	import {
		ITEM_META,
		SIDES,
		addable,
		addToSide,
		itemLabel,
		moveInSide,
		moveToSide,
		removeFromSide,
		sideItems,
		type Side
	} from '$lib/cardSides';

	let {
		tabs,
		tabContent = $bindable(),
		activeTab = $bindable(),
		order = $bindable(),
		includeAudio = $bindable(),
		side = $bindable()
	}: {
		tabs: string[];
		tabContent: TabContent;
		activeTab: number;
		order: string[];
		includeAudio: boolean;
		side: Side;
	} = $props();

	const tab = $derived(tabs[activeTab]);
	const card = $derived(tabContent[tab]);
	const NAMES: Record<Side, string> = { front: 'Front', back: 'Back' };

	function setCard(next: TabContent[string]) {
		tabContent = { ...tabContent, [tab]: next };
	}

	function add(item: string) {
		if (item === CONSTANTS.FIELDS.AUDIO && !includeAudio) includeAudio = true;
		setCard(addToSide(card, side, item));
	}

	function remove(s: Side, item: string) {
		setCard(removeFromSide(card, s, item));
	}

	async function refocus(s: Side, item: string) {
		await tick();
		document.querySelector<HTMLElement>(`[data-chip="${s}:${item}"]`)?.focus();
	}

	function onKey(e: KeyboardEvent, s: Side, item: string, index: number) {
		const other: Side = s === 'front' ? 'back' : 'front';
		if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
			e.preventDefault();
			order = moveInSide(order, card, s, item, index + (e.key === 'ArrowUp' ? -1 : 1));
			refocus(s, item);
		} else if ((e.key === 'ArrowLeft' && s === 'back') || (e.key === 'ArrowRight' && s === 'front')) {
			e.preventDefault();
			setCard(moveToSide(card, s, other, item));
			side = other;
			refocus(other, item);
		} else if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault();
			remove(s, item);
		}
	}

	// ---- drag: reorder within a column, or carry a row across ----
	let drag = $state<{ item: string; side: Side; moved: boolean; y: number } | null>(null);

	function startDrag(e: PointerEvent, s: Side, item: string) {
		if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
		drag = { item, side: s, moved: false, y: e.clientY };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onDragMove(e: PointerEvent) {
		if (!drag) return;
		if (!drag.moved && Math.abs(e.clientY - drag.y) < 4) return;
		drag.moved = true;
		e.preventDefault();
		const col = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-side]');
		const target = (col?.dataset.side as Side | undefined) ?? drag.side;
		let next = card;
		if (target !== drag.side) {
			next = moveToSide(card, drag.side, target, drag.item);
			setCard(next);
			drag.side = target;
			side = target;
		}
		// Position = how many of the column's other rows sit above the pointer.
		const rows = [...document.querySelectorAll<HTMLElement>(`[data-side="${target}"] [data-chip]`)].filter(
			(r) => r.dataset.chip !== `${target}:${drag!.item}`
		);
		const index = rows.filter((r) => {
			const b = r.getBoundingClientRect();
			return b.top + b.height / 2 < e.clientY;
		}).length;
		order = moveInSide(order, next, target, drag.item, index);
	}

	function endDrag() {
		drag = null;
	}

	const row =
		'group flex min-h-11 touch-none select-none items-center gap-2 rounded-card pr-1 pl-1.5 text-[14.5px] outline-none focus-visible:ring-3 focus-visible:ring-sky';
</script>

{#if card}
	{#if tabs.length > 1}
		<div class="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Card type">
			{#each tabs as t, i (t)}
				<button
					type="button"
					class="min-h-8 rounded-full px-3 text-[13.5px] font-semibold {i === activeTab
						? 'bg-sky-soft text-sky-ink'
						: 'text-muted ring-1 ring-line ring-inset hover:text-ink'}"
					aria-pressed={i === activeTab}
					onclick={() => (activeTab = i)}>{t}</button
				>
			{/each}
		</div>
	{/if}

	<div class="grid gap-3 sm:grid-cols-2">
		{#each SIDES as s (s)}
			{@const items = sideItems(order, card, s)}
			<!-- The click only puts this side in focus; the keyboard reaches each row
			     directly, so the column needs no key handler of its own. -->
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
			<section
				data-side={s}
				aria-label="{NAMES[s]} of the card"
				class="rounded-panel p-2 transition {side === s ? 'bg-sky-soft/50 ring-2 ring-sky ring-inset' : 'bg-sunk'}"
				onclick={() => (side = s)}
			>
				<header class="flex items-baseline justify-between px-1.5 pt-0.5 pb-2">
					<h3 class="m-0 text-[15px] font-semibold text-ink">{NAMES[s]}</h3>
					<span class="text-[13px] text-muted">{items.length ? `${items.length} item${items.length === 1 ? '' : 's'}` : 'Empty'}</span>
				</header>
				<ul class="m-0 flex list-none flex-col gap-1.5 p-0">
					{#each items as item, i (item)}
						{@const meta = ITEM_META[item]}
						{@const chrome = meta?.kind === 'chrome'}
						{@const muted = item === CONSTANTS.FIELDS.AUDIO && !includeAudio}
						<!-- A focusable row: arrow keys move it, Delete removes it (the label says so). -->
						<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
						<li
							data-chip="{s}:{item}"
							tabindex="0"
							aria-label="{itemLabel(item)}, {NAMES[s].toLowerCase()} {i + 1} of {items.length}{muted
								? ', audio is off'
								: ''}. Arrow keys move it, Delete removes it."
							class="{row} {chrome
								? 'border border-dashed border-line text-muted'
								: 'bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)] ring-1 ring-line ring-inset'} {drag?.item === item &&
							drag.side === s
								? 'opacity-60'
								: ''} cursor-grab"
							onpointerdown={(e) => startDrag(e, s, item)}
							onpointermove={onDragMove}
							onpointerup={endDrag}
							onpointercancel={endDrag}
							onkeydown={(e) => onKey(e, s, item, i)}
						>
							<GripVertical class="size-4 shrink-0 text-muted/70" aria-hidden="true" />
							<span
								class="grid h-7 min-w-7 shrink-0 place-items-center rounded-md px-1 font-zh text-[13px] {chrome
									? ''
									: 'bg-sunk text-muted'}"
								aria-hidden="true">{meta?.glyph ?? '·'}</span
							>
							<span class="min-w-0 flex-1 truncate {muted ? 'text-muted line-through' : ''}">{itemLabel(item)}</span>
							<button
								type="button"
								tabindex="-1"
								class="grid size-8 shrink-0 place-items-center rounded-full text-muted opacity-60 transition group-hover:opacity-100 hover:bg-sunk hover:text-ink"
								aria-label="Remove {itemLabel(item)} from the {NAMES[s].toLowerCase()}"
								onclick={(e) => {
									e.stopPropagation();
									remove(s, item);
								}}><X class="size-4" /></button
							>
						</li>
					{/each}
				</ul>
				{#if !items.length}
					<p class="m-0 rounded-card border border-dashed border-line px-3 py-4 text-center text-[13.5px] text-muted">
						Add a field below
					</p>
				{/if}
			</section>
		{/each}
	</div>

	<div class="mt-3">
		<p class="m-0 mb-2 text-[13.5px] font-semibold text-muted">Add to the {NAMES[side].toLowerCase()}</p>
		<div class="flex flex-wrap gap-1.5">
			{#each addable(order, card, side) as item (item)}
				<button
					type="button"
					class="inline-flex min-h-9 items-center gap-1 rounded-full bg-surface px-3 text-[13.5px] font-medium text-ink ring-1 ring-line ring-inset transition hover:bg-sky-soft hover:text-sky-ink"
					onclick={() => add(item)}
					><Plus class="size-3.5" />{itemLabel(item)}</button
				>
			{:else}
				<span class="text-[13.5px] text-muted">Everything is on the {NAMES[side].toLowerCase()}.</span>
			{/each}
		</div>
		<p class="m-0 mt-2.5 text-[13px] text-muted">Drag to reorder or move across. Order is shared by both sides.</p>
	</div>
{/if}
