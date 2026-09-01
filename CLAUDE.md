# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Three loosely-coupled parts under one repo:

1. **The web app** — a SvelteKit + Vite static site (homepage, docs, and a browser-based deck generator at `/create`). All app code lives in `src/`.
2. **Pre-built Anki decks** — large `*.apkg` files at the repo root, published via GitHub Releases (not built by the web app).
3. **HSK word data** — the `HSK-3.0-words-list` git submodule (`url`: github.com/krmanik/HSK-3.0-words-list). Fixes to word/pinyin/meaning data go to *that* repo, not here.

`main.ipynb` + `HSK Wordlist/` + `card templates/` are the *legacy* offline pipeline that
generated the released `.apkg` files (8 fields: ID, Simplified, Traditional, Pinyin, Zhuyin, PoS,
Meaning, Audio). Released decks are now built by `scripts/build-hsk-decks.mjs`, which runs the web app's own deck
code and carries every field it computes. `HSK Wordlist/` is still the Old
HSK 2012 source for `npm run build:hsk`.

## Commands

```bash
npm run build:hsk    # regenerate static/data/hsk/*.json from cedict.db + the word lists
npm run build:hsk-decks  # pre-build one .apkg per HSK word list into dist-decks/
npm run build:dict   # regenerate static/data/dict/ (etymology + stroke names)
npm run build:syllables  # regenerate static/data/audio/syllables/*.mp3 (needs the Qwen TTS server + ffmpeg + librosa)
npm run build:radicals   # regenerate static/data/radicals/ (Wikipedia + cedict + zdic; slow first run)
npm run build:radical-deck  # build dist-decks/Anki-xiehanzi-Kangxi-Radicals.apkg
npm run preview:radical-card # render the cards to dist-decks/radical-card.html (design check)
npm run shoot:card-previews  # screenshot a deck's cards from Anki (hand tool; needs Anki + AnkiConnect)
npm run build:pdf-fonts  # regenerate static/fonts/*.ttf (needs python3 + fonttools)
npm run dev          # vite dev server
npm run build        # static build → build/ (adapter-static, SPA fallback 404.html)
npm run preview      # serve the production build
npm run check        # svelte-kit sync + svelte-check (typecheck)
npm test             # vitest run (both projects)
npm run test:watch   # vitest watch
```

Run a single test / project:
```bash
npx vitest run src/lib/tone.test.ts          # one file
npx vitest run --project node                 # fast pure-logic tests only
npx vitest run --project dom                  # jsdom + compiled Svelte tests only
```

Vitest is split into two projects (`vitest.config.ts`):
- **node** — pure logic, no DOM. Includes `src/**/*.test.ts`, excludes `*.svelte.test.ts`.
- **dom** — jsdom + compiled Svelte. Includes `src/**/*.svelte.test.ts`, setup in `src/test/setup.ts`.

Keep pure logic in `*.ts` (testable in the fast `node` project); only component/interaction tests get the `.svelte.test.ts` suffix.

## Deck-generation architecture

The deck generator is the heart of the app. Layering matters because correctness is unit-tested at the pure layer and the exported `.apkg` byte output must not drift.

- **`src/lib/deckTemplate.ts`** — pure. Builds Anki note templates + CSS from a `TemplateOpts`. No genanki-js / sql.js / DOM / `$app/paths`. This is where card layout, element ordering, groups, and per-card-type element styles are computed. Heavily unit-tested.
- **`src/lib/deck.ts`** — the impure orchestrator. Pulls in `genanki-js` (`.apkg` packaging), `sql.js` (dictionary DBs), `jieba-wasm` (segmentation), `@kingdanx/edge-tts-browser` (audio). Re-exports much of `deckTemplate.ts` for back-compat. **Model IDs, templates, and media list must stay identical** — extracted verbatim from the original React `create.tsx`.
- **`src/lib/cardPresets.ts`** — pure data + builder for one-click front/back presets (Beginner / Intermediate / …). Chrome tokens (`CONTROL_BUTTONS_TOKEN`, `SEPARATOR_TOKEN`) default to the back side per Anki convention.
- **`src/lib/tone.ts` / `tonePresets.ts`** — pure tone-color palettes + hanzi/pinyin colorization.
- **`src/lib/cardThemes.ts`** — pure visual theme groups + element-style merging.
- **`src/lib/dict/cedict.ts`** — impure dictionary layer. Loads `cedict.db` + `hsk_sentences.db` (SQLite via sql.js, unzipped from `static/data/*.zip`) plus JSON glosses. Provides lookup, POS, classifiers, HSK level, frequency, per-reading definitions, example sentences.
- **`src/lib/dict/sentences.ts`** — pure example-sentence ranking (difficulty + length score); DB lookup stays in `cedict.ts`.
- **`src/routes/create/+page.svelte`** — the UI orchestrator (~400 lines) wiring all of the above: word/paragraph/file input → segmentation → dict lookup → live `CardPreview` → `.apkg` export. The bulk of the UI lives in extracted components under `src/lib/components/` (`WordSourceInput`, `WordReviewTable`, `CardCustomizer`, `AppearancePanel`, `ExportPreview`, `ExportSuccess`, …).

## HSK browser (`/hsk`)

A separate, much lighter stack from the deck generator — it must never pull the
10 MB `cedict.db.zip` just to show a word list.

