/**
 * The Kangxi radical deck's note type — fields, card templates, CSS and the
 * per-note HTML — as pure functions of a `Radical`.
 *
 * Pure on purpose (mirrors `deckTemplate.ts` behind `deck.ts`): no genanki-js,
 * no fetch, no `$app/paths`, so the layout is unit-tested and the packaging
 * script in `scripts/build-radical-deck.mjs` only has to add media and zip.
 *
 * Two cards per radical:
 *   1. Recognize — the glyph on the front, everything known about it on the back.
 *   2. Write     — the meaning on the front and an empty grid to write into,
 *                  the glyph and a stroke-by-stroke animation on the back.
 *
 * Stroke data rides along in a hidden field rather than in a shared media JSON:
 * 342 KB across 214 notes, versus a 32 MB file re-parsed on every card render.
 */

import { STANDARD_TONES } from './tonePresets';
import { toneOfPinyin } from './tone';
import type { Radical, RadicalExample } from './radicals';

/**
 * The deck ships in two editions. They are separate note types on purpose: the
 * free one has a single card template, and if both editions shared a model id,
 * importing one after the other would rewrite the other's card templates and
 * silently delete or duplicate its cards.
 */
export type Edition = 'free' | 'premium';

/** The two questions the deck can ask about a radical. */
export type RadicalCardType = 'recognize' | 'write';

export const RADICAL_CARD_TYPES: { value: RadicalCardType; name: string; label: string }[] = [
	{ value: 'recognize', name: 'Recognize', label: 'Recognition — glyph on the front' },
	{ value: 'write', name: 'Write', label: 'Writing — produce it from the meaning' }
];

/**
 * What a built deck contains. The premium `.apkg` is built offline with
 * everything on; the free deck is generated in the browser from `/radicals`,
 * where the reader picks — same shape of choice the deck creator offers for
 * words, so "one card or two, with or without audio" means the same thing here.
 */
export interface RadicalDeckOptions {
	edition: Edition;
	/** Which cards each note generates; order is the card order in Anki. */
	cards: RadicalCardType[];
	/** Pronunciation clip (the note's Audio field, and the media that backs it). */
	audio: boolean;
	/** The stroke-order animation on the back. */
	strokeOrder: boolean;
	/** The Chinese / Hán-Việt / Japanese / Korean readings table. */
	readings: boolean;
	/** The Chinese teaching name (月字旁). */
	colloquial: boolean;
	/** The characters the radical builds. */
	examples: boolean;
	/** 字源演变 + 字形对比 glyph images — premium only (they are ~11 MB of SVG). */
	glyphs: boolean;
	/** The radical read as ordinary vocabulary — premium. */
	asWord: boolean;
	/** Colour pinyin by tone. */
	toneColors: boolean;
	/**
	 * The sidebar that shows and hides parts of the card while reviewing —
	 * premium. Each side remembers its own choices, so the front can be stripped
	 * to the glyph while the back stays full.
	 */
	fieldToggles: boolean;
}

const FREE_DEFAULTS: RadicalDeckOptions = {
	edition: 'free',
	cards: ['recognize', 'write'],
	audio: true,
	strokeOrder: true,
	readings: true,
	colloquial: true,
	examples: true,
	glyphs: false,
	asWord: false,
	toneColors: true,
	fieldToggles: false
};

const PREMIUM_DEFAULTS: RadicalDeckOptions = {
	...FREE_DEFAULTS,
	edition: 'premium',
	glyphs: true,
	asWord: true,
	fieldToggles: true
};

/**
 * Options for an edition, with any of them overridden. `cards` is never allowed
 * to end up empty — a note type with no template imports as nothing at all.
 */
export function radicalOptions(
	edition: Edition = 'premium',
	overrides: Partial<RadicalDeckOptions> = {}
): RadicalDeckOptions {
	const base = edition === 'free' ? FREE_DEFAULTS : PREMIUM_DEFAULTS;
	const merged = { ...base, ...overrides, edition };
	const cards = RADICAL_CARD_TYPES.map((c) => c.value).filter((c) => merged.cards.includes(c));
	return {
		...merged,
		cards: cards.length ? cards : ['recognize'],
		// The glyph images and the word sense are what is bought; a free deck never
		// carries them however it is configured.
		glyphs: edition === 'premium' && merged.glyphs,
		asWord: edition === 'premium' && merged.asWord,
		fieldToggles: edition === 'premium' && merged.fieldToggles
	};
}

/** Accepts either the plain edition name or a full options object. */
const asOptions = (spec: Edition | RadicalDeckOptions = 'premium'): RadicalDeckOptions =>
	typeof spec === 'string' ? radicalOptions(spec) : spec;

/**
 * Recognition and writing ship as **separate decks**, each with its own note
 * type: one to study, one to practise, suspendable and schedulable apart from
 * each other. (The word decks do the same — see `cardTypeDecks` in `deck.ts`.)
 *
 * Every id here is distinct from the HSK note types (`1969669503`/`4`) and from
 * each other: two note types sharing an id makes importing one rewrite the
 * other's templates and silently delete or duplicate its cards.
 */
const MODEL_IDS: Record<Edition, Record<RadicalCardType, string>> = {
	premium: { recognize: '1969669521', write: '1969669523' },
	free: { recognize: '1969669522', write: '1969669524' }
};

/** The premium recognition note type — the first one that ever shipped. */
export const RADICAL_MODEL_ID = MODEL_IDS.premium.recognize;
export const RADICAL_MODEL_NAME = 'Kangxi Radical Recognize - (Anki-xiehanzi)';

export const modelId = (edition: Edition = 'premium', card: RadicalCardType = 'recognize') =>
	MODEL_IDS[edition][card];

export const modelName = (edition: Edition = 'premium', card: RadicalCardType = 'recognize') =>
	`Kangxi Radical${edition === 'free' ? ' Free' : ''} ${
		card === 'write' ? 'Write' : 'Recognize'
	} - (Anki-xiehanzi)`;

/**
 * Anki nests on `::`. Both editions sit under the same parent, each card type
 * under its own child, so "Kangxi Radicals::Write" can be studied — or left
 * alone — without touching the recognition deck.
 */
export function radicalDeckName(edition: Edition = 'premium', card?: RadicalCardType): string {
	const parent = `Anki xiehanzi::Kangxi Radicals${edition === 'free' ? ' (Free)' : ''}`;
	if (!card) return parent;
	return `${parent}::${card === 'write' ? 'Write' : 'Recognize'}`;
}

/**
 * Media file name for a radical's pronunciation clip. The extension is a
 * parameter because the builder falls back through several TTS sources and they
 * do not all hand back an mp3.
 */
export const audioFile = (r: Pick<Radical, 'number'>, ext = 'mp3') =>
	`xhz-radical-${r.number}.${ext}`;

/**
 * Media file name for a glyph SVG. Anki keys media by name across the whole
 * collection, so the deck's own prefix keeps `kai-cn-6708.svg` from colliding
 * with anything else the user has imported. The leading underscore also tells
 * "Check Media" the file is in use even when a card type stops referencing it.
 */
export const glyphMedia = (file: string) => `_xhzr-${file}`;

export const RADICAL_FIELDS = [
	'Number',
	'Radical',
	'Variants',
	'Simplified',
	'Strokes',
	'StrokeLabel',
	'Pinyin',
	'Meaning',
	'Colloquial',
	'ColloquialPinyin',
	'ColloquialMeaning',
	'HanViet',
	'Japanese',
	'Korean',
	'Frequency',
	'Productivity',
	'Band',
	'Examples',
	'Evolution',
	'Regional',
	'Audio',
	'StrokeData',
	// Premium-only detail. The free note type carries the fields too (one field
	// list keeps `buildRadicalNote` single-purpose); its templates just ignore them.
	'Zhuyin',
	'AsWord',
	'Unicode',
	'KangxiForm'
] as const;

export type RadicalField = (typeof RADICAL_FIELDS)[number];

const escapeHtml = (s: string) =>
	String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

/** Wrap tone-marked pinyin in the tone class the deck CSS colors. */
export function tonedPinyin(pinyin: string): string {
	return (pinyin ?? '')
		.split(/(\s+)/)
		.map((part) =>
			part.trim()
				? `<span class="t${toneOfPinyin(part)}">${escapeHtml(part)}</span>`
				: escapeHtml(part)
		)
		.join('');
}

