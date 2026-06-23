# Zhōngwén de zhōngwén (中文的中文)

**Pre-built HSK 3.0 1-9 Anki flashcard decks** 

## Features
- **Traditional & Simplified** - Both character sets included
- **Stroke order animations** - Interactive Hanzi Writer integration with animate & quiz modes
- **Pinyin & Zhuyin** - Both phonetic systems included
- **Audio pronunciation** - Built-in audio player using Youdao TTS
- **Diacritic borders** - Visual tone indicators on characters
- **Part of speech indicators** - Visual representations of part of speech (General & Specific)
- **Field toggle buttons** - Each card includes toggles to Show/Hide categories
- **Example sentences** - Context learning support
- **Cloze deletion** - Fill-in-the-blank cards

**Toggle Buttons on Cards** 
Each card includes toggles to Show/Hide:
- **Traditional** - Traditional character set 
- **Stroke Order** - Animation of strokes, 1 by 1 in order
- **Pinyin** - Pinyin pronunciation guide
- **Zhuyin** - Zhuyin/Bopomofo pronunciation guide
- **Diacritic Guide** - Tone diacritic borders on characters
- **Part of Speech** - General and Specific Part of Speech indicators, if off characters render according to light or dark mode without icons
- **Grid** - Visual guide for writing exercises, style selectable: 田/米/井/回)
- **Radical** - Radical indicator, when on radical will render on default light or dark mode
- **Hint** - After (User selected) failed strokes on writing box, the correct stroke is shown briefly, default is 2

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

Decks will be generated in the `decks/` folder according to the content in `wordlists/` and `charlists/`

## Card Types Included

Each deck contains **9 different card presets** for comprehensive learning. 

| Card Type | Front | Back |
|-----------|-----------------|---------------|---------|
| **Character Equivalence A** | Simplified | Traditional |
| **Character Equivalence B** | Traditional | Simplified |
| **Character writing practice** | Simplified + Traditional + Stroke Animation + Writing Practice Box| ... |
| **Word writing practice** | Simplified + Traditional + Pinyin + Zhuyin + Stroke Animation + Writing Practice Box| ... |
| **Word recall A** | Simplified + Traditional + Stroke Animation + General Part of Speech + Specific Part of Speech + Diacritic Border | Meaning + Pinyin + Zhuyin |
| **Word recall B** |  Meaning + Pinyin + Zhuyin + Writing Practice Box | Simplified + Traditional + Stroke Animation + General Part of Speech + Specific Part of Speech + Diacritic Border |
| **Sentence Listening** | Audio + Writing Practice Box| ... |
| **Cloze Deletion** | Sentence with blanked word (Simplified + Traditional) + Audio + Writing Practice Box | Solved sentence (Simplified + Traditional) + Pinyin + Zhuyin |

### Part-of-Speech Representation Logic

| Type of Word | General Part of Speech | Description | Format | Tag |
|---|---|---|---|
| Content | 名词<br>Noun | People, places, things, concepts | Blue | `noun` |
| Content | 代词<br>Pronoun | Placeholders for nouns to avoid repetition | Blue Outline | `pronoun` |
| Content | 动词<br>Verb | Actions, states | Green | `verb` |
| Content | 形容词<br>Adjective | Descriptive words | Yellow | `adjective` |
| Content | 副词<br>Adverb | Verb modifiers / Adjective modifiers | Lime | `adverb` |
| Content | 数词<br>Numeral | Numbers, quantities, order | Cardinal: Red<br>Ordinal: Red + 🎯 | `numeral` |
| Content | 像词<br>Sounds as Words | Representations of a sound | Magenta | `sound` |
| Function | 连词<br>Conjunction | Connectors | Orange | `conjunction` |
| Function | 分类词<br>Measure Word | Counting units | Purple | `measure` |
| Function | 介<br>Preposition | Relate to location or object | Teal | `preposition` |
| Function | 助词<br>Particle | Sentence modifiers | Brown | `particle` |
| Function | 缀词<br>Affix | Word modifiers at the start or ends of words | Grey | `affix` |