- **`scripts/build-hsk-data.mjs`** (`npm run build:hsk`) — offline generator. Reads
  `static/data/cedict.db`, the Old HSK 2012 lists in `HSK Wordlist/`, and the New
  HSK 2025 lists in the submodule, and writes `static/data/hsk/{old|new}-{level}.json`
  plus `index.json`. Committed output; rerun it when any of those sources change.
  Runs on Node's `node:sqlite` and imports `src/lib/dict/pinyinzhuyin.ts` directly
  (Node ≥22 type stripping), so pinyin/zhuyin match the deck pipeline exactly.
- **`src/lib/hsk.ts`** — types, cached JSON loaders, and pure search / sort /
  tone-pairing helpers. Unit-tested.
- **`src/lib/hskExport.ts`** — the one field registry (`EXPORT_COLUMNS`) plus
  pure export builders: CSV, TSV, JSON and real OOXML `.xlsx` / `.docx` (JSZip).
  Every format picks from the same field list, so the picker in the UI means the
  same thing whatever format is selected.
- **`src/lib/hskPdf.ts`** — writes the PDF directly with pdf-lib; no print
  dialog. A PDF carries its own glyphs, so it embeds the subset fonts built by
  `scripts/build_pdf_fonts.py` (merged simplified+traditional Kai for hanzi and
  bopomofo, DejaVu Sans for Latin — the Kai faces have no macron/caron vowels,
  which is why tone-marked pinyin came out blank when the browser printed).
  Text is drawn run by run, one font per run. Columns are sized by measuring
  their widest value (capped), the leftover goes to the wrapping columns, and
  every row is the same height — sized to fit ~85% of rows whole, clamping the
  rest with an ellipsis, so nothing overruns its column. `PDF_FIELDS` layers
  drawing rules (type size, colouring, `wrap` for list-valued columns like part
  of speech) onto `EXPORT_COLUMNS` rather than duplicating it. All of that maths
  is pure and unit-tested.
  The CJK subset is ~4 MB and is fetched only on the first PDF export.
- **`scripts/build-hsk-decks.mjs`** (`npm run build:hsk-decks`) — offline deck
  builder. **One `.apkg` per word list**, holding the whole list with a subdeck
  per level, the successor to what `main.ipynb` used to publish. `/hsk` hands out
  the file directly instead of making every visitor generate the same deck (and
  its ~16,000 audio clips) in the browser.
  **One note and one card per word** — hanzi + audio on the front, everything on
  the back: common meaning (`SimpleMeaning`), full definitions, breakdown,
  radical, HSK level, frequency, example sentences and the stroke-practice grid.
  The released decks' four note types + four subdecks per level (`HSK 1::Audio`,
  `::Meaning`, `::Pinyin`, `::Write`) are gone: they quadrupled the notes and the
  deck tree for the same words, and per-level `.apkg` files are gone with them.
  Card layout is `scripts/lib/deck-layout.mjs`, so the builder and any preview
  script describe the same deck.
  **The card is the app's own design** (`deck.ts` → `deckTemplate.ts` +
  `CONSTANTS.DECK_CSS`) — the `char-card` hanzi, the `modal-footer1` control bar,
  the sidebar of field switches, i.e. what `/create` exports and what the
  released v2.x decks looked like. The premium line's panel layout is a separate
  product; **nothing in `scripts/` reads from `premium/`** and the free deck is
  not a premium subset.
  It runs the *real* browser code (`src/lib/deck.ts` → `buildDeckPackage`) under
  the Node shims in `scripts/lib/node-env.mjs`, which (a) resolve `$app/paths` to
  a stub whose `base` is the absolute path of `static/` and (b) serve every
  resulting `${base}/data/…` fetch from disk.
  **Audio is injected, not left to `deck.ts`.** Its browser path ends in Edge
  TTS, which is a browser API and fails under Node with "the file buffer is
  empty" on every word — a screenful of stack traces and a silent clip. The
  builder passes `getAudio`, which tries, in order: the clip cache in
  `.cache/hsk-audio` (keyed by word; clips from the older url-hash cache are
  moved across on sight) · **the submodule's own `New HSK (2025)/Audio` folder**,
  so a full build of that list needs no network · the CDN, for words the checkout
  has not got (the 2012 list has no folder of its own) · macOS `say` via
  `scripts/lib/say.mjs`, whose output is checked with `afinfo` and transcoded
  with `lame`, because the note names an `.mp3` and a valid-but-silent file
  passes every other test. Every clip in a build is reported by source.
  **Stroke data ships whole, never subset** — see `buildHanziData` in `deck.ts`:
  both list decks claim the media name `_hanzi-writer-data.json`, and Anki keys
  media by name across the collection, so two different subsets would have the
  second import strip characters from the first.
  Output goes to `dist-decks/` (gitignored — upload as GitHub Release assets by
  hand); the only committed artefact is `static/data/hsk/decks.json`, one entry
  per list (`new`, `old`).
- **The v2.3 decks stay linked, not rebuilt, and they live inside the New HSK
  card.** `DeckLibrary`'s `v23` list points at the release assets of the
  four-card-type decks `main.ipynb` built. They are **not** a superseded version
  filed away at the foot of the page: same word list, a different card design —
  every word becomes four cards in four subdecks (meaning · pinyin & zhuyin ·
  audio · writing) — so they sit in the New HSK 2025 card under the one-card deck. People mid-collection
  are also not pushed onto a differently-shaped deck. The "Which list should I
  learn?" comparison stays an always-open section — nobody opens a collapsible to
  find out which of two lists applies to them. Only the 2021 AnkiWeb decks stay
  behind `<details>`.
