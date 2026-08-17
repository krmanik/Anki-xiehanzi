# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Three loosely-coupled parts under one repo:

1. **The web app** — a SvelteKit + Vite static site (homepage, docs, and a browser-based deck generator at `/create`). All app code lives in `src/`.
2. **Pre-built Anki decks** — large `*.apkg` files at the repo root, published via GitHub Releases (not built by the web app).
3. **HSK word data** — the `HSK-3.0-words-list` git submodule (`url`: github.com/krmanik/HSK-3.0-words-list). Fixes to word/pinyin/meaning data go to *that* repo, not here.

`main.ipynb` + `HSK Wordlist/` + `card templates/` are the *legacy* offline pipeline that
generated the released `.apkg` files (8 fields: ID, Simplified, Traditional, Pinyin, Zhuyin, PoS,
Meaning, Audio). Released decks are now built by `scripts/build-hsk-decks.mjs`, which runs the web
app's own deck code and carries every field it computes. `HSK Wordlist/` is still the Old HSK 2012
source for `npm run build:hsk`.

## Commands

```bash
npm run build:hsk    # regenerate static/data/hsk/*.json from cedict.db + the word lists
npm run build:hsk-decks  # pre-build one .apkg per HSK level into dist-decks/ (slow: audio)
npm run build:radicals   # regenerate static/data/radicals/ (Wikipedia + cedict + zdic; slow first run)
npm run build:radical-deck  # build dist-decks/Anki-xiehanzi-Kangxi-Radicals.apkg
npm run preview:radical-card # render the cards to dist-decks/radical-card.html (design check)
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
  builder. Two shapes per list: one `.apkg` per HSK level (`--levels`) and one
  holding the whole list with a subdeck per level (`--whole`), the successor to
  what `main.ipynb` used to publish. `/hsk` then hands out a direct download
  instead of making every visitor generate the same deck (and its thousands of
  audio clips) in the browser.
  Notes get four card types — Audio / Meaning / Pinyin / Write (`--cards single`
  for one) — and every field the dictionary layer computes: common meaning, full
  definitions, character breakdown, radical, HSK level, frequency, example
  sentences, audio, stroke practice.
  It runs the *real* browser code (`src/lib/deck.ts` → `buildDeckPackage`) under
  the Node shims in `scripts/lib/node-env.mjs`, which (a) resolve `$app/paths` to
  a stub whose `base` is the absolute path of `static/` and (b) serve every
  resulting `${base}/data/…` fetch from disk. Audio comes off the HSK CDN at
  `--audio-concurrency` (48) in flight and is cached in `.cache/hsk-audio`
  between runs — a full rebuild is ~2 minutes warm; the ~1% of words with no CDN
  clip end up silent (Edge TTS does not work outside a browser). The 31 MB
  stroke-data blob is subset to the characters that deck actually uses.
  Output goes to `dist-decks/` (gitignored — upload as GitHub Release assets,
  see `.github/workflows/build-hsk-decks.yml`); the only committed artefact is
  `static/data/hsk/decks.json`, where the whole-list deck is the entry with
  `level: "all"`.
- **`src/lib/hskDecks.ts`** — the manifest loader plus pure lookup/format
  helpers. A level with no entry falls back to the deck creator, so the manifest
  may lag behind the word lists.
- **`src/lib/hskHandoff.ts`** — the sessionStorage bridge that used to carry a
  level's word list from `/hsk` to `/create`. **Currently has no producer**: the
  HSK export modal is file formats only now (a level's deck is the prebuilt
  download), and `/create` builds HSK levels through its own level picker in
  `WordSourceInput`. The consuming code in `WordSourceInput` /
  `create/+page.svelte` is still wired up, so a new producer would just work.
- Routes: `src/lib/components/DeckLibrary.svelte` holds the merged landing page
  — one level grid per list, each card carrying both the prebuilt `.apkg`
  download and the link into the word-list browser (`#decks` / `#lists` both
  still resolve to it) — rendered by both `/hsk` (canonical) and `/decks` (the
  older URL, kept alive). `src/routes/hsk/[list]/[level]/+page.svelte` is the level browser and
  export. The dynamic route needs explicit `entries()` in its `+page.ts` — the
  site is client-rendered, so the prerenderer cannot crawl to it.

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
    on both sides with the deselected ones simply hidden. Choices are stored per
    side — `localStorage['xhz.hide2.front'|'xhz.hide2.back']`, a comma-separated
    key list. **`SIDEBAR_SCRIPT` seeds that entry from the template's classes on
    first run**, then treats a stored entry as authoritative in both directions
    (it *removes* the template's default classes before applying it) — otherwise
    a part switched on would be re-hidden by the next card, and the first toggle
    would rewrite a list built from nothing. The key is `hide2` because a stored
    `xhz.hide.front` from the build before this one would read as "show
    everything on the front". A row whose part is missing from *this note* (no
    variant forms, say) is hidden on load. Free ships no extras at all — dead
    markup without a panel to work it.
  - **`.ident` collapses when empty.** The identity column is one panel with a
    shadow, and its default state on a question side is every row off, so
    `identCollapseCss` emits one compound selector per side ("all of this side's
    ident parts are hidden → `display: none`"). Plain CSS on purpose: `:has()`
    is not old enough for every Anki webview.
  - **Each switch's `onchange` carries its own code**, like the bar's buttons, and
    `try`/`catch`es storage. Only *restoring* the choices needs `SIDEBAR_SCRIPT`.
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
  · practise writing) is centred between them. Only that centre lane carries
  `data-xhz="buttons"` — hiding the buttons must not take the switch that unhides
  them with it. Tool buttons are neutral (`--soft`/`--muted`), action buttons
  tonal indigo, so the two groups do not read as one. Pure HTML/CSS with
  inline-SVG icons — no Material Icons font, no logo PNGs, unlike the word decks.
  `window.xhzWriterAction` is the one seam between the bar and Hanzi Writer, and
  the buttons check for it rather than assume it (see below).
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
  now records the character each radical is actually spoken through.
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