/**
 * Examples as a definition list: character, its reading, its meaning. A bare
 * hanzi would be a second thing to look up, which is the opposite of the point.
 */
export function examplesHtml(examples: RadicalExample[]): string {
	if (!examples?.length) return '';
	const rows = examples
		.map(
			(e) =>
				`<li class="ex"><span class="ex-char">${escapeHtml(e.char)}</span>` +
				`<span class="ex-body"><span class="ex-pinyin">${tonedPinyin(e.pinyin)}</span>` +
				(e.zhuyin ? `<span class="ex-zhuyin">${escapeHtml(e.zhuyin)}</span>` : '') +
				`<span class="ex-meaning">${escapeHtml(e.meaning)}</span></span>` +
				(e.band ? `<span class="chip chip--freq">${escapeHtml(e.band)}</span>` : '') +
				`</li>`
		)
		.join('');
	return `<ul class="examples">${rows}</ul>`;
}

/**
 * The radical read as ordinary vocabulary. Only 187 of the 214 are words at all,
 * and knowing which is which is exactly the kind of thing a learner wonders
 * about — so the block is absent rather than empty for the other 27.
 */
export function asWordHtml(word: Radical['word']): string {
	if (!word?.meaning) return '';
	return (
		`<span class="word-pinyin">${tonedPinyin(word.pinyin)}</span>` +
		`<span class="word-meaning">${escapeHtml(word.meaning)}</span>` +
		(word.band ? `<span class="chip chip--freq">${escapeHtml(word.band)}</span>` : '')
	);
}

/**
 * A row of glyph images with their labels. `evolution` runs oldest script to
 * newest, `regional` compares one glyph across five printing traditions — same
 * markup, different caption language, so one builder covers both.
 */
export function glyphRowHtml(
	glyphs: { label: string; script?: string; region?: string; file: string }[],
	kind: 'evolution' | 'regional'
): string {
	if (!glyphs?.length) return '';
	const items = glyphs
		.map((g) => {
			const cn = escapeHtml(g.script ?? g.region ?? '');
			return (
				`<figure class="glyph"><img src="${escapeHtml(glyphMedia(g.file))}" alt="${escapeHtml(g.label)}">` +
				`<figcaption><span class="glyph-cn">${cn}</span>` +
				`<span class="glyph-en">${escapeHtml(g.label)}</span></figcaption></figure>`
			);
		})
		.join('');
	return `<div class="glyph-row glyph-row--${kind}">${items}</div>`;
}

/** "つき tsuki" — native script first, romanization after; either may be empty. */
export function readingPair(native: string, roman: string): string {
	const parts = [native, roman].map((s) => (s ?? '').trim()).filter(Boolean);
	if (!parts.length) return '';
	return parts
		.map((p, i) =>
			i === 0 && parts.length > 1
				? `<span class="r-native">${escapeHtml(p)}</span>`
				: `<span class="r-roman">${escapeHtml(p)}</span>`
		)
		.join(' ');
}

/**
 * All the note's fields, as the HTML each one holds.
 *
 * `audio` is the media file actually stored for this radical — `false` (or a
 * missing clip) leaves the field empty, and the templates hide the player.
 */
export function buildRadicalNote(
	r: Radical,
	opts: { strokeData?: string; audio?: string | false } = {}
): Record<RadicalField, string> {
	const clip = opts.audio === undefined ? audioFile(r) : opts.audio;
	return {
		Number: String(r.number),
		Radical: r.char,
		Variants: r.variants.join(' '),
		Simplified: r.simplified.join(' '),
		Strokes: String(r.strokes),
		// Anki's template syntax tests fields for emptiness, not for value, so a
		// singular/plural switch has to be decided here.
		StrokeLabel: `${r.strokes} stroke${r.strokes === 1 ? '' : 's'}`,
		Pinyin: tonedPinyin(r.pinyin),
		Meaning: escapeHtml(r.meaning),
		Colloquial: escapeHtml(r.colloquial?.term ?? ''),
		ColloquialPinyin: tonedPinyin(r.colloquial?.pinyin ?? ''),
		ColloquialMeaning: escapeHtml(r.colloquial?.english ?? ''),
		HanViet: escapeHtml(r.hanviet),
		Japanese: readingPair(r.kana, r.romaji),
		Korean: readingPair(r.hangul, r.romaja),
		Frequency: r.frequency ? String(r.frequency) : '',
		Productivity: productivityLabel(r.frequency),
		Band: r.frequency ? productivityBandLabel(r.frequency) : '',
		Examples: examplesHtml(r.examples),
		Evolution: glyphRowHtml(r.evolution, 'evolution'),
		Regional: glyphRowHtml(r.compare, 'regional'),
		Audio: clip ? `[sound:${clip}]` : '',
		StrokeData: opts.strokeData ?? '',
		Zhuyin: escapeHtml(r.zhuyin ?? ''),
		AsWord: asWordHtml(r.word),
		Unicode: escapeHtml(r.unicode ?? ''),
		// The Kangxi-block form draws the same as the ideograph in most fonts, so
		// the codepoint is the part that actually says something.
		KangxiForm: r.kangxiForm
			? `${escapeHtml(r.kangxiForm)} <span class="muted">U+${r.kangxiForm
					.codePointAt(0)!
					.toString(16)
					.toUpperCase()}</span>`
			: ''
	};
}

/** How many characters the radical files, as its own chip. */
export function productivityLabel(frequency: number): string {
	if (!frequency) return '';
	return `${frequency} character${frequency === 1 ? '' : 's'}`;
}

/** How productive that makes it — a second, short chip beside the count. */
export function productivityBandLabel(frequency: number): string {
	if (!frequency) return '';
	if (frequency >= 300) return 'Very common';
	if (frequency >= 100) return 'Common';
	if (frequency >= 30) return 'Moderate';
	return 'Rare';
}

/** Hierarchical tags so Anki can filter by stroke count and productivity. */
export function radicalTags(r: Radical): string[] {
	const tags = ['Xiehanzi', 'Kangxi_Radical', `Strokes::${String(r.strokes).padStart(2, '0')}`];
	const band = productivityBandLabel(r.frequency) || 'Rare';
	tags.push(`Productivity::${band.replace(/\s+/g, '_')}`);
	return tags;
}

/**
 * Seeded on the radical's identity, not its field HTML, so re-importing a
 * rebuilt deck updates the existing notes instead of duplicating all 214.
 */
export function radicalNoteGuid(
	r: Pick<Radical, 'number' | 'char'>,
	edition: Edition = 'premium',
	card: RadicalCardType = 'recognize'
): string {
	// Edition and card type carry their own guids too: a user who owns both, or
	// studies both, ends up with independent decks rather than one overwriting
	// the other's notes.
	const seed = `xiehanzi-radical:${modelId(edition, card)}:${r.number}:${r.char}`;
	let h1 = 0x811c9dc5;
	let h2 = 0x811c9dc5 ^ 0x9e3779b9;
	for (let i = 0; i < seed.length; i++) {
		const c = seed.charCodeAt(i);
		h1 = Math.imul(h1 ^ c, 0x01000193);
		h2 = Math.imul(h2 ^ c, 0x01000193);
	}
	return (h1 >>> 0).toString(36).padStart(7, '0') + (h2 >>> 0).toString(36).padStart(7, '0');
}
// ---------------------------------------------------------------------------
// Hanzi Writer
// ---------------------------------------------------------------------------

/**
 * The writer runs off the note's own `StrokeData`, so nothing is fetched and
 * nothing is shared between decks. `mode` decides what the grid does on load:
 * the recognition card replays the strokes, the writing card asks for them —
 * and the control bar can switch between the two at any point.
 *
 * Everything is defined on `window` rather than as bare functions: Anki reuses
 * one webview across cards, so a second declaration of the same name throws.
 */
/**
 * The engine's media name — deck-private, not the `_hanzi-writer.min.js` the word
 * decks ship. Anki keys media by name across the whole collection, so sharing one
 * meant this deck loading whatever another import (or an earlier, broken build of
 * this one) had left under that name. A file only this deck writes is a file only
 * this deck can break.
 */
