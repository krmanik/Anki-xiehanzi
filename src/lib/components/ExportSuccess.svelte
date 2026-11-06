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
		class="relative w-full max-w-md rounded-2xl border-2 border-accent bg-surface p-8 text-center shadow-[8px_8px_0_0_#111]"
		transition:scale={{ duration: 250, start: 0.9, easing: quintOut }}
		role="dialog"
		aria-modal="true"
		aria-label="Deck exported"
	>
		<button
			class="absolute right-4 top-4 rounded-md p-1 text-muted transition hover:bg-sunk hover:text-ink"
			onclick={onClose}
			aria-label="Close"
		>
			<X size={20} />
		</button>

		<div class="mb-3 text-5xl" aria-hidden="true">🎉</div>
		<h2 class="text-2xl font-extrabold tracking-tight text-ink">Hooray! Deck exported</h2>
		<p class="mt-1 text-sm text-muted">
			<code class="rounded bg-sunk px-1.5 py-0.5">{deckName}.apkg</code> downloaded — import it into Anki.
		</p>

		<div class="my-6 h-px bg-line"></div>

		<p class="text-sm font-medium text-muted">Enjoying Anki-xiehanzi? Give it a star.</p>
		<a
			href={REPO}
			target="_blank"
			rel="noopener noreferrer"
			class="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md"
		>
			<Star size={16} class="fill-yellow-400 text-yellow-400" />
			Star on GitHub
		</a>

		<div class="my-6 h-px bg-line"></div>

		<p class="mb-3 text-sm font-medium text-muted">Share Anki-xiehanzi project</p>
		<ShareButtons />

		<button
			class="mt-6 text-xs text-muted underline underline-offset-2 transition hover:text-ink"
			onclick={dontShowAgain}
		>
			Do not show again
		</button>
	</div>
</div>
