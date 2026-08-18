#!/usr/bin/env python3
"""
Build one audio clip per Mandarin syllable, spoken by Qwen3-TTS, and check that
each one actually says the tone it claims to.

Why per syllable: the HSK CDN has a recording per HSK *word* (~11,000). cedict
has 120,000, so most lookups — 从零开始 among them — have nothing to play. There
are only ~1,600 toned syllables in the whole dictionary, so one clip each covers
every word there will ever be, and the browser assembles words by playing the
syllables back to back.

Two findings decided the shape of this script, both measured rather than assumed:

1. **Feed hanzi, not pinyin.** Asked to read "bā", Qwen renders latin text with
   utterance-final intonation: the f0 falls ~8 semitones, which is a fourth tone.
   Asked to read 八, it holds level (+2.2 st over the syllable). Same for mā/妈
   (-9.9 vs +1.1). So a syllable is recorded through a *character*, and which
   character matters: `say`-era rules apply, since a TTS reads a character with
   its default reading. A character is used only when cedict gives it exactly one
   reading, or when it is a single-character HSK word whose listed pinyin is this
   syllable. Matching any reading of any character would ship 白 bai2 as "bó".

2. **The tone is verified, not trusted.** Every clip's f0 contour is classified
   (see `tone_of_clip`) and compared with the tone it is supposed to have. The
   classifier was calibrated against 300 human HSK recordings whose tone the word
   list states, and agrees with 91% of them (99% on tone 1, 94% tone 2, 84% tone
   3, 88% tone 4) — tone 3 against tone 2 is where it is weakest, because half-third
   tone genuinely looks like a rise. It is therefore a *screen*, not a judge: a
   clip that fails is regenerated through the next candidate character, and one
   that never passes is still written but marked `unverified` in the index, so a
   human can listen to a short list instead of 1,600 files.

Usage:
    # start the Qwen server first (hanzi-slides-svelte/backend/server.py)
    python3 scripts/build_syllable_audio.py [--limit N] [--force] [--server URL]

Output (committed):
    static/data/audio/syllables/<syllable>.mp3    one file per syllable
    static/data/audio/syllables.json              {syl: duration}, plus metadata

Clips cache under .cache/syllable-audio-qwen/, so a rerun is cheap.

Needs: the Qwen TTS server, ffmpeg, and librosa/numpy (the slides project's venv
has both — run this with that interpreter).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "static" / "data" / "cedict.db"
HSK_WORDS = ROOT / "static" / "data" / "hsk_words.json"
OUT_DIR = ROOT / "static" / "data" / "audio"
CLIP_DIR = OUT_DIR / "syllables"
CACHE = ROOT / ".cache" / "syllable-audio-qwen"

VALID = re.compile(r"^[a-z]+[1-5]$")
TONE_MARKS = {"̄": "1", "́": "2", "̌": "3", "̀": "4"}


# ---------------------------------------------------------------------------
# Syllables, and the characters they can be spoken through
# ---------------------------------------------------------------------------

def normalize(reading: str) -> str:
    return reading.lower().replace("u:", "v")


def to_numbered(tone_marked: str) -> str:
    """"ài" -> "ai4"; unmarked is neutral, so "ma" -> "ma5"."""
    tone = "5"
    letters = ""
    for ch in unicodedata.normalize("NFD", tone_marked.lower()):
        if ch in TONE_MARKS:
            tone = TONE_MARKS[ch]
        elif unicodedata.combining(ch):
            continue
        else:
            letters += ch
    return f"{letters.replace('ü', 'v')}{tone}"


def needed_syllables(db: sqlite3.Connection) -> dict[str, int]:
    """Every syllable cedict uses, with how often — commonest recorded first."""
    counts: dict[str, int] = {}
    for (pinyin,) in db.execute("SELECT pinyin FROM cedict"):
        for reading in json.loads(pinyin or "[]"):
            for raw in str(reading).split():
                syllable = normalize(raw)
                # r5 is erhua: it colours the syllable before it, and is never
                # said on its own.
                if VALID.match(syllable) and syllable != "r5":
                    counts[syllable] = counts.get(syllable, 0) + 1
    return counts


def candidate_characters(db: sqlite3.Connection) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """
    syllable -> characters safe to speak it through, commonest first.

    Returns two maps: the *certain* ones (single reading, or the HSK list names
    this as the character's reading) and the *tone-ambiguous* ones — characters
    whose readings differ only in tone (论 lún/lùn, 跑 pǎo/páo, 难 nán/nàn).
    Those are safe **only because the clip's tone is measured afterwards**: when
    every reading shares one base syllable, a clip that carries the right tone is
    the right syllable by construction. Characters whose readings differ in more
    than tone (着 zhāo/zhe/zháo/zhuó) are never used — a tone match there could
    still be the wrong syllable.
    """
    # How ordinary a character is, measured rather than assumed: the number of
    # dictionary words it appears in. It separates cleanly — 车 524, 日 478, 开
    # 527, 小 721 against 砗 2, 鈤 1, 锎 1, 筱 1 — where every other signal fails.
    # cedict's `rank` is NULL for 三, 点 and 二, and its `character` table lists
    # 砗 beside 车, so both would happily hand a syllable to a glyph nobody
    # writes; a voice renders those badly, which is what "开 sounds like ka" was.
    usage: dict[str, int] = {}
    for (word,) in db.execute("SELECT word FROM cedict"):
        for ch in set(word):
            usage[ch] = usage.get(ch, 0) + 1
    ORDINARY = 20
    known = {ch for ch, n in usage.items() if n >= ORDINARY}

    by_rank: dict[str, list[tuple[str, float]]] = {}
    for word, pinyin, rank in db.execute("SELECT word, pinyin, rank FROM cedict"):
        if len(word) != 1:
            continue
        # Case-fold and dedupe first: cedict lists 牛 as ["niu2", "Niu2"], the
        # surname spelled with a capital — one reading written twice.
        readings = {normalize(r) for r in json.loads(pinyin or "[]")}
        if len(readings) != 1:
            continue
        syllable = readings.pop()
        if not VALID.match(syllable):
            continue
        # Commonest first: how many words use the character, then cedict's rank
        # as a tiebreak.
        r = rank if isinstance(rank, int) else 10**6
        by_rank.setdefault(syllable, []).append((word, (-usage.get(word, 0), r)))

    # Ordinary characters, and the rest kept apart: a rare glyph is only ever a
    # last resort, behind even a carrier word, because ri4 spoken through 鈤 is
    # worse than ri4 cut out of 日本.
    out: dict[str, list[str]] = {}
    spare: dict[str, list[str]] = {}
    for syllable, items in by_rank.items():
        ordered = [w for w, _ in sorted(items, key=lambda t: t[1])]
        out[syllable] = [w for w in ordered if w in known][:6]
        spare[syllable] = [w for w in ordered if w not in known][:3]
        if not out[syllable]:
            del out[syllable]

    # Characters whose readings differ only in tone.
    tone_only: dict[str, list[tuple[str, float]]] = {}
    for word, pinyin, rank in db.execute("SELECT word, pinyin, rank FROM cedict"):
        if len(word) != 1:
            continue
        readings = {normalize(r) for r in json.loads(pinyin or "[]")}
        readings = {r for r in readings if VALID.match(r)}
        if len(readings) < 2 or len({r[:-1] for r in readings}) != 1:
            continue
        for syllable in readings:
            tone_only.setdefault(syllable, []).append(
                (word, (-usage.get(word, 0), rank if isinstance(rank, int) else 10**6))
            )
    ambiguous = {s: [w for w, _ in sorted(v, key=lambda t: t[1])[:4]] for s, v in tone_only.items()}

    # The HSK list names a character's *common* reading, which is what a TTS
    # gives it — this is what covers 白 bái, 打 dǎ, 过 guò, 说 shuō.
    for level in json.loads(HSK_WORDS.read_text()).values():
        for entry in level:
            word = entry.get("word", "")
            py = (entry.get("pinyin_tone") or "").strip()
            if len(word) != 1 or not py or " " in py:
                continue
            syllable = to_numbered(py)
            if VALID.match(syllable):
                out.setdefault(syllable, [])
                if word not in out[syllable]:
                    out[syllable].append(word)

    # Being on the HSK list makes a character *eligible* — it is taught, so the
    # voice knows it — but it does not make it the best one to speak the syllable
    # through. Inserting it at the front handed zhu3 to 拄 (1 word) over 主 (528)
    # and sou1 to 艘 over 搜. Commonness decides the order; HSK only gets a
    # character into the running.
    for syllable, words in out.items():
        out[syllable] = sorted(words, key=lambda w: -usage.get(w, 0))[:6]

    return out, ambiguous, spare


def word_carriers(db: sqlite3.Connection) -> dict[str, list[tuple[str, int, str]]]:
    """
    Syllable -> commonest two-character words to speak it inside, as
    (word, position, the other syllable).

    Two syllables need a carrier. A **neutral** one, because no character is
    listed as neutral on its own — 服 is fú, and fu5 exists only inside 衣服. And
    a **tone-ambiguous** one the TTS reads with its other tone: asked for 散 it
    says sǎn, so sàn has to come out of 散步 instead, where the context forces the
    reading.

    The cut is checked by measuring the syllable that is *not* wanted: if that
    piece carries the tone the word says it has, the split landed on the
    boundary.
    """
    best: dict[str, list[tuple[str, int, str, float]]] = {}
    for word, pinyin, rank in db.execute("SELECT word, pinyin, rank FROM cedict"):
        if len(word) != 2:
            continue
        readings = json.loads(pinyin or "[]")
        if not readings:
            continue
        parts = [normalize(p) for p in str(readings[0]).split()]
        if len(parts) != 2 or not all(VALID.match(p) for p in parts):
            continue
        r = rank if isinstance(rank, int) else 10**9
        for position, syllable in enumerate(parts):
            other = parts[1 - position]
            # The check needs the *other* syllable to have a tone to measure.
            if other.endswith("5"):
                continue
            best.setdefault(syllable, []).append((word, position, other, r))
    return {
        s: [(w, p, o) for w, p, o, _ in sorted(v, key=lambda t: t[3])[:3]]
        for s, v in best.items()
    }


# ---------------------------------------------------------------------------
# Tone measurement
# ---------------------------------------------------------------------------

def f0_features(path: Path) -> dict | None:
    """Shape of the syllable's pitch, in semitones around its own median."""
    import librosa

    y, sr = librosa.load(str(path), sr=22050)
    y, _ = librosa.effects.trim(y, top_db=35)
    if len(y) < sr * 0.05:
        return None
    f0, _, _ = librosa.pyin(y, fmin=70, fmax=450, sr=sr, frame_length=1024)
    voiced = f0[~np.isnan(f0)]
    if len(voiced) < 8:
        return None
    semitones = 12 * np.log2(voiced / np.median(voiced))
    # Trim the onset glide; keep almost all of the tail, because a fourth tone
    # does its falling there. (Calibrated: 0.08-0.97 scored best of the trims
    # tried against the human set.)
    n = len(semitones)
    core = semitones[int(n * 0.08):int(n * 0.97)]
    if len(core) < 5:
        core = semitones
    third = max(len(core) // 3, 1)
    a, b, c = core[:third].mean(), core[third:2 * third].mean(), core[2 * third:].mean()
    return {
        "slope": float(c - a),
        "range": float(core.max() - core.min()),
        "dip": float(b - (a + c) / 2),
        "duration": len(y) / sr,
    }


def tone_of_clip(path: Path) -> int | None:
    """1-4 from the contour, or None when there is too little voiced audio."""
    f = f0_features(path)
    if f is None:
        return None
    slope, rng, dip = f["slope"], f["range"], f["dip"]
    if slope < -2.5:
        return 4
    if slope > 3.5:
        return 2
    if rng < 1.8 and abs(slope) < 1.2:
        return 1
    if dip < -0.6:
        return 3
    return 1 if abs(slope) < 1.0 else (2 if slope > 0 else 4)


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------

def synthesize(server: str, text: str, dest: Path) -> bool:
    """One POST /tts, saved as a wav. False on any failure."""
    body = json.dumps({"text": text}).encode()
    request = urllib.request.Request(
        f"{server}/tts", data=body, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            audio = response.read()
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        print(f"    tts failed for {text!r}: {exc}")
        return False
    if len(audio) < 2000:
        return False
    dest.write_bytes(audio)
    return True


def ffmpeg(args: list[str]) -> bool:
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args],
        capture_output=True,
    )
    return result.returncode == 0


def duration(path: Path) -> float:
    """Seconds, or 0 when ffprobe cannot tell — an empty file reports N/A."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)],
        capture_output=True, text=True,
    )
    try:
        value = float(result.stdout.strip())
    except ValueError:
        return 0.0
    return value if np.isfinite(value) else 0.0


def clean(raw: Path, dest: Path) -> bool:
    """Trim the silence around the syllable and even out the level."""
    ok = ffmpeg([
        "-i", str(raw), "-af",
        "silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB:detection=peak,"
        "areverse,silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB:detection=peak,"
        "areverse,dynaudnorm=p=0.9",
        "-ar", "22050", "-ac", "1", "-c:a", "pcm_s16le", str(dest),
    ])
    # A quiet take can be trimmed away to a bare header; keep the untrimmed
    # audio rather than shipping a clip with nothing in it.
    if not ok or duration(dest) <= 0.05:
        ffmpeg(["-i", str(raw), "-af", "dynaudnorm=p=0.9", "-ar", "22050",
                "-ac", "1", "-c:a", "pcm_s16le", str(dest)])
    return dest.exists() and duration(dest) > 0.05


def split_word(clip: Path, position: int, other_tone: int, dest: Path) -> bool:
    """
    Cut a two-syllable word in half and keep the syllable at `position`.

    One argmin is too brittle — a stop consonant inside a syllable is quieter
    than the boundary — so the quietest *several* points in the middle of the
    clip are tried in order, and the first cut whose discarded half carries the
    tone it should is the one that landed on the boundary. Nothing is written
    when none of them does.
    """
    import librosa
    import soundfile as sf

    y, sr = librosa.load(str(clip), sr=22050)
    y, _ = librosa.effects.trim(y, top_db=35)
    if len(y) < sr * 0.3:
        return False
    hop = 256
    rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=hop)[0]
    # A two-syllable word is not always split down the middle — 灾难's boundary
    # sits at 0.3 of the clip — so the window has to be wide.
    lo, hi = int(len(rms) * 0.22), int(len(rms) * 0.85)
    if hi - lo < 4:
        return False
    order = np.argsort(rms[lo:hi])[:12]
    probe = dest.with_suffix(".probe.wav")
    for offset in order:
        cut = int((lo + int(offset)) * hop)
        head, tail = y[:cut], y[cut:]
        if len(head) < sr * 0.12 or len(tail) < sr * 0.12:
            continue
        keep, check = (head, tail) if position == 0 else (tail, head)
        sf.write(str(probe), check, sr)
        heard = tone_of_clip(probe)
        probe.unlink(missing_ok=True)
        if heard != other_tone:
            continue
        sf.write(str(dest), keep, sr)
        if duration(dest) > 0.08:
            return True
    probe.unlink(missing_ok=True)
    return False


def from_carrier(server: str, syllable: str, carriers: list[tuple[str, int, str]],
                 index: dict, spoken_through: dict, unverified: list) -> bool:
    """Speak a word containing this syllable, then cut the syllable out of it."""
    target_tone = int(syllable[-1])
    word = ""
    cut = CACHE / f"{syllable}.wav"
    ok = False
    verified = False
    fallback: tuple[str, bytes] | None = None
    for word, position, other in carriers:
        raw = CACHE / f"{syllable}.carrier.wav"
        if not synthesize(server, word, raw):
            continue
        ok = split_word(raw, position, int(other[-1]), cut)
        raw.unlink(missing_ok=True)
        if not ok:
            continue
        # The boundary is proven by the half thrown away. The half kept is then
        # measured too, but a mismatch there is not fatal: the tone classifier is
        # ~90% against human speech, so refusing every disagreement would drop
        # syllables that are perfectly good — 散 sàn blocks 100 words on its own.
        # Keep the clip, and say so in `unverified`.
        if target_tone == 5 or tone_of_clip(cut) == target_tone:
            verified = True
            break
        if fallback is None:
            fallback = (word, cut.read_bytes())
    if not ok or not verified:
        if fallback is None:
            return False
        word, audio = fallback
        cut.write_bytes(audio)
        unverified.append(syllable)
    final = CLIP_DIR / f"{syllable}.mp3"
    if not ffmpeg(["-i", str(cut), "-af", "dynaudnorm=p=0.9", "-c:a", "libmp3lame",
                   "-b:a", "48k", "-ar", "22050", "-ac", "1", str(final)]):
        return False
    seconds = duration(final)
    if seconds <= 0.05:
        return False
    index[syllable] = round(seconds, 4)
    spoken_through[syllable] = word
    # A neutral syllable has no tone contour to check, so it is never "verified"
    # the way a toned one is; the split check is what stands in for it.
    (CACHE / f"{syllable}.json").write_text(json.dumps(
        {"duration": round(seconds, 4), "char": word, "verified": verified,
         "heard": None, "from": "carrier"}))
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", default="http://localhost:8000")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--only", default="", help="comma-separated syllables, for spot checks")
    args = parser.parse_args()

    CACHE.mkdir(parents=True, exist_ok=True)
    CLIP_DIR.mkdir(parents=True, exist_ok=True)

    db = sqlite3.connect(DB)
    counts = needed_syllables(db)
    candidates, ambiguous, spare = candidate_characters(db)
    carriers = word_carriers(db)

    wanted = sorted(counts, key=lambda s: -counts[s])
    if args.only:
        wanted = [s.strip() for s in args.only.split(",") if s.strip()]
    if args.limit:
        wanted = wanted[: args.limit]

    print(f"syllables wanted: {len(wanted)} · server {args.server}")

    index: dict[str, float] = {}
    spoken_through: dict[str, str] = {}
    unverified: list[str] = []
    missing: list[str] = []
    started = time.time()

    for done, syllable in enumerate(wanted, 1):
        target_tone = int(syllable[-1])
        final = CLIP_DIR / f"{syllable}.mp3"
        meta = CACHE / f"{syllable}.json"

        if not args.force and final.exists() and meta.exists():
            saved = json.loads(meta.read_text())
            index[syllable] = saved["duration"]
            spoken_through[syllable] = saved["char"]
            if not saved.get("verified", True):
                unverified.append(syllable)
            continue

        chars = candidates.get(syllable, [])
        # A character whose readings differ only in tone is allowed here because
        # the clip's tone is measured below: right tone, right syllable.
        tone_checked = [c for c in ambiguous.get(syllable, []) if c not in chars]

        if not chars and not tone_checked:
            # Nothing ordinary to read it from on its own — cut it out of a word,
            # and only then fall back to a character nobody writes.
            if carriers.get(syllable) and from_carrier(
                args.server, syllable, carriers[syllable], index, spoken_through, unverified
            ):
                continue
            chars = spare.get(syllable, [])
            if not chars:
                missing.append(syllable)
                continue

        # **Commonness beats the tone screen.** The classifier is ~91% against
        # human speech, so letting any candidate win on a verified tone hands
        # kai1 to 锎 (californium) and ri4 to 鈤 the one time 开 or 日 is misread —
        # and a voice renders a character nobody writes badly, which is exactly
        # what "开 sounds like ka" was. Only characters the dictionary describes
        # are tried here; the rest wait behind the carrier words.
        best = None  # (char, audio, heard) kept in case nothing verifies
        for char in (chars[:3] + tone_checked[:2]):
            raw = CACHE / f"{syllable}.raw.wav"
            clip = CACHE / f"{syllable}.wav"
            if not synthesize(args.server, char, raw):
                continue
            if not clean(raw, clip):
                continue
            heard = tone_of_clip(clip)
            # Only a character with a certain reading may be kept on a failed
            # tone check; for a tone-ambiguous one the check *is* the proof.
            if best is None and char in chars:
                best = (char, clip.read_bytes(), heard)
            if heard == target_tone or (target_tone == 5 and heard is not None):
                best = (char, clip.read_bytes(), heard)
                break

        raw = CACHE / f"{syllable}.raw.wav"
        raw.unlink(missing_ok=True)
        if best is None:
            # Every candidate was tone-ambiguous and none carried the right tone
            # (asked for 散 the voice says sǎn, but sàn is what 100 words need).
            # The word forces the reading, so try that before giving up.
            if carriers.get(syllable) and from_carrier(
                args.server, syllable, carriers[syllable], index, spoken_through, unverified
            ):
                continue
            missing.append(syllable)
            continue

        char, audio, heard = best
        if heard != target_tone and carriers.get(syllable):
            # The character was read with its other tone (散 as sǎn); the word
            # forces the reading this syllable needs.
            if from_carrier(args.server, syllable, carriers[syllable], index,
                            spoken_through, unverified):
                continue

        clip = CACHE / f"{syllable}.wav"
        clip.write_bytes(audio)
        # 48 kbps mono: a syllable is under half a second, so the whole set is a
        # couple of megabytes, and speech at 22 kHz needs no more.
        if not ffmpeg(["-i", str(clip), "-c:a", "libmp3lame", "-b:a", "48k",
                       "-ar", "22050", "-ac", "1", str(final)]):
            missing.append(syllable)
            continue

        seconds = duration(final)
        verified = heard == target_tone or target_tone == 5
        index[syllable] = round(seconds, 4)
        spoken_through[syllable] = char
        if not verified:
            unverified.append(syllable)
        meta.write_text(json.dumps({"duration": round(seconds, 4), "char": char,
                                    "verified": verified, "heard": heard}))

        if done % 50 == 0:
            rate = (time.time() - started) / done
            left = rate * (len(wanted) - done) / 60
            print(f"  {done}/{len(wanted)} · {rate:.1f}s each · ~{left:.0f} min left")

    # The index is rebuilt from *every* cached clip, not just the ones this run
    # touched: a `--only` or `--limit` run would otherwise publish an index
    # holding those few syllables and drop the rest of the set.
    for meta in CACHE.glob("*.json"):
        syllable = meta.stem
        if syllable in index or not (CLIP_DIR / f"{syllable}.mp3").exists():
            continue
        saved = json.loads(meta.read_text())
        index[syllable] = saved["duration"]
        spoken_through[syllable] = saved["char"]
        if not saved.get("verified", True):
            unverified.append(syllable)

    (OUT_DIR / "syllables.json").write_text(json.dumps({
        "engine": "qwen3-tts",
        "rate": 22050,
        "unverified": sorted(unverified),
        "spokenThrough": spoken_through,
        "syllables": index,
    }))

    total = sum(f.stat().st_size for f in CLIP_DIR.glob("*.mp3"))
    print(f"\nclips: {len(index)} · {total / 1024 / 1024:.2f} MB in {CLIP_DIR.relative_to(ROOT)}/")
    print(f"tone unverified: {len(unverified)}" + (f" — {' '.join(unverified[:20])}" if unverified else ""))
    print(f"no safe character: {len(missing)}" + (f" — {' '.join(missing[:20])}" if missing else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