- **`scripts/shoot-card-previews.mjs`** (`npm run shoot:card-previews`) — a
  hand-run tool, wired into nothing: it asks AnkiConnect for a real note's
  `cardsInfo` — question and answer HTML exactly as Anki built them, card CSS
  included — then shoots each side in headless Chrome with a `<base href>` of
  Anki's own `collection.media`, so fonts, dictionary logos and the Hanzi Writer
  engine resolve as they do in the app. Written for a card gallery on `/hsk`
  that was then dropped (previewing the free deck beside premium argues against
  the sale), so nothing on the site reads its output today; keep it for
  screenshots of a card design without importing an `.apkg` by hand. Three
  details are load-bearing: the page is **never trimmed horizontally** (a card
  centres its hanzi and left-aligns its prose, so trimming to the ink box tips
  the whole card sideways); the wrapper sets a **sans base font**, because
  Anki's reviewer does and Chrome's default is serif; and shots are taken at
  **2×**. It needs Anki running with AnkiConnect and the deck imported into the
  open profile (premium: `node premium/run.mjs build.ts --levels 1 --audio`,
  then import).
- **`src/lib/hskDecks.ts`** — the manifest loader plus pure lookup/format
  helpers, keyed by list. A list with no entry falls back to the deck creator, so
  the manifest may lag behind the word lists.
- **`src/lib/hskHandoff.ts`** — the sessionStorage bridge that used to carry a
  level's word list from `/hsk` to `/create`. **Currently has no producer**: the
  HSK export modal is file formats only now (a level's deck is the prebuilt
  download), and `/create` builds HSK levels through its own level picker in
  `WordSourceInput`. The consuming code in `WordSourceInput` /
  `create/+page.svelte` is still wired up, so a new producer would just work.
- Routes: `src/lib/components/DeckLibrary.svelte` holds the merged landing page,
  ordered **what the project makes first** (radicals · premium · deck creator),
  **the HSK downloads below** — one card per list with a single download button
  and the level chips linking into the word-list browser, not into downloads
  (`#decks` / `#lists` both still resolve to that section) — rendered by both
  `/hsk` (canonical) and `/decks` (the older URL, kept alive). `src/routes/hsk/[list]/[level]/+page.svelte` is the level browser and
  export. The dynamic route needs explicit `entries()` in its `+page.ts` — the
  site is client-rendered, so the prerenderer cannot crawl to it.

## Dictionary (`/dictionary`)

A lookup page in the shape of the hanzi-slides character deck: search a word,
then drill into any character of it.

- **It does pull `cedict.db`** (10 MB zipped), unlike `/hsk` and `/radicals` —
  a dictionary that only knows a word list is not a dictionary. `loadCedict()`
  is kicked off on mount, not on the first keystroke, so the download overlaps
  the reader typing. `hsk_sentences.db` follows lazily, when an entry asks for
  examples.
- **`src/lib/dictionary.ts`** — pure: query classification, ranking, IDS
  parsing, etymology wording, stroke pairing, reading order. Unit-tested
  (`dictionary.test.ts`); it is to the dictionary what `deckTemplate.ts` is to
  the deck.
- **`src/lib/dict/cedict.ts`** gained `searchDictionary`, `wordsContaining` and
  `charactersWithComponent`. Search resolves the query kind itself:
  - hanzi — exact, then prefix, then contains, ranked by frequency;
  - pinyin — an in-memory index of every reading keyed by its **normalized**
    (toneless, spaceless, ü→v) form, built on the first pinyin search from a
    `word,pinyin,rank` projection (~2.3 MB). No SQL `LIKE` can match `nihao`
    against the stored `["ni3 hao3"]`;
  - english — `LIKE` on `eng_Tran` as a coarse filter, scored in JS.
  - **A toneless latin run is searched both ways.** "love" is spellable as
    lo + ve, "long" and "man" are syllables; committing to one reading of the
    query is what makes a dictionary feel broken, so `queryKind` returns `both`
    and the scores settle it.
  - **A word matches on its best reading, not its first**, and hits print every
    reading: cedict's `pinyin` array is not ordered by commonness (分 lists
    fèn first, 女 lists rǔ first). `orderReadings()` puts the reading with the
    fullest sense list first **for display only** — `lookup()` keeps cedict's
    order, because the deck's fields are built from it and must not drift.
  - `eng_Tran` is sometimes the placeholder `#` (龙, 钕 …); the per-reading
    `definitions` are the fallback.
- **`static/data/dict/`** — two committed assets `cedict.db` has no room for,
  built by `npm run build:dict` from the hanzi-slides checkout
  (`--source ~/Desktop/hanzi-slides-svelte`): `etymology.json` (makemeahanzi's
  formation type / hint / semantic + phonetic component, 9,033 chars, 570 KB)
  and `stroke-names.json` + `stroke-types.json` (ordered stroke names per
  character and their glyphs, 6,939 chars). Loaded by `dict/chardata.ts` only
  when a character is first expanded.
- **Stroke animation comes from Hanzi Writer's own CDN**, one file per
  character — the dictionary can be asked about any of 9,500 characters, so
  neither the local 32 MB blob nor the radicals' 214-glyph subset would do.
  Strokes are drawn in the character's **tone colour**.
- **Components:** `/dictionary` (search + word bag) → `WordEntry` (readings,
  senses, chips, character row, sentences, compounds) → `CharacterPanel`
  (writing, structure, components with semantic/phonetic roles, origin, stroke
  sequence, radical → `/radicals`, words with it, characters built from it,
  sentences) → `StrokeAnimation`. A one-character word opens its panel at once
  and the panel drops its own sentence list, so the same examples are not
  printed twice.
