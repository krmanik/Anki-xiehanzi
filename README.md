# 📚 Anki-xiehanzi (写汉字)

**Pre-built HSK 1-6 Anki flashcard decks** with stroke order animations, audio pronunciation, part-of-speech color coding, and 9 card types for comprehensive Mandarin Chinese learning.

## Quick Start

### Option 1: Download Pre-built Decks (Recommended)

1. Visit the [GitHub Releases](https://github.com/tzoalli/Anki-xiehanzi/releases) page
2. Download the HSK level you want (HSK_1.apkg through HSK_6.apkg)
3. Import into Anki (File → Import, or double-click the .apkg file)

### Option 2: Build Locally

#### Step 1: Prepare HSK 3.0 Wordlists

Create a `wordlists/` directory and add your HSK 3.0 vocabulary files in CSV format:

```csv
Simplified,Traditional,Pinyin,Definition,PartOfSpeech,HSKLevel
你，你，ni3,you;thou,pronoun,1
好，好，hao3,good;well,adjective,1
```

**File Naming:** Place files in `wordlists/` with names like:
- `HSK_1.csv`, `HSK_2.csv`, etc. (preferred)
- `HSK1.csv`, `HSK2.csv`, etc.
- `hsk1.csv`, `hsk2.csv`, etc.

The script auto-detects CSV format and parses the columns automatically.

#### Step 2: Build the Decks

```bash
npm install
npm run build
```

Decks will be generated in the `dist/` folder.

## Card Types Included

Each deck contains **9 different card presets** for comprehensive learning. All fields are available in every card - you can customize visibility in Anki's "Manage Note Types" menu.

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

### ✨ 9 Card Types
Comprehensive learning approach with different card presets for recognition, production, reading, writing, and context-based learning.

### 🎨 Part-of-Speech Color Coding
Words are color-coded by grammatical category (12 categories):

- 🔵 **Nouns** (名词) - Blue
- 🔷 **Pronouns** (代词) - Sky Blue  
- 🟢 **Verbs** (动词) - Dark Green
- 🟩 **Auxiliary Verbs** (助动词) - Mint
- 🔴 **Numerals** (数词) - Red
- 🟡 **Adjectives** (形容词) - Yellow
- 🟣 **Measure Words** (量词) - Purple
- 🟢 **Adverbs** (副词) - Lime
- 🔷 **Prepositions** (介词) - Teal
- 🟠 **Conjunctions** (连词) - Orange
- ⚫ **Particles** (助词) - Grey
- 🩷 **Interjections** (叹词) - Pink

### 🎯 Additional Features

- ✅ **Tone diacritic borders** - Visual tone indicators on characters
- ✅ **Stroke order animations** - Interactive Hanzi Writer integration with animate & quiz modes
- ✅ **Audio pronunciation** - Built-in audio player using Youdao TTS
- ✅ **Pinyin & Zhuyin** - Both phonetic systems included
- ✅ **Field toggle buttons** - Monochrome and no-diacritics modes on each card
- ✅ **Example sentences** - Context learning support
- ✅ **Cloze deletion** - Fill-in-the-blank cards
- ✅ **Night mode optimized** - Colors adjusted for dark theme

## Customizing Cards in Anki

All cards include 15 fields. To customize what you see:

1. In Anki, go to **Tools** → **Manage Note Types**
2. Select your HSK deck's note type
3. Click **"Fields..."** to show/hide specific fields
4. Click **"Cards..."** to modify front/back templates

### Toggle Buttons on Cards
Each card includes buttons to:
- **Monochrome** - Remove PoS colors for focused practice
- **No Diacritics** - Hide tone marks for challenge mode

## CSV Format Specification

For best results, use this CSV format for your wordlists:

```csv
Simplified,Traditional,Pinyin,Definition,PartOfSpeech,HSKLevel
你，你，ni3,you;thou,pronoun,1
好，好，hao3,good;well,adjective,1
学习，學習，xue2xi2,to study;to learn,v,1
```

**Required columns:**
- `Simplified` - Simplified Chinese characters
- `Traditional` - Traditional Chinese characters (can be same as Simplified)
- `Pinyin` - Pinyin with tone numbers (e.g., `ni3`, `hao3`)
- `Definition` - English meaning(s), semicolon-separated
- `PartOfSpeech` - One of: `n`, `pron`, `v`, `aux`, `num`, `adj`, `mw`, `adv`, `prep`, `conj`, `part`, `int`
- `HSKLevel` - HSK level 1-6

**Optional columns for advanced features:**
- `ExampleSentences` - Example sentences in Chinese
- `ExampleTranslation` - English translation of examples

## Data Sources

- **Hanzi Writer** - Stroke order animation data
- **Youdao Dictionary** - Audio pronunciation
- **User-provided wordlists** - HSK 3.0 vocabulary

## License

GPL-3.0 License

## Contributing

Contributions welcome! Open an issue or PR on [GitHub](https://github.com/tzoalli/Anki-xiehanzi).