export const ENGINE_FILE = '_xhz-hanzi-writer.js';

export const WRITER_SCRIPT = `<script>
(function () {
  function boot() {
    var host = document.getElementById('xhz-writer');
    if (!host) return;
    // No engine (its media file went missing): an empty grid says nothing, so
    // take it out rather than leave a box the buttons cannot fill.
    if (typeof HanziWriter === 'undefined') { host.classList.add('writer--missing'); return; }
    var char = host.getAttribute('data-char') || '';
    var mode = host.getAttribute('data-mode') || 'animate';
    var raw = document.getElementById('xhz-stroke-data');
    var data = null;
    try { data = JSON.parse((raw && raw.textContent || '').trim()); } catch (e) { data = null; }
    if (!data || !data.strokes) { host.classList.add('writer--missing'); return; }

    host.innerHTML = '';
    var night = document.body.classList.contains('nightMode') ||
                document.documentElement.classList.contains('night-mode');
    // The replay grid lives in the narrow left column of the answer's top pair,
    // inside a padded panel; the quiz grid has the question side to itself.
    var size = mode === 'quiz'
      ? Math.min(250, Math.max(170, Math.round(window.innerWidth * 0.55)))
      : Math.min(184, Math.max(140, Math.round(window.innerWidth * 0.4)));
    var writer = HanziWriter.create(host, char, {
      charDataLoader: function (c, onLoad) { onLoad(data); },
      width: size,
      height: size,
      padding: 6,
      showCharacter: false,
      showOutline: true,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 200,
      strokeColor: night ? '#e8eaed' : '#16181d',
      outlineColor: night ? '#3a3d42' : '#dfe2e6',
      drawingColor: night ? '#8ab4f8' : '#1a73e8',
      highlightColor: '#4caf50',
      showHintAfterMisses: 2
    });

    var hint = document.getElementById('xhz-writer-hint');
    function say(text) { if (hint) hint.textContent = text; }

    function animate() {
      host.classList.remove('writer--quiz', 'writer--done');
      writer.cancelQuiz();
      writer.showOutline();
      writer.hideCharacter();
      writer.animateCharacter();
      say('Tap to replay');
    }

    function quiz() {
      host.classList.add('writer--quiz');
      host.classList.remove('writer--done');
      // An outline to trace is not recall — the hint after two misses is.
      writer.hideOutline();
      writer.hideCharacter();
      writer.quiz({ onComplete: function () {
        host.classList.add('writer--done');
        say('Done');
      } });
      say('Write it');
    }

    // The control bar talks to the writer through this, so the bar markup stays
    // free of any knowledge of Hanzi Writer.
    window.xhzWriterAction = function (action) {
      if (action === 'practice') quiz();
      else if (action === 'hint') writer.animateCharacter();
      else animate();
    };

    host.addEventListener('click', function () {
      if (!host.classList.contains('writer--quiz')) animate();
    });

    if (mode === 'quiz') quiz(); else animate();
  }

  // The engine is loaded from here rather than written as a "script src" tag in
  // the template. Anki re-inserts a card's script tags one after another and
  // awaits each one, so a tag whose media file is missing — the media server
  // answers with its 404 *page*, which parses as HTML — throws
  // "Unexpected token" and takes every later script on the card with it.
  //
  // Read first, run second: the bytes are checked for the engine before anything
  // executes them, so a missing or wrong file can never be parsed as JavaScript.
  // fetch is unavailable where the card is served from a file URL (AnkiDroid), so
  // a tag is the fallback there. Anki reuses one webview across cards, so a
  // loaded engine is reused and only the first card of a session pays for it.
  function withEngine(run) {
    if (typeof HanziWriter !== 'undefined') return run();
    var queue = window.xhzEngineQueue || (window.xhzEngineQueue = []);
    queue.push(run);
    if (window.xhzEngineLoading) return;
    window.xhzEngineLoading = true;

    function done() {
      window.xhzEngineLoading = false;
      var pending = window.xhzEngineQueue || [];
      window.xhzEngineQueue = [];
      for (var i = 0; i < pending.length; i++) pending[i]();
    }

    function inject(source) {
      var tag = document.createElement('script');
      if (source) tag.textContent = source;
      else { tag.src = '${ENGINE_FILE}'; tag.onload = tag.onerror = done; }
      document.head.appendChild(tag);
      if (source) done();
    }

    try {
      fetch('${ENGINE_FILE}').then(function (res) {
        return res.ok ? res.text() : '';
      }).then(function (source) {
        // A 404 page is HTML, not the engine; running it is the "Unexpected
        // token" every card used to report.
        if (source && source.indexOf('HanziWriter') !== -1) inject(source);
        else done();
      })['catch'](function () { inject(''); });
    } catch (e) {
      inject('');
    }
  }

  function start() { withEngine(boot); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
</script>`;

/**
 * The grid the writer draws into, plus the note's stroke data beside it.
 *
 * The data sits in a hidden **div**, not in a `<script type="application/json">`:
 * Anki's reviewer re-runs the card's scripts by eval'ing their text, and it does
 * not look at the type — a JSON body throws `SyntaxError: Unexpected token` on
 * eval, and because the reviewer awaits them all in one chain, that one throw
 * stops every later script on the card, leaving a dead grid and a dead bar.
 *
 * `guard` adds the `{{#StrokeData}}` wrapper. The answer already wraps its whole
 * block in one, and the same section nested inside itself is dead weight.
 */
function writerBlock(mode: 'animate' | 'quiz', guard = true): string {
	const body = `<div class="writer-wrap">
  <div id="xhz-writer" class="writer" ${part(
		'grid'
	)} data-char="{{text:Radical}}" data-mode="${mode}"></div>
  <div id="xhz-writer-hint" class="writer-hint">${
		mode === 'quiz' ? 'Write it' : 'Tap to replay'
	}</div>
</div>
<div id="xhz-stroke-data" class="stroke-data">{{text:StrokeData}}</div>
${WRITER_SCRIPT}`;
	return guard ? `{{#StrokeData}}\n${body}\n{{/StrokeData}}` : body;
}

// ---------------------------------------------------------------------------
// Chrome — the control bar
// ---------------------------------------------------------------------------

/**
 * Icons are inline SVG, not an icon font: the word decks ship a 60 KB
 * `_MaterialIcons-Regular.woff2` for this, and a deck of 214 notes should not
 * carry a font to draw three glyphs.
 */
const ICONS: Record<string, string> = {
	play: '<path d="M8 5.5v13l11-6.5z"/>',
	replay: '<path d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/>',
	pencil: '<path d="m4 16.2 9.4-9.4 4.1 4.1L8.1 20H4zM15 5.2l1.6-1.6a1.2 1.2 0 0 1 1.7 0l2.4 2.4a1.2 1.2 0 0 1 0 1.7L19.1 9.3z"/>',
	eye: '<path d="M12 5.5c-4.5 0-8 4-9 6.5 1 2.5 4.5 6.5 9 6.5s8-4 9-6.5c-1-2.5-4.5-6.5-9-6.5zm0 11a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-2.2a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z"/>',
	sliders:
		'<path d="M4 7h9v2H4zm12 0h4v2h-4zM4 15h4v2H4zm7 0h9v2h-9z"/><path d="M13.5 5.5h2v5h-2zm-5 8h2v5h-2z"/>',
	more: '<path d="M12 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>',
	close: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.8"/>'
};