| General Part of Speech | Specific Part Of Speech | Use | Format | Tag |
|---|---|---|---|
| 名词<br>Noun | 专名<br>Proper Noun | Names of specific people, places or things | Blue + 🎯 | `noun-p` |
| 名词<br>Noun | 方位 / 处所 词<br>Locational/Spatial Noun | Relative directions / Cardinal directions / Spatial References (destination, origin, physical space) | Blue + 🧭 | `noun-l` |
| 名词<br>Noun | 时间词<br>Time Noun | When an action takes place / Duration / Specific points in time. | Blue + ⏳ | `noun-t` |
| 代词<br>Pronoun | 人称代词<br>Personal Pronoun | Substitute for specific people or things | Blue Outline + 🎯 | `pronoun-p` |
| 代词<br>Pronoun | 指示代词<br>Demonstrative Pronoun | Point to specific objects, people, or locations | Blue Outline + 👉 | `pronoun-d` |
| 代词<br>Pronoun | 疑问代词<br>Interrogative Pronoun | Ask questions / represent unknowns | Blue Outline + ? | `pronoun-i` |
| 动词<br>Verb | 能愿 动词<br>Auxiliary Verb | Helper verbs to express capability / possibility / necessity / obligation / willingness | Green Outline | `verb-a` |
| 动词<br>Verb | 存现 动词<br>Existential Verb | Static or instantaneous state of being in a space. | Green + ⏹️ | `verb-e` |
| 动词<br>Verb | 趋向 动词<br>Directional Verb | Dynamic or continuous trajectory of motion through space | Green + ⏩ | `verb-d` |
| 动词<br>Verb | 可分动词<br>Separable Verb | Verb-object compounds that can split apart to insert other words in the middle | Green + ✂️ | `verb-s` |
| 动词<br>Verb | 心理动词<br>Psychological Verb | Internal mental states | Green + ➡️👤 | `verb-p` |
| 动词<br>Verb | 使令动词<br>Causative Verb | Induction of a state of mind, action, or change in another entity | Green + 👤➡️ | `verb-c` |
| 形容词<br>Adjective | 区别词<br>Distinguishing Words | Cannot be preceded by 很 / Cannot serve as predicates | Yellow + 📄 | `adjective-d` |
| 形容词<br>Adjective | 性质形容词<br>Qualitative Adjective | Describe core traits / Adjective acting as noun | Core traits: Yellow + ✨<br>Adjective acting as a noun : Blue Outline Yellow filling | `adjective-q` |
| 像词<br>Sounds as Words | 叹词<br>Interjection | Sudden emotions | Magenta + ! | `sound-i` |
| 像词<br>Sounds as Words | 拟声词<br>Onomatopoeia | Physical sounds | Magenta + 🔊 | `sound-o` |
| 分类词<br>Measure Word | 名分类词<br>Noun Measure Word | To count nouns | Purple outline, blue filling | `measure-n` |
| 分类词<br>Measure Word | 动分类词<br>Verb Measure Word | To count actions | Purple outline, green filling | `measure-v` |
| 助词<br>Particle | 动态助词<br>Aspectual Particle | Status of an action (Completion, Experience, Duration...) | Brown + 📈 | `particle-a` |
| 助词<br>Particle | 语气助词<br>Modal Particle | Tone / Mood / attitude | Brown + 🎭 | `particle-m` |
| 助词<br>Particle | 结构助词<br>Structural Particle | Connect words and indicate grammatical relationships within a phrase | Brown + 🔗 | `particle-s` |
| 缀词<br>(Affix) | 前缀<br>(Prefix) | Modifier at the beginning of a word | Grey + ➡️ | `affix-p` |
| 缀词<br>(Affix) | 后缀<br>(Suffix) | Modifier at the end of a word | Grey + ⬅️ | `affix-s` |

**Fallback:** Unknown tags display with black text (light mode) or white text (dark mode), no icon

#### Supported File Names for wordlists:
The build script searches for these specific files (mind case sensitivity)
For character lists
- `HSK1C.csv`, `HSK2C.csv`, `HSK3C.csv`, `HSK4C.csv`, `HSK5C.csv`,`HSK6C.csv`, `HSK789C.csv`
For word lists
- `HSK1W.csv`, `HSK2W.csv`, `HSK3W.csv`, `HSK4W.csv`, `HSK5w.csv`,`HSK6W.csv`, `HSK789W.csv`

## CSV Format Specification

For best results, use this CSV format for your wordlists:

```csv
Simplified,Traditional,Pinyin,Zhuyin,Definition,PartOfSpeechGeneral,PartOfSpeechSpecific,HSKLevel
你，你，ni3,ㄋㄧˇ,you;thou,代词，疑问代词，1
学习，學習，xue2xi2,ㄒㄩㄝˊ ㄒㄧˊ,to study;to learn,动词，心理动词，1
书，書，shu1,ㄕㄨ,book,名词，普通名词，1
这，這，zhe4,ㄓㄜˋ,this,代词，指示代词，1
在，在，zai4,ㄗㄞˋ,at;in;on,介词，处所介词，1
了，了，le5,ㄌㄜ˙,(completed action),助词，动态助词，1
和，和，he2,ㄏㄜˊ,and;with,连词，并列连词，1
本，本，ben3,ㄅㄣˇ,classifier for books,分类词，名分类词，1
很，很，hen3,ㄏㄣˇ,very,副词，程度副词，1
三，三，san1,ㄙㄢ,said,数词，基数词，1
第一，第一，di4yi1,ㄉ一ˋ 一，first,数词，序数词，1
北京，北京，Bei3jing1,ㄅㄟˇ ㄐㄧㄥ,Beijing,名词，专名，1
上面，上面，shang4mian5,ㄕㄤˋ ㄇ一ㄢ˙,above,名词，方位词，1
现在，現在，xian4zai4,ㄒ一ㄢˋ ㄗㄞˋ,now,名词，时间词，1
我，我，wo3,ㄨㄛˇ,I;me,代词，人称代词，1
哪，哪，na3,ㄋㄚˇ,which,代词，疑问代词，1
能，能，neng2,ㄋㄥˊ,can;able to,动词，能愿动词，1
有，有，you3,ㄧㄡˇ,have;there is,动词，存现动词，1
来，来，lai2,ㄌㄞˊ,come,动词，趋向动词，1
分开，分開，fen1kai1,ㄈㄣ ㄎㄞ,separate,动词，可分动词，1
爱，愛，ai4,ㄞˋ,love,动词，心理动词，1
让，讓，rang4,ㄖㄤˋ,let;allow,动词，使令动词，1
男，男，nan2,ㄋㄢˊ,male,形容词，区别词，1
漂亮，漂亮，piao4liang5,ㄆ一ㄠˋ ㄌ一ㄤˋ,beautiful,形容词，性质形容词，1
哗啦，嘩啦，hua1la1,ㄏㄨㄚ ㄌㄚ，splash,像词，拟声词，1
啊，啊，a5,ㄚ，ah!,像词，叹词，1
的，的，de5,ㄉㄜ˙,(possessive particle),助词，结构助词，1
吗，嗎，ma5,ㄇㄚ，(question particle),助词，语气助词，1
过，過，guo4,ㄍㄨㄛˋ,(experiential aspect),助词，动态助词，1
老-，老-，lao3-,old-(prefix),缀词，前缀，1
-子，-子，-zi5,-(suffix),缀词，后缀，1
```

**Required columns:**

| Column | Required | Description |
|--------|----------|-------------|
| `Simplified` | Yes | Simplified Chinese characters |
| `Traditional` | Yes | Traditional characters with equivalence mapped to Simplified |
| `Pinyin` | Yes | Pinyin with tone numbers (e.g., `ni3`) |
| `Zhuyin` | Yes | Zhuyin with tone markers (e.g., `ㄋㄧˇ`) |
| `Definition` | No | English definition |
| `PartOfSpeechGeneral` | Yes | General Part of Speech tag (see table below) |
| `PartOfSpeechSpecific` | No | Specific Part of Speech tag (see table below) |
| `HSKLevel` | Yes | HSK 3.0 level 1-9 |

## Tests before production

Build succeeds with sample data
.apkg files are generated succesfully
CSV parser correctly processes all fields
Visual coding works for all General and Specific Parts of Speech
Diacritic border shows the right tone
User selected griid is rendered
All toggles produce their intended effect

## Data Sources

- **Hanzi Writer** - Stroke order animation data
- **Youdao Dictionary** - Audio pronunciation
- **User-provided wordlists** - HSK 3.0 vocabulary

## License

GPL-3.0 License

## Contributing

Contributions welcome! Open an issue or PR on [GitHub](https://github.com/tzoalli/Anki-xiehanzi).
