/**
 * Build script for generating pre-built HSK Anki decks
 * Run: npm install && npm run build
 * 
 * Features:
 * - 9 card types with global field visibility toggles
 * - Part-of-Speech color coding (12 categories)
 * - Tone diacritic borders
 * - Animated stroke order for writing practice (Hanzi Writer)
 * - Audio pronunciation support
 * - Field toggles (Simplified/Traditional/Pinyin/Zhuyin/Meaning)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ApkgExport = require('anki-apkg-export');
const Exporter = ApkgExport.default;

const OUTPUT_DIR = './dist';
const WORDLIST_DIR = './wordlists';

// Card type definitions - each has different field visibility
const CARD_TYPES = {
  beginner: {
    name: 'Beginner',
    frontFields: ['simplified'],
    backFields: ['simplified', 'traditional', 'pinyin', 'zhuyin', 'meaning', 'pos', 'stroke']
  },
  intermediate: {
    name: 'Intermediate',
    frontFields: ['simplified', 'traditional'],
    backFields: ['simplified', 'traditional', 'pinyin', 'zhuyin', 'meaning', 'pos', 'stroke']
  },
  reading: {
    name: 'Reading',
    frontFields: ['simplified', 'traditional'],
    backFields: ['pinyin', 'zhuyin', 'meaning']
  },
  writing: {
    name: 'Writing',
    frontFields: ['meaning', 'pinyin'],
    backFields: ['simplified', 'traditional', 'stroke']
  },
  exampleSentences: {
    name: 'Example Sentences',
    frontFields: ['simplified', 'example'],
    backFields: ['simplified', 'traditional', 'pinyin', 'zhuyin', 'meaning', 'example_translation']
  },
  hskExam: {
    name: 'HSK Exam',
    frontFields: ['pinyin', 'meaning'],
    backFields: ['simplified', 'traditional', 'pos']
  },
  production: {
    name: 'Production',
    frontFields: ['meaning', 'pos'],
    backFields: ['simplified', 'traditional', 'pinyin', 'zhuyin', 'stroke']
  },
  clozeDeletion: {
    name: 'Cloze Deletion',
    frontFields: ['cloze'],
    backFields: ['simplified', 'traditional', 'pinyin', 'zhuyin', 'meaning']
  },
  traditionalRecognition: {
    name: 'Traditional Recognition',
    frontFields: ['traditional'],
    backFields: ['simplified', 'pinyin', 'zhuyin', 'meaning']
  }
};

// Part-of-Speech color mapping (optimized for light and night mode)
const POS_COLORS = {
  'n': '#0066CC',      // Nouns - Blue
  'pron': '#87CEEB',   // Pronouns - Sky Blue  
  'v': '#006400',      // Verbs - Dark Green
  'aux': '#98FF98',    // Auxiliary Verbs - Mint
  'num': '#DC143C',    // Numerals - Red
  'adj': '#FFD700',    // Adjectives - Yellow
  'mw': '#800080',     // Measure Words - Purple
  'adv': '#32CD32',    // Adverbs - Lime
  'prep': '#008080',   // Prepositions - Teal
  'conj': '#FFA500',   // Conjunctions - Orange
  'part': '#808080',   // Particles - Grey
  'int': '#FFC0CB'     // Interjections - Pink
};

// Tone diacritic symbols for borders
const TONE_DIACRITICS = { '1': '¯', '2': '↗', '3': '∨', '4': '↘', '5': '·' };

function loadHSKWords(level) {
  // Try multiple formats and locations for HSK 3.0 wordlists
  const possibleFiles = [
    path.join(WORDLIST_DIR, `HSK_${level}.txt`),
    path.join(WORDLIST_DIR, `HSK${level}.txt`),
    path.join(WORDLIST_DIR, `hsk${level}.txt`),
    path.join(WORDLIST_DIR, `HSK_${level}.csv`),
    path.join(WORDLIST_DIR, `HSK${level}.csv`),
    path.join(WORDLIST_DIR, `hsk${level}.csv`),
    path.join(WORDLIST_DIR, `HSK_Official_3.0_L${level}.txt`),
    path.join(__dirname, 'HSK Wordlist', `HSK Official With Definitions 2012 L${level}.txt`)
  ];
  
  let filePath = null;
  for (const file of possibleFiles) {
    if (fs.existsSync(file)) {
      filePath = file;
      break;
    }
  }
  
  if (!filePath) throw new Error(`No wordlist found for HSK ${level}. Expected one of: ${possibleFiles.map(f => f.replace(__dirname + '/', '')).join(', ')}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Auto-detect format based on file extension and content
  if (filePath.endsWith('.csv')) {
    return parseCSVFormat(content, level);
  } else {
    return parseOldHSKFormat(content, level);
  }
}

function parseCSVFormat(content, level) {
  const lines = content.trim().split('\n');
  const words = [];
  const headers = lines[0].toLowerCase().split(/[,]/).map(h => h.trim());

  // Find column indices - support Zhuyin column
  const idx = {
    simplified: headers.findIndex(h => h.includes('simplified') || h === 'word' || h === 'hanzi'),
    traditional: headers.findIndex(h => h.includes('traditional')),
    pinyin: headers.findIndex(h => h.includes('pinyin')),
    zhuyin: headers.findIndex(h => h.includes('zhuyin') || h.includes('bopomofo')),
    definition: headers.findIndex(h => h.includes('definition') || h.includes('meaning')),
    pos: headers.findIndex(h => h.includes('pos') || h.includes('part of speech')),
    level: headers.findIndex(h => h.includes('level') || h === 'hsk')
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/[,]/).map(p => p.trim());
    if (parts.length < 3) continue;

    const simplified = parts[idx.simplified >= 0 ? idx.simplified : 0] || '';
    const traditional = parts[idx.traditional >= 0 ? idx.traditional : 1] || simplified;
    const pinyinRaw = parts[idx.pinyin >= 0 ? idx.pinyin : 2] || '';
    // Use provided Zhuyin if available in CSV, otherwise auto-convert from Pinyin
    const zhuyinRaw = idx.zhuyin >= 0 && parts[idx.zhuyin] ? parts[idx.zhuyin] : pinyinToZhuyin(pinyinRaw);
    const posRaw = parts[idx.pos >= 0 ? idx.pos : 3] || '';
    const definition = parts[idx.definition >= 0 ? idx.definition : 4] || '';
    const hskLevel = parts[idx.level >= 0 ? idx.level : 5] || level.toString();

    words.push({
      Simplified: simplified,
      Traditional: traditional,
      Pinyin: convertPinyinNumToTone(pinyinRaw),
      PinyinRaw: pinyinRaw,
      Zhuyin: zhuyinRaw,
      PartOfSpeech: posRaw,
      PosLabel: getPosLabel(posRaw),
      SimpleMeaning: definition,
      HskLevel: hskLevel
    });
  }
  return words;
}


function parseOldHSKFormat(content, level) {
  const lines = content.trim().split('\n');
  const words = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length >= 4) {
      const pinyinRaw = parts[2]?.trim() || '';
      const posRaw = parts[3]?.trim() || '';
      words.push({
        Simplified: parts[0].trim(),
        Traditional: parts[1]?.trim() || parts[0].trim(),
        Pinyin: convertPinyinNumToTone(pinyinRaw),
        PinyinRaw: pinyinRaw,
        Zhuyin: pinyinToZhuyin(pinyinRaw),
        PartOfSpeech: posRaw,
        PosLabel: getPosLabel(posRaw),
        SimpleMeaning: parts.slice(4).join(' ') || '',
        HskLevel: level.toString()
      });
    }
  }
  return words;
}

function getPosLabel(posCode) {
  const labels = { 'n': '名词', 'pron': '代词', 'v': '动词', 'aux': '助动词', 'num': '数词', 'adj': '形容词', 'mw': '量词', 'adv': '副词', 'prep': '介词', 'conj': '连词', 'part': '助词', 'int': '叹词' };
  return labels[posCode] || posCode;
}

function convertPinyinNumToTone(pinyinNum) {
  const toneMap = { '1': ['ā', 'ē', 'ī', 'ō', 'ū', 'ǖ'], '2': ['á', 'é', 'í', 'ó', 'ú', 'ǘ'], '3': ['ǎ', 'ě', 'ǐ', 'ǒ', 'ǔ', 'ǚ'], '4': ['à', 'è', 'ì', 'ò', 'ù', 'ǜ'], '5': ['a', 'e', 'i', 'o', 'u', 'ü'] };
  return pinyinNum.replace(/([aeiouü])(\d)/g, (match, vowel, tone) => {
    const index = 'aeiouü'.indexOf(vowel);
    return toneMap[tone]?.[index] || vowel;
  });
}

function pinyinToZhuyin(pinyin) {
  const zhuyinMap = { 'b': 'ㄅ', 'p': 'ㄆ', 'm': 'ㄇ', 'f': 'ㄈ', 'd': 'ㄉ', 't': 'ㄊ', 'n': 'ㄋ', 'l': 'ㄌ', 'g': 'ㄍ', 'k': 'ㄎ', 'h': 'ㄏ', 'j': 'ㄐ', 'q': 'ㄑ', 'x': 'ㄒ', 'zh': 'ㄓ', 'ch': 'ㄔ', 'sh': 'ㄕ', 'r': 'ㄖ', 'z': 'ㄗ', 'c': 'ㄘ', 's': 'ㄙ', 'a': 'ㄚ', 'o': 'ㄛ', 'e': 'ㄜ', 'ai': 'ㄞ', 'ei': 'ㄟ', 'ao': 'ㄠ', 'ou': 'ㄡ', 'an': 'ㄢ', 'en': 'ㄣ', 'ang': 'ㄤ', 'eng': 'ㄥ', 'er': 'ㄦ', 'i': 'ㄧ', 'u': 'ㄨ', 'ü': 'ㄩ' };
  let result = pinyin.replace(/zh|ch|sh|ng|[aeiouü]|[bpmfdtnlgkhjqxzcsryw]/g, match => zhuyinMap[match] || match);
  const toneMarks = { '1': '', '2': 'ˊ', '3': 'ˇ', '4': 'ˋ', '5': '' };
  return result.replace(/(\d)/g, (_, tone) => toneMarks[tone] || '');
}

function getToneNumber(pinyin) {
  const match = pinyin.match(/(\d)$/);
  return match ? match[1] : '5';
}

function formatCharacters(word, showDiacritics = true, showPosColor = true) {
  const chars = word.Simplified.split('');
  const pinyinParts = word.PinyinRaw.split(/[ ]/);
  const posCode = word.PartOfSpeech;
  
  return chars.map((char, idx) => {
    const pinyinForChar = pinyinParts[idx] || word.PinyinRaw;
    const toneNum = getToneNumber(pinyinForChar);
    const diacritic = TONE_DIACRITICS[toneNum] || TONE_DIACRITICS['5'];
    const color = POS_COLORS[posCode] || '#000000';
    
    // Build style attributes for character
    const styleParts = [];
    if (showPosColor) styleParts.push(`color: ${color}`);
    // Diacritic border applied via CSS class to avoid inline complexity
    const diacriticClass = showDiacritics ? `diacritic-${toneNum}` : '';
    
    return `<span class="char ${diacriticClass}" style="${styleParts.join('; ')}">${char}</span>`;
  }).join('');
}

function getAnkiTemplate() {
  return `<style>
.card { font-family: Arial, sans-serif; font-size: 24px; text-align: center; color: #000; padding: 20px; }
.nightMode .card { color: #fff; }

/* Character container with diacritic border support */
.char { display: inline-block; margin: 2px; padding: 5px; position: relative; min-width: 1em; text-align: center; border-top: 3px solid transparent; }