const icon = (name: string) =>
	`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

type BarButton = 'audio' | 'replay' | 'practice' | 'hint';

/**
 * Every button carries its own code in its `onclick`, and calls nothing that a
 * script had to define first.
 *
 * The bar used to call `xhzPlayAudio()` / `xhzWriter()`, defined by a script on
 * the card. Anki keeps the note type a collection already has when you re-import
 * a deck, so a card whose templates are one version old kept calling handlers
 * that were no longer there — `Uncaught ReferenceError: xhzWriter is not
 * defined`, on every press, unfixable by re-importing. An `onclick` that depends
 * on nothing cannot rot that way: audio needs no script at all, and the writer
 * calls are guarded, so a card with no stroke data does nothing instead of
 * throwing.
 */
const PLAY_AUDIO =
	"var h=document.getElementById('xhz-audio')," +
	"e=h&amp;&amp;h.getElementsByTagName('*')[0];" +
	// Anki renders [sound:…] as its own replay link on desktop, an audio element
	// on mobile; clicking the link is what plays it.
	"if(e)e.tagName==='AUDIO'?e.play():e.click()";

const writerCall = (action: string) =>
	`if(window.xhzWriterAction)window.xhzWriterAction('${action}')`;

const BUTTONS: Record<BarButton, { label: string; icon: string; call: string }> = {
	audio: { label: 'Play audio', icon: 'play', call: PLAY_AUDIO },
	replay: { label: 'Replay the strokes', icon: 'replay', call: writerCall('replay') },
	practice: { label: 'Practise writing it', icon: 'pencil', call: writerCall('practice') },
	hint: { label: 'Show me a stroke', icon: 'eye', call: writerCall('hint') }
};

/** Opens the show/hide panel. Lives in the bar, beside the audio and writer buttons. */
const COG_BUTTON =
	`<button type="button" class="bar-btn bar-btn--tool cog" aria-label="Show or hide parts of the card" ` +
	`title="Show or hide parts of the card" ` +
	`onclick="document.querySelector('.card-body').classList.toggle('xhz-panel')">${icon('sliders')}</button>`;

/** Opens the dictionary drawer on the right. */
const MORE_BUTTON =
	`<button type="button" class="bar-btn bar-btn--tool more-btn" aria-label="Look it up elsewhere" ` +
	`title="Look it up elsewhere" ` +
	`onclick="document.querySelector('.card-body').classList.toggle('xhz-more')">${icon('more')}</button>`;

/**
 * The bar — the card's one row of controls: what it can *do* on the left (play
 * the clip, replay the strokes, practise writing), what it can *show* on the
 * right (the show/hide panel, the dictionary drawer).
 *
 * Only the action group carries `data-xhz="buttons"`: hiding the buttons must
 * not take the switch that unhides them away with it.
 */
function controlBar(
	buttons: BarButton[],
	tools: { cog?: boolean; more?: boolean } = {}
): string {
	const items = buttons
		.map((b) => {
			const spec = BUTTONS[b];
			return (
				`<button type="button" class="bar-btn" aria-label="${spec.label}" ` +
				`title="${spec.label}" onclick="${spec.call}">${icon(spec.icon)}</button>`
			);
		})
		.join('\n    ');
	if (!buttons.length && !tools.cog && !tools.more) return '';
	// Three lanes, always in the same places, and always all three: the switches
	// panel opens from the left of the card and its button sits at the left, the
	// lookup drawer opens from the right and its button sits at the right, and
	// what the card can *do* is centred between them. An empty lane still holds
	// its column, or a single button would drift into the middle.
	const actions = buttons.length
		? `<div class="bar-actions" ${part('buttons')}>\n    ${items}\n  </div>`
		: `<div class="bar-actions"></div>`;
	return `<div class="bar">
  <div class="bar-side bar-side--left">${tools.cog ? `\n    ${COG_BUTTON}\n  ` : ''}</div>
  ${actions}
  <div class="bar-side bar-side--right">${tools.more ? `\n    ${MORE_BUTTON}\n  ` : ''}</div>
</div>`;
}

/**
 * Where else to look the radical up. Text links, no icons: the word decks ship
 * a PNG per site, and a 214-note deck should not carry seven logos to draw a
 * list. `{{text:Radical}}` is the glyph itself — the webview URL-encodes it.
 */
const MORE_LINKS: { label: string; note: string; href: string }[] = [
	{ label: 'Pleco', note: 'iOS · Android', href: 'plecoapi://x-callback-url/df?hw={{text:Radical}}' },
	{ label: 'zdic 汉典', note: 'Chinese', href: 'https://www.zdic.net/hans/{{text:Radical}}' },
	{ label: 'MDBG', note: 'Dictionary', href: 'https://www.mdbg.net/chinese/dictionary?wdqb={{text:Radical}}' },
	{ label: 'HanziCraft', note: 'Breakdown', href: 'https://hanzicraft.com/character/{{text:Radical}}' },
	{ label: 'Wiktionary', note: 'Etymology', href: 'https://en.wiktionary.org/wiki/{{text:Radical}}' },
	{ label: 'Youdao', note: 'Chinese', href: 'http://dict.youdao.com/search?q={{text:Radical}}' },
	{ label: 'Forvo', note: 'Pronunciation', href: 'https://forvo.com/word/{{text:Radical}}/#zh' },
	{ label: 'Tatoeba', note: 'Sentences', href: 'https://tatoeba.org/en/sentences/search?from=cmn&query={{text:Radical}}' }
];

/** The right-hand drawer the more button opens. Links only — no script. */
const MORE_DRAWER = `<aside class="more" aria-label="Look it up elsewhere">
  <div class="panel-head">
    <span class="panel-title">Look it up</span>
    <button type="button" class="panel-close" aria-label="Close" onclick="document.querySelector('.card-body').classList.remove('xhz-more')">${icon(
			'close'
		)}</button>
  </div>
  <div class="more-links">
${MORE_LINKS.map(
	(l) =>
		`    <a class="more-link" href="${l.href}"><span class="more-name">${l.label}</span>` +
		`<span class="more-note">${l.note}</span></a>`
).join('\n')}
  </div>
