<script lang="ts">
	import { buttonClass } from '$lib/ui/styles';
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
	class="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4 backdrop-blur-[2px]"
	transition:fade={{ duration: 150 }}
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && onClose()}
>
	<div
		class="relative w-full max-w-md rounded-tile bg-surface p-8 text-center shadow-raised"
		transition:scale={{ duration: 250, start: 0.9, easing: quintOut }}
		role="dialog"
		aria-modal="true"
		aria-label="Deck exported"
	>
		<button
			class="absolute top-4 right-4 grid size-10 cursor-pointer place-items-center rounded-xl border-0 bg-transparent text-muted transition hover:bg-sunk hover:text-ink"
			onclick={onClose}
			aria-label="Close"
		>
			<X size={20} />
		</button>

		<div class="mb-3 text-5xl" aria-hidden="true">🎉</div>
		<h2 class="m-0 text-[28px] leading-[1.05] font-bold tracking-[-0.035em] text-ink">Hooray! Deck exported</h2>
		<p class="mt-1 text-sm text-muted">
			<code class="rounded bg-sunk px-1.5 py-0.5">{deckName}.apkg</code> downloaded — import it into Anki.
		</p>

		<div class="my-6 h-px bg-line"></div>

		<p class="text-sm font-medium text-muted">Enjoying Anki-xiehanzi? Give it a star.</p>
		<a
			href={REPO}
			target="_blank"
			rel="noopener noreferrer"
			class="mt-3 {buttonClass('primary', 'sm')}"
		>
			<Star size={16} class="fill-gold text-gold" />
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
