---
title: FAQ
---

<script>
	import { base } from '$app/paths';
</script>

# Frequently Asked Questions

### What is Anki-xiehanzi?

A set of Anki decks and a free <a href="{base}/create">deck generator</a> for learning to read,
write and pronounce Mandarin Chinese. Cards cover simplified and traditional characters, pinyin,
zhuyin, audio, meanings and stroke-order practice.

### How do I import a deck into Anki?

Download an `.apkg` from the <a href="{base}/hsk#decks">decks page</a>, then in Anki choose
**File → Import** and select the file. Before importing, back up your collection with scheduling
information.

### Can I get just one HSK level?

Each list is one download — New HSK (2025) or Old HSK (2012) — on the
<a href="{base}/hsk">HSK page</a>, with audio, example sentences and stroke order already inside.
Every level is a subdeck of it, so you can study, suspend or delete a level on its own after
importing. Nothing is generated in your browser, so there is no wait. If you want one level as its
own file or a different card layout, the <a href="{base}/create">Create</a> tool can build any HSK
level from scratch with your own fields and card types.

### Can I make my own deck?

Yes. Use the <a href="{base}/create">Create</a> tool. Enter words, a paragraph or upload a word
list — or pull a whole HSK / BCT / YCT level — pick your card types and fields, then generate
an `.apkg` you can import into Anki. See <a href="{base}/docs/export-deck">Export a Deck</a>.

### Where do the words and definitions come from?

Definitions are from CC-CEDICT; pinyin, zhuyin and frequency are derived from it. Word lists
cover New HSK (2025) levels 1–9, plus BCT (A/B) and YCT (1–4). Pasted paragraphs are segmented
into words automatically.

### Does it send my words to a server?

No. The deck is generated entirely in your browser. Audio and stroke data are fetched from a
CDN during export, but your word list and the `.apkg` never leave your device.

### Will the cards work offline?

Yes. The exported `.apkg` bundles its audio, fonts and stroke-order data, so cards review
offline after import.

### Can I customize how a card looks?

Yes. Choose a tone-color palette (Standard, Pleco, MDBG) and a card theme (Minimal, OLED,
Editorial and more, each light/dark). Inside Anki, the sidebar lets you show/hide fields and
change grid size, stroke width and hints — see <a href="{base}/docs/studying">Studying cards</a>.

### Does audio work in every browser?

Text-to-speech audio generation works best in Microsoft Edge. HSK words also pull pre-recorded
audio when available, so other browsers still work for those. Exporting a large deck with audio
is slower because TTS is fetched in small batches — keep the tab open until the download starts.

### Why are some characters drawn with colored strokes?

Stroke colors map to the tone of the first pinyin, making tones easier to remember while you
practice writing.

### Is it free and open source?

Yes. The project is licensed under GPL-3.0. Source is on
[GitHub](https://github.com/krmanik/Anki-xiehanzi).
