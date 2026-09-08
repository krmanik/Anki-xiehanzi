# Shop product pictures

One image per product on `/shop`, named by the product's `image` field in
`static/data/shop.json` (which is the product id plus `.jpg`).

They are **card screenshots taken from Anki itself**, not mockups:

```bash
node premium/run.mjs build.ts --levels 1 --audio   # then import into the open profile
npm run build:radical-deck                          # then import dist-decks/…-Radicals.apkg
npm run shoot:card-previews                         # needs Anki running + AnkiConnect
```

`SHOP_TILES` in `scripts/shoot-card-previews.mjs` maps a shot to a product and
copies it here. Expected files:

| file | shot |
| --- | --- |
| `hsk-word-decks.jpg` | `premium-recognition-back` |
| `kangxi-radicals.jpg` | `radicals-recognize-back` |
| `cloze-sentences.jpg` | no deck wired up yet — add a set to `SETS` |
| `printables.jpg` | not a card; a photo or a PDF page render |

A missing file is a normal state: the card falls back to a generated tile
(the product's glyph on a tinted ground), so the grid never shows a broken
image. Dropping the file in here is the whole change — no code edit.
