# 📚 Anki-xiehanzi (写汉字)

**Pre-built HSK 1-6 Anki flashcard decks** with stroke order, audio, and part-of-speech color coding for learning Mandarin Chinese.

## Quick Start

### Option 1: Download Pre-built Decks (Recommended)

1. Visit the [GitHub Releases](https://github.com/tzoalli/Anki-xiehanzi/releases) page
2. Download the HSK level you want (HSK_1.apkg through HSK_6.apkg)
3. Import into Anki (File → Import, or double-click the .apkg file)

### Option 2: Build Locally

```bash
npm install
npm run build
```

Decks will be generated in the `dist/` folder.

## Card Types Included

Each deck contains 9 different card presets for comprehensive learning:

| Card Type | Front | Back | Purpose |
|-----------|-------|------|---------|
| **Beginner** | Simplified | Pinyin + Simple Meaning | Basic recognition |
| **Intermediate** | Simplified | Traditional + Pinyin + Details | Character comparison |
| **Reading** | Simplified + Pinyin | Simple Meaning | Reading comprehension |
| **Writing** | Simple Meaning | Write Character + Stroke Order | Production practice |
| **Example Sentences** | Simplified | All info + Examples + Audio | Context learning |
| **HSK Exam** | Simplified | Complete information | Comprehensive review |
| **Production** | Meaning + PoS | Character + All details | Active recall |
| **Cloze Deletion** | Sentence with blank | Full sentence + Answer | Context mastery |
| **Traditional Recognition** | Traditional | Simplified + Pinyin | Two-way recognition |
| **Traditional Production** | Simplified + Meaning | Traditional | Writing practice |

## Features

### 🎨 Part-of-Speech Color Coding

Words are color-coded by grammatical category:

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

- ✅ Tone colorization (5 tone colors)
- ✅ Stroke order animations (via Hanzi Writer)
- ✅ Native audio pronunciation (Edge TTS)
- ✅ Radical breakdowns
- ✅ Synonyms & Antonyms
- ✅ Frequency rankings
- ✅ HSK level tagging

## Customizing Cards in Anki

All fields are included in every card. To customize what you see:

1. In Anki, go to **Tools** → **Manage Note Types**
2. Select **"xiehanzi-3.0"**
3. Click **"Fields..."**
4. Click the **eye icon** 👁️ next to any field to show/hide it

This gives you complete control over card appearance without modifying the deck.

## Data Sources

- **CC-CEDICT** - Chinese dictionary (definitions, pronunciations)
- **HSK Wordlists** - Official HSK 1-6 vocabulary lists
- **Hanzi Writer** - Stroke order data
- **Edge TTS** - Text-to-speech audio

## License

GPL-3.0 License - See [License.md](License.md) for details.

## Contributing

Contributions welcome! Suggestions for:
- New card types
- Improved templates
- Additional HSK levels (7-9)
- Better PoS tagging

Open an issue or PR on [GitHub](https://github.com/tzoalli/Anki-xiehanzi).