- **The word bag is the `hskHandoff` bridge's new producer.** Starred words go
  to sessionStorage via `setPendingWords()` and `/create` picks them up in
  `WordSourceInput` — the consumer had been sitting there with nobody feeding it.
- **Audio has three tiers** (`dict/audio.ts`), because the CDN only covers HSK:
  1. the HSK 2025 recording on jsDelivr — a real speaker, ~11,000 words;
  2. **the syllable sprite** — one clip per Mandarin syllable, scheduled back to
     back, which covers all 120,000 cedict words and every example sentence;
  3. Edge TTS, lazily imported, for anything with no pinyin to work from.
  Deliberately not `deck.ts#playWordAudio`, which drags in genanki-js, sql.js
  and jieba-wasm.
- **Per-syllable audio** (`npm run build:syllables` → one
  `static/data/audio/syllables/<syllable>.mp3` per syllable plus
  `syllables.json`; 1,454 clips, 6 MB, speaking **99.8%** of cedict's words):
  Mandarin has ~1,600 toned syllables in the whole dictionary, so one clip each
  covers every word there will ever be, and the browser plays a word's syllables
  back to back. 从零开始 has no recording of its own and used to make no sound
  outside Edge browsers.
  - **Qwen3-TTS generates the clips**, through the mlx-audio FastAPI server in
    the hanzi-slides project (`backend/server.py`, `POST /tts`). The builder is
    `scripts/build_syllable_audio.py` — Python, not `.mjs`, because the tone
    check below needs librosa.
  - **Feed hanzi, never pinyin.** Asked to read "bā", Qwen renders latin text
    with utterance-final intonation: f0 falls ~8 semitones, which is a fourth
    tone. Asked to read 八, it holds level. Measured, not assumed (bā −7.9 st vs
    八 +2.2; mā −9.9 vs 妈 +1.1).
  - **Which character speaks a syllable is the same problem the radical deck
    has**: a TTS gives a character its default reading, so a character is used
    only when cedict gives it exactly one reading, or when it is a
    single-character HSK word whose listed pinyin is this syllable. Matching any
    reading of any character is what would ship 白 bai2 as "bó". Readings are
    case-folded and deduped first — cedict lists 牛 as `["niu2", "Niu2"]`, one
    reading written twice.
  - **A tone-ambiguous character is admitted only under measurement.** 论 is
    lún/lùn, 跑 pǎo/páo — readings that differ *only* in tone, so a clip carrying
    the right tone is the right syllable by construction. A character whose
    readings differ by more than tone (着 zhāo/zhe/zháo/zhuó) is never used: a
    tone match there could still be the wrong syllable.
  - **What no character can say is cut out of a word.** No character is listed as
    neutral on its own (服 is fú; fu5 exists only inside 衣服), and asked for 散
    the voice says sǎn when 100 words need sàn. So the syllable is taken from the
    commonest two-character word carrying it — 儿子, 石头, 认识, 丈夫, 扩散, 遇难 —
    and **the cut is proved by the half that is thrown away**: if that piece
    carries the tone the word says it has, the split landed on the boundary.
    Several candidate cut points are tried (a stop consonant inside a syllable is
    quieter than the boundary between two) and the window is wide, because 灾难's
    boundary sits at 0.3 of the clip, not the middle.
  - **Every clip's tone is verified, not trusted.** `tone_of_clip` classifies the
    f0 contour (slope, range, dip in semitones around the clip's own median) and
    compares it with the tone the syllable claims. The thresholds are calibrated
    against 300 human HSK recordings whose tone the word list states, and agree
    with 91% of them (99% tone 1, 94% tone 2, 84% tone 3, 88% tone 4); tone 3
    against tone 2 is the weak pair, because half-third tone genuinely rises. So
    it is a **screen, not a judge**: a clip that fails is regenerated through the
    next candidate character, and one that never passes is still written but
    listed under `unverified` in the index — 149 of 1,454, which is about what
    the classifier's own error rate predicts, so it is a listening list, not a
    defect list. `dist-decks/syllable-review.html` (see the build script) plays
    them in a browser.
    Two calibration details that cost real accuracy: the contour's **onset glide
    and final creak are trimmed** (8%/97%), because an isolated tone-1 syllable
    drifts down at the end and a naive classifier called 17 of 48 human tone-1
    clips "tone 4"; and trimming the *tail* symmetrically hides the fourth tone's
    fall, which sent 29 tone-4 clips to "tone 1".
  - **One file per syllable, not one packed sprite.** A browser decodes an audio
    file whole, at the context's sample rate, so a single file of every clip is
    minutes of audio expanded to hundreds of MB of Float32 to say one word. A
    word fetches the three or four small files it needs; decoded clips are kept
    for the session.
  - Playback is Web Audio: every clip is fetched and decoded first, then each
    syllable is scheduled against the context clock rather than fired from a
    timer, which is what makes separate recordings read as one word instead of a
    stutter. `src/lib/syllables.ts` holds the pure half (tone-marked → numbered
    keys, tokenizing, the playback plan) and is unit-tested;
    `dict/syllableAudio.ts` is the impure half.
  - Sentence pinyin keeps arabic digits ("xiàn zài 7 diǎn 30 fēn"), so
    `numberSyllables()` reads one- and two-digit numbers out of the same clips;
    three digits up need 零 placement and stay unknown, which sends the sentence
    to the fallback.
  - An unparseable token is `unknown`, **not dropped** — dropping it would speak
    the word with a hole in it and report success.
- `$app/navigation` and `$app/state` have test stubs beside `appPathsStub.ts`,
  aliased in `vitest.config.ts` — the page keeps its query in the URL.

## Kangxi radicals (`/radicals` + the radical deck)

Same shape as the HSK browser — committed JSON, no `cedict.db` at runtime.

- **`scripts/build-radical-data.mjs`** (`npm run build:radicals`) — merges four
  sources into `static/data/radicals/index.json` plus `glyphs/*.svg` (2,016
  files, ~11 MB, committed):
  `scripts/data/chinese_radicals.json` (the 214 radicals, vendored from the
  hanzi-slides project) · the Wikipedia Kangxi table (Hán-Việt / Hiragana-Romaji
  / Hangul-Romaja / variant + simplified forms) · `cedict.db` (pinyin and a
  short gloss for every example character) · zdic.net (字源演变 and 字形对比 glyph
  SVGs). Network responses cache under `.cache/radicals/`, so only the first run
  is slow (~25 min; zdic 403s anything that is not a browser UA and is crawled
  with a delay). `--no-zdic` builds without the images. It also writes
  `strokes.json` — Hanzi Writer data for the radicals and their variant forms
  (~460 KB), so neither `/radicals` nor the in-browser deck builder pulls the
  32 MB blob to animate 214 glyphs.
  **The "Simplified" column says two opposite things**, and reading both as
  "simplified" made the 儿 card print `simplified 兒` — 兒 is the *traditional*
  form. A bare glyph is the radical's simplified form (見 → 见); `(pr. 兒)` means
  the radical *is* a simplified character and names the traditional one it stands
  in for (7 radicals: 儿 厂 尸 干 广 气 虫). `splitSimplified` files them as
  `simplified` and `traditional`, two fields the card labels separately. The bare
  column also lists *combining* forms that are not simplifications at all (肉 → 月,
  艸 → ⺾, 角 → ⻆, 骨 → ⻣, 糸 → 纟 — 肉, 角 and 骨 were never simplified), so each
  pairing is checked against cedict's own traditional↔simplified columns and
  anything it will not confirm goes to `variants` instead. 21 radicals end up with
  a real `simplified`; before the check they were all sitting in `variants` under
  "also written", which is why the audio resolver's "speak it through the
  simplified form" branch never fired.
  Examples cedict has no reading *or* gloss for (匼, 屰, 韰, 鼧, …) are dropped
  rather than rendered as a bare hanzi between two blanks; every radical still
  keeps at least two.

  **Two things about parsing that table**, both of which corrupted readings that
  then shipped: (a) tags are walked with a scanner that tracks quotes, not
  `/<[^>]+>/` — Wikipedia's `data-mw='{"parts":[…]}'` attributes contain `>`, and
  stopping at the first one left JSON in the cell (radical 13's Hán-Việt read
  `khuynh"}},"i":0}}]}'>quynhkhuynh`); (b) `<br>` becomes ` / ` — two readings in
  one cell were otherwise welded together (`quynhkhuynh`). The Hiragana-Romaji and
  Hangul-Romaja columns hold both forms in one cell, in inconsistent shapes, so
  `splitReading` drops any bracketed alternatives and tells the native reading
  from the romanization **by script** rather than by position.
- **`scripts/build-radical-deck.mjs`** (`npm run build:radical-deck`) — packages
  both editions into `dist-decks/` and writes `static/data/radicals/deck.json`,
  the manifest the site reads, plus `audio.json` (see Audio below;
  `--speech-only` regenerates just that, in a second).
  Each edition is packaged as **two decks with two note types** — `…::Recognize`
  and `…::Write` — so either can be studied or suspended alone; the same note
  fields are written once per deck (214 notes each). *premium*
  (`…-Radicals.apkg`) adds the zdic glyph rows, the radical's zhuyin, what it
  means as a standalone word and the Unicode/Kangxi-block codepoints, and is
  sold on Patreon rather than released. `--edition free|premium` builds one.
  **Each edition is its own note type** (`1969669521` premium / `1969669522`
  free) with its own note guids and deck name — sharing a model id would make
  importing one rewrite the other's card templates.
- **The free deck is generated in the browser** from `/radicals`
  (`RadicalDeckModal` → `src/lib/radicalDeckBuild.ts`): the reader picks cards,
  audio, stroke order, readings, teaching name, examples and tone colours, and
  gets the `.apkg` straight back. The offline free build stays for the release
  asset. `radicalOptions()` in `radicalDeck.ts` is the one place editions and
  switches resolve; free never gets `glyphs`/`asWord` however it is configured.
- **Card order**: genanki-js writes every card `due = 0` and every note
  `sfld = 0`, so an imported deck comes out shuffled and the browser has no sort
  column. `orderByKangxi()` (in `radicalDeck.ts`, shared by both builders)
  rewrites both from the note's `Number` field after `pkg.write()`.
  `notes.sfld` is declared `integer` in Anki's schema, so the number stores as a
  number and sorts numerically — no zero-padding needed.
- **`/radicals` UI**: one "Get the deck" button opens `RadicalDeckModal`, which
  leads with the free-vs-premium comparison table (a reader who only sees a
  download button never learns premium exists), then the build controls. Premium
  is the filled button, the free build the outlined one.
- **`src/lib/radicals.ts`** — types, cached loaders (`index.json`,
  `strokes.json`, `deck.json`), pure filter/sort helpers.
- **`src/lib/radicalDeck.ts`** — pure options, note fields, card templates and
  CSS for the deck, unit-tested (`deckTemplate.ts` is to `deck.ts` what this is
  to the builder scripts). Its model id `1969669521` must stay distinct from the
  HSK note types.
- **Card layout**: the answer opens with one grid — the stroke animation on the
  left, the identity column on the right (glyph, pinyin, meaning, the metadata
  line, the forms, the teaching name and the Hán-Việt/Japanese/Korean readings) —
  then the control bar, then one column of blocks. There is no
  full-width header above the grid and no 中文 row in the readings table: both
  printed the same pinyin a second time.
- **The palette is Material, the layout is panels.** The page is a tinted ground
  (`--bg`), every part of the answer is a raised `--surface` panel with a 16px
  radius and one soft shadow, and each panel carries **one accent colour** on the
  3px rule left of its title (`--acc`, set per `.block--*`: stroke order blue,
  as-a-word teal, evolution orange, regional violet, examples pink). `--p` is the
  indigo the chrome runs on — the metadata pills, the chips, the bar's action
  buttons, the panel checkboxes — with `--p-soft` as its 12% tint. Body text
  stays near-black on near-white; a card of five identical grey hairlines was
  what this replaced. Tone colours are untouched, and stay the only colour on the
  *content*: `.ex-char` deliberately does not take the accent, because the pinyin
  beside it is already tone-coloured.
- **Block titles are labels, not sentences**: `Evolution 字源演变`,
  `Regional forms 字形对比`, `Examples`, `As a word`, `Readings`. English leads
  with the Chinese name as a footnote — a beginner cannot read 字源演变, and the
  same goes for `/radicals` and the deck modal — and they are short enough to
  double as the sidebar's row labels (`PART_LABELS`).
- **The review sidebar (premium only)**: the leftmost tool button in the control
  bar opens a left drawer of
  switches that show and hide parts of the card — stroke order, grid lines,
  glyph, pinyin, zhuyin, meaning, the Kangxi line, other forms, teaching name,
  readings, as-a-word, evolution, regional forms, examples, buttons, codepoints.
  How it hangs together:
  - Every switchable element carries `data-xhz="<key>"`; `PART_LABELS` is the one
    list of keys and their short names, and `radicalCss` generates one
    `.card-body.xhz-h-<key> [data-xhz='<key>'] { display: none }` rule per key.
    `grid` is the exception — it takes the guide lines off the writer box and
    leaves the animation.
  - **Per side, and every field on both sides.** A question side carries the
    whole note too — `extras()` renders the same stack as the answer, minus what
    the question already prints (`FRONT_SKIP`) and minus the writer, which the
    writing front owns in quiz mode — with every extra part **default-hidden via
    an `xhz-h-*` class on `.card-body`**. So the reader can put the pinyin, the
    readings or the examples on a front, the way the HSK deck ships every field
    on both sides with the deselected ones simply hidden. Free ships no extras
    at all — dead markup without a panel to work it.
  - **One storage entry per side, keyed by `data-side`** (`recognize` / `write` /
    `back`), a comma-separated key list under `localStorage['xhz.hide2.<side>']`.
    **Not front/back**: the two question sides hide opposite things (a
    recognition front *prints* the glyph, a writing front *asks* for it), so one
    shared "front" entry had each of them undoing the other's defaults — the
    writing card came up showing the glyph, so pinyin or readings could not be
    switched on without the answer coming with them.
  - **`SIDEBAR_SCRIPT` seeds the entry from the template's classes on first run**,
    then treats a stored entry as authoritative in both directions (it *removes*
    the template's default classes before applying it) — otherwise a part
    switched on would be re-hidden by the next card, and the first toggle would
    rewrite a list built from nothing. The key is `hide2` because a stored
    `xhz.hide.front` from an earlier build would read as "show everything on the
    front". A row whose part is missing from *this note* (no variant forms, say)
    is hidden on load.
  - **A switch means the whole card.** `PART_SELECTORS` names the classes the
    *note's own HTML* uses for the same thing (`.ex-zhuyin`, `.ex-pinyin`,
    `.coll-pinyin`, `.word-pinyin`, `.ex-meaning`, `.word-meaning`), because
    `examplesHtml` / `asWordHtml` build their rows from the fields where no
    `data-xhz` marker can reach. Switching zhuyin off and still reading it under
    every example is the switch lying.
  - **`outline` is a call, not a hide** — like `grid`, it gets no generated CSS
    rule. Its `onchange` toggles the class and then asks the engine
    (`window.xhzWriterAction('outline')`, guarded), and the writer reads the same
    class at boot, so panel and engine cannot disagree. It starts **off on the
    writing front** (tracing is not recall) and on everywhere else, and its
    marker rides on `.writer-wrap`, so the row only exists where a writer does.
    This is the word decks' outline control, which the radical deck was missing.
  - **`window.xhzSync`** collapses a panel a switch has just emptied (the
    identity column, the prompt and the extras wrap are each one surface with a
    shadow, so an empty one is a blank white box). The CSS handles the states
    known in advance — `identCollapseCss` and the `.prompt` rule — and this
    covers the rest, such as a row left on for a part the *next* note has not
    got. Switches call it guarded, so they work the same when it is absent.
  - **`.ident` collapses when empty.** The identity column is one panel with a
    shadow, and its default state on a question side is every row off, so
    `identCollapseCss` emits one compound selector per side ("all of this side's
    ident parts are hidden → `display: none`"). Plain CSS on purpose: `:has()`
    is not old enough for every Anki webview.
  - **Each switch's `onchange` carries its own code**, like the bar's buttons, and
    `try`/`catch`es storage. Only *restoring* the choices needs `SIDEBAR_SCRIPT`.
  - **The drawer carries the branding**: `Anki-xiehanzi` / `Radicals` at the top,
    a "View on GitHub" row (`PROJECT_URL`) at the bottom. It is the only chrome
    with room for a name, and a card otherwise says nothing about where it came
    from. Free has no drawer, so it has neither.
  - Free never gets it however it is configured (`radicalOptions` forces
    `fieldToggles: false`), and it is listed in `premiumExtras()`, the modal's
    comparison table and the manifest's `features.fieldToggles`.
- **Card chrome**: the control bar is the card's one row of controls and sits in
  the card's flow under the top grid, like the word decks' buttons — not pinned
  to the bottom of the webview, where it covered the last row of a long answer.
  It is a **three-lane grid** (`1fr auto 1fr`), each lane always present even
  when empty: the switches panel opens from the left of the card so its button
  sits in the left lane, the dictionary drawer opens from the right so its button
  sits in the right lane, and what the card can *do* (play audio · replay strokes
  · practise writing) is centred between them. **"Buttons" hides the centre lane
  and the lookup button** (both carry `data-xhz="buttons"`) but never the panel
  switch — with that gone there would be nothing left to switch anything back on
  with. **Each button is wrapped in the field it needs** (`{{#Audio}}`,
  `{{#StrokeData}}`): a button that presses to no effect is bad enough, but Anki
  reuses one webview across cards, so a writer button on a card with no writer of
  its own reaches the *previous* card's engine — which is also why
  `WRITER_SCRIPT` nulls `window.xhzWriterAction` before it boots. Tool buttons are neutral (`--soft`/`--muted`), action buttons
  tonal indigo, so the two groups do not read as one. Pure HTML/CSS with
  inline-SVG icons — no Material Icons font, no logo PNGs, unlike the word decks.
  `window.xhzWriterAction` is the one seam between the bar and Hanzi Writer, and
  the buttons check for it rather than assume it (see below).
- **Every control carries `class="tappable"`.** AnkiMobile reads a tap anywhere
  on the card as "show answer" unless the element says otherwise, which is why
  tapping the writing grid flipped the card instead of drawing a stroke; the
  writer's click handler also stops the event for clients with no such rule. The
  grid additionally takes `touch-action: none` so a stroke is not read as a
  scroll. Night mode is matched on **four** selectors (`.card.nightMode`,
  `.card.night_mode`, and both as ancestors): desktop and AnkiDroid spell it
  differently, and the card was staying light on one of them.
- **The dictionary drawer** (`MORE_DRAWER`, both editions, **answers only** — on
  a question side, looking the glyph up would answer the card) is the right-hand
  counterpart of the switches panel: `MORE_LINKS` rendered as text rows (Pleco ·
  zdic · MDBG · HanziCraft · Wiktionary · Youdao · Forvo · Tatoeba), each
  `href`-ing `{{text:Radical}}`. Text, not the word decks' one-PNG-per-site: a
  214-note deck should not carry seven logos to draw a list. Opening it is
  `classList.toggle('xhz-more')` on `.card-body` and nothing else — no script,
  same as the panel.
- **Card scripts are one awaited chain, and templates in a collection are
  sticky.** Anki re-inserts every `<script>` on the card in order and awaits each
  one, so one throw leaves every later script undefined; and **re-importing a
  deck does not update a note type the collection already has**, so a card can
  keep calling into a script that no longer exists no matter how many times the
  deck is imported. Together those produced `Unexpected token '<'` followed by
  `xhzPlayAudio is not defined` on every button. Four rules follow, all
  unit-tested in `radicalDeck.test.ts`:
  1. **A button's `onclick` carries its own code** and calls nothing a script
     defines. Audio works with no script on the card at all; the writer calls go
     through `if(window.xhzWriterAction)`, so a card without the engine does
     nothing rather than throwing. There is no bar script any more — one script
     per side, the writer's.
  2. **No `<script src=…>` in a template.** A missing media file gets Anki's 404
     *page* back, which parses as HTML. `withEngine()` **fetches** the engine and
     checks the bytes for `HanziWriter` before injecting them as an inline
     script, so a wrong file is never parsed as JS; a tag is the fallback for
     clients where `fetch` cannot read media (AnkiDroid, file URLs). Loading is
     shared across cards via `window.xhzEngineLoading`/`xhzEngineQueue` — Anki
     reuses one webview, so only the first card of a session pays.
  3. **The engine has this deck's own media name** (`ENGINE_FILE` =
     `_xhz-hanzi-writer.js`), not the word decks' `_hanzi-writer.min.js`. Anki
     keys media by name across the whole collection, so a shared name meant
     loading whatever another import had left there. Both builders check the
     bytes before packaging it.
  4. **Nothing but JavaScript inside a `<script>`, and no tag-shaped `<` even in
     a comment** — a `<script type="application/json">` throws on eval, and the
     HTML tokenizer has its own rules inside script data. The stroke data rides
     in a hidden `<div id="xhz-stroke-data">`.

  When a card in Anki still misbehaves after a rebuild, the collection is holding
  the old note type: **Tools → Manage Note Types → delete `Kangxi Radical …`**
  (this deletes its notes), then import. Editing the template by hand or
  re-importing will not replace it.
- **`scripts/preview-radical-card.mjs`** (`npm run preview:radical-card`) —
  renders all four sides into `dist-decks/radical-card.html`, one iframe each
  (the card scripts look their grid up by a fixed id). `--radical N`,
  `--edition free`, `--night`. Check design changes here before rebuilding a
  4 MB `.apkg`.
- **`src/lib/radicalDeckBuild.ts`** — the impure half: sql.js + genanki-js +
  JSZip + Edge TTS in the browser. Keep it out of anything the radical page
  imports eagerly (that is why `loadRadicalStrokes` lives in `radicals.ts`).
- Stroke data rides in each note's hidden `StrokeData` field (342 KB across 214
  notes) instead of the shared 32 MB `_hanzi-writer-data.json`, so cards render
  instantly and two decks never fight over one media name.
- Audio: most radicals are not words anyone speaks, so `makeSpeechResolver`
  returns a *ranked list* of characters carrying the same syllable and tone (丨
  gǔn → 滚, 勹 bāo → 包, 車 chē → its own simplified 车), and `clipFor` offers every
  one of them to the HSK audio CDN before synthesizing anything — 丶 zhǔ resolves
  to 主, which the CDN does not have, and to 煮, which it does. Edge TTS **does not
  work under Node** ("the file buffer is empty"), so the last resort is macOS
  `say`, whose output has to be checked: the Siri voices macOS *offers*
  (`Eddy (Chinese (China mainland))`) write a valid 0.01-second file of silence
  until they are downloaded, which is how 56 radicals once shipped silent. So
  `say` runs through the classic voices (Tingting first) and every clip — new or
  cached — is rejected under `MIN_SECONDS` via `afinfo`. Clips cache in
  `.cache/radical-audio/`. Resolving needs `cedict.db`, which the site never
  loads, so the character each radical is spoken through is committed as
  `static/data/radicals/audio.json` (written *after* the clips, so it names the
  file the CDN actually has) and the browser builder only looks it up.
  `--speech-only` rewrites just that map and the clip cache.
- **A radical is only ever spoken through a character there is no doubt about.**
  A candidate qualifies two ways: cedict gives it **exactly one reading**, or it
  is a single-character **HSK word whose listed pinyin is the card's reading** (the
  CDN *is* the New HSK 2025 audio set, so its word lists say what each recording
  says — that is what lets 大 dà, 女 nǚ, 色 sè, 血 xuè use their own recordings).
  Matching on *any* cedict reading is what shipped 亅 jué as 脚 "jiǎo", 己 jǐ as 给
  "gěi", 豆 dòu as 读 "dú", 工 gōng as 红 "hóng" and 行 háng as its own "xíng":
  cedict's `pinyin` array is **not** ordered by commonness (女 lists `ru3` first,
  行 lists `heng2` first), and a recording says the common reading. `radical-audio.json`
  is checked the same way — 24 of its hand-written alternatives named a character
  that reads differently (冖 mì → 盖 gài, 卩 jié → 印 yìn, 釆 biàn → 采 cǎi) — and it
  now records the character each radical is actually spoken through. A radical
  with a genuine simplified form is spoken through it (見 → 见, 車 → 车, 魚 → 鱼),
  which only started working once `simplified` stopped being empty — see below.
  After the clips are fetched the build **re-checks every one and refuses to
  package** on a wrong reading, a missing clip, or a file extension Anki will not
  play; that check is why none of the above can come back quietly.
