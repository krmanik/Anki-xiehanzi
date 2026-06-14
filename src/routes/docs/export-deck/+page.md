---
title: Export a Deck
---

<script>
	import { base } from '$app/paths';
</script>

# Export an Anki deck

The <a href="{base}/create">Create</a> tool builds a `.apkg` file entirely in your
browser — nothing is uploaded to a server. You design the card layout, add Chinese
words, then generate a deck you import straight into Anki.

The page is a two-step wizard:

1. **Create Card Types** — design what the cards look like.
2. **Input Chinese Characters** — add words and generate the `.apkg`.

You can move back and forth between the two steps at any time with the arrows at the
bottom of the page.

## Step 1 — Design the cards

### Pick a card preset

Start from a preset (e.g. *meaning*, *pinyin / zhuyin*, *audio*, *tone marks*,
*stroke writing*) instead of building from scratch. A preset fills in sensible front
and back fields. Presets that need pronunciation turn on **Include Audio**
automatically.

### Card types

A deck can hold several **card types** (the tabs labelled *Card 1*, *Card 2*, …).
Each card type becomes one card per word, so one word with three card types produces
three cards. For every card type you choose which fields appear on the **front** and
which on the **back**.

### Available fields

- **Simplified** / **Traditional** characters
- **Pinyin** (tone-marked) and **Zhuyin** (Bopomofo)
- **Part of speech**
- **Meaning** (short gloss) and full **Definitions** (CC-CEDICT)
- **Breakdown**, **Radical**, **HSK level**, **Frequency**
- **Examples** — smart example sentences (pulls a separate ~5 MB sentence database
  on demand, only when the field is used)
- **Audio** — pre-recorded HSK audio, or text-to-speech for everything else
- **Writing component** — the hanzi-writer stroke-order practice grid

Drag fields to reorder them; the order is shared across the whole deck. The
control-button bar and the separator line are layout-only tokens you can position
like any other field.

### Appearance

The customizer controls fonts, mono vs. colored hanzi, tone-colored pinyin, the card
theme, whether definitions are collapsed, and example-sentence options (count and
min/max length). The live **Preview** on the right shows the front and back exactly
as Anki will render them.

## Step 2 — Add words

Switch to **Input Chinese Characters**. Pick a source:

| Source | What it does |
| --- | --- |
| **Word** | Type a single word (e.g. `中国`) and click **Add**. |
| **Paragraph** | Paste Chinese text; it is segmented into words automatically. |
| **File** | Upload a `.txt` file with one word per line. |
| **HSK Level** | Pick HSK levels 1–6 / 7+; every word at those levels is added, most-common first. |
| **BCT Level** | BCT A (~600 words) or B (~4000 words). |
| **YCT Level** | YCT levels 1–4. |

Each added word is looked up for pinyin, meaning and the rest. Words appear in a
paginated table below where you can play audio, select rows, and **Delete** the ones
you don't want.

## Step 3 — Generate

Set the **deck name** at the top (it defaults to `Anki xiehanzi <date> <timestamp>`).

- **Include Audio (Text-to-Speech)** — when on, the export fetches pre-recorded HSK
  audio where available and synthesizes the rest with edge-tts. This makes export
  slower and the file larger. Two different note types are emitted depending on this
  toggle (`Basic - (Anki-xiehanzi)` with audio, or the `- No Audio` variant).
- **Export CSV** — download the raw word list as `.csv` (no cards/media).
- **Preview** — final check of the generated cards before exporting.
- **Generate** — builds the `.apkg`. A progress bar tracks media fetching (sidebar
  icons, the writer engine + stroke data when a card uses the writing component, and
  audio if enabled). When it finishes, the browser downloads
  `<deck name>.apkg`.

> Generating with audio for hundreds of words can take a while — TTS is fetched in
> small batches with short delays. Keep the tab open until the download starts.

## Step 4 — Import into Anki

1. Open **Anki Desktop**.
2. **File → Import** and choose the downloaded `.apkg`, or just double-click the file.
3. The deck, note types, and all media (audio, fonts, stroke data) import together.

The same `.apkg` syncs to **AnkiDroid** and **AnkiMobile** through AnkiWeb.

> **Back up first.** Before importing into a collection that already has
> scheduling/review history, make a backup with scheduling information. The cards use
> JavaScript (Anki renders cards in a webview), so a few older or non-standard devices
> may not display them correctly.
