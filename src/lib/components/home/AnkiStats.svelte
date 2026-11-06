<!--
  Four numbers from the reader's own Anki — known, learning, due today, the
  level to work on — shown on Home only once Anki has answered. Nobody sees an
  empty or zeroed version of it: a reader who never connected sees nothing.
-->
<script lang="ts">
	import { base } from '$app/paths';
	import { anki } from '$lib/anki/ankiStatus.svelte';
	import { progress } from '$lib/anki/progress.svelte';
	import { countStates, levelDone, percent, totals, type ProgressCount } from '$lib/anki/progress';
	import { levelLabel, loadHskIndex, loadHskLevel } from '$lib/hsk';
	import { IconDot, type Hue } from '$lib/ui';
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Clock from '@lucide/svelte/icons/clock';
	import Sprout from '@lucide/svelte/icons/sprout';
	import Target from '@lucide/svelte/icons/target';

	const shown = $derived(anki.status === 'ready' && progress.status === 'ready');
	const t = $derived(totals(progress.states));

	/** The first New HSK level not yet done, loading levels only until it is found. */
	let next = $state<{ level: string; count: ProgressCount } | null | 'done'>(null);
	$effect(() => {
		if (!shown) return;
		const states = progress.states;
		let stale = false;
		(async () => {
			const list = (await loadHskIndex()).lists.find((l) => l.id === 'new');
			if (!list) return;
			for (const l of list.levels) {
				const words = (await loadHskLevel(list.id, l.level)).map((e) => e.s);
				const count = countStates(words, states);
				if (!levelDone(count)) {
					if (!stale) next = { level: l.level, count };
					return;
				}
			}
			if (!stale) next = 'done';
		})().catch(() => {});
		return () => (stale = true);
	});

	const cards = $derived<{ label: string; value: string; hue: Hue; icon: typeof Check }[]>([
		{ label: 'Words known', value: t.known.toLocaleString(), hue: 'mint', icon: Check },
		{ label: 'Learning', value: t.learning.toLocaleString(), hue: 'apricot', icon: Sprout },
		{ label: 'Cards due today', value: progress.due.toLocaleString(), hue: 'sky', icon: Clock }
	]);
	const PANEL: Record<Hue, string> = {
		rose: 'bg-rose-soft',
		apricot: 'bg-apricot-soft',
		mint: 'bg-mint-soft',
		sky: 'bg-sky-soft',
		lavender: 'bg-lavender-soft'
	};
</script>

{#if shown}
	<section class="pb-6" aria-label="Your progress in Anki">
		<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			{#each cards as c (c.label)}
				{@const Icon = c.icon}
				<div class="flex items-center gap-3 rounded-panel p-4 {PANEL[c.hue]}">
					<IconDot hue={c.hue} class="max-sm:hidden"><Icon /></IconDot>
					<div class="min-w-0">
						<p class="m-0 text-2xl leading-tight font-bold text-ink">{c.value}</p>
						<p class="m-0 text-sm text-muted">{c.label}</p>
					</div>
				</div>
			{/each}
			{#if next && next !== 'done'}
				<a
					href="{base}/hsk/new/{next.level}"
					class="flex items-center gap-3 rounded-panel bg-lavender-soft p-4 no-underline hover:brightness-[.98]"
				>
					<IconDot hue="lavender" class="max-sm:hidden"><Target /></IconDot>
					<div class="min-w-0 flex-1">
						<p class="m-0 text-2xl leading-tight font-bold text-ink">{levelLabel(next.level)}</p>
						<p class="m-0 text-sm text-muted">
							Up next · {percent(next.count.known, next.count.total)}% known
						</p>
					</div>
					<ChevronRight class="size-5 shrink-0 text-muted" />
				</a>
			{:else if next === 'done'}
				<div class="flex items-center gap-3 rounded-panel bg-lavender-soft p-4">
					<IconDot hue="lavender" class="max-sm:hidden"><Target /></IconDot>
					<div class="min-w-0">
						<p class="m-0 text-2xl leading-tight font-bold text-ink">HSK 7–9</p>
						<p class="m-0 text-sm text-muted">Every level known</p>
					</div>
				</div>
			{/if}
		</div>
	</section>
{/if}
