<!--
  One character drawn stroke by stroke in its tone colour, over and over —
  decoration for a tile, so it is one image with a label. Stroke data comes
  from Hanzi Writer's CDN, one small file per character (never the 32 MB
  blob). With reduced motion it shows the finished character instead.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { toneColor, cssVar } from '$lib/ui/cssVar';
	import { currentTheme } from '$lib/theme.svelte';

	let { char, tone, size = 96 }: { char: string; tone: number; size?: number } = $props();

	let box = $state<HTMLDivElement>();
	let mounted = $state(false);
	onMount(() => (mounted = true));

	$effect(() => {
		if (!mounted || !box) return;
		const el = box;
		// Repaint on a theme switch: the writer takes literal colours.
		void currentTheme();
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

		(async () => {
			const { default: HanziWriter } = await import('hanzi-writer');
			if (cancelled) return;
			el.innerHTML = '';
			const w = HanziWriter.create(el, char, {
				width: size,
				height: size,
				padding: 4,
				showCharacter: still,
				showOutline: true,
				strokeColor: toneColor(tone),
				outlineColor: cssVar('--xhz-line', '#e5e5e5'),
				strokeAnimationSpeed: 1.1,
				delayBetweenStrokes: 220
			});
			if (still) return;
			const loop = () => {
				if (cancelled) return;
				w.hideCharacter();
				w.animateCharacter({ onComplete: () => (timer = setTimeout(loop, 1600)) });
			};
			loop();
		})().catch(() => {
			// Offline: the tile still has its label.
			if (!cancelled) el.textContent = char;
		});

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	});
</script>

<div
	bind:this={box}
	role="img"
	aria-label="{char} written stroke by stroke"
	class="relative font-zh text-[64px] leading-none"
	style:width="{size}px"
	style:height="{size}px"
></div>
