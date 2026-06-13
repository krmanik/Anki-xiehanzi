# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Three loosely-coupled parts under one repo:

1. **The web app** — a SvelteKit + Vite static site (homepage, docs, and a browser-based deck generator at `/create`). All app code lives in `src/`.
2. **Pre-built Anki decks** — large `*.apkg` files at the repo root, published via GitHub Releases (not built by the web app).
3. **HSK word data** — the `HSK-3.0-words-list` git submodule (`url`: github.com/krmanik/HSK-3.0-words-list). Fixes to word/pinyin/meaning data go to *that* repo, not here.

`main.ipynb` + `HSK Wordlist/` + `card templates/` are the offline pipeline that generated the released `.apkg` files — separate from the web app.

## Commands

```bash
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
- **`src/routes/create/+page.svelte`** — the UI (~1600 lines) wiring all of the above: word/paragraph/file input → segmentation → dict lookup → live `CardPreview` → `.apkg` export.

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
