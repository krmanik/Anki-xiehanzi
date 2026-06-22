# Direct Method Immersion Tool: Transition Plan

## Executive Summary

This document outlines the transformation of **Anki-xiehanzi** from a translation-based learning tool into a "Direct Method" immersion tool that eliminates English and uses Chinese-to-Chinese (Zh-Zh) definitions, visual scaffolding, and contextual learning.

---

## Design Decisions Summary

### 1. Immersion Philosophy
- **Eliminate all English** from card interfaces
- Replace translations with **Chinese-to-Chinese (Zh-Zh) definitions**
- Use **images/GIFs** for concrete nouns and actions
- Implement **conceptual scaffolding** (equations, synonym scales, radical breakdowns)

### 2. 1:1 Meaning Mapping
- **Split polysemous words** into separate cards (one meaning per card)
- Categorize by **HSK level** to ensure appropriate difficulty progression
- Each card represents a single semantic unit

### 3. Dynamic Part-of-Speech Coloring (12-Color System)

| Color | PoS Category | Chinese | Function |
|-------|--------------|---------|----------|
| Blue | 名词 | Nouns | People, places, things, concepts |
| Sky Blue | 代词 | Pronouns | Replace nouns (我，这，etc.) |
| Dark Green | 动词 | Verbs | Action or state words |
| Mint | 助动词 | Auxiliary Verbs | Helper words (会，能，可以) |
| Red | 数词 | Numerals | Numbers |
| Yellow | 形容词 | Adjectives | Describe nouns |
| Purple | 量词 | Measure Words | Required when counting |
| Lime | 副词 | Adverbs | Modify verbs/adjectives |
| Teal | 介词 | Prepositions | Location, time, direction |
| Orange | 连词 | Conjunctions | Connect words/clauses |
| Grey | 助词 | Particles | Grammatical context (的，了，吧) |
| Pink | 叹词 | Interjections | Emotion/onomatopoeia |

### 4. Controlled Intentional Friction
A toggleable 3-step reveal system:
- **Toggle OFF**: No help available (pure recall)
- **Toggle ON**: Progressive reveal:
  1. Image/Zh-Zh definition
  2. Radical breakdown + Synonyms
  3. External Chinese dictionary link (Zdic, Baidu)

### 5. Icon-Only UI
- Remove all English text labels ("Meaning", "Example", etc.)
- Replace with intuitive SVG icons
- Maintain accessibility through consistent iconography

### 6. Resource Pivot
- **From**: CC-CEDICT (English definitions)
- **To**: 
  - Zdic.net (汉典) - Zh-Zh definitions
  - Baidu Baike - Encyclopedic entries
  - Tatoeba (Chinese-only sentences)
  - Unsplash/Pixabay - Images for concrete concepts

---

## Implementation Work Order

We proceed from **Data Structure** (back-end) → **Processing Logic** (engine) → **Card Interface** (front-end).

---

## Step 1: Data Schema Redefinition (Foundation)

### Objective
Redefine the note type fields to support immersion-first data.

### Current State (from `/workspace/card templates/New/front-xiehanzi-3.0.html`)
```
Current Fields:
- Simplified
- Traditional  
- Pinyin
- Zhuyin
- Meaning (English)
- Audio
```

### Target Schema
```
New Fields:
- Simplified (简化字)
- Traditional (繁體字)
- Pinyin (拼音)
- Zhuyin (注音)
- Definition_ZH (中文释义) - Zh-Zh definition
- PoS_Tag (词性) - ICTCLAS tag for coloring
- HSK_Level (等级) - For sense splitting
- Sense_ID (义项编号) - For polysemy handling
- Media_URL (图片/媒体) - Image/GIF URL
- Radical_Info (部首信息) - Radical + decomposition
- Synonyms_ZH (近义词) - Chinese synonyms
- Antonyms_ZH (反义词) - Chinese antonyms
- Example_Sentence_ZH (例句) - Chinese-only sentence
- Sentence_PoS_Highlight (句内词性标注) - Pre-computed HTML
- Friction_Level (难度等级) - 0-3 for reveal system
- External_Dict_Link (外部词典链接) - Zdic/Baidu URL
```

### Files to Modify
1. `/workspace/src/lib/deckTemplate.ts` - Note type definition
2. `/workspace/src/lib/dict/cedict.ts` - Dictionary lookup interface
3. `/workspace/main.ipynb` - Deck generation script

