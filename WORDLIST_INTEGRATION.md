# HSK 3.0 Wordlist Integration Guide

## Summary of Changes

### 1. Removed Unused Dependencies
The following dependencies were removed from `package.json`:
- `chinese-s2t` - Not used in the codebase
- `chinese-to-pinyin` - Custom pinyin conversion already implemented
- `genanki-js` - Not used (using `anki-apkg-export` instead)

**Result:** Reduced package size by ~355 dependencies after `npm prune`.

### 2. Fixed Directory Path Issue
**Problem:** The original code had a hardcoded path `./HSK Wordlist/` with spaces and case-sensitivity issues, looking specifically for "HSK Official With Definitions 2012 L{1-6}.txt" files.

**Solution:** 
- Created flexible `WORDLIST_DIR = './wordlists'` directory
- Added support for multiple file naming conventions
- Auto-detects CSV vs plain text format

### 3. Added HSK 3.0 Wordlist Support

#### Supported Formats:

**CSV Format (Recommended):**
```csv
Simplified,Traditional,Pinyin,Definition,PartOfSpeech,HSKLevel
你，你，ni3,you;thou,pronoun,1
好，好，hao3,good;well,adjective,1
```

**Plain Text Format (Legacy HSK 2012):**
```
你 你 ni3 pronoun you;thou
好 好 hao3 adjective good;well
```

#### Supported File Names:
The build script searches for these patterns (in order):
- `HSK_1.csv`, `HSK_2.csv`, etc. (preferred)
- `HSK1.csv`, `HSK2.csv`
- `hsk1.csv`, `hsk2.csv`
- `HSK_Official_3.0_L1.txt`
- Legacy: `HSK Official With Definitions 2012 L1.txt`

### 4. Enhanced Parser Functions

**New: `parseCSVFormat()`**
- Auto-detects column headers (case-insensitive)
- Flexible column mapping
- Supports both comma and tab delimiters
- Handles missing columns gracefully

**Updated: `loadHSKWords()`**
- Searches multiple file locations and naming patterns
- Auto-detects format based on file extension
- Provides clear error messages with expected file paths

### 5. Updated Documentation
README.md now includes:
- Step-by-step wordlist preparation guide
- Format examples for CSV and plain text
- File naming conventions
- Clear build instructions

## Testing Results

✅ Build succeeds with sample HSK 1-6 data
✅ All 6 levels generate .apkg files successfully
✅ CSV parser correctly processes all fields
✅ Part-of-speech color coding works
✅ Pinyin tone conversion works
✅ Zhuyin conversion works

## How to Add Your HSK 3.0 Wordlists

1. **Create the wordlists directory** (already exists):
   ```bash
   mkdir -p wordlists
   ```

2. **Add your wordlist files** in one of these formats:

   **Option A - CSV (Recommended):**
   ```csv
   Simplified,Traditional,Pinyin,Definition,PartOfSpeech,HSKLevel
   词，詞，ci2,word,noun,1
   语法，語法，yu3fa3,grammar,noun,1
   ```

   **Option B - Plain Text:**
   ```
   词 詞 ci2 noun word
   语法 語法 yu3fa3 noun grammar
   ```

3. **Name your files** using any of these patterns:
   - `HSK_1.csv` through `HSK_6.csv` (recommended)
   - Or any pattern listed above

4. **Build the decks:**
   ```bash
   npm run build
   ```

## Column Requirements for CSV

| Column | Required | Aliases | Description |
|--------|----------|---------|-------------|
| Simplified | Yes | `word`, `hanzi` | Simplified Chinese characters |
| Traditional | No | `traditional` | Traditional characters (defaults to Simplified) |
| Pinyin | Yes | `pinyin` | Pinyin with tone numbers (e.g., `ni3`) |
| Definition | No | `definition`, `meaning` | English definition |
| PartOfSpeech | No | `pos`, `part of speech` | POS code (n, v, adj, etc.) |
| HSKLevel | No | `level`, `hsk` | HSK level 1-6 (defaults to filename) |

## Part-of-Speech Codes

Supported POS codes for color coding:
- `n` - Noun (蓝色)
- `pron` - Pronoun (天蓝色)
- `v` - Verb (深绿色)
- `aux` - Auxiliary Verb (薄荷绿)
- `num` - Numeral (红色)
- `adj` - Adjective (黄色)
- `mw` - Measure Word (紫色)
- `adv` - Adverb (酸橙色)
- `prep` - Preposition (青色)
- `conj` - Conjunction (橙色)
- `part` - Particle (灰色)
- `int` - Interjection (粉色)

## Notes on Incomplete Features

The following features mentioned in comments are NOT yet implemented:
- ❌ Animated stroke order (mentioned in CSS but no Hanzi Writer integration)
- ❌ Audio pronunciation (fields exist but no TTS generation)
- ❌ Example sentences (field exists but not populated)
- ❌ Detailed definitions (separate from SimpleMeaning but not used)
- ❌ 9 card types (only basic card generation, templates not defined)

These would require additional implementation beyond wordlist parsing.