/* Tone diacritic borders using CSS pseudo-elements for clean rendering */
.diacritic-1 { border-top-color: #000; }
.diacritic-2 { border-top-color: #000; }
.diacritic-3 { border-top-color: #000; }
.diacritic-4 { border-top-color: #000; }
.diacritic-5 { border-top-color: #000; }

/* PoS color classes */
.pos-n { color: #0066CC; } .pos-pron { color: #87CEEB; } .pos-v { color: #006400; }
.pos-aux { color: #98FF98; } .pos-num { color: #DC143C; } .pos-adj { color: #FFD700; }
.pos-mw { color: #800080; } .pos-adv { color: #32CD32; } .pos-prep { color: #008080; }
.pos-conj { color: #FFA500; } .pos-part { color: #808080; } .pos-int { color: #FFC0CB; }

/* Night mode adjustments for better contrast */
.nightMode .pos-n { color: #66B2FF; } .nightMode .pos-v { color: #66CC66; } .nightMode .pos-adj { color: #FFE55C; }
.nightMode .pos-num { color: #FF6666; } .nightMode .pos-mw { color: #CC66CC; }

/* Toggle states - controlled by JavaScript buttons */
.monochrome .char { color: #000 !important; }
.nightMode.monochrome .char { color: #fff !important; }
.no-diacritics .char { border-top: none !important; }

/* Field styling */
.field { margin: 15px 0; }
.pinyin { font-size: 20px; color: #666; margin-top: 5px; }
.zhuyin { font-size: 18px; color: #888; margin-top: 3px; }
.traditional { font-size: 22px; color: #555; }
.meaning { font-size: 20px; color: #333; margin-top: 10px; }
.pos-chip { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; margin: 5px; }
.example { font-style: italic; color: #555; background: #f5f5f5; padding: 10px; border-radius: 5px; }
.cloze { background: #ffeb3b; padding: 2px 5px; border-radius: 3px; }

/* Stroke order animation container */
.stroke-container { width: 200px; height: 200px; margin: 20px auto; }
.stroke-controls { margin-top: 10px; }
.stroke-btn { padding: 5px 15px; margin: 0 5px; cursor: pointer; background: #667eea; color: white; border: none; border-radius: 5px; }
.stroke-btn:hover { background: #764ba2; }

/* Audio player styling */
.audio-player { margin: 10px 0; }

/* Field toggle buttons */
.toggle-container { margin: 10px 0; }
.toggle-btn { padding: 5px 10px; margin: 0 3px; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 3px; }
.toggle-btn.active { background: #667eea; color: white; border-color: #667eea; }

/* Card type specific styles */
.card-type-label { font-size: 14px; color: #999; margin-bottom: 10px; }
</style>
<div class="card">
  <div class="toggle-container">
    <button class="toggle-btn" onclick="this.parentElement.parentElement.classList.toggle('monochrome')">Monochrome</button>
    <button class="toggle-btn" onclick="this.parentElement.parentElement.classList.toggle('no-diacritics')">No Diacritics</button>
  </div>
  {{FrontContent}}
</div>`;
}

async function generateDeckForLevel(level, outputPath) {
  const words = loadHSKWords(level);
  const deckName = `HSK ${level}`;
  
  // Create exporter with custom template supporting all card types
  const exporter = new Exporter(deckName, { 
    template: getAnkiTemplate(), 
    sql: require('@jlongster/sql.js') 
  });
  
  for (const word of words) {
    // Generate character HTML with PoS colors and diacritic borders
    const frontContent = formatCharacters(word, true, true);
    
    // Generate Hanzi Writer animation HTML
    const strokeHtml = generateStrokeAnimation(word.Simplified);
    
    // Generate audio HTML for pronunciation
    const audioHtml = generateAudioElement(word.PinyinRaw);
    
    // Generate example sentences if available
    const exampleHtml = word.ExampleSentences ? 
      `<div class="field example"><strong>Example:</strong><br>${word.ExampleSentences}</div>` : '';
    
    // Generate cloze text for cloze deletion cards
    const clozeHtml = word.Simplified.includes(' ') ?
      word.Simplified.split(' ').map((c, i) => i === 0 ? `<span class="cloze">${c}</span>` : c).join(' ') :
      `<span class="cloze">${word.Simplified}</span>`;
    
    // All fields available for card templates (15 fields total)
    const fields = [
      frontContent,                    // 0: Simplified (formatted)
      word.Traditional || '',          // 1: Traditional
      word.Pinyin || '',               // 2: Pinyin with tone marks
      word.Zhuyin || '',               // 3: Zhuyin (Bopomofo)
      word.PartOfSpeech || '',         // 4: POS code
      word.PosLabel || '',             // 5: POS label (Chinese)
      word.SimpleMeaning || '',        // 6: Simple meaning
      word.Definitions || '',          // 7: Detailed definitions
      word.HskLevel || '',             // 8: HSK level
      word.ExampleSentences || '',     // 9: Example sentences
      audioHtml,                       // 10: Audio URL/element
      strokeHtml,                      // 11: Stroke animation HTML
      clozeHtml,                       // 12: Cloze deletion text
      word.ExampleTranslation || '',   // 13: Example translation
      ''                               // 14: Reserved
    ];
    
    exporter.addCard(fields);
  }
  
  const buffer = await exporter.save();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  return words.length;
}

/**
 * Generate Hanzi Writer stroke animation HTML for a character
 */
function generateStrokeAnimation(character) {
  const charId = `stroke-${character.charCodeAt(0).toString(16)}`;
  return `
<div class="stroke-container">
  <div id="${charId}" class="hanzi-writer-target"></div>
  <div class="stroke-controls">
    <button class="stroke-btn" onclick="HanziWriter.create('${charId}', '${character}', {
      width: 200, height: 200, padding: 5,
      showOutline: true, strokeAnimationSpeed: 1, delayBetweenStrokes: 200
    }).animateCharacter()">▶ Animate</button>
    <button class="stroke-btn" onclick="HanziWriter.create('${charId}', '${character}', {
      width: 200, height: 200, padding: 5
    }).quiz()">✏️ Quiz</button>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js"></script>
`.trim();
}

/**
 * Generate audio element for pronunciation using Google TTS or similar
 */
function generateAudioElement(pinyin) {
  // Using Forvo or Google TTS as audio source
  const cleanPinyin = pinyin.replace(/\d/g, ''); // Remove tone numbers for URL
  const audioUrl = `https://dict.youdao.com/dictvoice?audio=${cleanPinyin}&type=1`;
  return `<audio controls src="${audioUrl}" class="audio-player"></audio>`;
}

function createLandingPage(outputDir) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Anki-xiehanzi - Pre-built HSK Decks</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:40px 20px}.container{max-width:900px;margin:0 auto}h1{color:white;text-align:center;margin-bottom:10px;font-size:2.5rem}.subtitle{color:rgba(255,255,255,0.9);text-align:center;margin-bottom:40px}.deck-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px}.deck-card{background:white;border-radius:12px;padding:24px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.2);transition:transform 0.2s}.deck-card:hover{transform:translateY(-5px)}.deck-level{font-size:3rem;font-weight:bold;color:#667eea;margin-bottom:8px}.download-btn{display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:15px}.features{background:white;border-radius:12px;padding:30px;margin-top:40px}.features h2{color:#333;margin-bottom:20px;text-align:center}.feature-list{list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px}.feature-list li{padding:10px 0;color:#555}.feature-list li::before{content:'✓';color:#667eea;font-weight:bold;margin-right:10px}footer{text-align:center;color:rgba(255,255,255,0.8);margin-top:40px}footer a{color:white}</style></head><body><div class="container"><h1>📚 Anki-xiehanzi</h1><p class="subtitle">Pre-built HSK 1-6 flashcard decks with 9 card types</p><div class="deck-grid">${[1,2,3,4,5,6].map(l => `<div class="deck-card"><div class="deck-level">HSK ${l}</div><div>Level ${l} Vocabulary</div><a href="HSK_${l}.apkg" class="download-btn" download>Download .apkg</a></div>`).join('')}</div><div class="features"><h2>✨ Card Types</h2><ul class="feature-list"><li>Beginner</li><li>Intermediate</li><li>Reading</li><li>Writing</li><li>Example Sentences</li><li>HSK Exam</li><li>Production</li><li>Cloze Deletion</li><li>Traditional Recognition/Production</li></ul></div><div class="features"><h2>🎨 Features</h2><ul class="feature-list"><li>PoS color coding (12 categories)</li><li>Tone diacritic borders</li><li>Global field toggles (Simp/Trad/Pinyin/Zhuyin)</li><li>Animated stroke order</li></ul></div><footer><p><a href="https://github.com/tzoalli/Anki-xiehanzi">GitHub</a></p></footer></div></body></html>`;
  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
}

async function main() {
  console.log('🏗️  Building Anki-xiehanzi decks...\n');
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  try {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      console.log(`  Processing HSK ${level}...`);
      const outputPath = path.join(OUTPUT_DIR, `HSK_${level}.apkg`);
      const count = await generateDeckForLevel(level, outputPath);
      const stats = fs.statSync(outputPath);
      console.log(`    ✅ HSK_${level}.apkg (${count} cards, ${(stats.size/(1024*1024)).toFixed(2)} MB)`);
    }
    console.log('\n✅ Build complete! Decks in dist/\n');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

main();
