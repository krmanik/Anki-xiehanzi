/**
 * Build script for generating pre-built HSK Anki decks
 * Run: npm install && npm run build
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const genanki = require('genanki-js');
const { Deck, Model, Package } = genanki;

const OUTPUT_DIR = './dist';

function loadHSKWords(level) {
  const filePath = path.join(__dirname, 'HSK Wordlist', `HSK Official With Definitions 2012 L${level}.txt`);
  if (!fs.existsSync(filePath)) throw new Error(`No wordlist found for HSK ${level}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseOldHSKFormat(content, level);
}

function parseOldHSKFormat(content, level) {
  const lines = content.trim().split('\n');
  const words = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length >= 4) {
      words.push({
        Simplified: parts[0].trim(),
        Traditional: parts[1]?.trim() || parts[0].trim(),
        Pinyin: convertPinyinNumToTone(parts[2]?.trim() || ''),
        SimpleMeaning: parts.slice(4).join(' ') || '',
        HskLevel: level.toString()
      });
    }
  }
  return words;
}

function convertPinyinNumToTone(pinyinNum) {
  const toneMap = {
    '1': ['ā', 'ē', 'ī', 'ō', 'ū', 'ǖ'],
    '2': ['á', 'é', 'í', 'ó', 'ú', 'ǘ'],
    '3': ['ǎ', 'ě', 'ǐ', 'ǒ', 'ǔ', 'ǚ'],
    '4': ['à', 'è', 'ì', 'ò', 'ù', 'ǜ'],
    '5': ['a', 'e', 'i', 'o', 'u', 'ü']
  };
  const match = pinyinNum.match(/([a-züv]+)(\d)/);
  if (!match) return pinyinNum;
  const [, syllable, toneNum] = match;
  const vowels = 'aeiouv';
  let result = syllable;
  for (let i = 0; i < syllable.length; i++) {
    const char = syllable[i];
    if (vowels.includes(char)) {
      const vowelIndex = vowels.indexOf(char);
      const toneChar = toneMap[toneNum][vowelIndex];
      if (toneChar) {
        result = syllable.substring(0, i) + (toneChar === 'ü' ? 'ü' : toneChar) + syllable.substring(i + 1);
        break;
      }
    }
  }
  return result;
}

function createNoteType() {
  const fields = [
    'Simplified', 'Traditional', 'Pinyin', 'Zhuyin', 'Definitions', 'SimpleMeaning', 'Definition_ZH',
    'PoS_Tag', 'Media_URL', 'Image_URL', 'Friction_Level', 'Radical_Info', 'Synonyms', 'Antonyms', 'Usage_Notes',
    'HskLevel', 'Frequency', 'Breakdown', 'Examples', 'Example_Source', 'Audio_URL', 'StrokeOrder_URL',
    'ClozeText', 'ClozeHint'
  ];
  
  const templates = [
    { name: 'Beginner', qfmt: '{{Simplified}}', afmt: '{{Pinyin}}<br>{{SimpleMeaning}}' },
    { name: 'Intermediate', qfmt: '{{Simplified}}', afmt: '{{Traditional}}<br>{{Pinyin}}<br>{{SimpleMeaning}}<br>{{Definitions}}' },
    { name: 'Reading', qfmt: '{{Simplified}}<br>{{Pinyin}}', afmt: '{{SimpleMeaning}}' },
    { name: 'Writing', qfmt: '{{SimpleMeaning}}', afmt: '{{Simplified}}' },
    { name: 'Example Sentences', qfmt: '{{Simplified}}', afmt: '{{Pinyin}}<br>{{SimpleMeaning}}<br>{{Definitions}}<br>{{Examples}}' },
    { name: 'HSK Exam', qfmt: '{{Simplified}}', afmt: '{{Traditional}}<br>{{Pinyin}}<br>{{Definitions}}<br>{{SimpleMeaning}}<br>Hsk Level: {{HskLevel}}' },
    { name: 'Production', qfmt: '{{SimpleMeaning}}', afmt: '{{Simplified}}<br>{{Traditional}}<br>{{Pinyin}}' },
    { name: 'Cloze Deletion', qfmt: '{{ClozeText}}<br><div class="hint">{{ClozeHint}}</div>', afmt: '{{Simplified}}<br>{{Pinyin}}<br>{{SimpleMeaning}}' },
    { name: 'Traditional Recognition', qfmt: '{{Traditional}}', afmt: '{{Simplified}}<br>{{Pinyin}}<br>{{SimpleMeaning}}' },
    { name: 'Traditional Production', qfmt: '{{Simplified}}<br>{{SimpleMeaning}}', afmt: '{{Traditional}}<br>{{Pinyin}}' }
  ];
  
  const css = `.card { font-family: "ZenKai", sans-serif; font-size: 48px; text-align: center; color: #333; padding: 20px; }
.pos-noun { color: #2563eb; } .pos-pronoun { color: #0ea5e9; } .pos-verb { color: #166534; } .pos-auxiliary { color: #86efac; }
.pos-numeral { color: #dc2626; } .pos-adjective { color: #ca8a04; } .pos-measure { color: #9333ea; } .pos-adverb { color: #84cc16; }
.pos-preposition { color: #14b8a6; } .pos-conjunction { color: #f97316; } .pos-particle { color: #6b7280; } .pos-interjection { color: #ec4899; }
.tone1 { color: #ef4444; } .tone2 { color: #22c55e; } .tone3 { color: #3b82f6; } .tone4 { color: #a855f7; } .tone5 { color: #6b7280; }
.hint { font-size: 16px; color: #666; margin-top: 10px; }`;
  
  return new Model(1748352064, 'xiehanzi-3.0', fields, templates, css);
}

async function generateDeckForLevel(level, outputPath) {
  const words = loadHSKWords(level);
  const deck = new Deck(1748352064 + level, `HSK ${level}`, 'Chinese');
  const model = createNoteType();
  
  for (const word of words) {
    const note = model.newNote();
    for (const [key, value] of Object.entries(word)) {
      if (value !== undefined && value !== null) {
        try { note.fields[key] = String(value); } catch (e) {}
      }
    }
    deck.addNote(note);
  }
  
  const pkg = new Package([deck]);
  const buffer = await pkg.writeToBuffer();
  fs.writeFileSync(outputPath, buffer);
  return words.length;
}

function createLandingPage(outputDir) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anki-xiehanzi - Pre-built HSK Decks</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 40px 20px; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: white; text-align: center; margin-bottom: 10px; font-size: 2.5rem; }
    .subtitle { color: rgba(255,255,255,0.9); text-align: center; margin-bottom: 40px; }
    .deck-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .deck-card { background: white; border-radius: 12px; padding: 24px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2); transition: transform 0.2s; }
    .deck-card:hover { transform: translateY(-5px); }
    .deck-level { font-size: 3rem; font-weight: bold; color: #667eea; margin-bottom: 8px; }
    .download-btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 15px; }
    .features { background: white; border-radius: 12px; padding: 30px; margin-top: 40px; }
    .features h2 { color: #333; margin-bottom: 20px; text-align: center; }
    .feature-list { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .feature-list li { padding: 10px 0; color: #555; }
    .feature-list li::before { content: '✓'; color: #667eea; font-weight: bold; margin-right: 10px; }
    footer { text-align: center; color: rgba(255,255,255,0.8); margin-top: 40px; }
    footer a { color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📚 Anki-xiehanzi</h1>
    <p class="subtitle">Pre-built HSK 1-6 flashcard decks with 9 card types</p>
    <div class="deck-grid">
      ${[1,2,3,4,5,6].map(l => `<div class="deck-card"><div class="deck-level">HSK ${l}</div><div>Level ${l} Vocabulary</div><a href="HSK_${l}.apkg" class="download-btn" download>Download .apkg</a></div>`).join('')}
    </div>
    <div class="features">
      <h2>✨ Card Types</h2>
      <ul class="feature-list">
        <li>Beginner</li><li>Intermediate</li><li>Reading</li><li>Writing</li>
        <li>Example Sentences</li><li>HSK Exam</li><li>Production</li>
        <li>Cloze Deletion</li><li>Traditional Recognition/Production</li>
      </ul>
    </div>
    <div class="features">
      <h2>🎨 Features</h2>
      <ul class="feature-list">
        <li>PoS color coding (12 categories)</li><li>Tone colorization</li>
        <li>Customizable in Anki</li><li>Synonyms & Antonyms</li>
      </ul>
    </div>
    <footer><p><a href="https://github.com/tzoalli/Anki-xiehanzi">GitHub</a></p></footer>
  </div>
</body>
</html>`;
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
    
    createLandingPage(OUTPUT_DIR);
    console.log('\n✅ Build complete! Decks in dist/\n');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

main();
