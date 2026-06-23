# Zhōngwén de zhōngwén (中文的中文)

**Pre-built HSK 1-9 Anki flashcard decks** 
- **Traditional & Simplified** - Both character sets included
- **Stroke order animations** - Interactive Hanzi Writer integration with animate & quiz modes
- **Pinyin & Zhuyin** - Both phonetic systems included
- **Audio pronunciation** - Built-in audio player using Youdao TTS
- **Tone diacritic borders** - Visual tone indicators on characters
- **Part of speech indicators** - Visual representations of part of speech
- **Field toggle buttons** - Each card includes toggles to Show/Hide categories
- **Example sentences** - Context learning support
- **Cloze deletion** - Fill-in-the-blank cards

**Toggle Buttons on Cards** 
Each card includes toggles to Show/Hide:
- **Traditional** - Traditional character set 
- **Stroke Order** - Animation of strokes, 1 by 1 in order
- **Pinyin** - Pinyin pronunciation guide
- **Zhuyin** - Zhuyin/Bopomofo pronunciation guide
- **Diacritics** - Tone diacritic borders on characters
- **Part of Speech** - Part of speech indicators with coloring for general categories and icons for specific subcategories, if off characters render according to light or dark mode without icons
- **Grid** - Visual guide for writing exercises, style selectable: 田/米/井/回)
- **Radical** - Radical indicator, when on radical will render bolder

## Incomplete Features (in development)

The following features mentioned in comments are NOT yet implemented:
- ❌ Animated stroke order (mentioned in CSS but no Hanzi Writer integration)
- ❌ Audio pronunciation (fields exist but no TTS generation)
- ❌ Example sentences (field exists but not populated)
- ❌ Detailed definitions (separate from SimpleMeaning but not used)
- ❌ Card types (only basic card generation, templates not defined)

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

### Part-of-Speech Color Logic (15 Categories)

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

#### Supported File Names for wordlists:
The build script searches for these patterns (in order):
- `HSK_1.csv`, `HSK_2.csv`, etxc. (preferred)
- `HSK1.csv`, `HSK2.csv`
- `hsk1.csv`, `hsk2.csv`

## CSV Format Specification

For best results, use this CSV format for your wordlists:

```csv
Simplified,Traditional,Pinyin,Zhuyin,Definition,PartOfSpeech,HSKLevel
你，你，ni3,you;thou,pronoun,1
学习，學習，xue2xi2,to study;to learn,v,1
```

**Required columns:**

| Column | Required | Description |
| `HSKLevel` | Yes |HSK 3.0 level 1-9
| `Simplified` | Yes | Simplified Chinese characters |
| `Traditional` | Yes | Traditional characters with equivalence mapped to Simplified |
| `Pinyin` | Yes | Pinyin with tone numbers (e.g., `ni3`) |
| `Zhuyin` | Yes | Zhuyin with tone markers
| `PartOfSpeechGeneral` | Yes | One of 15 supported Part of Speech codes for color coding:
| `PartOfSpeechSpecific` | No | One of 15 supported Part of Speech codes for color coding:
| `Definition` | No | English definition

***Part of speech supported codes:***

| Code | Equivalence | Description |
|`noun` | Noun (名词)| 
|`pronoun` | Pronoun (代词)
|`verb` | Verb (深绿色)
| `auxverb` | Auxiliary Verb (薄荷绿)
| `num` | Numeral (红色)
| `adj` | Adjective (黄色)
| `mw` | Measure Word (紫色)
| `adv` | Adverb (酸橙色)
| `prep` | Preposition (青色)
| `conj` | Conjunction (橙色)
| `part` | Particle (灰色)
| `int` |  Interjection (粉色)

## Tests 

Build succeeds with sample HSK 1-6 data
All levels generate .apkg files successfully
CSV parser correctly processes all fields
Part-of-speech color coding works
Pinyin tone conversion works
Zhuyin conversion works

## Data Sources

- **Hanzi Writer** - Stroke order animation data
- **Youdao Dictionary** - Audio pronunciation
- **User-provided wordlists** - HSK 3.0 vocabulary

## License

GPL-3.0 License

## Contributing

Contributions welcome! Open an issue or PR on [GitHub](https://github.com/tzoalli/Anki-xiehanzi).
