---
title: Contributing
---

<script>
	import { base } from '$app/paths';
</script>

# Contributing

Anki-xiehanzi is free and open source. Fixes, bug reports and features are all
welcome. This page is a quick map; the full guide is in
[CONTRIBUTING.md](https://github.com/krmanik/Anki-xiehanzi/blob/main/CONTRIBUTING.md).

## The three parts

The project is split into three loosely-coupled pieces, and **where your change
goes depends on which one it touches:**

1. **The web app** — the homepage, these docs, and the
   <a href="{base}/create">Create</a> deck generator. SvelteKit + Vite, all under
   `src/`. Bugs and features live in
   [this repo](https://github.com/krmanik/Anki-xiehanzi).
2. **Pre-built decks** — the `.apkg` files on the
   [releases page](https://github.com/krmanik/Anki-xiehanzi/releases), generated
   by an offline pipeline.
3. **HSK word data** — words, pinyin, zhuyin and meanings live in the
   [HSK-3.0-words-list](https://github.com/krmanik/HSK-3.0-words-list) submodule.

> **Wrong word, pinyin, zhuyin or meaning?** Fix it in the
> [HSK-3.0-words-list](https://github.com/krmanik/HSK-3.0-words-list) repo — not
> in the main repo or the deck.

## Reporting a bug

[Search the existing issues](https://github.com/krmanik/Anki-xiehanzi/issues)
first. If it's new, open one with an
[issue form](https://github.com/krmanik/Anki-xiehanzi/issues/new/choose).
For website or generator bugs, include your browser, the steps to reproduce, and
a screenshot if it helps.

## Running the app locally

You need **Node.js 20**.

```bash
git clone --recurse-submodules https://github.com/krmanik/Anki-xiehanzi.git
cd Anki-xiehanzi
npm install
npm run dev          # → http://localhost:5173
```

Useful commands:

```bash
npm run build        # static production build
npm run check        # typecheck (svelte-check)
npm test             # run the test suite
```

If you forgot `--recurse-submodules`, run
`git submodule update --init --recursive` to pull in the word list.

## Opening a pull request

Branch off `main`, make your change, run `npm run check` and `npm test`, then
open a PR against `main`. Describe what changed and why, and link the issue if
you're solving one. A maintainer will review it.

Full details — the generator's layering, byte-pinned card templates, and build
gotchas — are in
[CONTRIBUTING.md](https://github.com/krmanik/Anki-xiehanzi/blob/main/CONTRIBUTING.md)
and
[CLAUDE.md](https://github.com/krmanik/Anki-xiehanzi/blob/main/CLAUDE.md).
