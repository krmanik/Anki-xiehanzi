<script lang="ts">
	import { buttonClass } from '$lib/ui/styles';
	import { fade, scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import X from '@lucide/svelte/icons/x';
	import Star from '@lucide/svelte/icons/star';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import { REPO } from '$lib/share.svelte';

	let { onClose }: { onClose: () => void } = $props();

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
		aria-label="Share Anki-xiehanzi project"
	>
		<button
			class="absolute top-4 right-4 grid size-10 cursor-pointer place-items-center rounded-xl border-0 bg-transparent text-muted transition hover:bg-sunk hover:text-ink"
			onclick={onClose}
			aria-label="Close"
		>
			<X size={20} />
		</button>

		<h2 class="m-0 text-[28px] leading-[1.05] font-bold tracking-[-0.035em] text-ink">Share Anki-xiehanzi project</h2>
		<p class="mt-1 text-sm text-muted">Help other learners find it.</p>

		<div class="my-6 h-px bg-line"></div>

		<ShareButtons />

		<div class="my-6 h-px bg-line"></div>

		<a
			href={REPO}
			target="_blank"
			rel="noopener noreferrer"
			class="{buttonClass('primary', 'sm')}"
		>
			<Star size={16} class="fill-gold text-gold" />
			Star on GitHub
		</a>
	</div>
</div>
