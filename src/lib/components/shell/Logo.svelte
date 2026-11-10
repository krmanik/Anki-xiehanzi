<script lang="ts">
	import { base } from '$app/paths';

	let { onclick }: { onclick?: () => void } = $props();
</script>

<a
	href="{base}/"
	{onclick}
	class="group flex items-center gap-2.5 rounded-card text-[17px] font-bold tracking-[-0.02em] text-ink no-underline focus-visible:outline-3 focus-visible:outline-accent sm:text-lg"
>
	<span
		class="grid size-[34px] shrink-0 -rotate-6 place-items-center rounded-[11px] bg-ink font-zh text-[19px] leading-none font-bold text-ground transition-transform duration-[400ms] ease-spring group-hover:scale-[1.08] group-hover:rotate-6"
		aria-hidden="true">写</span
	>
	<span class="whitespace-nowrap">Anki-xiehanzi</span>
</a>
