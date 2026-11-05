<script lang="ts">
	import { base } from '$app/paths';
	import IconDot from '$lib/ui/IconDot.svelte';

	let { onclick }: { onclick?: () => void } = $props();
</script>

<a
	href="{base}/"
	{onclick}
	class="flex items-center gap-2.5 rounded-card text-[17px] font-bold tracking-tight text-ink no-underline focus-visible:outline-3 focus-visible:outline-sky"
>
	<IconDot hue="rose" shape="tile" class="font-zh text-[19px]">写</IconDot>
	<span>Anki-<span class="text-sky-ink">xiehanzi</span></span>
</a>