</aside>`;

/** Audio lives in a hidden div so the bar can trigger Anki's own player. */
const AUDIO_HOLDER = `{{#Audio}}<div id="xhz-audio" class="audio-holder">{{Audio}}</div>{{/Audio}}`;

// ---------------------------------------------------------------------------
// The sidebar — show and hide parts of the card while reviewing (premium)
// ---------------------------------------------------------------------------

/**
 * One switch's `onchange`, carrying everything it does: hide the part, remember
 * the choice for **this side** of the card, and never throw if storage is
 * unavailable (AnkiDroid, a locked-down webview).
 *
 * It is written into the attribute rather than calling a function a script
 * defines, for the same reason the bar's buttons are: Anki keeps the note type a
 * collection already has, so a card can outlive the script it was paired with.
 *
 * The hidden parts are stored as a comma-separated list — no JSON quoting to
 * escape inside an HTML attribute.
 */
const toggleCall = (key: CardPart) =>
	[
		`var r=document.querySelector('.card-body'),k='${key}';`,
		`r.classList.toggle('xhz-h-'+k,!this.checked);`,
		`try{`,
		`var s=r.classList.contains('back')?'back':'front',n='xhz.hide2.'+s,`,
		`l=(localStorage.getItem(n)||'').split(',').filter(Boolean),i=l.indexOf(k);`,
		`if(this.checked){if(i>-1)l.splice(i,1)}else if(i<0)l.push(k);`,
		`localStorage.setItem(n,l.join(','))`,
		`}catch(e){}`
	].join('');

/**
 * The panel, listing only the parts *this side* actually has — a front that
 * shows a glyph and a stroke grid has no business offering a switch for the
 * readings table.
 */
function sidebar(parts: CardPart[]): string {
	if (!parts.length) return '';
	const rows = parts
		.map(
			(key) =>
				`    <label class="panel-row" data-row="${key}">` +
				`<input type="checkbox" checked value="${key}" onchange="${toggleCall(key)}">` +
				`<span>${PART_LABELS[key]}</span></label>`
		)
		.join('\n');
	// The button that opens this lives in the control bar (see COG_BUTTON), not
	// pinned to the corner of the webview.
	return `<aside class="panel" aria-label="Show or hide parts of the card">
  <div class="panel-head">
    <span class="panel-title">Show</span>
    <button type="button" class="panel-close" aria-label="Close" onclick="document.querySelector('.card-body').classList.remove('xhz-panel')">${icon(
			'close'
		)}</button>
  </div>
  <div class="panel-rows">
${rows}
  </div>
  <div class="panel-foot">This side only</div>
</aside>`;
}

/**
 * Applies what the reader chose last time, and drops the rows for parts this
 * *note* happens not to have (no variant forms, no example characters).
 *
 * The switches work without this script; only remembering them needs it.
 */
const SIDEBAR_SCRIPT = `<script>
(function () {
  var root = document.querySelector('.card-body');
  if (!root) return;
  var side = root.classList.contains('back') ? 'back' : 'front';
  // hide2, not hide: a question side used to store only its own two or three
  // switches, and a stored list from that build would now read as "the reader
  // wants every field on the front shown" — the card answering itself.
  var name = 'xhz.hide2.' + side;
  // What the template hides to begin with: on a question side, everything the
  // answer would give away. Seeded into storage on the first card of all, so the
  // first toggle rewrites a complete list instead of one built from nothing.
  var initial = [];
  for (var c = 0; c < root.classList.length; c++) {
    var cls = root.classList[c];
    if (cls.indexOf('xhz-h-') === 0) initial.push(cls.slice(6));
  }
  var stored = null;
  try { stored = localStorage.getItem(name); } catch (e) { stored = null; }
  var hidden = initial;
  if (stored === null) {
    try { localStorage.setItem(name, initial.join(',')); } catch (e) {}
  } else {
    // The reader's choices replace the defaults in both directions — a part they
    // switched on has to survive the class the template puts on every card.
    hidden = stored.split(',').filter(Boolean);
    for (var d = 0; d < initial.length; d++) root.classList.remove('xhz-h-' + initial[d]);
    for (var i = 0; i < hidden.length; i++) root.classList.add('xhz-h-' + hidden[i]);
  }
  var rows = root.querySelectorAll('.panel-row');
  for (var j = 0; j < rows.length; j++) {
    var key = rows[j].getAttribute('data-row');
    if (!root.querySelector('[data-xhz="' + key + '"]')) { rows[j].style.display = 'none'; continue; }
    var box = rows[j].getElementsByTagName('input')[0];
    if (box) box.checked = hidden.indexOf(key) < 0;
  }
})();
</script>`;

// ---------------------------------------------------------------------------
// Card templates
// ---------------------------------------------------------------------------

/**
 * Every part of a card a reader can switch off, and what the sidebar calls it.
 *
 * The keys are short on purpose — they are labels in a narrow panel, not
 * sentences. The same names shortened the block titles on the card itself:
 * "How the glyph evolved" is a sentence, "Evolution" is a heading.
 */
export const PART_LABELS: Record<string, string> = {
	strokes: 'Stroke order',
	grid: 'Grid lines',
	glyph: 'Glyph',
	pinyin: 'Pinyin',
	zhuyin: 'Zhuyin',
	meaning: 'Meaning',
	meta: 'Kangxi line',
	forms: 'Other forms',
	name: 'Teaching name',
	readings: 'Readings',
	word: 'As a word',
	evolution: 'Evolution',
	regional: 'Regional forms',
	examples: 'Examples',
	buttons: 'Buttons',
	codes: 'Codepoints'
};

export type CardPart = keyof typeof PART_LABELS;

/** Marks an element as switchable: `<div data-xhz="pinyin">`. */
const part = (key: CardPart) => `data-xhz="${key}"`;

/** One titled block. Everything on the back is one of these. */
const block = (title: string, body: string, guard?: string, cls = '', key?: CardPart) => {
	const html = `<section class="block${cls ? ` ${cls}` : ''}"${key ? ` ${part(key)}` : ''}>
  <h2>${title}</h2>
  <div class="block-body">${body}</div>
</section>`;
	return guard ? `{{#${guard}}}${html}{{/${guard}}}` : html;
};

/**
 * The readings of the *other* three traditions. The Chinese reading is printed
 * once, big, at the top of the identity column — a 中文 row here would be the
 * same pinyin twice on one screen.
 */
const READINGS_TABLE = `<table class="readings">
      {{#HanViet}}<tr><th>Hán-Việt</th><td>{{HanViet}}</td></tr>{{/HanViet}}
      {{#Japanese}}<tr><th>日本語</th><td>{{Japanese}}</td></tr>{{/Japanese}}
      {{#Korean}}<tr><th>한국어</th><td>{{Korean}}</td></tr>{{/Korean}}
    </table>`;

/**
 * The right half of the top grid: what the radical is, in one column beside the
 * stroke animation — glyph, reading, meaning, the plain metadata line, the forms
 * it is also written in, its teaching name, and the readings elsewhere.
 *
 * It used to be a full-width header above the grid, which then repeated its own
 * pinyin in the readings table two lines below it. One column, said once.
 */
/**
 * The rows the identity panel renders, in order. Shared with `radicalCss`, which
 * needs to know when *every* one of them is switched off — the panel is one
 * surface with a shadow, and an empty one is a blank white box on the card.
 */
function identParts(o: RadicalDeckOptions, skip: Set<CardPart> = new Set()): CardPart[] {
	return (
		[
			'glyph',
			'pinyin',
			...(o.asWord ? ['zhuyin'] : []),
			'meaning',
			'meta',
			'forms',
			...(o.colloquial ? ['name'] : []),
			...(o.readings ? ['readings'] : [])
		] as CardPart[]
	).filter((key) => !skip.has(key));
}

function identColumn(o: RadicalDeckOptions, skip: Set<CardPart> = new Set()): string {
	const has = (key: CardPart) => !skip.has(key);

	const forms = has('forms')
		? `{{#Variants}}<div class="forms" ${part(
				'forms'
			)}><span class="forms-label">also written</span>{{Variants}}</div>{{/Variants}}
  {{#Simplified}}<div class="forms" ${part(
		'forms'
	)}><span class="forms-label">simplified</span>{{Simplified}}</div>{{/Simplified}}`
		: '';

	const colloquial =
		o.colloquial && has('name')
			? `{{#Colloquial}}<div class="colloquial" ${part('name')}>
    <span class="coll-term">{{Colloquial}}</span>
    <span class="coll-pinyin">{{ColloquialPinyin}}</span>
    {{#ColloquialMeaning}}<span class="coll-en">{{ColloquialMeaning}}</span>{{/ColloquialMeaning}}
  </div>{{/Colloquial}}`
			: '';

	const readings =
		o.readings && has('readings')
			? `<div class="ident-readings" ${part('readings')}>
    <h2>Readings</h2>
    ${READINGS_TABLE}
  </div>`
			: '';

	const say = [
		has('pinyin') ? `<span class="pinyin" ${part('pinyin')}>{{Pinyin}}</span>` : '',
		o.asWord && has('zhuyin')
			? `{{#Zhuyin}}<span class="zhuyin" ${part('zhuyin')}>{{Zhuyin}}</span>{{/Zhuyin}}`
			: ''
	].join('');

	const head = [
		has('glyph') ? `    <span class="ident-glyph" ${part('glyph')}>{{Radical}}</span>` : '',
		say && `    <span class="ident-say">\n      ${say}\n    </span>`
	].filter(Boolean);

	const rows = [
		head.length && `  <div class="ident-head">\n${head.join('\n')}\n  </div>`,
		has('meaning') && `  <div class="ident-meaning" ${part('meaning')}>{{Meaning}}</div>`,
		has('meta') &&
			`  <div class="ident-meta" ${part(
				'meta'
			)}>Kangxi {{Number}} · {{StrokeLabel}}{{#Productivity}} · {{Productivity}}{{/Productivity}}{{#Band}} · {{Band}}{{/Band}}</div>`,
		forms && `  ${forms}`,
		colloquial && `  ${colloquial}`,
		readings && `  ${readings}`
	].filter(Boolean);

	if (!rows.length) return '';
	return [`<div class="ident">`, ...rows, `</div>`].join('\n');
}

/**
 * Everything the deck knows about the radical, in card order: the stroke
 * animation paired with the identity column, then one panel per block.
 *
 * `skip` is what *this side* leaves out — a question side renders the whole
 * stack too (that is what makes every field switchable on the front, as the HSK
 * deck's sidebar does), minus the parts its question already prints and minus
 * the writer, which the writing front owns in quiz mode.
 */
function answerBody(
	o: RadicalDeckOptions,
	bar: string,
	skip: Set<CardPart> = new Set()
): string {
	const strokes =
		o.strokeOrder && !skip.has('strokes')
			? `{{#StrokeData}}<section class="block block--grid" ${part('strokes')}>
  <h2>Stroke order</h2>
  <div class="block-body block-body--center">
${writerBlock('animate', false)}
  </div>
</section>{{/StrokeData}}`
			: '';

	const ident = identColumn(o, skip);
	// The pair only exists when both halves do; one child in a two-column grid
	// would sit in the 208px lane meant for the stroke box.
	const top = strokes ? `<div class="duo">\n${[strokes, ident].filter(Boolean).join('\n')}\n</div>` : ident;

	const blocks = [
		top,
		bar,
		o.asWord && !skip.has('word') && block('As a word', '{{AsWord}}', 'AsWord', 'block--word', 'word'),
		// English first, and short: a beginner cannot read 字源演变, and a heading is a
		// label, not the sentence "How the glyph evolved".
		o.glyphs &&
			!skip.has('evolution') &&
			block(
				'Evolution <span class="h2-cn">字源演变</span>',
				'{{Evolution}}',
				'Evolution',
				'block--evolution',
				'evolution'
			),
		o.glyphs &&
			!skip.has('regional') &&
			block(
				'Regional forms <span class="h2-cn">字形对比</span>',
				'{{Regional}}',
				'Regional',
				'block--regional',
				'regional'
			),
		o.examples &&
			!skip.has('examples') &&
			block('Examples', '{{Examples}}', 'Examples', 'block--examples', 'examples'),
		o.asWord &&
			!skip.has('codes') &&
			`<div class="foot" ${part('codes')}>
  {{#Unicode}}<span>{{Unicode}}</span>{{/Unicode}}
  {{#KangxiForm}}<span>Kangxi radical form {{KangxiForm}}</span>{{/KangxiForm}}
</div>`
	];
	return blocks.filter(Boolean).join('\n\n');
}

/** The question side of the recognition card: the glyph, and nothing else. */
const RECOGNIZE_FRONT = `  <div class="glyph-main" ${part('glyph')}>{{Radical}}</div>
  <div class="kangxi" ${part('meta')}>Kangxi radical {{Number}} · {{StrokeLabel}}</div>`;

/**
 * Which parts `answerBody` renders, in the order it renders them — the one list
 * the sidebar's rows are built from, so a row can never offer a switch for
 * something the side does not have (the test pins rows to `data-xhz` markers).
 */
function stackParts(o: RadicalDeckOptions, skip: Set<CardPart> = new Set()): CardPart[] {
	const keys: CardPart[] = [
		...(o.strokeOrder ? (['strokes', 'grid'] as CardPart[]) : []),
		'glyph',
		'pinyin',
		...(o.asWord ? (['zhuyin'] as CardPart[]) : []),
		'meaning',
		'meta',
		'forms',
		...(o.colloquial ? (['name'] as CardPart[]) : []),
		...(o.readings ? (['readings'] as CardPart[]) : []),
		...(o.asWord ? (['word'] as CardPart[]) : []),
		...(o.glyphs ? (['evolution', 'regional'] as CardPart[]) : []),
		...(o.examples ? (['examples'] as CardPart[]) : []),
		...(o.asWord ? (['codes'] as CardPart[]) : [])
	];
	return keys.filter((key) => !skip.has(key));
}

/**
 * What a question side already prints itself, and so leaves out of the switchable
 * stack under it. Shared with `radicalCss` — a rule there has to name the same
 * set of parts to know when the identity panel has nothing left in it.
 */
const FRONT_SKIP: Record<RadicalCardType, CardPart[]> = {
	recognize: ['glyph', 'meta'],
	write: ['meaning', 'pinyin', 'meta']
};

/**
 * The cards. Recognition shows the glyph and asks what it is; writing gives the
 * meaning and an empty grid to produce it in — the same pair the word decks
 * ship, down to the control bar under the card.
 */
export function radicalTemplates(
	spec: Edition | RadicalDeckOptions = 'premium'
): { name: string; qfmt: string; afmt: string }[] {
	const o = asOptions(spec);

	const backButtons: BarButton[] = [
		...(o.audio ? (['audio'] as BarButton[]) : []),
		...(o.strokeOrder ? (['replay', 'practice'] as BarButton[]) : [])
	];

	/** The sidebar for one side, plus the script that restores its choices. */
	const chrome = (parts: CardPart[]) =>
		o.fieldToggles ? `${sidebar(parts)}\n${SIDEBAR_SCRIPT}` : '';

	// Everything the answer can switch off, in the order it appears on the card.
	const backParts: CardPart[] = [
		...stackParts(o).filter((key) => key !== 'codes'),
		...(backButtons.length ? (['buttons'] as CardPart[]) : []),
		...(o.asWord ? (['codes'] as CardPart[]) : [])
	];

	// The hidden audio the bar plays is looked up by id at click time, so it sits
	// at the end of the card where it belongs.
	const afmt = `<div class="card-body back">
${answerBody(o, controlBar(backButtons, { cog: o.fieldToggles, more: true }))}
${chrome(backParts)}
${MORE_DRAWER}
${o.audio ? AUDIO_HOLDER : ''}
</div>`;

	/**
	 * The rest of the note under a question, for the reader to switch on — the
	 * pinyin as a hint on a recognition card, say, or the readings while writing.
	 * The HSK deck ships every field on both sides the same way, deselected ones
	 * simply starting hidden.
	 *
	 * It exists only where there is a panel to work it (premium), and never
	 * carries the stroke writer: the writing front owns `#xhz-writer` in quiz
	 * mode, and two of them on one side is one grid with two engines fighting
	 * over it.
	 */
	const extras = (skip: CardPart[]) => {
		if (!o.fieldToggles) return { html: '', parts: [] as CardPart[], hidden: '' };
		const omit = new Set<CardPart>([...skip, 'strokes', 'grid', 'buttons']);
		const parts = stackParts(o, omit);
		if (!parts.length) return { html: '', parts, hidden: '' };
		return {
			html: `<div class="extras">\n${answerBody(o, '', omit)}\n</div>`,
			parts,
			// Default-hidden on a question side: the class list is the template's
			// opinion, which the reader's stored choices then replace wholesale.
			hidden: parts.map((key) => ` xhz-h-${key}`).join('')
		};
	};

	const recognizeExtra = extras(FRONT_SKIP.recognize);
	const writeExtra = extras(FRONT_SKIP.write);

	const fronts: Record<RadicalCardType, string> = {
		// A question side has no actions of its own; the bar is the two chrome buttons.
		recognize: `<div class="card-body front front--recognize${recognizeExtra.hidden}">
${RECOGNIZE_FRONT}
${controlBar([], { cog: o.fieldToggles })}
${recognizeExtra.html}
${chrome(['glyph', 'meta', ...recognizeExtra.parts])}
</div>`,
		write: `<div class="card-body front front--write${writeExtra.hidden}">
  <div class="prompt">
    <span class="prompt-meaning" ${part('meaning')}>{{Meaning}}</span>
    <span class="prompt-pinyin" ${part('pinyin')}>{{Pinyin}}</span>
  </div>
  <div class="kangxi" ${part('meta')}>Kangxi radical {{Number}} · {{StrokeLabel}}</div>
${writerBlock('quiz')}
${controlBar(['hint', 'replay'], { cog: o.fieldToggles })}
${writeExtra.html}
${chrome(['meaning', 'pinyin', 'meta', 'grid', 'buttons', ...writeExtra.parts])}
</div>`
	};

	return o.cards.map((card) => ({
		name: RADICAL_CARD_TYPES.find((c) => c.value === card)!.name,
		qfmt: fronts[card],
		afmt
	}));
}

/**
 * A card is worth scheduling when the note has a radical and a meaning; the
 * writing card additionally needs stroke data, or its grid would be empty.
 */
export function radicalReq(
	spec: Edition | RadicalDeckOptions = 'premium'
): [number, string, number[]][] {
	const ord = (name: RadicalField) => RADICAL_FIELDS.indexOf(name);
	const need: Record<RadicalCardType, number[]> = {
		recognize: [ord('Radical')],
		write: [ord('Meaning'), ord('StrokeData')]
	};
	return asOptions(spec).cards.map((card, i) => [i, 'all', need[card]]);
}

/**
 * One typeface, one layout, and a Material palette: the page is a tinted ground,
 * every part of the answer is a raised panel on it, and each panel carries one
 * accent colour on its title rule — the card reads as a set of cards rather than
 * a wall of hairlines. Text itself stays near-black on near-white; the colour is
 * in the chrome and in the tone on the pinyin.
 */
export const RADICAL_CSS = `
.card {
  --bg: #eef1f8;
  --surface: #ffffff;
  --fg: #1b1c22;
  --muted: #5a6070;
  --faint: #8b91a3;
  --line: #e4e7f0;
  --soft: #f4f6fc;
  --p: #4b56e8;
  --p-soft: rgba(75, 86, 232, 0.12);
  --shadow: 0 1px 2px rgba(20, 24, 60, 0.06), 0 6px 18px rgba(20, 24, 60, 0.07);
  --acc: var(--p);
  --t1: ${STANDARD_TONES['1']};
  --t2: ${STANDARD_TONES['2']};
  --t3: ${STANDARD_TONES['3']};
  --t4: ${STANDARD_TONES['4']};
  --t5: ${STANDARD_TONES['5']};

  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  font-size: 17px;
  line-height: 1.5;
  text-align: center;
  -webkit-font-smoothing: antialiased;
}

.nightMode.card, .night_mode .card, .card.nightMode {
  --bg: #121319;
  --surface: #1c1e27;
  --fg: #e8eaf2;
  --muted: #a3a9bb;
  --faint: #7e849a;
  --line: #2b2e3a;
  --soft: #22252f;
  --p: #9aa5ff;
  --p-soft: rgba(154, 165, 255, 0.16);
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 6px 18px rgba(0, 0, 0, 0.35);
  --t2: #e0b93b;
  --t5: #9aa0a6;
}

/* One accent per panel. They are the same hues in both themes — saturated enough
   to read on white, light enough to read on the dark ground. */
.ident, .block--grid { --acc: #2f6bff; }
.block--word { --acc: #00a884; }
.block--evolution { --acc: #ff8a00; }
.block--regional { --acc: #8a5cf6; }
.block--examples { --acc: #f0407a; }

.card-body {
  max-width: 620px;
  margin: 0 auto;
  padding: 26px 18px 34px;
  box-sizing: border-box;
}

/* A question is one short thing; sitting it against the top of a tall webview
   leaves it stranded. */
.front {
  min-height: 72vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.hanzi, .glyph-main, .ident-glyph, .forms, .ex-char {
  font-family: "Kaiti SC", "KaiTi", "STKaiti", "Noto Serif CJK SC", "Songti SC", serif;
}

/* ── Question sides ───────────────────────────────────────────────────── */

/* The question is one thing, on one panel: a bare glyph on the tinted ground
   looked like it had lost its card. */
.glyph-main {
  font-size: 132px;
  line-height: 1.1;
  padding: 18px 44px 26px;
  background: var(--surface);
  border-radius: 24px;
  box-shadow: var(--shadow);
}

.prompt {
  display: block;
  padding: 20px 30px 22px;
  background: var(--surface);
  border-radius: 24px;
  box-shadow: var(--shadow);
}

/* A pill, not a caption: it is the one line of metadata on a question side. */
.kangxi {
  display: inline-block;
  margin-top: 16px;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--p-soft);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--p);
}

/* A question side carries the whole note too, switched off — the bar and those
   panels are laid out across the card, not shrunk to the question's width. */
.front .bar, .front .extras { width: 100%; }
.front .extras { text-align: left; }
.front .extras .block:first-child, .front .extras .duo, .front .extras .ident { margin-top: 0; }

.prompt-meaning { display: block; font-size: 30px; font-weight: 600; }
.prompt-pinyin { display: block; margin-top: 2px; font-size: 21px; font-weight: 600; color: var(--p); }
.front--write .kangxi { margin-top: 12px; }

/* ── Identity column (right of the stroke grid) ───────────────────────── */

.back { text-align: left; }

.ident {
  min-width: 0;
  padding: 16px 18px 18px;
  background: var(--surface);
  border-radius: 16px;
  box-shadow: var(--shadow);
}

.ident-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.ident-glyph { font-size: 46px; line-height: 1; }
.ident-say { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.pinyin { font-size: 29px; font-weight: 700; letter-spacing: 0.01em; }
.zhuyin { font-size: 14px; color: var(--muted); }
.ident-meaning { margin-top: 2px; font-size: 20px; }

.ident-meta {
  display: inline-block;
  margin-top: 10px;
  padding: 4px 11px;
  border-radius: 999px;
  background: var(--p-soft);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--p);
}

.ident-readings { margin-top: 16px; }
.ident-readings h2 {
  margin: 0 0 8px;
  padding-left: 9px;
  border-left: 3px solid var(--acc);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--acc);
}

.forms {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 10px;
  font-size: 24px;
}

.forms-label {
  /* The row is set in the serif CJK face for the glyphs; its label is not a glyph. */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 11px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--faint);
}

.colloquial { margin-top: 10px; font-size: 15px; }
.coll-term { font-size: 19px; margin-right: 8px; }
.coll-pinyin { color: var(--muted); margin-right: 8px; }
.coll-en { color: var(--faint); font-style: italic; }

.audio-holder, .stroke-data { display: none; }

/* ── Blocks ───────────────────────────────────────────────────────────── */

/* Every part of the answer is a panel on the tinted ground, with one accent
   colour on its title rule — the block titles used to be five identical grey
   hairlines down a white page. */
.block {
  margin-top: 16px;
  padding: 15px 18px 17px;
  background: var(--surface);
  border-radius: 16px;
  box-shadow: var(--shadow);
}

.block h2 {
  margin: 0 0 11px;
  padding: 0 0 0 9px;
  border-left: 3px solid var(--acc);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--acc);
}

/* The Chinese name of a block is a footnote to the English one, not the title. */
.block h2 .h2-cn { text-transform: none; letter-spacing: 0; font-weight: 400; opacity: 0.85; }

/* The pair: the stroke animation on the left, what the radical is on the right. */
.duo {
  display: grid;
  grid-template-columns: minmax(0, 208px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

/* The grid is the block's whole body; it brings its own frame, so the panel
   holds it with less padding than a block of text needs. */
.block--grid { padding: 15px 8px 12px; }
.writer { max-width: 100%; box-sizing: border-box; }

.duo > .block { margin-top: 0; display: flex; flex-direction: column; }
.duo > .block .block-body { flex: 1 1 auto; display: flex; align-items: center; }
.duo > .block .block-body--center { justify-content: center; }

@media (max-width: 460px) {
  .duo { grid-template-columns: minmax(0, 1fr); gap: 18px; }
}

/* ── Writer ───────────────────────────────────────────────────────────── */

.writer-wrap { margin: 0 auto; text-align: center; }

.writer {
  display: inline-block;
  border: 1px solid var(--line);
  border-radius: 14px;
  background:
    linear-gradient(var(--line), var(--line)) center/100% 1px no-repeat,
    linear-gradient(var(--line), var(--line)) center/1px 100% no-repeat,
    var(--soft);
  line-height: 0;
}

.writer--missing { display: none; }

.writer-hint {
  margin-top: 9px;
  font-size: 10px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--faint);
}

.writer--done + .writer-hint { color: #4caf50; }

.front--write .writer-wrap { margin-top: 24px; }

/* ── Readings ─────────────────────────────────────────────────────────── */

.readings { width: 100%; border-collapse: collapse; font-size: 16px; }

.readings th {
  width: 88px;
  text-align: left;
  font-weight: 400;
  color: var(--faint);
  padding: 4px 12px 4px 0;
  vertical-align: top;
  white-space: nowrap;
}

.readings td { padding: 4px 0; }
.r-native { margin-right: 8px; }
.r-roman { color: var(--muted); font-style: italic; }

/* ── Word sense, glyph rows, examples ─────────────────────────────────── */

.as-word, .block--word .block-body { display: flex; align-items: baseline; gap: 10px; }
.word-pinyin { font-weight: 600; }

.glyph-row { display: flex; flex-wrap: wrap; gap: 8px; }

.glyph-row figure {
  margin: 0;
  width: 68px;
  padding: 8px 4px;
  background: var(--soft);
  border: 1px solid var(--line);
  border-radius: 12px;
  text-align: center;
}

.glyph-row img { width: 44px; height: 44px; object-fit: contain; display: block; margin: 0 auto 5px; }
.nightMode .glyph-row img, .night_mode .glyph-row img { filter: invert(1) hue-rotate(180deg); }
.glyph-row figcaption { font-size: 10px; line-height: 1.3; }
.glyph-cn { display: block; }
.glyph-en { display: block; color: var(--faint); }

.examples { list-style: none; margin: 0; padding: 0; width: 100%; }

.ex {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
}

.ex:last-child { border-bottom: 0; }
/* The glyph stays the text colour: the pinyin beside it is already tone-coloured,
   and two colour systems in one row read as noise. */
.ex-char { font-size: 28px; line-height: 1; min-width: 38px; }
.ex-body { display: block; }
.ex-pinyin { margin-right: 8px; font-weight: 600; }
.ex-zhuyin { margin-right: 8px; font-size: 13px; color: var(--faint); }
.ex-meaning { color: var(--muted); }

.chip {
  display: inline-block;
  padding: 2px 9px;
  border: 0;
  border-radius: 999px;
  background: var(--p-soft);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p);
  white-space: nowrap;
}

.chip--freq { margin-left: auto; flex: 0 0 auto; }

.foot {
  margin-top: 16px;
  padding: 10px 18px;
  border-radius: 12px;
  background: var(--soft);
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--faint);
}

.foot .muted { opacity: 0.8; }

/* ── Control bar ──────────────────────────────────────────────────────── */

/* In the card's flow, under the pair at the top — a bar pinned to the bottom of
   the webview covers the last row of a long answer as you scroll to it. What the
   card can *do* on the left, what it can *show* on the right: the panel switch
   and the dictionary drawer used to be a button floating over the corner of the
   webview and nothing at all. */
.bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  margin: 16px 0 2px;
}

.bar-actions { display: flex; gap: 8px; justify-content: center; }
.bar-side { display: flex; }
.bar-side--right { justify-content: flex-end; }

.bar-btn {
  -webkit-appearance: none;
  appearance: none;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: var(--p-soft);
  color: var(--p);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s ease, color 0.12s ease;
}

.bar-btn:active { background: var(--p); color: #fff; }

/* The two chrome buttons are not actions on the radical; they stay neutral so
   the play and practise buttons keep the colour. */
.bar-btn--tool { background: var(--soft); color: var(--muted); }
.bar-btn--tool:active { background: var(--muted); color: var(--surface); }

.ico { width: 18px; height: 18px; fill: currentColor; display: block; }

/* ── Drawers: the part switches (left), the dictionaries (right) ──────── */

.panel, .more {
  position: fixed;
  top: 0;
  z-index: 45;
  max-width: 76vw;
  height: 100%;
  box-sizing: border-box;
  padding: 10px 0 0;
  background: var(--surface);
  box-shadow: var(--shadow);
  transition: transform 0.16s ease;
  overflow-y: auto;
  text-align: left;
  font-size: 13px;
}

.panel {
  left: 0;
  width: 186px;
  border-right: 1px solid var(--line);
  transform: translateX(-100%);
}

.more {
  right: 0;
  width: 216px;
  border-left: 1px solid var(--line);
  transform: translateX(100%);
}

.xhz-panel .panel, .xhz-more .more { transform: translateX(0); }

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 8px 12px;
  border-bottom: 1px solid var(--line);
}

.panel-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--p);
}

.panel-close {
  -webkit-appearance: none;
  appearance: none;
  border: 0;
  padding: 2px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.panel-rows { padding: 4px 0; }

.panel-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  cursor: pointer;
  color: var(--fg);
}

.panel-row input { margin: 0; flex: none; accent-color: var(--p); }

.panel-foot {
  padding: 8px 12px 14px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--faint);
}

/* ── The dictionary drawer's own rows ─────────────────────────────────── */

.more-links { padding: 6px 8px 16px; }

.more-link {
  display: block;
  padding: 8px 10px;
  margin: 3px 0;
  border-radius: 10px;
  background: var(--soft);
  color: var(--fg);
  text-decoration: none;
}

.more-link:active { background: var(--p-soft); }
.more-name { display: block; font-size: 14px; font-weight: 600; }

.more-note {
  display: block;
  font-size: 10px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--faint);
}

/* One rule per switchable part. "grid" is the only one that is not a matter of
   hiding an element: it takes the guide lines off the box the strokes are drawn
   in, and the animation stays. */
${Object.keys(PART_LABELS)
	.filter((key) => key !== 'grid')
	.map((key) => `.card-body.xhz-h-${key} [data-xhz='${key}'] { display: none !important; }`)
	.join('\n')}

.card-body.xhz-h-grid .writer { border-color: transparent; background: var(--surface); }

/* ── Tones ────────────────────────────────────────────────────────────── */

.t1 { color: var(--t1); }
.t2 { color: var(--t2); }
.t3 { color: var(--t3); }
.t4 { color: var(--t4); }
.t5 { color: var(--t5); }

@media (max-width: 460px) {
  .card-body { padding: 20px 15px 30px; }
  .glyph-main { font-size: 104px; }
  .ident-head { gap: 10px; }
  .ident-glyph { font-size: 40px; }
}
`;

/** Tone colouring is a switch, so turning it off has to beat the tone rules. */
const NO_TONE_COLORS = `
.t1, .t2, .t3, .t4, .t5 { color: inherit; }
`;

/**
 * The identity panel is one surface with a shadow, so switching off everything
 * inside it leaves a blank white box — which is the *default* state of a question
 * side. One compound rule per side ("every row this side's panel has is hidden")
 * collapses it, in plain CSS: `:has()` is not old enough for every Anki webview.
 */
function identCollapseCss(o: RadicalDeckOptions): string {
	const sides = [
		new Set<CardPart>(),
		new Set<CardPart>(FRONT_SKIP.recognize),
		new Set<CardPart>(FRONT_SKIP.write)
	];
	const rules = sides
		.map((skip) => identParts(o, skip))
		.filter((parts) => parts.length)
		.map((parts) => `.card-body${parts.map((key) => `.xhz-h-${key}`).join('')} .ident`);
	return `${[...new Set(rules)].join(',\n')} { display: none; }`;
}

/** The deck CSS for one set of options. */
export function radicalCss(spec: Edition | RadicalDeckOptions = 'premium'): string {
	const o = asOptions(spec);
	const css = `${RADICAL_CSS}\n${identCollapseCss(o)}\n`;
	return o.toneColors ? css : css + NO_TONE_COLORS;
}

/**
 * genanki writes every card with `due = 0` and every note with `sfld = 0`, so
 * Anki has nothing to order the new queue by and the deck comes out shuffled on
 * import. Number the new cards by Kangxi number instead — siblings of a note
 * share one position, which is what Anki itself does — and put the same number
 * in the note's sort field so the browser lists the deck in Kangxi order too.
 *
 * `notes.sfld` is declared `integer` in Anki's schema, so SQLite stores the
 * number as a number and sorts 2 before 10 without any zero-padding.
 *
 * Lives here, beside the field list it indexes into, because both the offline
 * builder and the in-browser one have to do it to the same effect.
 */
export interface ApkgDb {
	exec(sql: string): { values: unknown[][] }[];
	prepare(sql: string): { run(params: unknown[]): void; free(): void };
	run(sql: string): void;
}

export function orderByKangxi(db: ApkgDb): void {
	const numberOrd = RADICAL_FIELDS.indexOf('Number');
	const rows = db.exec('SELECT id, flds FROM notes');
	if (!rows.length) return;

	const setNote = db.prepare('UPDATE notes SET sfld = ? WHERE id = ?');
	const setCards = db.prepare('UPDATE cards SET due = ? WHERE nid = ?');
	db.run('BEGIN');
	for (const [id, flds] of rows[0].values) {
		const position = Number(String(flds).split('\x1f')[numberOrd]) || 0;
		setNote.run([position, id]);
		setCards.run([position, id]);
	}
	db.run('COMMIT');
	setNote.free();
	setCards.free();
}
