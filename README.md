# Anki xiě hànzì (写汉字)

> Master Mandarin with **9 specialized card types** for HSK 1–9: stroke order, production, cloze deletion, traditional recognition, and more — featuring audio, pinyin tone colors, part-of-speech color coding, and interactive stroke practice.

🔗 **[tzoalli.github.io/Anki-xiehanzi](https://tzoalli.github.io/Anki-xiehanzi)**

Works in [Anki Desktop](https://apps.ankiweb.net/),
[AnkiDroid](https://play.google.com/store/apps/details?id=com.ichi2.anki) and
[AnkiMobile](https://apps.apple.com/us/app/ankimobile-flashcards/id373493387).

<img src="https://raw.githubusercontent.com/tzoalli/Anki-xiehanzi/main/static/img/xiehanzi_v2.0.gif" height="450px"></img>

## Download the decks

Pre-built Anki decks for HSK 3.0 levels 1–9 with **9 card type options**:

- **HSK 1–9 Vocabulary** — Choose your learning style: stroke order, meaning recognition, character production, cloze deletion, traditional/simplified conversion, or comprehensive exam prep
- **With Example Sentences** — Same vocabulary plus contextual example sentences with media hints

All decks include:
- ✅ Interactive stroke order practice (Hanzi Writer)
- ✅ Simplified & Traditional characters
- ✅ Pinyin (tone-colored) & Zhuyin (Bopomofo)
- ✅ **Part-of-speech color coding** (12 categories: nouns, verbs, adjectives, etc.)
- ✅ Native audio pronunciation
- ✅ CC-CEDICT definitions, radicals, breakdown, HSK level & frequency
- ✅ Smart example sentences with optional media hints
- ✅ Customizable field visibility in Anki (toggle Simplified, Traditional, Pinyin, Zhuyin, etc.)

Import via **File → Import** in Anki. After importing, customize which fields appear using Anki's **Tools → Manage Note Types → Fields** (click the eye icon to show/hide).

> [!WARNING]
> Make a backup of your collection (with scheduling information) before importing.

---

## Card Types (9 Presets)

Choose the card type that matches your learning goal:

| Card Type | Front → Back | Best For |
|-----------|-------------|----------|
| **Beginner** | Simplified → Pinyin + Meaning + Audio | Building foundational recognition |
| **Intermediate** | Simplified → Traditional + Pinyin + Definitions | Connecting character variants |
| **Reading** | Simplified + Pinyin → Meaning | Quick reading fluency |
| **Writing** | Meaning → Write Character (stroke order) | Active character production |
| **Production** *(new)* | Meaning → Write Character (no hints) | Testing recall without cues |
| **Cloze Deletion** *(new)* | Sentence with blank + Media hint → Full sentence | Contextual learning with audio/visual hints |
| **Traditional Recognition** *(new)* | Traditional → Simplified + Meaning | Reading traditional texts |
| **Traditional Production** *(new)* | Simplified → Write Traditional | Writing traditional characters |
| **Example Sentences** | Simplified → All info + Examples + Audio | Learning usage in context |
| **HSK Exam** | Comprehensive review (all fields) | Exam preparation & mastery |

### Cloze Deletion Features
- Fill-in-the-blank sentences with contextual hints
- Optional audio/image hints for meaning support
- Perfect for learning vocabulary in natural contexts

### Part-of-Speech Color Coding
Words are color-coded by grammatical category for faster pattern recognition:
- 🔵 **Nouns** (Blue) | 🔷 **Pronouns** (Sky Blue) | 🟢 **Verbs** (Dark Green)
- 🌿 **Auxiliary Verbs** (Mint) | 🔴 **Numerals** (Red) | 🟡 **Adjectives** (Yellow)
- 🟣 **Measure Words** (Purple) | 🟩 **Adverbs** (Lime) | 🔷 **Prepositions** (Teal)
- 🟠 **Conjunctions** (Orange) | ⚫ **Particles** (Grey) | 🩷 **Interjections** (Pink)

> Customize field visibility after import: In Anki, go to **Tools → Manage Note Types → Fields** and toggle the eye icon next to any field (Simplified, Traditional, Pinyin, Zhuyin, etc.).

## Docs

[View the docs](https://tzoalli.github.io/Anki-xiehanzi/docs/intro) — features,
studying tips, card type comparisons, and FAQ.

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

Word definitions, part-of-speech tags, and example sentences come from
[CC-CEDICT](https://www.mdbg.net/chindict/chindict.php?page=cedict).

HSK 3.0 vocabulary lists sourced from
[HSK-3.0-words-list](https://github.com/tzoalli/HSK-3.0-words-list).

## Disclaimer

This is a JavaScript implementation that works because Anki renders flashcards in
a webview. It may not work on every device. Make backups (with scheduling
information) before importing.

## Contribute

Wrong word, pinyin or meaning? Those live in the
[HSK-3.0-words-list](https://github.com/tzoalli/HSK-3.0-words-list) submodule —
fix them there.

Want to suggest new card types or report issues? Open an issue on this repo.

More decks by the author: [AnkiWeb](https://ankiweb.net/shared/byauthor/119943820).

## License

Author: Mani (krmanik). MIT License and GPL 3.0.
Third-party licenses: [License.md](https://github.com/tzoalli/Anki-xiehanzi/blob/master/License.md).

---

> Part of the code in this project was generated with AI (Claude Opus 4.8).
