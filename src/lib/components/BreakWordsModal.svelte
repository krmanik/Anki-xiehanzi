<script lang="ts">
	import { btnPrimary, btnSecondary } from '$lib/buttonStyles';
	import { resolveWithSegmentation, type Word } from '$lib/deck';

	let {
		words = $bindable(),
		failedWords,
		ondismiss,
		onadd
	}: {
		words: Word[];
		failedWords: string[];
		// Called when the user skips / cancels / finishes — parent clears failedWords.
		ondismiss: () => void;
		// Called after words are added, with the count, so the parent can update status.
		onadd?: (count: number) => void;
	} = $props();

	let breakPreviewing = $state(false);
	let showBreakModal = $state(false);
	let breakPreviewWords = $state<Word[]>([]);
	let breakSelectedWords = $state<Set<string>>(new Set());

	async function previewBreakWords() {
		breakPreviewing = true;
		const existing = new Set(words.map((w) => w.Simplified));
		const seen = new Set<string>();
		const preview: Word[] = [];

		for (const failedWord of failedWords) {
			const resolved = await resolveWithSegmentation(failedWord);
			for (const w of resolved) {
				if (seen.has(w.Simplified) || existing.has(w.Simplified)) continue;
				seen.add(w.Simplified);
				preview.push(w);
			}
		}

		breakPreviewWords = preview;
		breakSelectedWords = new Set(preview.map((w) => w.Simplified));
		breakPreviewing = false;
		showBreakModal = true;
	}

	function toggleBreakWord(simplified: string) {
		const next = new Set(breakSelectedWords);
		if (next.has(simplified)) next.delete(simplified);
		else next.add(simplified);
		breakSelectedWords = next;
	}

	function toggleAllBreakWords() {
		if (breakSelectedWords.size === breakPreviewWords.length) {
			breakSelectedWords = new Set();
		} else {
			breakSelectedWords = new Set(breakPreviewWords.map((w) => w.Simplified));
		}
	}

	function reset() {
		showBreakModal = false;
		breakPreviewWords = [];
		breakSelectedWords = new Set();
	}

	function addSelectedBreakWords() {
		const toAdd = breakPreviewWords.filter((w) => breakSelectedWords.has(w.Simplified));
		words = [...words, ...toAdd];
		onadd?.(toAdd.length);
		reset();
		ondismiss();
	}

	function cancel() {
		reset();
		ondismiss();
	}
</script>

<div class="fixed bottom-6 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
	<p class="mb-2 text-sm font-medium text-amber-900">
		Google Translate failed for {failedWords.length} word{failedWords.length === 1 ? '' : 's'}.
		Break into individual characters and look up in dictionary?
	</p>
	<div class="flex gap-2">
		<button class={btnPrimary} onclick={previewBreakWords} disabled={breakPreviewing}>
			{breakPreviewing ? 'Loading…' : 'Preview'}
		</button>
		<button class={btnSecondary} onclick={ondismiss}>Skip</button>
	</div>
</div>

{#if showBreakModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
		<div class="flex w-full max-w-sm flex-col rounded-xl bg-white shadow-2xl">
			<div class="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
				<h3 class="font-semibold text-neutral-900">
					{breakPreviewWords.length} character{breakPreviewWords.length === 1 ? '' : 's'} found
				</h3>
				<button
					class="text-xs text-neutral-500 hover:text-neutral-900"
					onclick={toggleAllBreakWords}
				>
					{breakSelectedWords.size === breakPreviewWords.length ? 'Deselect all' : 'Select all'}
				</button>
			</div>
			{#if breakPreviewWords.length === 0}
				<p class="px-4 py-6 text-center text-sm text-neutral-500">No characters found in dictionary.</p>
			{:else}
				<ul class="max-h-72 overflow-y-auto divide-y divide-neutral-100">
					{#each breakPreviewWords as w (w.Simplified)}
						<li class="flex items-center gap-3 px-4 py-2">
							<input
								type="checkbox"
								checked={breakSelectedWords.has(w.Simplified)}
								onchange={() => toggleBreakWord(w.Simplified)}
								class="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
							/>
							<span class="text-xl font-medium">{w.Simplified}</span>
							<span class="text-xs text-neutral-500 truncate">{w.Pinyin} — {w.Definitions.split(' │ ')[0]}</span>
						</li>
					{/each}
				</ul>
			{/if}
			<div class="flex gap-2 border-t border-neutral-200 px-4 py-3">
				<button
					class={btnPrimary}
					onclick={addSelectedBreakWords}
					disabled={breakSelectedWords.size === 0}
				>
					Add selected ({breakSelectedWords.size})
				</button>
				<button class={btnSecondary} onclick={cancel}>Cancel</button>
			</div>
		</div>
	</div>
{/if}
