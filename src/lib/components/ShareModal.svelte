<script lang="ts">
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
		aria-label="Share Anki xiehanzi project"
	>
		<button
			class="absolute right-4 top-4 rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900"
			onclick={onClose}
			aria-label="Close"
		>
			<X size={20} />
		</button>

		<h2 class="text-2xl font-extrabold tracking-tight text-neutral-900">Share Anki xiehanzi project</h2>
		<p class="mt-1 text-sm text-neutral-500">Help other learners find it.</p>

		<div class="my-6 h-px bg-neutral-200"></div>

		<ShareButtons />

		<div class="my-6 h-px bg-neutral-200"></div>

		<a
			href={REPO}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#111]"
		>
			<Star size={16} class="fill-yellow-400 text-yellow-400" />
			Star on GitHub
		</a>
	</div>
</div>
