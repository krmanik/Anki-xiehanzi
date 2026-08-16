#!/usr/bin/env python3
"""
Builds the fonts the PDF exporter embeds, into `static/fonts/`.

    python3 scripts/build_pdf_fonts.py        (npm run build:pdf-fonts)

Needs fontTools (`pip install fonttools`) and only has to be rerun when the HSK
word data changes enough to introduce new characters. The outputs are committed.

Why this exists: a PDF has to carry its own glyphs, and neither font in `fonts/`
covers what the word lists need on its own.

  hsk-cjk.ttf     AR PL KaitiM GB (simplified) merged with AR PL KaitiM Big5
                  (traditional), then cut down to exactly the hanzi, bopomofo
                  and CJK punctuation used by static/data/hsk/*.json. Both faces
                  are Arphic Kai at 1024 upem, so they merge cleanly.
  hsk-latin.ttf   DejaVu Sans, cut down to the Latin characters used — including
                  the macron/caron vowels of tone-marked pinyin, which the Kai
                  faces do not have at all.
  hsk-latin-bold.ttf  the same for DejaVu Sans Bold (titles and table headers).

pdf-lib subsets again when embedding, so the generated PDF only carries the
glyphs of the level being exported.
"""

import glob
import json
import os
import sys
import urllib.request
import tarfile
import tempfile

try:
    from fontTools.merge import Merger
    from fontTools.subset import Options, Subsetter
    from fontTools.ttLib import TTFont
except ImportError:  # pragma: no cover - developer tooling
    sys.exit("build_pdf_fonts: fontTools is required — pip install fonttools")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "static", "fonts")
DATA_GLOB = os.path.join(ROOT, "static", "data", "hsk", "*.json")

# DejaVu is not a repo dependency; fetch the release tarball on demand and cache
# it next to the build outputs so repeat runs are offline.
DEJAVU_URL = "https://registry.npmjs.org/dejavu-fonts-ttf/-/dejavu-fonts-ttf-2.37.3.tgz"
CACHE_DIR = os.path.join(ROOT, "node_modules", ".cache", "hsk-pdf-fonts")

# Characters every export needs regardless of the word data (page numbers,
# separators, the strings the exporter itself writes).
ALWAYS = (
    " !\"#$%&'()*+,-./0123456789:;<=>?@"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`"
    "abcdefghijklmnopqrstuvwxyz{|}~"
    "·–—‘’“”…°"
)


def is_cjk(ch: str) -> bool:
    o = ord(ch)
    return (
        0x2E80 <= o <= 0x2EFF  # CJK radicals
        or 0x3000 <= o <= 0x303F  # CJK punctuation
        or 0x3100 <= o <= 0x312F  # bopomofo
        or 0x31A0 <= o <= 0x31BF  # bopomofo extended
        or 0x30A0 <= o <= 0x30FF  # katakana (the ・ separator)
        or 0x3400 <= o <= 0x4DBF  # ext A
        or 0x4E00 <= o <= 0x9FFF  # unified
        or 0xF900 <= o <= 0xFAFF  # compatibility
        or 0xFF00 <= o <= 0xFFEF  # fullwidth forms
    )


def used_characters() -> set:
    chars = set(ALWAYS)
    files = [f for f in glob.glob(DATA_GLOB) if not f.endswith("index.json")]
    if not files:
        sys.exit("build_pdf_fonts: no data in static/data/hsk — run npm run build:hsk first")
    for path in files:
        with open(path, encoding="utf-8") as fh:
            for entry in json.load(fh):
                for key in ("s", "t", "p", "y", "z", "m"):
                    chars |= set(entry.get(key, ""))
                for reading in entry.get("r", []):
                    for key in ("p", "y", "z", "d"):
                        chars |= set(reading.get(key, ""))
                for value in entry.get("c", []) + entry.get("o", []):
                    chars |= set(value)
    return chars


def dejavu_dir() -> str:
    ttf_dir = os.path.join(CACHE_DIR, "package", "ttf")
    if os.path.isdir(ttf_dir):
        return ttf_dir
    os.makedirs(CACHE_DIR, exist_ok=True)
    print("  fetching DejaVu Sans…")
    with tempfile.NamedTemporaryFile(suffix=".tgz", delete=False) as tmp:
        with urllib.request.urlopen(DEJAVU_URL) as response:
            tmp.write(response.read())
        archive = tmp.name
    with tarfile.open(archive) as tar:
        members = [m for m in tar.getmembers() if m.name.startswith("package/")]
        tar.extractall(CACHE_DIR, members=members)
    os.unlink(archive)
    return ttf_dir


def subset(font: TTFont, text: str, out_path: str) -> None:
    options = Options()
    options.layout_features = ["*"]
    options.notdef_outline = True
    options.drop_tables += ["DSIG"]
    subsetter = Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    font.save(out_path)
    print(f"  {os.path.basename(out_path):20} {os.path.getsize(out_path) / 1024:8.0f} KB")


def main() -> None:
    chars = used_characters()
    cjk = "".join(sorted(c for c in chars if is_cjk(c)))
    latin = "".join(sorted(c for c in chars if not is_cjk(c) and ord(c) > 0x1F))
    print(f"build_pdf_fonts: {len(cjk)} CJK + {len(latin)} Latin characters")

    os.makedirs(OUT_DIR, exist_ok=True)

    merged = Merger().merge(
        [
            os.path.join(ROOT, "fonts", "_GBZenKai-Medium.ttf"),
            os.path.join(ROOT, "fonts", "_ZenKai-Medium.ttf"),
        ]
    )
    covered = set(merged.getBestCmap())
    missing = [c for c in cjk if ord(c) not in covered]
    if missing:
        # Rare orthographic variants; they fall back to .notdef in the PDF.
        print(f"  note: {len(missing)} CJK characters absent from both Kai faces")
    subset(merged, cjk, os.path.join(OUT_DIR, "hsk-cjk.ttf"))

    ttf_dir = dejavu_dir()
    subset(TTFont(os.path.join(ttf_dir, "DejaVuSans.ttf")), latin, os.path.join(OUT_DIR, "hsk-latin.ttf"))
    subset(
        TTFont(os.path.join(ttf_dir, "DejaVuSans-Bold.ttf")),
        latin,
        os.path.join(OUT_DIR, "hsk-latin-bold.ttf"),
    )


if __name__ == "__main__":
    main()
