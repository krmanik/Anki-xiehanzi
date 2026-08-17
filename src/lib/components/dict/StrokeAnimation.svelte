<script lang="ts">
	/**
	 * One animated character on a writing grid, with replay / outline / quiz.
	 *
	 * Stroke data comes from Hanzi Writer's own CDN, one small file per
	 * character: the dictionary can be asked about any of 9,000 characters, so
	 * neither the 32 MB local blob nor the radicals' 214-glyph subset would do.
	 */
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import PencilLine from '@lucide/svelte/icons/pencil-line';
	import Eye from '@lucide/svelte/icons/eye';

	let {
		char,
		size = 200,
		autoplay = true,
		color = '#171717'
	}: { char: string; size?: number; autoplay?: boolean; color?: string } = $props();

	let target = $state<HTMLDivElement>();
	let writer: any = null;
	let outline = $state(true);
	let quiz = $state(false);
	let missing = $state(false);

	$effect(() => {
		const c = char;
		const el = target;
		if (!el) return;
		let cancelled = false;
		el.innerHTML = '';
		writer = null;
		missing = false;
		quiz = false;

		(async () => {
			const { default: HanziWriter } = await import('hanzi-writer');
			if (cancelled || !target) return;
			try {
				const w = HanziWriter.create(el, c, {
					width: size,
					height: size,
					padding: 6,
					showCharacter: false,
					showOutline: outline,
					strokeColor: color,
					outlineColor: '#e5e5e5',
					radicalColor: '#4f46e5',
					// The tone colour is the character's own; a re-render for a new
					// character re-creates the writer, so this is read once per glyph.
					delayBetweenStrokes: 180
				});
				writer = w;
				if (autoplay) w.animateCharacter();
			} catch {
				missing = true;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	function replay() {
		quiz = false;
		writer?.animateCharacter();
	}

	function toggleOutline() {
		outline = !outline;
		if (outline) writer?.showOutline();
		else writer?.hideOutline();
	}

	function practise() {
		quiz = true;
		writer?.quiz();
	}

	const tool =
		'flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-500 transition hover:border-neutral-900 hover:text-neutral-900';
</script>

<div class="flex flex-col items-center gap-2">
	<div
		class="relative overflow-hidden rounded-xl border border-neutral-200 bg-white"
		style="width:{size}px;height:{size}px"
	>
		<!-- The grid the character is written on: quarters plus diagonals. -->
		<svg class="absolute inset-0" width={size} height={size} aria-hidden="true">
			<line x1="0" y1="0" x2={size} y2={size} stroke="#f1f1f1" stroke-width="1" />
			<line x1={size} y1="0" x2="0" y2={size} stroke="#f1f1f1" stroke-width="1" />
			<line
				x1={size / 2}
				y1="0"
				x2={size / 2}
				y2={size}
				stroke="#e5e5e5"
				stroke-width="1"
				stroke-dasharray="5 4"
			/>
			<line
				x1="0"
				y1={size / 2}
				x2={size}
				y2={size / 2}
				stroke="#e5e5e5"
				stroke-width="1"
				stroke-dasharray="5 4"
			/>
		</svg>
		<div bind:this={target} class="relative touch-none"></div>
		{#if missing}
			<div
				class="absolute inset-0 flex items-center justify-center text-5xl text-neutral-300"
				lang="zh-Hans"
			>
				{char}
			</div>
		{/if}
	</div>

	<div class="flex flex-wrap items-center justify-center gap-1.5">
		<button type="button" class={tool} onclick={replay}>
			<RotateCcw size={13} /> Replay
		</button>
		<button type="button" class={tool} onclick={toggleOutline}>
			<Eye size={13} />
			{outline ? 'Hide outline' : 'Show outline'}
		</button>
		<button type="button" class={tool} onclick={practise} class:!border-neutral-900={quiz}>
			<PencilLine size={13} /> Practise
		</button>
	</div>
</div>