### Tasks
- [ ] Create new note type schema in `deckTemplate.ts`
- [ ] Add field migration logic for existing decks
- [ ] Update `CedictEntry` interface to include Zh-Zh fields
- [ ] Modify data pipeline to fetch Zh-Zh definitions

---

## Step 2: Processing & Tagging Logic (Engine)

### Objective
Implement the "Sentence Processor" for PoS tagging and sense splitting.

### 2.1 Chinese Segmentation & PoS Tagging

#### Integration Point
Add Jieba or similar segmenter to the processing pipeline.

#### Files to Create/Modify
1. `/workspace/src/lib/posTagger.ts` (NEW) - PoS tagging service
2. `/workspace/src/lib/dict/cedict.ts` - Extend to use PoS data

#### Implementation
```typescript
// posTagger.ts
import { posDisplay } from './dict/cedict';

export interface TokenWithPoS {
  text: string;
  pos: string;           // ICTCLAS tag (e.g., 'v', 'n', 'a')
  posColor: string;      // CSS color class
  posName: string;       // Display name (e.g., '动词')
}

export function tagSentence(sentence: string): TokenWithPoS[] {
  // Use cedict.db PoS data + heuristic fallback
  // Return tokens with color assignments
}

export const POS_COLOR_MAP: Record<string, string> = {
  'n': 'pos-noun',        // Blue
  'r': 'pos-pronoun',     // Sky Blue  
  'v': 'pos-verb',        // Dark Green
  'aux': 'pos-aux-verb',  // Mint
  'm': 'pos-numeral',     // Red
  'a': 'pos-adjective',   // Yellow
  'q': 'pos-measure',     // Purple
  'd': 'pos-adverb',      // Lime
  'p': 'pos-preposition', // Teal
  'c': 'pos-conjunction', // Orange
  'u': 'pos-particle',    // Grey
  'e': 'pos-interjection' // Pink
};
```

### 2.2 Sense Splitter Logic

#### Purpose
Create separate cards for different meanings of polysemous words.

#### Files to Modify
1. `/workspace/src/lib/dict/meta.ts` - Word metadata processing
2. `/workspace/main.ipynb` - Card generation loop

#### Implementation Strategy
```python
# In main.ipynb or equivalent Python processor
def split_word_senses(word_entry):
    """
    Split a word with multiple HSK levels into separate cards.
    Example: 意思 has meanings at HSK 2, 4, and 6
    """
    cards = []
    for reading in word_entry['readings']:
        for hsk_level in reading['hsk_levels']:
            card = {
                'simplified': word_entry['simplified'],
                'traditional': word_entry['traditional'],
                'definition_zh': reading['zh_definition'],
                'pos_tag': reading['dominant_pos'],
                'hsk_level': hsk_level,
                'sense_id': f"{word_entry['simplified']}_{hsk_level}"
            }
            cards.append(card)
    return cards
```

### 2.3 CSS Class Wrapping for Sentences

#### Files to Create
1. `/workspace/card templates/New/styling-pos-colors.css` (NEW)

#### CSS Implementation
```css
/* styling-pos-colors.css */
.pos-noun { color: #2196F3; }        /* Blue */
.pos-pronoun { color: #87CEEB; }     /* Sky Blue */
.pos-verb { color: #2E7D32; }        /* Dark Green */
.pos-aux-verb { color: #69F0AE; }    /* Mint */
.pos-numeral { color: #F44336; }     /* Red */
.pos-adjective { color: #FFEB3B; }   /* Yellow */
.pos-measure { color: #9C27B0; }     /* Purple */
.pos-adverb { color: #CDDC39; }      /* Lime */
.pos-preposition { color: #00BCD4; } /* Teal */
.pos-conjunction { color: #FF9800; } /* Orange */
.pos-particle { color: #9E9E9E; }    /* Grey */
.pos-interjection { color: #E91E63; } /* Pink */

/* Night mode overrides */
.card.night_mode .pos-adjective { color: #FFF59D; }
.card.night_mode .pos-verb { color: #81C784; }
/* ... etc */
```

---

## Step 3: Sourcing & Scraping Pipeline (Fuel)

### Objective
Replace English-language sources with Chinese-only resources.

