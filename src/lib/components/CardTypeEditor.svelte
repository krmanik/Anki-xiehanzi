<script lang="ts">
	import CircleX from '@lucide/svelte/icons/circle-x';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import PresetConfirmModal from '$lib/components/PresetConfirmModal.svelte';
	import { CONTROL_BUTTONS_TOKEN, SEPARATOR_TOKEN } from '$lib/deckTemplate';
	import { CARD_PRESETS, presetToCard, presetNeedsAudio, type CardPreset } from '$lib/cardPresets';
	import { newCard, fieldLabels, WRITING } from '$lib/cardEditorModel';
	import type { TabContent } from '$lib/deck';

	let {
		tabs = $bindable(),
		tabContent = $bindable(),
		activeTab = $bindable(),
		order = $bindable(),
		includeAudio = $bindable(),
		onshowcustomizer
	}: {
		tabs: string[];
		tabContent: TabContent;
		activeTab: number;
		order: string[];
		includeAudio: boolean;
		onshowcustomizer: () => void;
	} = $props();

	let pendingPreset = $state<CardPreset | null>(null);

	// ---- card-type tabs ----
	function findNextTabNumber() {
		let n = 1;
		while (tabs.includes(`Card ${n}`)) n++;
		return n;
	}

	function handleAddTab() {
		const name = `Card ${findNextTabNumber()}`;
		tabs = [...tabs, name];
		tabContent = { ...tabContent, [name]: newCard() };
		activeTab = tabs.length - 1;
	}

	// Unique tab name from a desired base (e.g. "Beginner", "Beginner 2").
	function uniqueTabName(base: string) {
		if (!tabs.includes(base)) return base;
		let n = 2;
		while (tabs.includes(`${base} ${n}`)) n++;
		return `${base} ${n}`;
	}

	function applyPresetReplace(preset: CardPreset) {
		const card = presetToCard(preset);
		const old = tabs[activeTab];
		const name = uniqueTabName(preset.name);
		const next = { ...tabContent };
		delete next[old];
		next[name] = card;
		tabs = tabs.map((t, i) => (i === activeTab ? name : t));
		tabContent = next;
		if (presetNeedsAudio(preset)) includeAudio = true;
	}

	function applyPresetAdd(preset: CardPreset) {
		const card = presetToCard(preset);
		const name = uniqueTabName(preset.name);
		tabs = [...tabs, name];
		tabContent = { ...tabContent, [name]: card };
		activeTab = tabs.length - 1;
		if (presetNeedsAudio(preset)) includeAudio = true;
	}

	function addPreset(preset: CardPreset) {
		const def = newCard();
		const sig = (c: { front: string[]; back: string[] }) => JSON.stringify([c.front, c.back]);
		const isPristine =
			tabs.length === 1 && !!tabContent[tabs[0]] && sig(tabContent[tabs[0]]) === sig(def);

		if (isPristine) {
			applyPresetReplace(preset);
		} else {
			pendingPreset = preset;
		}
	}

	function confirmPresetReplace() {
		if (pendingPreset) applyPresetReplace(pendingPreset);
		pendingPreset = null;
	}

	function confirmPresetAdd() {
		if (pendingPreset) applyPresetAdd(pendingPreset);
		pendingPreset = null;
	}

	function handleCloseTab(index: number) {
		const removed = tabs[index];
		tabs = tabs.filter((_, i) => i !== index);
		const next = { ...tabContent };
		delete next[removed];
		tabContent = next;
		activeTab = 0;
	}

	function handleCheckboxChange(fieldId: string, side: 'front' | 'back' | 'additional') {
		const current = tabs[activeTab];
		const content = { ...tabContent[current] };
		const isChecked = content[side].includes(fieldId);
		content[side] = isChecked
			? content[side].filter((id) => id !== fieldId)
			: [...content[side], fieldId];
		tabContent = { ...tabContent, [current]: content };
	}

	// ---- field ordering (drag + up/down) ----
	let dragIndex = $state<number | null>(null);

	function moveField(index: number, dir: -1 | 1) {
		const j = index + dir;
		if (j < 0 || j >= order.length) return;
		const next = [...order];
		[next[index], next[j]] = [next[j], next[index]];
		order = next;
	}

	function onFieldDrop(target: number) {
		if (dragIndex === null || dragIndex === target) return;
		const next = [...order];
		const [moved] = next.splice(dragIndex, 1);
		next.splice(target, 0, moved);
		order = next;
		dragIndex = null;
	}
</script>

<div class="mt-6 flex items-center gap-3">
	<h2 class="text-xl font-semibold">Create Card Types</h2>
	<button
		onclick={onshowcustomizer}
		class="ml-auto flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-900"
	>
		<Settings2 size={14} />
		Advanced customisation
	</button>
