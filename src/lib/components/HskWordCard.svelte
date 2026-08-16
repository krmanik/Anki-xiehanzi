<script lang="ts">
	import {
		formatClassifier,
		frequencyBand,
		hanziTones,
		pinyinTones,
		type HskEntry
	} from '$lib/hsk';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let {
		entry,
		index,
		colorize = true,
		showTraditional = true,
		open = false,
		onToggle
	}: {
		entry: HskEntry;
		index: number;
		colorize?: boolean;
		showTraditional?: boolean;
		open?: boolean;
		onToggle?: () => void;
	} = $props();

	const simp = $derived(hanziTones(entry.s, entry.p));
	const trad = $derived(hanziTones(entry.t, entry.p));
	const pinyin = $derived(pinyinTones(entry.y, entry.p));
	const band = $derived(frequencyBand(entry.f));
	const hasDetail = $derived(
		Boolean(entry.r?.length || entry.c?.length || (entry.o?.length ?? 0) > 1 || entry.f)
	);
	const toneClass = (tone: number) => (colorize ? `tone${tone}` : '');
</script>

<div
	class="group relative flex flex-col rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-400 hover:shadow-sm"
>
	<span class="absolute right-3 top-3 font-mono text-[10px] text-neutral-300">{index}</span>

	<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 pr-6">
		<span class="text-3xl font-semibold leading-tight" lang="zh-Hans">
			{#each simp as c}<span class={toneClass(c.tone)}>{c.ch}</span>{/each}
		</span>
		{#if showTraditional && entry.t !== entry.s}
			<span class="text-xl leading-tight text-neutral-400" lang="zh-Hant" title="Traditional">
				{#each trad as c}<span class={colorize ? `${toneClass(c.tone)} opacity-60` : ''}>{c.ch}</span
					>{/each}
			</span>
		{/if}
	</div>

	<div class="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
		<span class="font-medium">
			{#each pinyin as p, i}<span class={toneClass(p.tone)}>{p.text}</span>{#if i < pinyin.length - 1}<span
					>&nbsp;</span
				>{/if}{/each}
		</span>
		{#if entry.z}
			<span class="font-mono text-xs text-neutral-400">{entry.z}</span>
		{/if}
	</div>

	<p class="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-600">{entry.m}</p>

	<div class="mt-3 flex flex-wrap items-center gap-1.5">
		{#if entry.o?.[0]}
			<span
				class="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-500"
				>{entry.o[0]}</span
			>
		{/if}
		{#if band}
			<span
				class="rounded border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-indigo-500"
				>{band}</span
			>
		{/if}
		{#if hasDetail}
			<button
				type="button"
				onclick={onToggle}
				aria-expanded={open}
				class="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400 transition hover:text-neutral-900"
			>
				{open ? 'Less' : 'Details'}
				<ChevronDown size={12} class={open ? 'rotate-180 transition' : 'transition'} />
			</button>
		{/if}
	</div>

	{#if open}
		<div class="mt-3 space-y-3 border-t border-neutral-100 pt-3 text-sm">
			{#if entry.r?.length}
				<div class="space-y-2">
					{#each entry.r as r}
						<div>
							<div class="flex flex-wrap items-baseline gap-2">
								<span class="font-medium">
									{#each pinyinTones(r.y, r.p) as p, i}<span class={toneClass(p.tone)}>{p.text}</span
										>{#if i < pinyinTones(r.y, r.p).length - 1}<span>&nbsp;</span>{/if}{/each}
								</span>
								<span class="font-mono text-xs text-neutral-400">{r.z}</span>
								<span class="font-mono text-[10px] text-neutral-300">{r.p}</span>
							</div>
							<p class="mt-0.5 leading-relaxed text-neutral-600">{r.d}</p>
						</div>
					{/each}
				</div>
			{/if}

			<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
				{#if entry.o?.length}
					<dt class="font-mono uppercase tracking-wider text-neutral-400">Part of speech</dt>
					<dd class="text-neutral-600">{entry.o.join(' · ')}</dd>
				{/if}
				{#if entry.c?.length}
					<dt class="font-mono uppercase tracking-wider text-neutral-400">Classifier</dt>
					<dd class="text-neutral-600">{entry.c.map(formatClassifier).join(' · ')}</dd>
				{/if}
				{#if entry.f}
					<dt class="font-mono uppercase tracking-wider text-neutral-400">Frequency</dt>
					<dd class="text-neutral-600">#{entry.f.toLocaleString()} most common</dd>
				{/if}
				{#if entry.t !== entry.s}
					<dt class="font-mono uppercase tracking-wider text-neutral-400">Traditional</dt>
					<dd class="text-neutral-600" lang="zh-Hant">{entry.t}</dd>
				{/if}
			</dl>
		</div>
	{/if}
</div>
