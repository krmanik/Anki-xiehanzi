# Zhōngwén de zhōngwén (中文的中文)

**Pre-built HSK 1-9 Anki flashcard decks** 
1. stroke order animations
2. audio pronunciation
3. part-of-speech color coding
4. 9 card types for comprehensive Mandarin Chinese learning.

## Quick Start

### Option 1: Download Pre-built Decks (Recommended)

1. Visit the [GitHub Releases](https://github.com/tzoalli/ZhongwenDeZhongwen) page
2. Download the deck for the HSK level you want (1,2,3,4,5,6,7-9) or a full deck containing all levels
3. Import into Anki

### Option 2: Build Locally

#### Step 1: Build the decks

```bash
npm install
npm run build
```

Decks will be generated in the `dist/` folder according to the content in `wordlists/`

## Card Types Included

Each deck contains **9 different card presets** for comprehensive learning. 

| Card Type | Front (Question) | Back (Answer) | Purpose |
|-----------|-----------------|---------------|---------|
| **Beginner** | Simplified character | Traditional + Pinyin + Zhuyin + Meaning + Stroke Animation | Basic recognition with full info |
| **Intermediate** | Simplified + Traditional | Pinyin + Zhuyin + Meaning + PoS | Character comparison |
| **Reading** | Simplified + Traditional | Pinyin + Zhuyin + Meaning | Reading comprehension |
| **Writing** | Meaning + Pinyin | Simplified + Traditional + Stroke Animation | Production practice |
| **Example Sentences** | Simplified + Example sentence | All info + Translation + Audio | Context learning |
| **HSK Exam** | Pinyin + Meaning | Simplified + Traditional + PoS | Exam-style recall |
| **Production** | Meaning + PoS | Simplified + Traditional + Pinyin + Zhuyin + Stroke | Active recall |
| **Cloze Deletion** | Sentence with blanked word | Full sentence + Answer | Context mastery |
| **Traditional Recognition** | Traditional character | Simplified + Pinyin + Zhuyin + Meaning | Traditional to Simplified |

## Features


### 🎨 Part-of-Speech Color Logic (15 Categories)

Words are color-coded by grammatical category following a logical color system:

| # | Color | Chinese | English | Description | Relational Logic |
|---|-------|---------|---------|-------------|------------------|
| 1 |  Blue | 名词 | Nouns | People, places, things, or concepts | **Primary Pillar (Matter)**: The solid, foundational objects of language |
| 2 |  Sky Blue | 代词 | Pronouns | Placeholders like 我 (I) or 这 (this) | **Saturation Shift**: A "lighter," placeholder version of the Noun-Blue |
| 3 |  Dark Green | 动词 | Verbs | Actions or states (e.g., 爱，到) | **Primary Pillar (Energy)**: Movement and the flow of the sentence |
| 4 |  Mint | 助动词 | Auxiliary Verbs | Helpers like 会 (can) or 要 (want) | **Saturation Shift**: Supports main actions; a lighter, secondary Green |
| 5 |  Red | 数词 | Numerals | Numbers and quantities (e.g., 八，千) | **Primary Pillar (Quantity)**: Standalone symbols of pure logic |
| 6 |  Yellow | 形容词 | Adjectives | Descriptive words (e.g., 大，漂亮) | **Primary Pillar (Quality)**: A bright highlight reflecting a noun's state |
| 7 |  Purple | 量词 | Measure Words | Counting units (e.g., 本，个) | **Mix (Red + Blue)**: The bridge connecting a Numeral to a Noun |
| 8 |  Lime | 副词 | Adverbs | Modifiers like 不 (not) or 很 (very) | **Mix (Yellow + Green)**: Sits between Quality and Action |
| 9 |  Teal | 介词 | Prepositions | Relate to location or object (e.g., 对，往) | **Mix (Green + Blue)**: Connects Action to an Object/Location |
| 10 |  Orange | 连词 | Conjunctions | Connectors like 和 (and) or 但是 (but) | **Mix (Red + Yellow)**: The logic (Red) linking Qualities or ideas (Yellow) |
| 11 |  Grey | 助词 | Particles | Grammatical context (e.g., 的，了，吧) | **The Skeleton**: Neutral and colorless; carries no independent meaning |
| 12 |  Pink | 叹词 | Interjections | Sudden emotions like 喂 (hey) or 啊 (ah) | **The Outlier (Emotion)**: Extra-spectral color for words outside logical syntax |
| 13 |  Magenta | 拟声词 | Onomatopoeia | Physical sounds like 哈 (ha) or 哇 (wow) | **The Outlier (Sound)**: Intense extra-spectral color for raw physical sound |
| 14 |  Tan | 前缀 | Prefixes | Structural starts like 第 (No.) or 老 (old) | **The Clay (Raw Material)**: Foundational bits used to shape a word's "Matter" |
| 15 |  Brown | 后缀 | Suffixes | Structural ends like 子，们，or 性 | **The Foundation (Hardened Clay)**: Stabilizing base that anchors a word's category |

**Fallback:** Unknown POS tags display with black text (light mode) or white text (dark mode) with **no background color**.

### Additional Features

- ✅ **Tone diacritic borders** - Visual tone indicators on characters
- ✅ **Stroke order animations** - Interactive Hanzi Writer integration with animate & quiz modes
- ✅ **Audio pronunciation** - Built-in audio player using Youdao TTS
- ✅ **Pinyin & Zhuyin** - Both phonetic systems included
- ✅ **Traditional & Simplified** - Both character sets included
- ✅ **Field toggle buttons** - Monochrome and no-diacritics modes
- ✅ **Example sentences** - Context learning support
- ✅ **Cloze deletion** - Fill-in-the-blank cards
- ✅ **Night mode optimized** - Colors adjusted for dark theme


### Toggle Buttons on Cards
Each card includes toggles to Show/Hide:

- **Traditional** - Traditional character set
- **Pinyin** - Pinyin pronunciation guide
- **Zhuyin** - Zhuyin/Bopomofo pronunciation guide
- **Diacritics** - Tone marks
- **Monochrome** - Part of speech coloring, when on characters willl render according to light or dark mode


## CSV Format Specification

For best results, use this CSV format for your wordlists:

```csv
Simplified,Traditional,Pinyin,Zhuyin,Definition,PartOfSpeech,HSKLevel
你，你，ni3,you;thou,pronoun,1
学习，學習，xue2xi2,to study;to learn,v,1
```

**Required columns:**
- `Simplified` - Simplified Chinese characters
- `Traditional` - Traditional Chinese characters (can be same as Simplified)
- `Pinyin` - Pinyin with tone numbers (e.g., `ni3`, `hao3`)
- `Zhuyin` - 
- `Definition` - English meaning(s), semicolon-separated
- `PartOfSpeech` - One of 15 categories (English or Chinese):
  - `n`/`noun`/`名词`, `pron`/`pronoun`/`代词`, `v`/`verb`/`动词`, `aux`/`auxiliary`/`助动词`, 
  - `num`/`numeral`/`数词`, `adj`/`adjective`/`形容词`, `mw`/`measure`/`量词`, 
  - `adv`/`adverb`/`副词`, `prep`/`preposition`/`介词`, `conj`/`conjunction`/`连词`, 
  - `part`/`particle`/`助词`, `int`/`interjection`/`叹词`, `onom`/`onomatopoeia`/`拟声词`, 
  - `pref`/`prefix`/`前缀`, `suff`/`suffix`/`后缀`
- `HSKLevel` - HSK level 1-9 (updated for HSK 3.0)


## Data Sources

- **Hanzi Writer** - Stroke order animation data
- **Youdao Dictionary** - Audio pronunciation
- **User-provided wordlists** - HSK 3.0 vocabulary

## License

GPL-3.0 License

## Contributing

Contributions welcome! Open an issue or PR on [GitHub](https://github.com/tzoalli/Anki-xiehanzi).
