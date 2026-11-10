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
	import { toneText, cx } from '$lib/ui/styles';

	const CHARS = [
		{ h: '写', p: 'xiě', tone: 3, m: 'to write' },
		{ h: '汉', p: 'hàn', tone: 4, m: 'Chinese (Han)' },
		{ h: '字', p: 'zì', tone: 4, m: 'character' }
	];

	let i = $state(0);
	let box = $state<HTMLDivElement>();
	let width = $state(0);
	const c = $derived(CHARS[i]);

	onMount(() => {
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const css = getComputedStyle(document.documentElement);
		// The tone colour of the current theme, read once per character.
		const stroke = (tone: number) => css.getPropertyValue(`--xhz-t${tone}`).trim() || 'currentColor';

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
					outlineColor: 'rgba(128,128,128,.16)',
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
	class="m-0 w-full max-w-[316px] rotate-2 rounded-tile bg-surface p-5 shadow-raised transition-transform duration-500 ease-spring hover:rotate-0"
>
	<div class="mb-3 flex items-center gap-1.5">
		<span class="text-[13px] font-semibold text-muted">HSK 1 · Verb</span>
		<span class="ml-auto text-[13px] font-semibold text-muted">Stroke order</span>
	</div>

	<div
		bind:clientWidth={width}
		class="relative grid aspect-square place-items-center rounded-[20px] bg-sunk"
	>
		<span class="absolute inset-y-0 left-1/2 border-l-[1.5px] border-dashed border-muted/35"></span>
		<span class="absolute inset-x-0 top-1/2 border-t-[1.5px] border-dashed border-muted/35"></span>
		<div bind:this={box} class="relative"></div>
	</div>

	<div class="mt-4 flex items-center justify-center gap-1 text-2xl font-bold {toneText(c.tone)}">
		{c.p}<Volume2 class="size-4 text-muted" />
	</div>
	<p class="m-0 mb-4 text-center font-semibold text-muted">{c.m}</p>

	<div class="mb-4 rounded-[20px] bg-sunk px-3.5 py-3 text-center">
		<p class="m-0 font-zh text-xl tracking-wide text-ink">
			我在{#each CHARS as ch, j (ch.h)}<span class={cx('transition-colors', j === i && cx('font-bold', toneText(ch.tone)))}
					>{ch.h}</span
				>{/each}。
		</p>
		<p class="m-0 text-sm font-semibold text-muted">wǒ zài xiě hànzì</p>
		<p class="m-0 text-sm text-muted">I'm writing Chinese characters.</p>
	</div>

	<!-- Anki's own answer colours, as AnkiMobile and AnkiDroid fill them. -->
	<div class="grid grid-cols-4 gap-1.5 text-center text-sm font-bold">
		{#each [['again', 'Again', '<1m'], ['hard', 'Hard', '6m'], ['good', 'Good', '1d'], ['easy', 'Easy', '4d']] as [k, label, ivl] (k)}
			<span class="answer answer-{k} rounded-xl py-2"
				>{label}<small class="block text-xs font-semibold opacity-75">{ivl}</small></span
			>
		{/each}
	</div>
</figure>

<style>
	/* Filled like AnkiMobile's answer bar (see static/img/ankimobile*.PNG):
	   Again red, Hard orange, Good green, Easy blue. Each fill is the darkest
	   step of Anki's hue that keeps white text at AA, in both themes. */
	.answer {
		background: var(--a);
		color: #fff;
	}
	.answer-again {
		--a: #dc2626;
	}
	.answer-hard {
		--a: #c2410c;
	}
	.answer-good {
		--a: #15803d;
	}
	.answer-easy {
		--a: #2563eb;
	}
</style>
