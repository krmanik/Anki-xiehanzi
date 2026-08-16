<script lang="ts">
	// Word lists and prebuilt decks live on one page now. This older URL keeps
	// working — external links and releases point at it — and renders the same
	// content, with /hsk as the canonical address.
	import DeckLibrary from '$lib/components/DeckLibrary.svelte';
</script>

<svelte:head>
	<title>Download Decks &amp; HSK Word Lists — Anki xiehanzi</title>
	<meta
		name="description"
		content="Ready-made Anki decks for New HSK (2025), plus every HSK word list to browse or download as CSV, Excel, Word, PDF or text."
	/>
	<link rel="canonical" href="https://krmanik.github.io/Anki-xiehanzi/hsk" />
</svelte:head>

<DeckLibrary />
