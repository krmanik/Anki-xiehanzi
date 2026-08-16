# Anki xiě hànzì (写汉字)

> Learn, read, write and pronounce Mandarin by drawing stroke order in
> [Anki](https://apps.ankiweb.net/) — with HSK 1–9 audio, pinyin tone colors and
> a browser-based deck generator.

🔗 **[krmanik.github.io/Anki-xiehanzi](https://krmanik.github.io/Anki-xiehanzi)**

Works in [Anki Desktop](https://apps.ankiweb.net/),
[AnkiDroid](https://play.google.com/store/apps/details?id=com.ichi2.anki) and
[AnkiMobile](https://apps.apple.com/us/app/ankimobile-flashcards/id373493387).

<img src="https://raw.githubusercontent.com/krmanik/Anki-xiehanzi/main/static/img/xiehanzi_v2.0.gif" height="450px"></img>

## Two ways to use it

1. **Download a ready-made deck** — New HSK (2025) covering HSK 3.0 levels 1–9. See below.
2. **Build your own** — the [Create](https://krmanik.github.io/Anki-xiehanzi/create)
   tool turns any Chinese words into a custom `.apkg`, in your browser, no account or upload.

## HSK word lists

Browse every [HSK word list](https://krmanik.github.io/Anki-xiehanzi/hsk) —
Old HSK (2012) levels 1–6 and New HSK 3.0 (2025) levels 1–9 — with tone-coloured
hanzi and pinyin, zhuyin, traditional forms, part of speech, classifiers and
frequency. Any level downloads free as CSV, Excel, Word, PDF, plain text or JSON,
or opens straight in the deck creator as an Anki deck with audio and example
sentences. The same page holds the ready-made decks below.

## Shop

Premium decks and extras are available at the
[Patreon shop](https://www.patreon.com/cw/krmani/shop).

- [Anki xiě hànzì 3.0 — premium deck](https://www.patreon.com/krmani/posts/anki-xie-hanzi-3-166350823)
- [Patreon page](https://www.patreon.com/cw/krmani)

---

## Download the deck — New HSK (2025-11)

- [Anki-xiehanzi — New HSK (2025).apkg](https://github.com/krmanik/Anki-xiehanzi/releases/download/v2.3/Anki-xiehanzi.-.New.HSK.2025.apkg)
- [Anki-xiehanzi — New HSK (2025) with sentences.apkg](https://github.com/krmanik/Anki-xiehanzi/releases/download/v2.3/Anki-xiehanzi.-.New.HSK.2025.with.sentences.apkg)

Import via **File → Import** in Anki.

> [!WARNING]
> Make a backup of your collection (with scheduling information) before importing.

## Build your own deck — Create tool

[**krmanik.github.io/Anki-xiehanzi/create**](https://krmanik.github.io/Anki-xiehanzi/create)

Generate a deck from typed words, pasted paragraphs, an uploaded file, or a full
HSK / BCT / YCT level. The tool segments the text, looks up each word in
CC-CEDICT, lets you customize card types, fields and appearance with a live
preview, then exports a self-contained `.apkg` (audio, fonts and stroke data
bundled — works offline once imported). Everything runs client-side.

See [Export a Deck](https://krmanik.github.io/Anki-xiehanzi/docs/export-deck) for the walkthrough.

## Features

- Draw and practice stroke order (powered by [Hanzi Writer](https://hanziwriter.org))
- Simplified **and** traditional characters
- Pinyin (tone-marked) and Zhuyin (Bopomofo), with tone colors
- Colored strokes and characters
- HSK 1–9 audio plus text-to-speech
- CC-CEDICT definitions, part of speech, radical, breakdown, HSK level and frequency
- Smart example sentences
- Night mode; adjustable character size and stroke width
- Show / hide Simplified, Traditional, Pinyin or Meaning per card
- Decks sorted in frequency order
- External lookups: [Pleco](https://www.pleco.com/),
  [HanziCraft](https://hanzicraft.com/),
  [mnemonics](http://rtega.be/chmn/)
- Load indicator at the bottom (`green = loaded, red = error / not loaded`)

> Some setting changes take effect on the next card.

## Docs

[View the docs](https://krmanik.github.io/Anki-xiehanzi/docs/intro) — features,
studying tips, exporting a deck, and FAQ.

> [!NOTE]
> The old (v1) version of the site is still available at
> [krmanik.github.io/Anki-xiehanzi/v1](https://krmanik.github.io/Anki-xiehanzi/v1/).
> It is archived for reference and no longer updated.

---

<details>
<summary><b>Previous decks (2021-03)</b> — five legacy types, click to view</summary>

<br/>

### Type 1 (Recommended)

Separate decks for each type:
1. Stroke order
2. Meaning
3. Pinyin / Zhuyin
4. Pronunciation (audio + Pinyin / Zhuyin)

> Sorted in frequency order. [Download](https://ankiweb.net/shared/info/1351435439)

### Type 2 (Recommended)

Five card types per HSK-level note: stroke order, meaning, pinyin/zhuyin,
pronunciation, tone marks.

> Sorted in frequency order. [Download](https://ankiweb.net/shared/info/239300382)

### Type 3

Same five card types as Type 2, but sorted in alphabetical pinyin order.

> **Not** frequency-sorted. [Download](https://ankiweb.net/shared/info/1063372083)

### Type 4

Single note type — front: pinyin + meaning; back: writing component.

> **Not** frequency-sorted. [Download](https://ankiweb.net/shared/info/536858343)

### Type 5

HSK 2.0 deck.

> **Not** frequency-sorted. [Download](https://ankiweb.net/shared/info/119943820)

</details>

---

## Acknowledgements

Stroke drawing uses the [Hanzi Writer](https://hanziwriter.org) JavaScript
library. Its character and stroke-order data is derived from
[Make Me a Hanzi](https://github.com/skishore/makemeahanzi).

## Disclaimer

This is a JavaScript implementation that works because Anki renders flashcards in
a webview. It may not work on every device. Make backups (with scheduling
information) before importing. Some audio files are missing; they can be
regenerated with text-to-speech using
[gtts-textToMp3](https://github.com/krmanik/gtts-textToMp3).

## Build a word list

- [Anki Chinese Vocabulary Generator](https://github.com/krmanik/Anki-Chinese-Vocabulary-Generator)
- [Vocabulary](https://simplezhongwen.blogspot.com/search/label/vocabulary)

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) or the
[Contributing](https://krmanik.github.io/Anki-xiehanzi/docs/contributing) docs
page. Wrong word, pinyin or meaning? Those live in the
[HSK-3.0-words-list](https://github.com/krmanik/HSK-3.0-words-list) submodule —
fix them there.

More decks by the author: [AnkiWeb](https://ankiweb.net/shared/byauthor/119943820).

## License

Author: Mani (krmanik). MIT License and GPL 3.0.
Third-party licenses: [License.md](https://github.com/krmanik/Anki-xiehanzi/blob/main/License.md).

---

> Part of the code in this project was generated with AI (Claude Opus 4.8).
