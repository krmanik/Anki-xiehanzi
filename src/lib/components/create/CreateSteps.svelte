<!--
  Where the reader is in /create: Words → Card style → Export. Each step is a
  button — going back to fix the word list is one click, not three "Previous".
-->
<script lang="ts">
	import Check from '@lucide/svelte/icons/check';

	let {
		step = $bindable(),
		steps,
		done
	}: {
		/** 1-based. */
		step: number;
		steps: string[];
		/** Steps that count as finished (ticked), 1-based. */
		done: (n: number) => boolean;
	} = $props();
</script>

<ol class="m-0 mb-6 flex list-none flex-wrap gap-1.5 p-0" aria-label="Steps">
	{#each steps as label, i (label)}
		{@const n = i + 1}
		{@const now = n === step}
		{@const ok = !now && done(n)}
		<li>
			<button
				type="button"
				aria-current={now ? 'step' : undefined}
				onclick={() => (step = n)}
				class="flex min-h-9 items-center gap-2 rounded-full border-0 py-1 pr-3.5 pl-1 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-sky {now
					? 'bg-sky-soft text-sky-ink'
					: ok
						? 'bg-mint-soft text-mint-ink'
						: 'bg-sunk text-muted hover:text-ink'}"
			>
				<span
					class="grid size-[26px] place-items-center rounded-full text-[13px] {now
						? 'bg-sky-ink text-white'
						: ok
							? 'bg-mint-ink text-white'
							: 'bg-surface'}"
				>
					{#if ok}<Check class="size-3.5" />{:else}{n}{/if}
				</span>
				{label}
			</button>
		</li>
	{/each}
</ol>
