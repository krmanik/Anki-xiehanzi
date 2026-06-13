<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import X from '@lucide/svelte/icons/x';
	import Star from '@lucide/svelte/icons/star';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import { REPO, setPopupHidden } from '$lib/share.svelte';

	let { deckName = 'deck', onClose }: { deckName?: string; onClose: () => void } = $props();

	// confetti touches window/document at module eval, so load it browser-only
	// (this component only ever renders client-side after an export).
	let confetti = $state<((opts?: unknown) => void) | null>(null);

	function burst() {
		if (!confetti) return;
		const seq = [
			{ x: window.innerWidth * 0.5, y: window.innerHeight * 0.45 },
			{ x: window.innerWidth * 0.3, y: window.innerHeight * 0.4 },
			{ x: window.innerWidth * 0.7, y: window.innerHeight * 0.4 }
		];
		seq.forEach((position, i) =>
			setTimeout(() => confetti?.({ position, count: 120, fade: true }), i * 180)
		);
	}

	function dontShowAgain() {
		setPopupHidden(true);
		onClose();
	}

	onMount(async () => {
		confetti = (await import('@hiseb/confetti')).default;
		await tick();
		burst();
	});

	$effect(() => {
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
	transition:fade={{ duration: 150 }}
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && onClose()}
>
	<div
		class="relative w-full max-w-md rounded-2xl border-2 border-neutral-900 bg-white p-8 text-center shadow-[8px_8px_0_0_#111]"
		transition:scale={{ duration: 250, start: 0.9, easing: quintOut }}
		role="dialog"
		aria-modal="true"
		aria-label="Deck exported"
	>
		<button
			class="absolute right-4 top-4 rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
			onclick={onClose}
			aria-label="Close"
		>
			<X size={20} />
		</button>

		<div class="mb-3 text-5xl" aria-hidden="true">🎉</div>
		<h2 class="text-2xl font-extrabold tracking-tight text-neutral-900">Hooray! Deck exported</h2>
		<p class="mt-1 text-sm text-neutral-500">
			<code class="rounded bg-neutral-100 px-1.5 py-0.5">{deckName}.apkg</code> downloaded — import it into Anki.
		</p>

		<div class="my-6 h-px bg-neutral-200"></div>

		<p class="text-sm font-medium text-neutral-700">Enjoying Anki-xiehanzi? Give it a star.</p>
		<a
			href={REPO}
			target="_blank"
			rel="noopener noreferrer"
			class="mt-3 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#111]"
		>
			<Star size={16} class="fill-yellow-400 text-yellow-400" />
			Star on GitHub
		</a>

		<div class="my-6 h-px bg-neutral-200"></div>

		<p class="mb-3 text-sm font-medium text-neutral-700">Share Anki xiehanzi project</p>
		<ShareButtons />

		<button
			class="mt-6 text-xs text-neutral-400 underline underline-offset-2 transition hover:text-neutral-700"
			onclick={dontShowAgain}
		>
			Do not show again
		</button>
	</div>
</div>
