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

<ol class="xhz-seg m-0 mb-6 list-none" aria-label="Steps">
	{#each steps as label, i (label)}
		{@const n = i + 1}
		{@const now = n === step}
		{@const ok = !now && done(n)}
		<li class="contents">
			<button
				type="button"
				aria-current={now ? 'step' : undefined}
				onclick={() => (step = n)}
				class="gap-2! pl-1.5! focus-visible:outline-3 focus-visible:outline-accent"
			>
				<span
					class="grid size-6 place-items-center rounded-full text-[12.5px] font-bold {now
						? 'bg-accent text-on-accent'
						: ok
							? 'bg-ok-soft text-ok-ink'
							: 'bg-surface text-muted'}"
				>
					{#if ok}<Check class="size-3.5" aria-label="Done" />{:else}{n}{/if}
				</span>
				{label}
			</button>
		</li>
	{/each}
</ol>
