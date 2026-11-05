<!--
  The home page's hero art: a study card that writes 写 → 汉 → 字 stroke by
  stroke on a 田字格 grid, with the word's pinyin, meaning and an example
  sentence that highlights the character being drawn. An illustration, not a
  control — the review buttons are drawn, not clickable — so the whole card is
  one image with a label.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import Badge from '$lib/ui/Badge.svelte';
	import { toneHue, toneText, cx } from '$lib/ui/styles';

	const CHARS = [
		{ h: '写', p: 'xiě', tone: 3, m: 'to write' },
		{ h: '汉', p: 'hàn', tone: 4, m: 'Chinese (Han)' },
		{ h: '字', p: 'zì', tone: 4, m: 'character' }
	];
	const FALLBACK = { mint: '#52b886', sky: '#5f9fe6' } as Record<string, string>;

	let i = $state(0);
	let box = $state<HTMLDivElement>();
	let width = $state(0);
	const c = $derived(CHARS[i]);

	onMount(() => {
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const css = getComputedStyle(document.documentElement);
		const stroke = (tone: number) => {
			const hue = toneHue(tone) ?? 'sky';
			return css.getPropertyValue(`--xhz-${hue}`).trim() || FALLBACK[hue] || '#5f9fe6';
		};

		(async () => {
			const { default: HanziWriter } = await import('hanzi-writer');
			const size = Math.max(160, Math.min(240, (width || 260) - 24));
			const draw = () => {
				if (cancelled || !box) return;
				box.innerHTML = '';
				const ch = CHARS[i];
				const w = HanziWriter.create(box, ch.h, {
					width: size,
					height: size,
					padding: 10,
					showCharacter: still,
					showOutline: true,
					strokeColor: stroke(ch.tone),
					outlineColor: 'rgba(120,120,140,.14)',
					strokeAnimationSpeed: 1.3,
					delayBetweenStrokes: 140
				});
				if (still) return;
				w.animateCharacter({
					onComplete: () => {
						timer = setTimeout(() => {
							i = (i + 1) % CHARS.length;
							draw();
						}, 1400);
					}
				});
			};
			draw();
		})();

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	});
</script>

<figure
	role="img"
	aria-label="A study card writing 写, 汉 and 字 stroke by stroke"
	class="m-0 w-full max-w-[316px] rounded-[26px] bg-surface p-5 shadow-[0_2px_4px_rgba(20,30,50,.05),0_18px_40px_rgba(20,30,50,.12)]"
>
	<div class="mb-3 flex items-center gap-1.5">
		<Badge tint="mint">HSK 1</Badge>
		<Badge>Verb</Badge>
		<span class="ml-auto text-[13px] font-semibold text-muted">Stroke order</span>
	</div>

	<div
		bind:clientWidth={width}
		class="relative grid aspect-square place-items-center rounded-card bg-sunk ring-1 ring-line ring-inset"
	>
		<span class="absolute inset-y-0 left-1/2 border-l-[1.5px] border-dashed border-muted/35"></span>
		<span class="absolute inset-x-0 top-1/2 border-t-[1.5px] border-dashed border-muted/35"></span>
		<div bind:this={box} class="relative"></div>
	</div>

	<div class="mt-4 flex items-center justify-center gap-1 text-2xl font-bold {toneText(c.tone)}">
		{c.p}<Volume2 class="size-4 text-muted" />
	</div>
	<p class="m-0 mb-4 text-center font-semibold text-muted">{c.m}</p>

	<div class="mb-4 rounded-card bg-sunk px-3.5 py-3 text-center">
		<p class="m-0 font-zh text-xl tracking-wide text-ink">
			我在{#each CHARS as ch, j (ch.h)}<span class={cx('transition-colors', j === i && cx('font-bold', toneText(ch.tone)))}
					>{ch.h}</span
				>{/each}。
		</p>
		<p class="m-0 text-sm font-semibold text-muted">wǒ zài xiě hànzì</p>
		<p class="m-0 text-sm text-muted">I'm writing Chinese characters.</p>
	</div>

	<div class="grid grid-cols-4 gap-1.5 text-center text-sm font-bold">
		<span class="rounded-xl bg-rose-soft py-2 text-rose-ink">Again<small class="block text-xs font-semibold opacity-80">&lt;1m</small></span>
		<span class="rounded-xl bg-apricot-soft py-2 text-apricot-ink">Hard<small class="block text-xs font-semibold opacity-80">6m</small></span>
		<span class="rounded-xl bg-mint-soft py-2 text-mint-ink">Good<small class="block text-xs font-semibold opacity-80">1d</small></span>
		<span class="rounded-xl bg-sky-soft py-2 text-sky-ink">Easy<small class="block text-xs font-semibold opacity-80">4d</small></span>
	</div>
</figure>
