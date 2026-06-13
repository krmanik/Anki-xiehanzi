---
title: Studying cards
---

<script>
	import { base } from '$app/paths';
</script>

# Studying cards in Anki

Anki-xiehanzi cards are interactive — the writing grid, audio and field toggles all
work while you review. Everything is driven by small buttons at the bottom of the
card and two slide-out sidebars.

## Control bar

A row of buttons sits at the bottom of the card:

- **Menu** — opens the settings sidebar (toggles and sliders, below).
- **Replay audio** — plays the word's pronunciation again (cards with an Audio field).
- **Reload quiz** — restarts the stroke-order writing quiz on the current character.
- **More info** — opens the dictionary sidebar with external lookups.

## Settings sidebar

Open it from **Menu**. Settings are remembered from one card to the next.

**Front / Back** — each side keeps its own set of toggles; switch tabs at the top of
the sidebar to configure them separately.

**Show / hide** any of these fields:

Pinyin · Zhuyin · Simplified · Traditional · Part of speech · Simple meaning ·
Meaning · Breakdown · Radical · HSK level · Frequency · Examples

**Color** toggles:

- **Color hanzi** — tone-color the characters.
- **Color pinyin** — tone-color the pinyin.
- **Stroke tone color** — tone-color the writing strokes.

**Writing-grid** toggles:

- **Grid** — show the practice grid lines.
- **Outline** — show a faint character outline to trace over.

**Sliders:**

| Slider | Range | What it does |
| --- | --- | --- |
| **Grid size** | 100–1000 | Size of the writing area. |
| **Stroke width** | 2–50 | Thickness of the pen. |
| **Hint after misses** | 1–10 | Wrong strokes before a hint shows. |

## Writing practice

When a card includes the writing component you draw each stroke in the grid. Strokes
are checked in order; after the number of misses set above, a hint appears. Use
**Reload quiz** to start the character over.

## Dictionary sidebar

**More info** opens external references for the current word:

- [Pleco](https://www.pleco.com/) — dictionary (on phone)
- [HanziCraft](https://hanzicraft.com/) — character breakdown
- [rtega.be/chmn](http://rtega.be/chmn/) — mnemonics
- [Youdao](http://dict.youdao.com) — meaning
- [CharacterPop](https://characterpop.com) — stroke order and stories
- [Tatoeba](https://tatoeba.org/en/) — example sentences

## Night mode

Cards follow Anki's night mode. Themes set to **auto** switch their colors to the
dark variant automatically; light- or dark-locked themes keep their look.

> **Note:** some changes take effect from the next card, not the one on screen.