- **`say` writes WAV, transcoded to mp3 when `lame` is installed** — never AAC.
  `say --data-format=aac -o x.m4a` produces valid, correct-length, QuickTime-playable
  files that **Anki plays as silence**, which is how 14 radicals (犬, 竹, 耳, 皿, 缶,
  赤, 鼻, …) shipped with a dead play button. Old `.m4a` clips are read from the
  cache but never written, and the packaging check rejects anything but
  mp3/wav/ogg.

Data assets the app fetches at runtime live in `static/data/` (`cedict.db.zip`, `hsk_sentences.db.zip`, `*.wasm`, `hsk_words.json`, etc.). They are served from `${base}/data/...` — always go through `base` from `$app/paths` because of the GitHub Pages base path (see below).

## Build & config gotchas

These have caused real build hangs/failures — preserve them:

1. **Tailwind v4 must not scan `static/data/` binaries** (multi-MB `.db`/`.zip`/`.wasm` → build hangs on `app.css`). `src/app.css` uses `@import 'tailwindcss' source(none);` with explicit `@source '../src'` and `@source '../node_modules/flowbite-svelte/dist'`. Don't drop `source(none)`.
2. **Deep-import Lucide icons**, never the barrel: `import Download from '@lucide/svelte/icons/download'` (kebab-case). The barrel pulls ~1600 icons (~4000 modules → "stuck" transform). **flowbite-svelte is the opposite** — its per-component subpaths only define a `svelte` export condition (no `default`), so deep imports fail; keep it as the barrel `from 'flowbite-svelte'`.
3. **mdsvex layout needs an absolute path.** `svelte.config.js` passes `fileURLToPath(new URL('./src/lib/components/MarkdownLayout.svelte', ...))` — the `$lib` alias and relative paths both fail from `.md` files.
4. **GitHub Pages base path** — `kit.paths.base` is `/Anki-xiehanzi` in production, `''` in dev. Any reference to a static asset must use `base` from `$app/paths`. Tests stub `$app/paths` via `src/test/appPathsStub.ts` (aliased in `vitest.config.ts`).
5. **Node polyfills** — `vite.config.ts` shims `Buffer`/`process`/`crypto`/`stream`/`path` for genanki-js + sql.js, and excludes `jieba-wasm` from `optimizeDeps`. `.wasm` is in `assetsInclude`.
6. **`.md` is a Svelte route extension** (`extensions: ['.svelte', '.md']`) — docs pages under `src/routes/docs/` are mdsvex markdown.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages (https://krmanik.github.io/Anki-xiehanzi). `test-deploy.yml` runs on PRs.