</div>
<p class="mb-2 text-sm text-neutral-500">
	Each card type is one Anki template. Drag to set field order, then choose which fields show
	on the front and back. The preview updates live.
</p>

<div class="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
	<p class="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
		Quick start — add a ready-made card type
	</p>
	<div class="flex flex-wrap gap-2">
		{#each CARD_PRESETS as preset (preset.id)}
			<button
				type="button"
				onclick={() => addPreset(preset)}
				title={preset.description}
				class="group rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-left transition hover:border-neutral-900 hover:shadow-[3px_3px_0_0_#111]"
			>
				<span class="block text-sm font-semibold text-neutral-900">{preset.name}</span>
				<span class="block max-w-[14rem] text-[11px] leading-snug text-neutral-500">{preset.description}</span>
			</button>
		{/each}
	</div>
</div>

<div>
	<ul class="flex flex-wrap gap-2 border-b border-neutral-200">
		{#each tabs as tab, index (tab)}
			<li
				class="flex cursor-pointer items-center gap-1 rounded-t px-3 py-2 text-sm {activeTab ===
				index
					? 'border-b-2 border-neutral-900 font-semibold'
					: 'text-neutral-500'}"
			>
				<span
					onclick={() => (activeTab = index)}
					onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (activeTab = index)}
					role="button"
					tabindex="0">{tab}</span
				>
				{#if tabs.length > 1}
					<button onclick={() => handleCloseTab(index)} aria-label="close tab">
						<CircleX size={15} />
					</button>
				{/if}
			</li>
		{/each}
		<li class="text-lg text-neutral-500">
			<button class="cursor-pointer px-3 py-2" onclick={handleAddTab} aria-label="add card type">+</button>
		</li>
	</ul>

	{#if tabContent[tabs[activeTab]]}
		<div class="py-4">
			<!-- field editor -->
			<div>
				<p class="mb-2 text-xs text-neutral-500">Tick a field to show it on the front and/or back of this card type.</p>
				<p class="mb-2 border-l-2 border-red-400 pl-2 text-xs text-red-600">Drag a field by its handle to reorder it.</p>
				<div
					class="grid grid-cols-[1fr_3rem_3rem] items-center gap-2 px-3 pb-1 font-mono text-[10px] uppercase tracking-wider text-neutral-400"
				>
					<span>Field</span><span class="text-center">Front</span
					><span class="text-center">Back</span>
				</div>
				<ul class="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
					{#each order as item, index (item)}
						{@const isChrome = item === CONTROL_BUTTONS_TOKEN || item === SEPARATOR_TOKEN}
							<li
								draggable="true"
								ondragstart={() => (dragIndex = index)}
								ondragover={(e) => e.preventDefault()}
								ondrop={() => onFieldDrop(index)}
								class="grid grid-cols-[1fr_3rem_3rem] items-center gap-2 px-3 py-2 {item === WRITING || isChrome
									? 'bg-neutral-50'
									: 'bg-white'} {dragIndex === index ? 'opacity-50' : ''}"
							>
								<span class="flex items-center gap-2">
									<GripVertical size={15} class="cursor-grab text-neutral-300" />
									<span class="text-sm">{fieldLabels[item] ?? item}</span>
									<span class="ml-auto flex flex-col">
										<button
											class="text-neutral-400 hover:text-neutral-900 disabled:opacity-20"
											disabled={index === 0}
											onclick={() => moveField(index, -1)}
											aria-label="move up"><ChevronUp size={13} /></button
										>
										<button
											class="text-neutral-400 hover:text-neutral-900 disabled:opacity-20"
											disabled={index === order.length - 1}
											onclick={() => moveField(index, 1)}
											aria-label="move down"><ChevronDown size={13} /></button
										>
									</span>
								</span>
								<span class="text-center">
									<input
										type="checkbox"
										class="h-4 w-4 accent-neutral-900"
										aria-label={`${fieldLabels[item] ?? item} front`}
										checked={tabContent[tabs[activeTab]].front.includes(`front${item}`)}
										onchange={() => handleCheckboxChange(`front${item}`, 'front')}
									/>
								</span>
								<span class="text-center">
									<input
										type="checkbox"
										class="h-4 w-4 accent-neutral-900"
										aria-label={`${fieldLabels[item] ?? item} back`}
										checked={tabContent[tabs[activeTab]].back.includes(`back${item}`)}
										onchange={() => handleCheckboxChange(`back${item}`, 'back')}
									/>
								</span>
							</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</div>

{#if pendingPreset}
	<PresetConfirmModal
		preset={pendingPreset}
		activeTabName={tabs[activeTab]}
		onreplace={confirmPresetReplace}
		onadd={confirmPresetAdd}
		oncancel={() => (pendingPreset = null)}
	/>
{/if}
