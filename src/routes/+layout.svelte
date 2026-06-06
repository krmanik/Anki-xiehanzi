<script lang="ts">
	import '../app.css';
	import { base } from '$app/paths';
	let { children } = $props();

	const repo = 'https://github.com/krmanik/Anki-xiehanzi';
</script>

<nav class="border-b border-gray-200 bg-white">
	<div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
		<a href="{base}/" class="flex items-center gap-2 text-lg font-bold text-indigo-700">
			<img src="{base}/img/logo.gif" alt="Anki xiehanzi logo" class="h-8 w-8" />
			Anki xiehanzi
		</a>
		<div class="flex items-center gap-5 text-sm font-medium text-gray-700">
			<a href="{base}/create" class="hover:text-indigo-700">Create</a>
			<a href={repo} class="hover:text-indigo-700">GitHub</a>
		</div>
	</div>
</nav>

<main class="min-h-[70vh]">
	{@render children()}
</main>

<footer class="mt-12 bg-gray-900 text-gray-300">
	<div class="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 md:grid-cols-3">
		<div>
			<h3 class="mb-3 font-semibold text-white">Docs</h3>
			<a class="block hover:text-white" href="{repo}#readme">Tutorial</a>
		</div>
		<div>
			<h3 class="mb-3 font-semibold text-white">Community</h3>
			<a class="block hover:text-white" href="https://forums.ankiweb.net/">Anki Forums</a>
			<a class="block hover:text-white" href="https://discord.gg/qjzcRTx">Discord</a>
		</div>
		<div>
			<h3 class="mb-3 font-semibold text-white">More</h3>
			<a class="block hover:text-white" href="{base}/create">Create</a>
			<a class="block hover:text-white" href={repo}>GitHub</a>
		</div>
	</div>
	<div class="border-t border-gray-700 px-4 py-4 text-center text-sm">
		Copyright © {new Date().getFullYear()} Anki-xiehanzi.
	</div>
</footer>
