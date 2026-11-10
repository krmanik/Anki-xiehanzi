<script lang="ts">
	import { base } from '$app/paths';
	import { REPO } from '$lib/share.svelte';

	const link = 'text-muted no-underline transition-colors hover:text-ink';
</script>

<footer class="mt-20">
	<div
		class="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-5 gap-y-2 px-4 pt-8 pb-10 text-[14.5px] text-muted sm:px-7"
	>
		<a class={link} href="{base}/docs">Docs</a>
		<a class={link} href={REPO}>GitHub</a>
		<a class={link} href="https://forums.ankiweb.net/">Anki Forums</a>
		<a class={link} href="https://discord.gg/A3HGPw9UuA">Discord</a>
		<a class={link} href="https://github.com/sponsors/krmanik">Sponsor</a>
		<a class={link} href="https://www.buymeacoffee.com/krmani">Buy me a coffee</a>
		<span class="w-full text-[13px] sm:ml-auto sm:w-auto"
			>© {new Date().getFullYear()} Anki-xiehanzi · GPL-3.0 · Not affiliated with Anki or Ankitects.</span
		>
	</div>
</footer>
