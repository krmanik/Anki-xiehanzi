import{n as e}from"./DCWD7sYM.js";import{a as t}from"./CFFI4KRD.js";var n=[{value:`recognize`,name:`Recognize`,label:`Recognition — glyph on the front`},{value:`write`,name:`Write`,label:`Writing — produce it from the meaning`}],r={edition:`free`,cards:[`recognize`,`write`],audio:!0,strokeOrder:!0,readings:!0,colloquial:!0,examples:!0,glyphs:!1,asWord:!1,toneColors:!0,fieldToggles:!1},i={...r,edition:`premium`,glyphs:!0,asWord:!0,fieldToggles:!0};function a(e=`premium`,t={}){let a={...e===`free`?r:i,...t,edition:e},o=n.map(e=>e.value).filter(e=>a.cards.includes(e));return{...a,cards:o.length?o:[`recognize`],glyphs:e===`premium`&&a.glyphs,asWord:e===`premium`&&a.asWord,fieldToggles:e===`premium`&&a.fieldToggles}}var o=(e=`premium`)=>typeof e==`string`?a(e):e,s={premium:{recognize:`1969669521`,write:`1969669523`},free:{recognize:`1969669522`,write:`1969669524`}};s.premium.recognize;var c=(e=`premium`,t=`recognize`)=>s[e][t],l=(e=`premium`,t=`recognize`)=>`Kangxi Radical${e===`free`?` Free`:``} ${t===`write`?`Write`:`Recognize`} - (Anki-xiehanzi)`;function u(e=`premium`,t){let n=`Anki xiehanzi::Kangxi Radicals${e===`free`?` (Free)`:``}`;return t?`${n}::${t===`write`?`Write`:`Recognize`}`:n}var d=(e,t=`mp3`)=>`xhz-radical-${e.number}.${t}`,f=e=>`_xhzr-${e}`,p=`Number.Radical.Variants.Simplified.Traditional.Strokes.StrokeLabel.Pinyin.Meaning.Colloquial.ColloquialPinyin.ColloquialMeaning.HanViet.Japanese.Korean.Frequency.Productivity.Band.Examples.Evolution.Regional.Audio.StrokeData.Zhuyin.AsWord.Unicode.KangxiForm`.split(`.`),m=e=>String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`);function h(e){return(e??``).split(/(\s+)/).map(e=>e.trim()?`<span class="t${t(e)}">${m(e)}</span>`:m(e)).join(``)}function g(e){return e?.length?`<ul class="examples">${e.map(e=>`<li class="ex"><span class="ex-char">${m(e.char)}</span><span class="ex-body"><span class="ex-pinyin">${h(e.pinyin)}</span>`+(e.zhuyin?`<span class="ex-zhuyin">${m(e.zhuyin)}</span>`:``)+`<span class="ex-meaning">${m(e.meaning)}</span></span>`+(e.band?`<span class="chip chip--freq">${m(e.band)}</span>`:``)+`</li>`).join(``)}</ul>`:``}function _(e){return e?.meaning?`<span class="word-pinyin">${h(e.pinyin)}</span><span class="word-meaning">${m(e.meaning)}</span>`+(e.band?`<span class="chip chip--freq">${m(e.band)}</span>`:``):``}function v(e,t){return e?.length?`<div class="glyph-row glyph-row--${t}">${e.map(e=>{let t=m(e.script??e.region??``);return`<figure class="glyph"><img src="${m(f(e.file))}" alt="${m(e.label)}"><figcaption><span class="glyph-cn">${t}</span><span class="glyph-en">${m(e.label)}</span></figcaption></figure>`}).join(``)}</div>`:``}function y(e,t){let n=[e,t].map(e=>(e??``).trim()).filter(Boolean);return n.length?n.map((e,t)=>t===0&&n.length>1?`<span class="r-native">${m(e)}</span>`:`<span class="r-roman">${m(e)}</span>`).join(` `):``}function b(e,t={}){let n=t.audio===void 0?d(e):t.audio;return{Number:String(e.number),Radical:e.char,Variants:e.variants.join(` `),Simplified:e.simplified.join(` `),Traditional:e.traditional.join(` `),Strokes:String(e.strokes),StrokeLabel:`${e.strokes} stroke${e.strokes===1?``:`s`}`,Pinyin:h(e.pinyin),Meaning:m(e.meaning),Colloquial:m(e.colloquial?.term??``),ColloquialPinyin:h(e.colloquial?.pinyin??``),ColloquialMeaning:m(e.colloquial?.english??``),HanViet:m(e.hanviet),Japanese:y(e.kana,e.romaji),Korean:y(e.hangul,e.romaja),Frequency:e.frequency?String(e.frequency):``,Productivity:x(e.frequency),Band:e.frequency?S(e.frequency):``,Examples:g(e.examples),Evolution:v(e.evolution,`evolution`),Regional:v(e.compare,`regional`),Audio:n?`[sound:${n}]`:``,StrokeData:t.strokeData??``,Zhuyin:m(e.zhuyin??``),AsWord:_(e.word),Unicode:m(e.unicode??``),KangxiForm:e.kangxiForm?`${m(e.kangxiForm)} <span class="muted">U+${e.kangxiForm.codePointAt(0).toString(16).toUpperCase()}</span>`:``}}function x(e){return e?`${e} character${e===1?``:`s`}`:``}function S(e){return e?e>=300?`Very common`:e>=100?`Common`:e>=30?`Moderate`:`Rare`:``}function C(e){let t=[`Xiehanzi`,`Kangxi_Radical`,`Strokes::${String(e.strokes).padStart(2,`0`)}`],n=S(e.frequency)||`Rare`;return t.push(`Productivity::${n.replace(/\s+/g,`_`)}`),t}function w(e,t=`premium`,n=`recognize`){let r=`xiehanzi-radical:${c(t,n)}:${e.number}:${e.char}`,i=2166136261,a=522970236;for(let e=0;e<r.length;e++){let t=r.charCodeAt(e);i=Math.imul(i^t,16777619),a=Math.imul(a^t,16777619)}return(i>>>0).toString(36).padStart(7,`0`)+(a>>>0).toString(36).padStart(7,`0`)}var T=`_xhz-hanzi-writer.js`,E=`<script>
(function () {
  // Anki reuses one webview across cards, so the handler the last card left on
  // window would drive a writer that is no longer on screen. Drop it first, and
  // let this card's boot put its own back.
  window.xhzWriterAction = null;

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
    var body = document.querySelector('.card-body');
    // Every client spells it differently: Anki desktop puts nightMode and
    // night_mode on the body, AnkiDroid night-mode on the html element.
    var night = document.body.classList.contains('nightMode') ||
                document.body.classList.contains('night_mode') ||
                document.documentElement.classList.contains('night-mode') ||
                document.documentElement.classList.contains('night_mode');
    // Stroke colours come off the live CSS variables, so the writer tracks the
    // card's palette instead of keeping its own copy of it (the word decks read
    // theirs the same way).
    function cssVar(name, fallback) {
      try {
        var v = getComputedStyle(document.body).getPropertyValue(name);
        return (v || '').trim() || fallback;
      } catch (e) { return fallback; }
    }
    // The outline is a switch like any other part; the card body carries its
    // state, so the writer and the panel cannot disagree about it.
    function outlineOn() { return !(body && body.classList.contains('xhz-h-outline')); }
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
      showOutline: outlineOn(),
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 200,
      strokeColor: cssVar('--fg', night ? '#e8eaed' : '#16181d'),
      outlineColor: cssVar('--line', night ? '#3a3d42' : '#dfe2e6'),
      drawingColor: cssVar('--p', night ? '#9aa5ff' : '#4b56e8'),
      highlightColor: '#4caf50',
      showHintAfterMisses: 2
    });

    var hint = document.getElementById('xhz-writer-hint');
    function say(text) { if (hint) hint.textContent = text; }

    function applyOutline() {
      if (outlineOn()) writer.showOutline(); else writer.hideOutline();
    }

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
      // An outline to trace is not recall — the hint after two misses is. The
      // reader can put it back with the switch, which is what the word decks do.
      applyOutline();
      writer.hideCharacter();
      writer.quiz({ onComplete: function () {
        host.classList.add('writer--done');
        say('Done');
      } });
      say('Write it');
    }

    // The control bar and the switches talk to the writer through this, so their
    // markup stays free of any knowledge of Hanzi Writer.
    window.xhzWriterAction = function (action) {
      if (action === 'practice') quiz();
      else if (action === 'hint') writer.animateCharacter();
      else if (action === 'outline') applyOutline();
      else animate();
    };

    // AnkiMobile reads a tap anywhere on the card as "show answer" unless the
    // element says otherwise, which is what the tappable class on the grid is
    // for; stopping the event here covers the clients that have no such rule.
    host.addEventListener('click', function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
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
      else { tag.src = '${T}'; tag.onload = tag.onerror = done; }
      document.head.appendChild(tag);
      if (source) done();
    }

    try {
      fetch('${T}').then(function (res) {
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
<\/script>`;function D(e,t=!0){let n=`<div class="writer-wrap" ${W(`outline`)}>
  <div id="xhz-writer" class="writer tappable" ${W(`grid`)} data-char="{{text:Radical}}" data-mode="${e}"></div>
  <div id="xhz-writer-hint" class="writer-hint">${e===`quiz`?`Write it`:`Tap to replay`}</div>
</div>
<div id="xhz-stroke-data" class="stroke-data">{{text:StrokeData}}</div>
${E}`;return t?`{{#StrokeData}}\n${n}\n{{/StrokeData}}`:n}var O={play:`<path d="M8 5.5v13l11-6.5z"/>`,replay:`<path d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/>`,pencil:`<path d="m4 16.2 9.4-9.4 4.1 4.1L8.1 20H4zM15 5.2l1.6-1.6a1.2 1.2 0 0 1 1.7 0l2.4 2.4a1.2 1.2 0 0 1 0 1.7L19.1 9.3z"/>`,eye:`<path d="M12 5.5c-4.5 0-8 4-9 6.5 1 2.5 4.5 6.5 9 6.5s8-4 9-6.5c-1-2.5-4.5-6.5-9-6.5zm0 11a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-2.2a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z"/>`,sliders:`<path d="M4 7h9v2H4zm12 0h4v2h-4zM4 15h4v2H4zm7 0h9v2h-9z"/><path d="M13.5 5.5h2v5h-2zm-5 8h2v5h-2z"/>`,more:`<path d="M12 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>`,close:`<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.8"/>`,github:`<path d="M12 .5C5.7.5.9 5.4.9 11.6c0 4.9 3.2 9.1 7.6 10.5.6.1.8-.2.8-.5v-1.9c-3.1.7-3.8-1.5-3.8-1.5-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.6 1.2 3.2.9.1-.7.4-1.2.7-1.5-2.5-.3-5.1-1.2-5.1-5.5 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.4.1-3 0 0 .9-.3 3.1 1.1a10.6 10.6 0 0 1 5.6 0c2.1-1.4 3.1-1.1 3.1-1.1.6 1.6.2 2.7.1 3 .7.8 1.1 1.8 1.1 3 0 4.3-2.6 5.2-5.1 5.5.4.4.8 1 .8 2.1v3.1c0 .3.2.6.8.5 4.4-1.4 7.6-5.6 7.6-10.5C23.1 5.4 18.3.5 12 .5z"/>`},k=`https://github.com/krmanik/Anki-xiehanzi`,A=e=>`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${O[e]}</svg>`,j=`var h=document.getElementById('xhz-audio'),e=h&amp;&amp;h.getElementsByTagName('*')[0];if(e)e.tagName==='AUDIO'?e.play():e.click()`,M=e=>`if(window.xhzWriterAction)window.xhzWriterAction('${e}')`,N={audio:{label:`Play audio`,icon:`play`,call:j,field:`Audio`},replay:{label:`Replay the strokes`,icon:`replay`,call:M(`replay`),field:`StrokeData`},practice:{label:`Practise writing it`,icon:`pencil`,call:M(`practice`),field:`StrokeData`},hint:{label:`Show me a stroke`,icon:`eye`,call:M(`hint`),field:`StrokeData`}},P=`<button type="button" class="bar-btn bar-btn--tool cog tappable" aria-label="Show or hide parts of the card" title="Show or hide parts of the card" onclick="document.querySelector('.card-body').classList.toggle('xhz-panel')">${A(`sliders`)}</button>`,F=`<button type="button" class="bar-btn bar-btn--tool more-btn tappable" aria-label="Look it up elsewhere" title="Look it up elsewhere" onclick="document.querySelector('.card-body').classList.toggle('xhz-more')">${A(`more`)}</button>`;function I(e,t={}){let n=e.map(e=>{let t=N[e];return`{{#${t.field}}}<button type="button" class="bar-btn tappable" aria-label="${t.label}" title="${t.label}" onclick="${t.call}">${A(t.icon)}</button>{{/${t.field}}}`}).join(`
    `);if(!e.length&&!t.cog&&!t.more)return``;let r=e.length?`<div class="bar-actions" ${W(`buttons`)}>\n    ${n}\n  </div>`:`<div class="bar-actions"></div>`,i=t.more?`<div class="bar-side bar-side--right" ${W(`buttons`)}>\n    ${F}\n  </div>`:`<div class="bar-side bar-side--right"></div>`;return`<div class="bar">
  <div class="bar-side bar-side--left">${t.cog?`\n    ${P}\n  `:``}</div>
  ${r}
  ${i}
</div>`}var L=`<aside class="more" aria-label="Look it up elsewhere">
  <div class="panel-head">
    <span class="panel-title">Look it up</span>
    <button type="button" class="panel-close tappable" aria-label="Close" onclick="document.querySelector('.card-body').classList.remove('xhz-more')">${A(`close`)}</button>
  </div>
  <div class="more-links">
${[{label:`Pleco`,note:`iOS · Android`,href:`plecoapi://x-callback-url/df?hw={{text:Radical}}`},{label:`zdic 汉典`,note:`Chinese`,href:`https://www.zdic.net/hans/{{text:Radical}}`},{label:`MDBG`,note:`Dictionary`,href:`https://www.mdbg.net/chinese/dictionary?wdqb={{text:Radical}}`},{label:`HanziCraft`,note:`Breakdown`,href:`https://hanzicraft.com/character/{{text:Radical}}`},{label:`Wiktionary`,note:`Etymology`,href:`https://en.wiktionary.org/wiki/{{text:Radical}}`},{label:`Youdao`,note:`Chinese`,href:`http://dict.youdao.com/search?q={{text:Radical}}`},{label:`Forvo`,note:`Pronunciation`,href:`https://forvo.com/word/{{text:Radical}}/#zh`},{label:`Tatoeba`,note:`Sentences`,href:`https://tatoeba.org/en/sentences/search?from=cmn&query={{text:Radical}}`}].map(e=>`    <a class="more-link tappable" href="${e.href}"><span class="more-name">${e.label}</span><span class="more-note">${e.note}</span></a>`).join(`
`)}
  </div>
</aside>`,R=`{{#Audio}}<div id="xhz-audio" class="audio-holder">{{Audio}}</div>{{/Audio}}`,z=e=>[`var r=document.querySelector('.card-body'),k='${e}';`,`r.classList.toggle('xhz-h-'+k,!this.checked);`,`try{`,`var s=r.getAttribute('data-side')||'front',n='xhz.hide2.'+s,`,`l=(localStorage.getItem(n)||'').split(',').filter(Boolean),i=l.indexOf(k);`,`if(this.checked){if(i>-1)l.splice(i,1)}else if(i<0)l.push(k);`,`localStorage.setItem(n,l.join(','))`,`}catch(e){}`,e===`outline`?`if(window.xhzWriterAction)window.xhzWriterAction('outline');`:``,`if(window.xhzSync)window.xhzSync()`].join(``);function B(e){if(!e.length)return``;let t=e.map(e=>`    <label class="panel-row tappable" data-row="${e}"><input class="tappable" type="checkbox" checked value="${e}" onchange="${z(e)}"><span>${H[e]}</span></label>`).join(`
`);return`<aside class="panel" aria-label="Show or hide parts of the card">
  <div class="panel-brand">
    <span class="brand-text">
      <span class="brand-name">Anki-xiehanzi</span>
      <span class="brand-sub">Radicals</span>
    </span>
    <button type="button" class="panel-close tappable" aria-label="Close" onclick="document.querySelector('.card-body').classList.remove('xhz-panel')">${A(`close`)}</button>
  </div>
  <div class="panel-head">
    <span class="panel-title">Show</span>
    <span class="panel-note">This side only</span>
  </div>
  <div class="panel-rows">
${t}
  </div>
  <div class="panel-foot">
    <a class="panel-gh tappable" href="${k}">${A(`github`)}<span>View on GitHub</span></a>
  </div>
</aside>`}var V=`<script>
(function () {
  var root = document.querySelector('.card-body');
  if (!root) return;
  // The side's own name — 'recognize', 'write' or 'back'. Not front/back: the two
  // question sides hide different things, so a shared entry made each of them
  // undo the other's defaults (the writing card came up showing the glyph).
  var side = root.getAttribute('data-side') || (root.classList.contains('back') ? 'back' : 'front');
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

  // The identity column and the prompt are each one panel — a surface with a
  // shadow — so a panel whose every row is switched off is a blank white box on
  // the card. The CSS collapses the states known in advance; this covers the
  // ones that are not, such as a row left on for a part this note has not got.
  // The switches call it if it is there and work the same if it is not.
  window.xhzSync = function () {
    var boxes = root.querySelectorAll('.ident, .prompt, .extras');
    // Clear every verdict before taking a new one, then work from the innermost
    // box outwards: the extras wrap holds the identity panel, so measuring the
    // wrap first would read a panel this pass is about to bring back as empty.
    for (var r = 0; r < boxes.length; r++) boxes[r].style.display = '';
    for (var b = boxes.length - 1; b >= 0; b--) {
      var kids = boxes[b].children, live = 0;
      for (var k = 0; k < kids.length; k++) {
        var style = getComputedStyle(kids[k]);
        if (!style || style.display !== 'none') live++;
      }
      if (!live) boxes[b].style.display = 'none';
    }
  };
  try { window.xhzSync(); } catch (e) {}
})();
<\/script>`,H={strokes:`Stroke order`,grid:`Grid lines`,outline:`Character outline`,glyph:`Glyph`,pinyin:`Pinyin`,zhuyin:`Zhuyin`,meaning:`Meaning`,meta:`Kangxi line`,forms:`Other forms`,name:`Teaching name`,readings:`Readings`,word:`As a word`,evolution:`Evolution`,regional:`Regional forms`,examples:`Examples`,buttons:`Buttons`,codes:`Codepoints`},U={pinyin:[`.ex-pinyin`,`.coll-pinyin`,`.word-pinyin`],zhuyin:[`.ex-zhuyin`],meaning:[`.ex-meaning`,`.word-meaning`]},W=e=>`data-xhz="${e}"`,G=(e,t,n,r=``,i)=>{let a=`<section class="block${r?` ${r}`:``}"${i?` ${W(i)}`:``}>
  <h2>${e}</h2>
  <div class="block-body">${t}</div>
</section>`;return n?`{{#${n}}}${a}{{/${n}}}`:a},K=`<table class="readings">
      {{#HanViet}}<tr><th>Hán-Việt</th><td>{{HanViet}}</td></tr>{{/HanViet}}
      {{#Japanese}}<tr><th>日本語</th><td>{{Japanese}}</td></tr>{{/Japanese}}
      {{#Korean}}<tr><th>한국어</th><td>{{Korean}}</td></tr>{{/Korean}}
    </table>`;function q(e,t=new Set){return[`glyph`,`pinyin`,...e.asWord?[`zhuyin`]:[],`meaning`,`meta`,`forms`,...e.colloquial?[`name`]:[],...e.readings?[`readings`]:[]].filter(e=>!t.has(e))}function J(e,t=new Set){let n=e=>!t.has(e),r=n(`forms`)?`{{#Variants}}<div class="forms" ${W(`forms`)}><span class="forms-label">also written</span>{{Variants}}</div>{{/Variants}}
  {{#Simplified}}<div class="forms" ${W(`forms`)}><span class="forms-label">simplified</span>{{Simplified}}</div>{{/Simplified}}
  {{#Traditional}}<div class="forms" ${W(`forms`)}><span class="forms-label">traditional</span>{{Traditional}}</div>{{/Traditional}}`:``,i=e.colloquial&&n(`name`)?`{{#Colloquial}}<div class="colloquial" ${W(`name`)}>
    <span class="coll-term">{{Colloquial}}</span>
    <span class="coll-pinyin">{{ColloquialPinyin}}</span>
    {{#ColloquialMeaning}}<span class="coll-en">{{ColloquialMeaning}}</span>{{/ColloquialMeaning}}
  </div>{{/Colloquial}}`:``,a=e.readings&&n(`readings`)?`<div class="ident-readings" ${W(`readings`)}>
    <h2>Readings</h2>
    ${K}
  </div>`:``,o=[n(`pinyin`)?`<span class="pinyin" ${W(`pinyin`)}>{{Pinyin}}</span>`:``,e.asWord&&n(`zhuyin`)?`{{#Zhuyin}}<span class="zhuyin" ${W(`zhuyin`)}>{{Zhuyin}}</span>{{/Zhuyin}}`:``].join(``),s=[n(`glyph`)?`    <span class="ident-glyph" ${W(`glyph`)}>{{Radical}}</span>`:``,o&&`    <span class="ident-say">\n      ${o}\n    </span>`].filter(Boolean),c=[s.length&&`  <div class="ident-head">\n${s.join(`
`)}\n  </div>`,n(`meaning`)&&`  <div class="ident-meaning" ${W(`meaning`)}>{{Meaning}}</div>`,n(`meta`)&&`  <div class="ident-meta" ${W(`meta`)}>Kangxi {{Number}} · {{StrokeLabel}}{{#Productivity}} · {{Productivity}}{{/Productivity}}{{#Band}} · {{Band}}{{/Band}}</div>`,r&&`  ${r}`,i&&`  ${i}`,a&&`  ${a}`].filter(Boolean);return c.length?[`<div class="ident">`,...c,`</div>`].join(`
`):``}function Y(e,t,n=new Set){let r=e.strokeOrder&&!n.has(`strokes`)?`{{#StrokeData}}<section class="block block--grid" ${W(`strokes`)}>
  <h2>Stroke order</h2>
  <div class="block-body block-body--center">
${D(`animate`,!1)}
  </div>
</section>{{/StrokeData}}`:``,i=J(e,n);return[r?`<div class="duo">\n${[r,i].filter(Boolean).join(`
`)}\n</div>`:i,t,e.asWord&&!n.has(`word`)&&G(`As a word`,`{{AsWord}}`,`AsWord`,`block--word`,`word`),e.glyphs&&!n.has(`evolution`)&&G(`Evolution <span class="h2-cn">字源演变</span>`,`{{Evolution}}`,`Evolution`,`block--evolution`,`evolution`),e.glyphs&&!n.has(`regional`)&&G(`Regional forms <span class="h2-cn">字形对比</span>`,`{{Regional}}`,`Regional`,`block--regional`,`regional`),e.examples&&!n.has(`examples`)&&G(`Examples`,`{{Examples}}`,`Examples`,`block--examples`,`examples`),e.asWord&&!n.has(`codes`)&&`<div class="foot" ${W(`codes`)}>
  {{#Unicode}}<span>{{Unicode}}</span>{{/Unicode}}
  {{#KangxiForm}}<span>Kangxi radical form {{KangxiForm}}</span>{{/KangxiForm}}
</div>`].filter(Boolean).join(`

`)}var X=`  <div class="glyph-main" ${W(`glyph`)}>{{Radical}}</div>
  <div class="kangxi" ${W(`meta`)}>Kangxi radical {{Number}} · {{StrokeLabel}}</div>`;function Z(e,t=new Set){return[...e.strokeOrder?[`strokes`,`grid`,`outline`]:[],`glyph`,`pinyin`,...e.asWord?[`zhuyin`]:[],`meaning`,`meta`,`forms`,...e.colloquial?[`name`]:[],...e.readings?[`readings`]:[],...e.asWord?[`word`]:[],...e.glyphs?[`evolution`,`regional`]:[],...e.examples?[`examples`]:[],...e.asWord?[`codes`]:[]].filter(e=>!t.has(e))}var Q={recognize:[`glyph`,`meta`],write:[`meaning`,`pinyin`,`meta`]};function $(e=`premium`){let t=o(e),r=[...t.audio?[`audio`]:[],...t.strokeOrder?[`replay`,`practice`]:[]],i=e=>t.fieldToggles?`${B(e)}\n${V}`:``,a=[...Z(t).filter(e=>e!==`codes`),...r.length?[`buttons`]:[],...t.asWord?[`codes`]:[]],s=`<div class="card-body back" data-side="back">
${Y(t,I(r,{cog:t.fieldToggles,more:!0}))}
${i(a)}
${L}
${t.audio?R:``}
</div>`,c=e=>{if(!t.fieldToggles)return{html:``,parts:[],hidden:``};let n=new Set([...e,`strokes`,`grid`,`outline`,`buttons`]),r=Z(t,n);return r.length?{html:`<div class="extras">\n${Y(t,``,n)}\n</div>`,parts:r,hidden:r.map(e=>` xhz-h-${e}`).join(``)}:{html:``,parts:r,hidden:``}},l=c(Q.recognize),u=c(Q.write),d={recognize:`<div class="card-body front front--recognize${l.hidden}" data-side="recognize">
${X}
${I([],{cog:t.fieldToggles})}
${l.html}
${i([`glyph`,`meta`,...l.parts])}
</div>`,write:`<div class="card-body front front--write${u.hidden} xhz-h-outline" data-side="write">
  <div class="prompt">
    <span class="prompt-meaning" ${W(`meaning`)}>{{Meaning}}</span>
    <span class="prompt-pinyin" ${W(`pinyin`)}>{{Pinyin}}</span>
  </div>
  <div class="kangxi" ${W(`meta`)}>Kangxi radical {{Number}} · {{StrokeLabel}}</div>
${D(`quiz`)}
${I([`hint`,`replay`],{cog:t.fieldToggles})}
${u.html}
${i([`meaning`,`pinyin`,`meta`,`grid`,`outline`,`buttons`,...u.parts])}
</div>`};return t.cards.map(e=>({name:n.find(t=>t.value===e).name,qfmt:d[e],afmt:s}))}function ee(e=`premium`){let t=e=>p.indexOf(e),n={recognize:[t(`Radical`)],write:[t(`Meaning`),t(`StrokeData`)]};return o(e).cards.map((e,t)=>[t,`all`,n[e]])}var te=`
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
  --t1: ${e[1]};
  --t2: ${e[2]};
  --t3: ${e[3]};
  --t4: ${e[4]};
  --t5: ${e[5]};

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

/* Every client marks night mode differently: Anki desktop puts nightMode on the
   body, AnkiDroid and AnkiMobile night_mode, and some wrap the card instead. */
.nightMode.card, .card.nightMode, .card.night_mode, .night_mode .card, .nightMode .card {
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

/* AnkiMobile reads a tap anywhere on the card as "show answer" unless the
   element carries this class — which is why tapping the writing grid used to
   flip the card instead of drawing a stroke. Every control on the card has it,
   the same convention the word decks follow. */
.tappable {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

/* The one exception: strokes are drawn on the grid, so the browser must not
   claim the gesture for scrolling or zooming. */
.writer.tappable { touch-action: none; }

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

/* The meaning is the answer to the recognition card, and it was sitting 2px
   under the glyph line — close enough to read as part of it. It gets room on
   both sides instead. */
.ident-meaning { margin-top: 10px; font-size: 20px; line-height: 1.35; }

.ident-meta {
  display: inline-block;
  margin-top: 14px;
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
.nightMode .glyph-row img, .night_mode .glyph-row img,
.nightMode.card .glyph-row img, .card.night_mode .glyph-row img {
  filter: invert(1) hue-rotate(180deg);
}
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
  /* A column so the project link sits at the foot of the drawer rather than
     floating under the last switch on a side with only a few of them. */
  display: flex;
  flex-direction: column;
}

.more {
  right: 0;
  width: 216px;
  border-left: 1px solid var(--line);
  transform: translateX(100%);
}

.xhz-panel .panel, .xhz-more .more { transform: translateX(0); }

/* The deck's name, at the top of the drawer. */
.panel-brand {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 10px 10px 12px;
  border-bottom: 1px solid var(--line);
}

.brand-text { display: block; }

.brand-name {
  display: block;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--p);
}

.brand-sub {
  display: block;
  margin-top: 1px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--faint);
}

.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 10px 6px 12px;
}

.panel-note {
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--faint);
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

.panel-rows { flex: 1 0 auto; padding: 4px 0; }

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
  margin-top: 4px;
  padding: 8px 8px 16px;
  border-top: 1px solid var(--line);
}

.panel-gh {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--soft);
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
}

.panel-gh:active { background: var(--p-soft); color: var(--p); }
.panel-gh .ico { width: 15px; height: 15px; }

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

/* One rule per switchable part, and a switch means the *whole card*: turning
   zhuyin off has to take the zhuyin out of the example rows too, or the switch
   is only telling half the truth. The data-xhz attribute marks what the template
   owns; PART_SELECTORS names what the note's own HTML calls the same thing.

   Two parts are not a matter of hiding an element at all: "grid" takes the guide
   lines off the box the strokes are drawn in, and "outline" is a call into the
   writer (see toggleCall) — both leave the animation where it is. */
${Object.keys(H).filter(e=>e!==`grid`&&e!==`outline`).map(e=>`${[`[data-xhz='${e}']`,...U[e]??[]].map(t=>`.card-body.xhz-h-${e} ${t}`).join(`,
`)} { display: none !important; }`).join(`
`)}

.card-body.xhz-h-grid .writer { border-color: transparent; background: var(--surface); }

/* Both halves of the question's prompt gone leaves an empty white panel sitting
   above the grid; same reasoning as the identity panel below. */
.card-body.xhz-h-meaning.xhz-h-pinyin .prompt { display: none; }

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
`,ne=`
.t1, .t2, .t3, .t4, .t5 { color: inherit; }
`;function re(e){let t=[new Set,new Set(Q.recognize),new Set(Q.write)].map(t=>q(e,t)).filter(e=>e.length).map(e=>`.card-body${e.map(e=>`.xhz-h-${e}`).join(``)} .ident`);return`${[...new Set(t)].join(`,
`)} { display: none; }`}function ie(e=`premium`){let t=o(e),n=`${te}\n${re(t)}\n`;return t.toneColors?n:n+ne}function ae(e){let t=p.indexOf(`Number`),n=e.exec(`SELECT id, flds FROM notes`);if(!n.length)return;let r=e.prepare(`UPDATE notes SET sfld = ? WHERE id = ?`),i=e.prepare(`UPDATE cards SET due = ? WHERE nid = ?`);e.run(`BEGIN`);for(let[e,a]of n[0].values){let n=Number(String(a).split(``)[t])||0;r.run([n,e]),i.run([n,e])}e.run(`COMMIT`),r.free(),i.free()}export{b as a,ae as c,w as d,a as f,$ as h,d as i,ie as l,C as m,n,c as o,ee as p,p as r,l as s,T as t,u};