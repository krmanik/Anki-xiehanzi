<script lang="ts">
	import '../app.css';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';

	let { children } = $props();
	const repo = 'https://github.com/krmanik/Anki-xiehanzi';

	let open = $state(false);

	const nav = [
		{ href: `${base}/create`, label: 'Create' },
		{ href: `${base}/decks`, label: 'Decks' },
		{ href: `${base}/features`, label: 'Features' },
		{ href: `${base}/faq`, label: 'FAQ' }
	];

	const current = $derived(page.url.pathname.replace(base, '') || '/');
	const isActive = (href: string) => current === href.replace(base, '');
</script>

<header class="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
	<nav class="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
		<a href="{base}/" class="flex items-center gap-2 font-bold tracking-tight text-neutral-900">
			<img src="{base}/img/logo.gif" alt="" class="h-7 w-7" />
			<span>Anki<span class="text-indigo-600">xiehanzi</span></span>
		</a>

		<!-- desktop -->
		<div class="hidden items-center gap-1 md:flex">
			{#each nav as item}
				<a
					href={item.href}
					class="rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition {isActive(
						item.href
					)
						? 'bg-neutral-900 text-white'
						: 'text-neutral-500 hover:text-neutral-900'}">{item.label}</a
				>
			{/each}
			<a
				href={repo}
				class="ml-1 rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
				>GitHub</a
			>
		</div>

		<!-- mobile toggle -->
		<button
			class="rounded-md p-1.5 text-neutral-700 hover:bg-neutral-100 md:hidden"
			aria-label="menu"
			onclick={() => (open = !open)}
		>
			{#if open}<X size={20} />{:else}<Menu size={20} />{/if}
		</button>
	</nav>

	{#if open}
		<div class="border-t border-neutral-200 bg-white md:hidden">
			<div class="flex flex-col px-5 py-2">
				{#each nav as item}
					<a
						href={item.href}
						onclick={() => (open = false)}
						class="rounded-md px-2 py-2.5 font-mono text-sm uppercase tracking-wider {isActive(
							item.href
						)
							? 'text-indigo-600'
							: 'text-neutral-600'}">{item.label}</a
					>
				{/each}
				<a
					href={repo}
					class="rounded-md px-2 py-2.5 font-mono text-sm uppercase tracking-wider text-neutral-600"
					>GitHub</a
				>
			</div>
		</div>
	{/if}
</header>

<main class="min-h-[70vh]">
	{@render children()}
</main>

<footer class="mt-16 border-t border-neutral-200 bg-neutral-50">
	<div class="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 md:grid-cols-4">
		<div class="sm:col-span-2 md:col-span-1">
			<div class="flex items-center gap-2 font-bold tracking-tight">
				<img src="{base}/img/logo.gif" alt="" class="h-6 w-6" />
				Anki<span class="text-indigo-600">xiehanzi</span>
			</div>
			<p class="mt-2 max-w-xs text-sm text-neutral-500">
				Learn, read and write Mandarin by drawing strokes in Anki.
			</p>
		</div>
		<div>
			<h3 class="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">Docs</h3>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href="{base}/features">Features</a>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href="{base}/faq">FAQ</a>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href="{base}/decks">Decks</a>
		</div>
		<div>
			<h3 class="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">Community</h3>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href="https://forums.ankiweb.net/">Anki Forums</a>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href="https://discord.gg/qjzcRTx">Discord</a>
		</div>
		<div>
			<h3 class="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">More</h3>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href="{base}/create">Create</a>
			<a class="block py-1 text-sm text-neutral-600 hover:text-neutral-900" href={repo}>GitHub</a>
		</div>
	</div>
	<div class="border-t border-neutral-200 px-5 py-4 text-center font-mono text-xs text-neutral-400">
		© {new Date().getFullYear()} Anki-xiehanzi · GPL-3.0
	</div>
</footer>