### 3.1 Tatoeba Integration (Chinese Sentences)

#### Current State
`/workspace/card templates/files/_chinese_sentences.json` contains bilingual sentences.

#### Target
Fetch Chinese-only sentences from Tatoeba API.

#### Files to Create
1. `/workspace/src/lib/dict/tatoeba.ts` (NEW)

```typescript
export interface TatoebaSentence {
  id: number;
  text: string;           // Chinese only
  transcription: string;  // Pinyin
  meaning: string;        // Zh-Zh explanation (if available)
  tags: string[];         // Difficulty, topic, etc.
}

export async function fetchSentencesForWord(word: string, limit: number = 5): Promise<TatoebaSentence[]> {
  const response = await fetch(
    `https://api.tatoeba.org/v1/sentences/search?query=${encodeURIComponent(word)}&language=cmn&limit=${limit}`
  );
  return response.json();
}
```

### 3.2 Zh-Zh Dictionary Parser

#### Sources
- **Zdic.net** (汉典): Comprehensive Zh-Zh definitions with classical references
- **Baidu Baike**: Encyclopedic entries for proper nouns
- **Moedict.tw** (萌典): Clean API for Zh-Zh definitions

#### Files to Create
1. `/workspace/src/lib/dict/zdic.ts` (NEW)

```typescript
export interface ZhZhDefinition {
  word: string;
  definition: string;      // Chinese definition
  examples: string[];      // Classical/literary examples
  radicals: string;        // Radical information
  strokeCount: number;
  variants: string[];      // Variant characters
}

export async function lookupZhZh(word: string): Promise<ZhZhDefinition | null> {
  // Scrape or API call to Zdic.net
  // Parse HTML to extract Zh-Zh definition
}
```

### 3.3 Image/GIF Pipeline

#### Strategy
- Concrete nouns → Static images (Unsplash, Pixabay)
- Actions/verbs → GIFs (Giphy, Tenor)
- Abstract concepts → Visual metaphors or skip

#### Files to Create
1. `/workspace/src/lib/media/imageFetcher.ts` (NEW)

```typescript
export async function fetchImageForConcept(concept: string, posTag: string): Promise<string | null> {
  // Prioritize open APIs (Unsplash, Pixabay)
  // Cache results in /workspace/static/img/
  // Return relative path or null if not found
}
```

---

## Step 4: Card Template Redesign (Interface)

### Objective
Rewrite Anki Front/Back HTML/CSS with icon-only UI and friction controls.

### 4.1 Front Card Template

#### File to Modify
`/workspace/card templates/New/front-xiehanzi-3.0.html`

#### Key Changes
```html
<!-- BEFORE -->
<div id="char_meaning" class="meaning-card">{{Meaning}}</div>
<label for="text-meaning">Meaning</label>

<!-- AFTER -->
<div id="char_definition_zh" class="definition-card">
  {{Definition_ZH}}
  <img src="{{Media_URL}}" class="concept-image" style="display: {{has_image}}"/>
</div>

<!-- Icon-only toggle (no text labels) -->
<input class="tappable" type="checkbox" id="friction-toggle" title="显示提示">
<label for="friction-toggle" class="icon-label">
  <svg><!-- lightbulb icon --></svg>
</label>
```

### 4.2 Back Card Template

#### File to Modify
`/workspace/card templates/New/back.html`

#### 3-Strike Friction Reveal JavaScript
```javascript
// Friction reveal system
let frictionLevel = 0;
const maxFrictionLevel = 3;

function revealNextHint() {
  frictionLevel++;
  switch(frictionLevel) {
    case 1:
      // Show image + Zh-Zh definition
      document.getElementById('hint-layer-1').style.display = 'block';
      break;
    case 2:
      // Show radical breakdown + synonyms
      document.getElementById('hint-layer-2').style.display = 'block';
      break;
    case 3:
      // Show external dictionary link
      document.getElementById('hint-layer-3').style.display = 'block';
      break;
  }
}

