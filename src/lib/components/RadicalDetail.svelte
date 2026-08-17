<script lang="ts">
	/**
	 * Everything known about one radical, in the same order the Anki card uses:
	 * what it is, how it sounds, how it is written, what it is called, how the
	 * rest of East Asia reads it, where the glyph came from, and what it builds.
	 */
	import {
		glyphUrl,
		loadRadicalStrokes,
		productivityBand,
		radicalTone,
		type Radical,
		type StrokeCharacter
	} from '$lib/radicals';
	import { toneOfPinyin } from '$lib/tone';
	import X from '@lucide/svelte/icons/x';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	let {
		radical,
		colorize = true,
		onClose
	}: { radical: Radical; colorize?: boolean; onClose?: () => void } = $props();

	const tone = $derived(radicalTone(radical.pinyin));
	const band = $derived(productivityBand(radical.frequency));
	const toneClass = (pinyin: string) => (colorize ? `tone${toneOfPinyin(pinyin)}` : '');

	let target = $state<HTMLDivElement>();
	let writer: { animateCharacter: () => void } | null = null;

	/**
	 * Stroke data for the radicals only (~460 KB, `npm run build:radicals`), not
	 * the 32 MB Hanzi Writer blob, and fetched once per session the first time a
	 * radical is opened — never on page load. Shared with the in-browser deck
	 * builder, which needs the same subset.
	 */
	const loadStrokes = loadRadicalStrokes;

	$effect(() => {
		const char = radical.char;
		const el = target;
		if (!el) return;
		let cancelled = false;
		el.innerHTML = '';
		writer = null;

		(async () => {
			const [{ default: HanziWriter }, data] = await Promise.all([
				import('hanzi-writer'),
				loadStrokes()
			]);
			if (cancelled || !target) return;
			const charData = data[char];
			if (!charData) return;
			writer = HanziWriter.create(el, char, {
				charDataLoader: (_c: string, onLoad: (d: StrokeCharacter) => void) => onLoad(charData),
				width: 180,
				height: 180,
				padding: 8,
				showCharacter: false,
				showOutline: true,
				strokeColor: '#171717',
				outlineColor: '#e5e5e5',
				delayBetweenStrokes: 220
			});
			writer.animateCharacter();
		})();

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="rounded-2xl border border-neutral-900 bg-white p-5 sm:p-6">
	<div class="flex items-start justify-between gap-4">
		<div class="flex items-baseline gap-4">
			<span class="text-6xl leading-none {colorize ? `tone${tone}` : ''}" lang="zh-Hans">
				{radical.char}
			</span>
			<div>
				<p class="flex items-baseline gap-2">
					<span class="text-2xl font-semibold {colorize ? `tone${tone}` : ''}">{radical.pinyin}</span>
					{#if radical.zhuyin}
						<span class="text-sm text-neutral-400">{radical.zhuyin}</span>
					{/if}
				</p>
				<p class="text-lg text-neutral-700">{radical.meaning}</p>
				<p class="mt-1 font-mono text-xs uppercase tracking-wider text-neutral-400">
					Kangxi {radical.number} · {radical.strokes} stroke{radical.strokes === 1 ? '' : 's'}
					{#if band} · {band}{/if}
				</p>
			</div>
		</div>
		{#if onClose}
			<button
				type="button"
				onclick={onClose}
				aria-label="Close radical detail"
				class="rounded-lg border border-neutral-200 p-1.5 text-neutral-400 transition hover:border-neutral-900 hover:text-neutral-900"
			>
				<X size={16} />
			</button>
		{/if}
	</div>

	{#if radical.variants.length || radical.simplified.length}
		<div class="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
			{#if radical.variants.length}
				<span class="flex items-baseline gap-2">
					<span class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
						also written
					</span>
					<span class="text-xl" lang="zh-Hans">{radical.variants.join('   ')}</span>
				</span>
			{/if}
			{#if radical.simplified.length}
				<span class="flex items-baseline gap-2">
					<span class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
						simplified
					</span>
					<span class="text-xl" lang="zh-Hans">{radical.simplified.join('   ')}</span>
				</span>
			{/if}
		</div>
	{/if}

	{#if radical.colloquial}
		<p class="mt-4 inline-flex flex-wrap items-baseline gap-2 rounded-full bg-neutral-100 px-4 py-1.5 text-sm">
			<span class="text-base" lang="zh-Hans">{radical.colloquial.term}</span>
			<span class="text-neutral-500">{radical.colloquial.pinyin}</span>
			{#if radical.colloquial.english}
				<span class="italic text-neutral-400">{radical.colloquial.english}</span>
			{/if}
		</p>
	{/if}

	{#if radical.word}
		<p class="mt-4 flex flex-wrap items-baseline gap-2 text-sm">
			<span class="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
				as a word
			</span>
			<span class="font-medium {colorize ? `tone${tone}` : ''}">{radical.word.pinyin}</span>
			<span class="text-neutral-600">{radical.word.meaning}</span>
			{#if radical.word.band}
				<span class="rounded-full border border-neutral-200 px-2 py-0.5 text-[10px] text-neutral-400">
					{radical.word.band}
				</span>
			{/if}
		</p>
	{/if}

	<!-- The grid on the left, the readings it belongs with on the right, the same
	     height — the arrangement the deck's cards use. -->
	<div class="mt-6 grid items-stretch gap-6 sm:grid-cols-[200px_1fr]">
		<div class="sm:order-2">
			<h3 class="font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-400">
				Readings
			</h3>
			<!-- No 中文 row: the reading is printed once, big, in the header above. -->
			<table class="mt-2 w-full text-sm">
				<tbody>
					{#if radical.hanviet}
						<tr class="border-b border-neutral-100">
							<th class="w-28 py-1.5 text-left font-medium text-neutral-400">Hán-Việt</th>
							<td class="py-1.5">{radical.hanviet}</td>
						</tr>
					{/if}
					{#if radical.kana || radical.romaji}
						<tr class="border-b border-neutral-100">
							<th class="py-1.5 text-left font-medium text-neutral-400">日本語</th>
							<td class="py-1.5">
								<span lang="ja">{radical.kana}</span>
								<span class="ml-2 italic text-neutral-500">{radical.romaji}</span>
							</td>
						</tr>
					{/if}
					{#if radical.hangul || radical.romaja}
						<tr>
							<th class="py-1.5 text-left font-medium text-neutral-400">한국어</th>
							<td class="py-1.5">
								<span lang="ko">{radical.hangul}</span>
								<span class="ml-2 italic text-neutral-500">{radical.romaja}</span>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>

		<div class="sm:order-1">
			<div class="inline-block rounded-xl border border-neutral-200 p-1">
				<div bind:this={target} class="h-[180px] w-[180px]"></div>
			</div>
			<button
				type="button"
				onclick={() => writer?.animateCharacter()}
				class="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400 transition hover:text-neutral-900"
			>
				<RotateCcw size={12} /> Replay strokes
			</button>
		</div>
	</div>

	{#if radical.evolution.length}
		<div class="mt-7">
			<h3 class="font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-400">
				Evolution
				<span class="normal-case tracking-normal text-neutral-300" lang="zh-Hans">字源演变</span>
			</h3>
			<div class="mt-2.5 flex flex-wrap gap-2">
				{#each radical.evolution as g (g.file + g.label)}
					<figure class="w-[86px] rounded-xl border border-neutral-200 bg-neutral-50 p-2 text-center">
						<img src={glyphUrl(g.file)} alt="{radical.char} — {g.label}" class="mx-auto h-14 w-14 object-contain" loading="lazy" />
						<figcaption class="mt-1 text-[10px] leading-tight">
							<span class="block" lang="zh-Hans">{g.script}</span>
							<span class="block text-neutral-400">{g.label}</span>
						</figcaption>
					</figure>
				{/each}
			</div>
		</div>
	{/if}

	{#if radical.compare.length}
		<div class="mt-7">
			<h3 class="font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-400">
				Regional forms
				<span class="normal-case tracking-normal text-neutral-300" lang="zh-Hans">字形对比</span>
			</h3>
			<div class="mt-2.5 flex flex-wrap gap-2">
				{#each radical.compare as g (g.file + g.label)}
					<figure class="w-[86px] rounded-xl border border-neutral-200 bg-neutral-50 p-2 text-center">
						<img src={glyphUrl(g.file)} alt="{radical.char} — {g.label}" class="mx-auto h-14 w-14 object-contain" loading="lazy" />
						<figcaption class="mt-1 text-[10px] leading-tight">
							<span class="block" lang="zh-Hans">{g.region}</span>
							<span class="block text-neutral-400">{g.label}</span>
						</figcaption>
					</figure>
				{/each}
			</div>
		</div>
	{/if}

	{#if radical.examples.length}
		<div class="mt-7">
			<h3 class="font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-400">
				Examples
				{#if radical.frequency}
					<span class="normal-case tracking-normal text-neutral-300">
						{radical.frequency} in common use
					</span>
				{/if}
			</h3>
			<ul class="mt-2 divide-y divide-neutral-100">
				{#each radical.examples as ex (ex.char)}
					<li class="flex items-baseline gap-3 py-2">
						<span class="min-w-[2rem] text-2xl leading-none {toneClass(ex.pinyin)}" lang="zh-Hans">
							{ex.char}
						</span>
						<span class="text-sm font-medium {toneClass(ex.pinyin)}">{ex.pinyin}</span>
						{#if ex.zhuyin}<span class="text-xs text-neutral-400">{ex.zhuyin}</span>{/if}
						<span class="text-sm text-neutral-500">{ex.meaning}</span>
						{#if ex.band}
							<span
								class="ml-auto shrink-0 rounded-full border border-neutral-200 px-2 py-0.5 text-[10px] text-neutral-400"
							>
								{ex.band}
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<p class="mt-6 flex flex-wrap gap-4 border-t border-neutral-100 pt-3 font-mono text-[10px] text-neutral-300">
		<span>{radical.unicode}</span>
		{#if radical.kangxiForm}
			<span>
				Kangxi radical form {radical.kangxiForm} U+{radical.kangxiForm
					.codePointAt(0)
					?.toString(16)
					.toUpperCase()}
			</span>
		{/if}
	</p>
</div>
