<script lang="ts">
	import { computeDeckStats } from '$lib/deckStats';
	import type { TabContent, TemplateOpts } from '$lib/deckTemplate';
	import { getSmartSentences, renderCardHtml, type Word, type ExampleSentence } from '$lib/deck';
	import type { TonePalette } from '$lib/tonePresets';
	import X from '@lucide/svelte/icons/x';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let {
		words,
		tabs,
		tabContent,
		template,
		fields,
		order = [],
		includeAudio = false,
		palette = null,
		isGenerating = false,
		onGenerate,
		onclose
	}: {
		words: Word[];
		tabs: string[];
		tabContent: TabContent;
		template: TemplateOpts;
		fields: string[];
		order?: string[];
		includeAudio?: boolean;
		palette?: TonePalette | null;
		isGenerating?: boolean;
		onGenerate?: () => void;
		onclose?: () => void;
	} = $props();

	const stats = $derived(computeDeckStats(words));

	const SIDES = ['front', 'back'] as const;

	// Render one card side to a full HTML doc using the REAL compiled template +
	// CSS + field values — exactly what the .apkg ships — for a pixel-exact preview.
	function doc(side: 'front' | 'back', tab: string): string {
		if (!currentWord) return '';
		return renderCardHtml({
			side,
			tab,
			word: currentWord,
			fields,
			order,
			tabContent,
			template,
			includeAudio,
			examples: previewExamples
		});
	}

	// Page through the actual words; the previews render the current one.
	let wordIndex = $state(0);
	const safeIndex = $derived(Math.min(wordIndex, Math.max(0, words.length - 1)));
	const currentWord = $derived<Word | null>(words[safeIndex] ?? null);
	function prevWord() { if (safeIndex > 0) wordIndex = safeIndex - 1; }
	function nextWord() { if (safeIndex < words.length - 1) wordIndex = safeIndex + 1; }

	// Does any card type show the Examples field?
	const examplesUsed = $derived(
		tabs.some((t) => {
			const c = tabContent[t];
			return !!c && (c.front.includes('frontExamples') || c.back.includes('backExamples'));
		})
	);

	// Real example sentences for the current word (re-fetched as you page / tweak).
	let previewExamples = $state<ExampleSentence[]>([]);
	$effect(() => {
		const w = currentWord?.Simplified;
		const o = template.exampleOptions;
		if (!examplesUsed || !w) {
			previewExamples = [];
			return;
		}
		let cancelled = false;
		getSmartSentences(w, { limit: o.count, minChars: o.minChars, maxChars: o.maxChars })
			.then((r) => {
				if (!cancelled) previewExamples = r;
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	});

	function handleOverlay(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose?.();
	}
</script>

<div
	class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
	role="presentation"
	onclick={handleOverlay}
	onkeydown={(e) => e.key === 'Escape' && onclose?.()}
>
	<div
		class="absolute inset-3 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:inset-10"
		role="dialog"
		aria-label="Export preview"
	>
		<div class="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-3">
			<div>
				<h2 class="text-base font-semibold text-neutral-900">Export preview</h2>
				<p class="text-xs text-neutral-400">Check your cards and deck stats before exporting.</p>
			</div>
			<button onclick={onclose} class="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100" aria-label="Close"><X size={18} /></button>
		</div>

		<div class="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
			<!-- Statistics -->
			<div class="w-full shrink-0 space-y-4 overflow-y-auto border-b border-neutral-200 p-5 md:w-72 md:border-b-0 md:border-r">
				<div>
					<p class="font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-400">Deck</p>
					<p class="mt-1 text-3xl font-extrabold">{stats.total}</p>
					<p class="text-xs text-neutral-500">words · {tabs.length} card type{tabs.length === 1 ? '' : 's'} · {includeAudio ? 'with audio' : 'no audio'}</p>
				</div>

				<div>
					<p class="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-400">HSK level</p>
					{#if stats.levels.length}
						<div class="space-y-1">
							{#each stats.levels as l (l.label)}
								<div class="flex items-center justify-between text-xs">
									<span class="text-neutral-600">{l.label}</span>
									<span class="font-mono text-neutral-900">{l.count}</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-xs text-neutral-400">No words yet.</p>
					{/if}
				</div>

				<div>
					<p class="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-400">Frequency</p>
					{#if stats.bands.length}
						<div class="space-y-1">
							{#each stats.bands as b (b.label)}
								<div class="flex items-center justify-between text-xs">
									<span class="text-neutral-600">{b.label}</span>
									<span class="font-mono text-neutral-900">{b.count}</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-xs text-neutral-400">No words yet.</p>
					{/if}
				</div>
			</div>

			<!-- Card previews per card type -->
			<div class="flex-1 space-y-6 overflow-y-auto bg-neutral-100 p-6">
				{#if words.length}
					<div class="flex items-center justify-center gap-4">
						<button
							onclick={prevWord}
							disabled={safeIndex === 0}
							class="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 transition hover:border-neutral-900 disabled:opacity-30"
							aria-label="previous word"
						><ChevronLeft size={16} /></button>
						<div class="text-center">
							<p class="text-xl font-semibold leading-none">{currentWord?.Simplified}</p>
							<p class="mt-0.5 font-mono text-[10px] text-neutral-400">word {safeIndex + 1} / {words.length}</p>
						</div>
						<button
							onclick={nextWord}
							disabled={safeIndex >= words.length - 1}
							class="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 transition hover:border-neutral-900 disabled:opacity-30"
							aria-label="next word"
						><ChevronRight size={16} /></button>
					</div>
				{/if}
				{#each tabs as tab (tab)}
					<div>
						<p class="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">{tab}</p>
						<div class="grid gap-3 sm:grid-cols-2">
							{#each SIDES as side (side)}
								<div class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
									<div class="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">{side}</div>
									{#if currentWord}
										<iframe
											title="{tab} {side}"
											sandbox="allow-scripts allow-same-origin"
											class="block h-[460px] w-full border-0 bg-white"
											srcdoc={doc(side, tab)}
										></iframe>
									{:else}
										<div class="flex h-[460px] items-center justify-center text-sm text-neutral-300">No words</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-200 px-5 py-3">
			<button onclick={onclose} class="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50">Back</button>
			<button
				onclick={onGenerate}
				disabled={isGenerating || words.length === 0}
				class="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-40"
			>{isGenerating ? 'Generating…' : 'Generate deck'}</button>
		</div>
	</div>
</div>
