<script lang="ts">
	/**
	 * A light-weight word-list textarea for the worksheet/flashcard tools —
	 * deliberately not `WordSourceInput.svelte`, which binds `deck.ts`'s `Word[]`
	 * and drags in genanki-js/sql.js for a job that only needs a list of strings.
	 */
	import { btnSecondary } from '$lib/buttonStyles';
	import { loadHskIndex, levelLabel, type HskIndex } from '$lib/hsk';
	import { loadHskLevel } from '$lib/hsk';

	let { value = $bindable('') }: { value: string } = $props();

	let index = $state<HskIndex | null>(null);
	let listId = $state('new');
	let level = $state('');
	let filling = $state(false);
	let error = $state('');

	$effect(() => {
		if (index) return;
		loadHskIndex()
			.then((idx) => {
				index = idx;
				const first = idx.lists.find((l) => l.id === listId) ?? idx.lists[0];
				listId = first?.id ?? listId;
				level = first?.levels[0]?.level ?? '';
			})
			.catch((e) => (error = e instanceof Error ? e.message : String(e)));
	});

	const levels = $derived(index?.lists.find((l) => l.id === listId)?.levels ?? []);

	async function fill() {
		if (!level) return;
		filling = true;
		error = '';
		try {
			const entries = await loadHskLevel(listId, level);
			value = entries.map((e) => e.s).join('\n');
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			filling = false;
		}
	}
</script>

<div>
	<textarea
		bind:value
		rows={8}
		placeholder="One word or character per line — or paste a list"
		class="w-full rounded-xl border border-neutral-200 p-3 font-mono text-sm text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-900"
		lang="zh-Hans"
	></textarea>

	{#if index}
		<div class="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3">
			<span class="font-mono text-xs font-medium uppercase tracking-wider text-neutral-500">
				Or fill from
			</span>
			<select
				bind:value={listId}
				onchange={() => (level = levels[0]?.level ?? '')}
				class="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm"
			>
				{#each index.lists as list (list.id)}
					<option value={list.id}>{list.name}</option>
				{/each}
			</select>
			<select bind:value={level} class="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm">
				{#each levels as l (l.level)}
					<option value={l.level}>{levelLabel(l.level)} · {l.count}</option>
				{/each}
			</select>
			<button type="button" onclick={fill} disabled={filling} class="{btnSecondary} px-4 py-1.5 text-sm">
				{filling ? 'Loading…' : 'Fill'}
			</button>
		</div>
	{/if}

	{#if error}<p class="mt-2 text-xs text-red-600">{error}</p>{/if}
</div>