// Bind to button
document.getElementById('btnRevealHint').onclick = function() {
  if (frictionLevel < maxFrictionLevel) {
    revealNextHint();
  }
};
```

### 4.3 Icon System

#### Icons to Implement (SVG)
| Function | Icon | Title (tooltip) |
|----------|------|-----------------|
| Definition | 📖 | 释义 |
| Example Sentence | 💬 | 例句 |
| Radical Info | ⺮ | 部首 |
| Synonyms | 🔗 | 近义词 |
| External Dict | 🌐 | 外部词典 |
| Audio | 🔊 | 发音 |
| Stroke Order | ✍️ | 笔顺 |
| Image | 🖼️ | 图片 |

#### Files to Create
1. `/workspace/card templates/files/icons.svg` (NEW) - Sprite sheet

### 4.4 Updated Styling

#### File to Modify
`/workspace/card templates/New/styling.css`

#### Additions
```css
/* Friction reveal layers */
.hint-layer {
  display: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.hint-layer.revealed {
  display: block;
  opacity: 1;
}

/* Concept image styling */
.concept-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  margin: 1rem auto;
  display: block;
}

/* PoS-colored sentence tokens */
.sentence-token {
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
}

/* Icon-only buttons */
.icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}
```

---

## Step 5: Legacy Code Cleanup

### Objective
Remove all English-dependent code paths and unused resources.

### Files to Delete
1. `/workspace/src/lib/dict/cedict.ts` - Remove English definition lookups (or keep for fallback)
2. `/workspace/card templates/files/_chinese_sentences.json` - Replace with Zh-Zh version
3. Any CC-CEDICT parsing logic

### Files to Archive
1. Old card templates (`Card 1` through `Card 5`) → Move to `/workspace/card templates/archive/`
2. Legacy styling files

### Code Paths to Remove
- English translation display logic
- CC-CEDICT gloss extraction
- Bilingual sentence ranking

---

## Testing & Validation Checklist

### Data Layer
- [ ] Zh-Zh definitions load correctly for 100 test words
- [ ] PoS tagging accuracy > 90% on sample sentences
- [ ] Sense splitting creates correct number of cards for polysemous words

### Processing Layer
- [ ] Sentence processor correctly wraps PoS colors
- [ ] Image fetcher returns valid URLs for concrete nouns
- [ ] Tatoeba integration returns relevant sentences

### UI Layer
- [ ] All English text removed from card templates
- [ ] Icons are recognizable and accessible
- [ ] Friction toggle reveals hints in correct sequence
- [ ] PoS colors render correctly in light and dark modes

### Performance
- [ ] Card generation time < 2 seconds per word
- [ ] No blocking network requests during study sessions
- [ ] Offline functionality preserved (cached images/definitions)

---

## Migration Path for Existing Users

### Option 1: Fresh Install
- Download new "Direct Method" deck
- Start fresh with Zh-Zh learning approach

### Option 2: Hybrid Transition
- Keep existing English-definition cards for review
- Generate new Zh-Zh cards for new vocabulary
- Gradually phase out English cards

### Option 3: Field Mapping
- Map old `Meaning` field to new `Definition_ZH`
- Use automated translation as temporary bridge
- Manually curate high-frequency words first

---

## Success Metrics

1. **Comprehension Rate**: Users can understand Zh-Zh definitions without reverting to English
2. **Retention Rate**: Spaced repetition intervals match or exceed English-based cards
3. **User Satisfaction**: Survey scores on immersion effectiveness
4. **Vocabulary Growth**: Words learned per week compared to baseline

---

## Appendix: Resource Links

### Dictionaries
- [Zdic.net (汉典)](http://www.zdic.net/)
- [Moedict.tw (萌典)](https://www.moedict.tw/)
- [Baidu Baike](https://baike.baidu.com/)

### Sentence Corpora
- [Tatoeba (Chinese)](https://tatoeba.org/en/sentences/show_all_in/chinese/eng)
- [Chinese Text Project](https://ctext.org/)

### Image Resources
- [Unsplash](https://unsplash.com/)
- [Pixabay](https://pixabay.com/)
- [Pexels](https://www.pexels.com/)

### Technical References
- [ICTCLAS PoS Tagset](http://ictclas.nlpir.org/)
- [Anki Card Templating](https://docs.ankiweb.net/templates/intro.html)
- [Hanzi Writer](https://hanziwriter.org/)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-06-22 | Initial plan created |

---

*This document serves as the master blueprint for transitioning Anki-xiehanzi into a Direct Method immersion tool. All implementation should reference this plan to maintain consistency with the core design philosophy.*
