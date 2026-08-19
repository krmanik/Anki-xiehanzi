/**
 * Anki card templates (front / back / writing component) and shared CSS.
 *
 * Offline-first: no network CDNs. The persistence library, the Hanzi Writer
 * library and the stroke-order data all ship inside the .apkg as media files
 * (underscore-prefixed names so Anki keeps them and syncs them across devices):
 *   _anki-persistence.js     review preferences (https://github.com/SimonLammer/anki-persistence)
 *   _hanzi-writer.min.js     stroke animation/quiz engine
 *   _hanzi-writer-data.json  { char: {strokes, medians} } subset for the deck's words
 */

const FIELDS = {
    SIMPLIFIED: 'Simplified',
    TRADITIONAL: 'Traditional',
    PINYIN: 'Pinyin',
    ZHUYIN: 'Zhuyin',
    PART_OF_SPEECH: 'PartOfSpeech',
    SIMPLE_MEANING: 'SimpleMeaning',
    DEFINITIONS: 'Definitions',
    BREAKDOWN: 'Breakdown',
    RADICAL: 'Radical',
    HSK_LEVEL: 'HskLevel',
    FREQUENCY: 'Frequency',
    EXAMPLES: 'Examples',
    AUDIO: 'Audio',
};

// Persistence library, loaded from bundled media (works offline, one copy).
// anki-persistence only upgrades to localStorage when the UA contains "Mobile",
// which iPadOS 13+ does not send (its WKWebView reports a Macintosh UA). The
// sessionStorage fallback is wiped between cards in the mobile reviewers, so
// force localStorage on every non-desktop client where it actually works.
const PERSISTENCE =
`<script src="_anki-persistence.js"></script>
<script>
    if (window.ankiPlatform != "desktop" && window.Persistence_localStorage) {
        var _p = new Persistence_localStorage();
        if (_p.isAvailable()) window.Persistence = _p;
    }
</script>`;

// Right-side dictionary links. Identical on every template; {{Simplified}} only.
const MORE_INFO_SIDEBAR =
`<div id="more-info-sidebar" class="more-info-sidebar">
    <a class="fieldset-item tappable">
        <div class="more-side-brand">
            <div class="brand-title">写汉字</div>
            <div class="brand-sub-title">xiě hànzì</div>
        </div>
        <div onclick="closeSidebar('more-info-sidebar')" class="close-button close2">✖</div>
    </a>
    <a class="fieldset-item tappable" id="plecoMobile" href="plecoapi://x-callback-url/df?hw={{Simplified}}"><img src="_pleco.png"><small>Pleco</small></a>
    <a class="fieldset-item tappable" href="http://dict.youdao.com/search?q={{Simplified}}"><img src="_youdao.png"><small>Youdao</small></a>
    <a class="fieldset-item tappable" href="https://hanzicraft.com/character/{{Simplified}}"><img src="_hanzicraft.png"><small>HanziCraft</small></a>
    <a class="fieldset-item tappable" href="https://characterpop.com/characters/{{Simplified}}"><img src="_characterpop.svg"><small>CharacterPop</small></a>
    <a class="fieldset-item tappable" href="http://rtega.be/chmn/index.php?c={{Simplified}}"><img src="_rtega.png"><small>Rtega</small></a>
    <a class="fieldset-item tappable" href="https://tatoeba.org/en/sentences/search?from=cmn&query={{Simplified}}&to="><img src="_tatoeba.png"><small>Tatoeba</small></a>
</div>`;

// Shared sidebar helpers + DOM builders. Building the toggle rows in JS keeps
// the template markup tiny while supporting every option in Anki.
const SIDEBAR_JS =
`    function showHide(type, isShow, style) {
        style = style || "inline";
        document.querySelectorAll(type).forEach(function (val) {
            val.style.display = isShow ? style : "none";
        });
    }
    function openSidebar(id) {
        // 200px, not 160: the widest label in the links sidebar is "CharacterPop",
        // which was being clipped mid-word at the old width.
        document.getElementById(id).style.width = id == "sidebar" ? "250px" : "200px";
    }
    function closeSidebar(id) {
        document.getElementById(id).style.width = "0";
    }
    // Run init as soon as the DOM this script sits under exists. Never wait on
    // window "load": Anki reviewers (desktop, AnkiDroid, AnkiMobile) swap card
    // HTML into an already-loaded page, so "load" has fired long before and a
    // listener added here would never run. UA sniffing used to stand in for
    // this and broke on iPadOS 13+, whose WKWebView reports a Macintosh UA.
    function ankiWhenReady(fn) {
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, false);
        else fn();
    }
    // Sidebar rows. The deck assembler decides which sections THIS side gets and
    // what is in them (see SIDEBAR_SECTIONS) — the sidebar only ever lists what the
    // side it belongs to actually shows. Row shapes:
    //   ["toggle", id, label]
    //   ["number", id, label, value, min, max]
    //   ["select", id, label, [option, ...]]
    function buildSections(targetId, sections) {
        function fsToggle(r) {
            return '<div class="fieldset-item fs-item-1"><div class="input-stack"><label for="' + r[1] + '">' + r[2] + '</label></div><input class="tappable" type="checkbox" id="' + r[1] + '" name="' + r[1] + '" onchange="setPrefs(this)"></div>';
        }
        function fsNumber(r) {
            return '<div class="fieldset-item fs-item-1"><div class="input-stack"><label for="' + r[1] + '"><small>' + r[2] + '</small></label></div><input class="tappable" type="number" id="' + r[1] + '" name="' + r[1] + '" value="' + r[3] + '" min="' + r[4] + '" max="' + r[5] + '" oninput="setPrefs(this)"></div>';
        }
        function fsSelect(r) {
            var opts = '';
            r[3].forEach(function (o) { opts += '<option>' + o + '</option>'; });
            return '<div class="fieldset-item fs-item-1 practice"><div class="input-stack"><label for="' + r[1] + '">' + r[2] + '</label></div><select id="' + r[1] + '" name="' + r[1] + '" onchange="setPrefs(this)">' + opts + '</select></div>';
        }
        var target = document.getElementById(targetId);
        if (!target) return;
        var html = '';
        sections.forEach(function (s) {
            var title = s[0], rows = s[1];
            if (!rows || !rows.length) return;
            var body = '';
            rows.forEach(function (r) {
                body += r[0] == "number" ? fsNumber(r) : r[0] == "select" ? fsSelect(r) : fsToggle(r);
            });
            if (title) html += '<div class="sidebar-section-title">' + title + '</div>';
            html += '<fieldset>' + body + '</fieldset>';
        });
        if (html) target.insertAdjacentHTML('beforeend', html);
    }
    // Ids of every checkbox row in the sections (the persisted show/hide switches).
    function toggleIdsOf(sections) {
        var ids = [];
        sections.forEach(function (s) {
            (s[1] || []).forEach(function (r) { if (r[0] != "number" && r[0] != "select") ids.push(r[1]); });
        });
        return ids;
    }
    // Rows that only make sense while their owner is on. With examples switched
    // off there are no sentences to colour, so their two colour rows would be
    // dead switches — hide them (and the section title, when nothing is left).
    var DEPENDENT_ROWS = { "text-examples": ["text-ex-color-hanzi", "text-ex-color-pinyin"] };
    function syncDependentRows() {
        for (var owner in DEPENDENT_ROWS) {
            var master = document.getElementById(owner);
            if (!master) continue;
            var on = master.checked;
            DEPENDENT_ROWS[owner].forEach(function (id) {
                var el = document.getElementById(id);
                if (el && el.parentElement) el.parentElement.style.display = on ? "" : "none";
            });
        }
    }
    document.addEventListener('click', function (event) {
        var sb = document.getElementById("sidebar"), mb = document.getElementById("more-info-sidebar");
        if (!sb || !mb) return;
        if (!sb.contains(event.target)) closeSidebar("sidebar");
        if (!mb.contains(event.target)) closeSidebar("more-info-sidebar");
        var menu = document.getElementById("btnShowMenu"), more = document.getElementById("btnMoreOptions");
        if (menu && menu.contains(event.target)) openSidebar("sidebar");
        if (more && more.contains(event.target)) openSidebar("more-info-sidebar");
    });`;

// Sidebar shell: brand header + a target section for JS-built rows + footer. Each
// side of a card gets its own sidebar listing only that side's contents, so there
// is no side picker here — the front sidebar configures the front, the back's the
// back.
const sidebarShell = (togglesId: string) =>
`<div id="sidebar" class="sidebar">
    <section>
        <fieldset style="border:none;">
            <div class="fieldset-item tappable">
                <div class="input-stack" style="text-align:center; color: var(--text2);">
                    <label for="deck-title">
                        <h3 class="brand-title">写汉字</h3>
                        <div class="brand-sub-title">xiě hànzì</div>
                    </label>
                    <a onclick="closeSidebar('sidebar')" class="close-button">✖</a>
                </div>
            </div>
        </fieldset>
    </section>
    <section id="${togglesId}"></section>
    <section>
        <fieldset>
            <a href="https://github.com/krmanik/Anki-xiehanzi">
                <div class="fieldset-item tappable">
                    <span style="font-size:14px; text-align:center;">View it on GitHub</span>
                </div>
            </a>
        </fieldset>
    </section>
</div>`;

// Dictionary definitions card: a toolbar (title + collapse arrow) over a
// collapsible body. Single source of truth — used by every template and by
// deck.ts (CONSTANTS.MEANING_CARD) so the markup never drifts.
const MEANING_CARD =
`<div id="char_meaning" class="meaning-card">
    <div class="meaning-bar" onclick="toggleMeaning(this)">
        <span class="meaning-title">Definitions</span>
        <span class="meaning-arrow">&#9662;</span>
    </div>
    <div class="meaning-content">{{Definitions}}</div>
</div>`;

// anki-tts (github.com/krmanik/anki-tts): the library's own documented usage
// — a CDN `<script type="module">` tag — loaded once per collection (an ES
// module doesn't re-run on later cards re-inserting the tag; see its Readme).
// Exposes window.ttsPlay(text) and a floating Settings button (Edge/online vs
// Piper/offline, locale, voice), and is only pulled in on a side that shows
// Examples — sentence audio is the one thing this deck's own three-tier player
// (deck.ts#playWordAudio) does not read aloud. Premium (a separate, private
// line — see premium/template/persistence.ts) inlines a vendored build of the
// same library instead, for reasons specific to that template.
const ANKI_TTS_SCRIPT =
`<script type="module" src="https://cdn.jsdelivr.net/gh/krmanik/anki-tts@latest/src/anki_tts.js"></script>`;

// Collapsible example-sentences card — same chrome as MEANING_CARD so it reuses
// toggleMeaning/initMeaning. Used only when template.collapseExamples is on; the
// non-collapsible variant is a plain `.examples-row` div (see deckTemplate.ts).
const EXAMPLES_CARD =
`<div id="char_examples" class="meaning-card examples-card">
    <div class="meaning-bar" onclick="toggleMeaning(this)">
        <span class="meaning-title">Examples</span>
        <span class="meaning-arrow">&#9662;</span>
    </div>
    <div class="meaning-content">{{Examples}}</div>
</div>`;

// Runtime card helpers shared by all templates: tone-color the big hanzi and the
// pinyin, and drive the collapsible dictionary card (state persisted).
const CARD_JS =
`    function toneOfSyllable(s) {
        var d = s.normalize('NFD');
        if (d.indexOf('̄') >= 0) return 1;
        if (d.indexOf('́') >= 0) return 2;
        if (d.indexOf('̌') >= 0) return 3;
        if (d.indexOf('̀') >= 0) return 4;
        return 5;
    }
    function colorPinyinEl(el) {
        if (!el || el.getAttribute('data-colored')) return;
        var parts = el.textContent.split(/(\\s+|,)/);
        var html = '';
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (p === '' || p === ',' || /^\\s+$/.test(p)) html += p;
            else html += '<span class="tone' + toneOfSyllable(p) + '">' + p + '</span>';
        }
        el.innerHTML = html;
        el.setAttribute('data-colored', '1');
    }
    function colorPinyin() {
        colorPinyinEl(document.getElementById('char_pinyin'));
        document.querySelectorAll('.pinyin').forEach(colorPinyinEl);
    }
    function colorChars() {
        var s = document.getElementById('char-sim-id'), d = document.getElementById('char_sim');
        if (s && d && s.textContent.trim()) d.innerHTML = s.innerHTML;
        var st = document.getElementById('char-trad-id'), dt = document.getElementById('char_trad');
        if (st && dt && st.textContent.trim()) dt.innerHTML = '〔' + st.innerHTML + '〕';
    }
    function toggleMeaning(bar) {
        var card = bar.parentElement;
        var c = card.querySelector('.meaning-content');
        var willCollapse = c.style.display !== 'none';
        c.style.display = willCollapse ? 'none' : '';
        bar.classList.toggle('collapsed', willCollapse);
        var key = card.id == 'char_examples' ? 'examples-collapsed' : 'meaning-collapsed';
        if (window.Persistence && Persistence.isAvailable()) Persistence.setItem(key, willCollapse.toString());
    }
    function initMeaningCard(id, key, def) {
        var card = document.getElementById(id);
        if (!card) return;
        var bar = card.querySelector('.meaning-bar');
        if (!bar) return; // not in collapsible mode — nothing to init
        var c = card.querySelector('.meaning-content');
        if (!c || !c.textContent.trim()) { card.style.display = 'none'; return; }
        var st = Persistence.getItem(key);
        var collapsed = st != null ? st == 'true' : !!def;
        c.style.display = collapsed ? 'none' : '';
        bar.classList.toggle('collapsed', collapsed);
    }
    function initMeaning() {
        initMeaningCard('char_meaning', 'meaning-collapsed', window.MEANING_COLLAPSE_DEFAULT);
        initMeaningCard('char_examples', 'examples-collapsed', window.EXAMPLES_COLLAPSE_DEFAULT);
    }`;

const DECK_HTML_FRONT =
`
${PERSISTENCE}
<script>
    var switchIdList = ["text-pinyin", "text-zhuyin", "text-meaning", "text-sim", "text-trad"];
    function initSwitchPrefs() {
        for (var _id of switchIdList) {
            var el = document.getElementById(_id.replace("text-", "char_"));
            if (el && Persistence.getItem("back" + _id) == "false") {
                el.style.display = "none";
            }
        }
    }
    // See ankiWhenReady in SIDEBAR_JS; the plain front card does not include it.
    function ankiWhenReady(fn) {
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, false);
        else fn();
    }

${CARD_JS}

    function initFront() { initSwitchPrefs(); colorChars(); colorPinyin(); initMeaning(); }
    if (Persistence.isAvailable()) ankiWhenReady(initFront);
</script>
`;

// Control bar + audio data div — placed into the card body via the assembler so
// they can be positioned (flex order) and toggled per side like any field.
const CONTROL_BAR =
`<div class="modal-footer1">
    <a class="btn" id="btnShowMenu" onclick="openSidebar('sidebar')">
        <div class="icon"><i class="material-icons">menu</i></div>
    </a>
    <a class="btn" id='btnPlayAudio'>
        <div class="icon">
            <i class="material-icons">play_arrow</i>
        </div>
    </a>
    <a class="btn" id='btnMoreOptions' onclick="openSidebar('more-info-sidebar')">
        <div class="icon"><i class="material-icons">more_vert</i></div>
    </a>
</div>`;

const AUDIO_DIV = `<div id='audio' style='display:none'>{{Audio}}</div>`;

// Sidebar markup, shared by the front and back so the control bar is functional
// on either side.
const SIDEBAR_BLOCK =
`<!--sidebar-->
${sidebarShell('sidebar-toggles')}
${MORE_INFO_SIDEBAR}
<!-----sidebar------>`;

// Full sidebar behaviour script (toggles, colour, audio, init), parametrised by
// the persistence side so the same chrome works on the front and the back.
const sideScript = (frontBack: 'front' | 'back') =>
`<script>
    // This sidebar belongs to one side of the card and configures only that side;
    // preferences are namespaced by side so the two never overwrite each other.
    var frontBack = "${frontBack}";
    var colorIds = ["text-color-hanzi", "text-color-pinyin", "text-ex-color-hanzi", "text-ex-color-pinyin"];
    // Sidebar contents for THIS side, seeded by the deck assembler from the fields
    // the side actually shows.
    var SIDEBAR_SECTIONS = [];
    // Fields shipped but deselected for this side; they start hidden.
    var defaultOff = [];
    function colorClassOf(id) {
        if (id == "text-color-hanzi") return "no-hanzi-color";
        if (id == "text-color-pinyin") return "no-pinyin-color";
        if (id == "text-ex-color-hanzi") return "no-ex-hanzi-color";
        return "no-ex-pinyin-color";
    }

${SIDEBAR_JS}

    buildSections("sidebar-toggles", SIDEBAR_SECTIONS);
    var switchIdList = toggleIdsOf(SIDEBAR_SECTIONS);

    function applyField(id, isShow) {
        if (id == "text-pinyin") showHide(".pinyin", isShow);
        if (id == "text-zhuyin") showHide(".zhuyin", isShow);
        if (id == "text-sim") showHide("#char-sim-id", isShow);
        if (id == "text-trad") { showHide("#char-trad-id", isShow); showHide(".sep", isShow); }
        if (id == "text-grid") document.body.classList.toggle("no-grid", !isShow);
        if (id == "text-color-hanzi") document.body.classList.toggle("no-hanzi-color", !isShow);
        if (id == "text-color-pinyin") document.body.classList.toggle("no-pinyin-color", !isShow);
        if (id == "text-ex-color-hanzi") document.body.classList.toggle("no-ex-hanzi-color", !isShow);
        if (id == "text-ex-color-pinyin") document.body.classList.toggle("no-ex-pinyin-color", !isShow);
    }

${CARD_JS}

    function initSwitchPrefs() {
        for (var _id of switchIdList) {
            var cb = document.getElementById(_id);
            if (!cb) continue;
            var dv = document.getElementById(_id.replace("text-", "char_"));
            var stored = Persistence.getItem(frontBack + _id);
            var on;
            if (stored != null) on = stored != "false";
            else if (colorIds.indexOf(_id) != -1) on = !document.body.classList.contains(colorClassOf(_id));
            else on = defaultOff.indexOf(_id) == -1;
            cb.checked = on;
            if (on) Persistence.setItem(frontBack + _id, "true");
            if (dv) dv.style.display = on ? "block" : "none";
            applyField(_id, on);
        }
        // Deselected fields have no row (the sidebar lists only what this side
        // shows), so hide them here — they ship because another card type uses them.
        for (var _off of defaultOff) {
            if (document.getElementById(_off)) continue;
            var offDv = document.getElementById(_off.replace("text-", "char_"));
            if (offDv) offDv.style.display = "none";
            applyField(_off, false);
        }
        syncDependentRows();
    }

    function setPrefs(e) {
        if (e.type != "checkbox") return;
        Persistence.setItem(frontBack + e.id, e.checked.toString());
        var dv = document.getElementById(e.id.replace("text-", "char_"));
        if (dv) dv.style.display = e.checked ? "block" : "none";
        applyField(e.id, e.checked);
        syncDependentRows();
    }

    function playAudio() {
        var audioEl = document.getElementById('audio');
        if (!audioEl) return;
        var audio = audioEl.getElementsByTagName("*");
        if (audio[0]) audio[0].tagName == "AUDIO" ? audio[0].play() : audio[0].click();
    }
    var btnAudio = document.getElementById("btnPlayAudio");
    if (btnAudio) btnAudio.onclick = playAudio;

    function initSide() { initSwitchPrefs(); colorChars(); colorPinyin(); initMeaning(); }
    if (Persistence.isAvailable()) ankiWhenReady(initSide);
</script>
`;

// Back template: assembler injects control bar / audio / hr / fields into the
// card body before this trailing sidebar + script.
const DECK_HTML_BACK = `<!--FIELDS-->\n\n${PERSISTENCE}\n\n${SIDEBAR_BLOCK}\n\n${sideScript('back')}`;

// Front-with-chrome trailing block: same sidebar + functional script (front side)
// appended after the assembled body, so the control bar works on the front too.
const DECK_HTML_FRONT_CHROME = `${PERSISTENCE}\n\n${SIDEBAR_BLOCK}\n\n${sideScript('front')}`;

// Writer colours read from the live CSS vars so strokes track the card theme
// and the chosen tone palette. Split out of the writer template so a different
// layout can reuse the engine without re-deriving them.
const WRITER_COLOR_JS =
`<script>
    // Writer colors come from the live CSS vars so they track the card theme
    // (--stroke/--outline/--drawing map to the theme's text/surface colors) and
    // the chosen tone palette (--tone-1..5, overridden by the tone preset).
    function cssVar(name, fallback) {
        var v = (getComputedStyle(document.body).getPropertyValue(name) || "").trim();
        return v || fallback;
    }
    var _night = document.body.classList.contains("night_mode");
    var stroke_color = cssVar("--stroke", _night ? "#ffffff" : "#555");
    var outline_color = cssVar("--outline", _night ? "#5B5B5B" : "#DDD");
    var drawing_color = cssVar("--drawing", _night ? "#fff" : "#333");
    function getToneColor(charCls) {
        var m = /char-tone([1-5])/.exec(charCls || "");
        if (!m) return cssVar("--stroke", _night ? "#ffffff" : "#555");
        return cssVar("--tone-" + m[1], stroke_color);
    }
</script>`;

// The Hanzi Writer engine: grid painting, the stroke quiz, the finished-glyph
// row and the reveal / replay / next wiring. Expects the writer markup ids
// (character-target-div, onfinish-character-target-div, ch_load_status), the
// sidebar's draw-size / stroke-size / hint-miss / practice-select inputs, and
// `charClass`, `frontBack`, `showHide`, `showTraditionalChar` from the page.
const WRITER_ENGINE_JS =
`<script src="_hanzi-writer.min.js"></script>
<script>
    // Offline stroke data: load the bundled subset, serve one character on demand.
    var HANZI_DATA = {};
    function hwCharDataLoader(char) { return HANZI_DATA[char]; }

    var charHW = document.getElementById("draw-size").value;
    var charHeight = charHW;
    var charWidth = charHW;
    var strokeWidth = document.getElementById("stroke-size").value;
    var strokeAfterMisses = document.getElementById("hint-miss").value;

    function btnTapAudio() {
        var audio = new Audio();
        audio.src = "_press.mp3";
        audio.load();
        audio.play();
    }

    function playAudio() {
        var audioEl = document.getElementById('audio');
        if (!audioEl) return;
        var audio = audioEl.getElementsByTagName("*");
        if (audio[0]) audio[0].tagName == "AUDIO" ? audio[0].play() : audio[0].click();
    }

    var btnAudio = document.getElementById("btnPlayAudio");
    if (btnAudio) btnAudio.onclick = playAudio;

    // Guide lines get their color from CSS (.char-grid line { stroke: var(--grid-line) }),
    // not from a stroke="" presentation attribute: var() in a presentation attribute is
    // unreliable across webviews, and the CSS rule lets card themes repoint --grid-line.
    var grid_data = \`<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' class='grid-color' id='grid-background-target'><g id="char_grid" class="char-grid"><line x1='0' y1='0' x2='100%' y2='100%' stroke-width='0.5' stroke-dasharray='3 3' opacity='0.4'/><line x1='100%' y1='0' x2='0' y2='100%' stroke-width='0.5' stroke-dasharray='3 3' opacity='0.4'/><line x1='50%' y1='0' x2='50%' y2='100%' stroke-width='0.7' stroke-dasharray='3 4'/><line x1='0' y1='50%' x2='100%' y2='50%' stroke-width='0.7' stroke-dasharray='3 4'/></g></svg>\`;

    var characters = document.getElementById("practice-select").selectedIndex == "0"
        ? document.getElementById('char_sim').textContent
        : document.getElementById('char_trad').textContent;

    function isHanzi(c) {
        return (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF) || (c >= 0xF900 && c <= 0xFAFF);
    }

    // The characters to practise, as a dense list — and the only thing anything
    // downstream is allowed to index.
    //
    // \`characters\` is the *rendered text* of a field, not a word: the traditional
    // field is bracketed by the template, so char_trad reads 〔圖書館〕 and the
    // hanzi sit at positions 1..3. Every loop below used to walk that string and
    // key its work on the raw position, which meant the traditional side numbered
    // its grid cells from 1 and — because \`charClass\` (the tone-coloured spans of
    // the simplified field) is a dense list of hanzi — shifted every stroke colour
    // by one, leaving the last character with no entry at all. Indexing this list
    // instead keeps cells, writers, tone colours and element ids on the same
    // numbering whichever form is being written.
    function practiceChars() {
        var out = [];
        for (var k = 0; k < characters.length; k++) {
            if (isHanzi(characters.charCodeAt(k))) out.push(characters[k]);
        }
        return out;
    }

    // Paint the gray practice grid synchronously, before the async stroke-data
    // fetch resolves and doPractice() runs. Without this the target div stays a
    // blank 0px box until the fetch finishes, so the grid pops in white -> gray
    // late and shoves the layout. Sized to charWidth/charHeight so it matches the
    // writer's SVG exactly (no shrink) — the writer just draws strokes inside it.
    function prefillGrid() {
        var onBack = !!document.getElementById("back");
        var box = document.getElementById(onBack ? "onfinish-character-target-div" : "character-target-div");
        if (!box) return;
        box.innerHTML = "";
        if (onBack) {
            // Match the finished layout (centered single row) so the placeholder
            // doesn't flash left-aligned before doPractice centers it.
            box.style.position = "unset";
            box.style.display = "flex";
            box.style.justifyContent = "center";
            box.style.flexWrap = "nowrap";
            box.style.overflow = "auto";
        }
        var cells = practiceChars();
        for (var k = 0; k < cells.length; k++) {
            var cell = document.createElement(onBack ? 'span' : 'div');
            cell.innerHTML = grid_data;
            var svg = cell.children[0];
            svg.removeAttribute('id');
            svg.style.margin = onBack ? "6px" : "";
            svg.style.width = (onBack ? 100 : charWidth) + "px";
            svg.style.height = (onBack ? 100 : charHeight) + "px";
            box.appendChild(cell);
        }
        // doPractice() reveals ch_load_status on the front, and its inline
        // margin-top:-36px nets ~-12px once shown — that pulled everything below
        // the grid up when the writer kicked in. Reserve it now (shows the red
        // loading dot during the fetch; the writer recolors it on success).
        if (!onBack) {
            var status = document.getElementById("ch_load_status");
            if (status) status.style.display = "block";
        }
    }
    prefillGrid();

    function generateHanziOnFinishQuiz(style = "none", finish = false) {
        var drawGrid = document.getElementById('onfinish-character-target-div');
        if (!drawGrid) return;
        drawGrid.innerHTML = "";
        drawGrid.style = "";
        var size = 40;
        if (finish) {
            // All chars done: one centered row of full-size finished glyphs
            // (single and multi char alike), scroll only if it overflows.
            size = 100;
            drawGrid.style.position = "unset";
            drawGrid.style.display = "flex";
            drawGrid.style.justifyContent = "center";
            drawGrid.style.flexWrap = "nowrap";
            drawGrid.style.overflow = "auto";
        } else {
            // During writing: stack completed mini-chars in a column that hugs
            // the left edge of the centered grid. The grid is centered in the
            // viewport, so its left edge is at (50% - gridWidth/2); right-align
            // a left-half-width column there so each finished char sits just
            // beside the grid, not on top of it or at the window's left edge.
            var half = (parseInt(charWidth, 10) || 200) / 2;
            drawGrid.style.position = "absolute";
            drawGrid.style.left = "0";
            drawGrid.style.width = "calc(50% - " + half + "px)";
            drawGrid.style.display = "flex";
            drawGrid.style.flexDirection = "column";
            drawGrid.style.alignItems = "flex-end";
        }

        var finished = practiceChars();
        for (var n = 0; n < finished.length; n++) {
            var hanzi = finished[n];
            var span = document.createElement('span');
            span.innerHTML = grid_data;
            span.children[0].id = "onfinish-grid-background-target" + n;
            span.children[0].style.margin = finish ? "6px" : "2px";
            span.style.display = style;
            drawGrid.appendChild(span);
            setStrokeColor(n);
            HanziWriter.create("onfinish-grid-background-target" + n, hanzi, {
                charDataLoader: hwCharDataLoader,
                width: size,
                height: size,
                padding: 5,
                strokeColor: stroke_color
            });
        }
    }

    document.getElementById("btnReloadQuiz").onclick = function () {
        // Finishing a quiz reveals the answer on the question side — the hanzi,
        // the meaning, the readings (see onFinishQuiz). Restarting the quiz has
        // to put the side back the way it was configured, or the practice grid
        // sits underneath the very character it is asking for. initSwitchPrefs
        // re-applies the stored per-side switches, so this is a reset, not a
        // second set of rules that could drift from the sidebar's.
        if (typeof initSwitchPrefs === "function") initSwitchPrefs();
        // The answer side normally has no quiz — its grid is a strip of finished
        // glyphs and the practice cell is hidden. Reload there means "let me
        // write it again", so mark the side as practising: the CSS turns the
        // cell back on, and the same three calls the question side makes then
        // start a real quiz, reveal/next buttons included. onFinishQuiz drops
        // the class again when the last character is done.
        var backEl = document.getElementById("back");
        if (backEl) backEl.classList.add("practising");
        doPractice(true);
        generateHanziOnFinishQuiz("none");
        showNextAndRevealBtn(true);
    }

    function doPractice(p = false) {
        if (document.getElementById("back")) {
            generateHanziOnFinishQuiz("unset", true);
            if (!p) {
                showNextAndRevealBtn(false);
                return;
            };
        } else {
            generateHanziOnFinishQuiz("none");
        }

        // The stroke-data fetch resolves asynchronously; by then the reviewer may
        // already have swapped this card out, leaving nothing to draw into.
        var loadStatus = document.getElementById("ch_load_status");
        var drawGrid = document.getElementById('character-target-div');
        if (!loadStatus || !drawGrid) return;
        loadStatus.innerHTML = "&#8226;";
        loadStatus.style.marginBottom = "0px";
        loadStatus.style.display = "block";

        var hanziWriterList = [];
        drawGrid.innerHTML = "";

        var toWrite = practiceChars();
        for (var n = 0; n < toWrite.length; n++) {
            var div = document.createElement('div');
            div.id = "div" + n;
            div.innerHTML = grid_data;
            div.children[0].id = "grid-background-target" + n;
            drawGrid.appendChild(div);
            setStrokeColor(n);
            var hanzi = toWrite[n];
            var writer = HanziWriter.create('grid-background-target' + n, hanzi, {
                charDataLoader: hwCharDataLoader,
                onLoadCharDataSuccess: function (data) {
                    if (loadStatus) loadStatus.style.color = "#4caf50";
                },
                onLoadCharDataError: function (reason) {
                    if (loadStatus) loadStatus.style.color = "#ea2322";
                },

                width: charWidth,
                height: charHeight,
                showCharacter: false,
                showOutline: Persistence.getItem(frontBack + "text-outline") == "true" ? true : false,
                highlightOnComplete: true,
                highlightCompleteColor: stroke_color,
                drawingWidth: strokeWidth,
                strokeColor: stroke_color,
                outlineColor: outline_color,
                drawingColor: drawing_color,
                showHintAfterMisses: strokeAfterMisses,
                padding: 5
            });

            writerQuiz(writer);
            hanziWriterList.push(writer);

            var revealClickCount = 0;
            document.getElementById("btnGoNextCard").onclick = function () {
                revealClickCount = 0;
                btnTapAudio();
                writer = hanziWriterList[getCurrentHanziNum()];
                writer.showOutline();
                writer.showCharacter();

                setTimeout(function () {
                    onFinishQuizDrawHanzi();
                }, 800);

                setTimeout(function () {
                    showNextHanzi();
                }, 1000);
            };

            var outlineCb = document.getElementById("text-outline");
            if (outlineCb) outlineCb.onclick = function () {
                btnTapAudio();
                outlineCb.checked ? writer.showOutline() : writer.hideOutline();
            };

            document.getElementById("btnRevealChar").onclick = function () {
                btnTapAudio();
                writer = hanziWriterList[getCurrentHanziNum()];
                writer.showOutline();
                if (revealClickCount == 0) {
                    writer.animateCharacter();
                } else if (revealClickCount == 1) {
                    writer.showCharacter();
                } else if (revealClickCount == 2) {
                    writer.hideCharacter();
                    writer.hideOutline();
                    writerQuiz(writer);
                } else {
                    revealClickCount = -1;
                    writerQuiz(writer);
                }
                revealClickCount++;
            };

            function writerQuiz(writer) {
                writer.quiz({
                    onComplete: function (summaryData) {
                        onFinishQuizDrawHanzi();

                        setTimeout(function () {
                            showNextHanzi();
                        }, 1000)
                    }
                });
            }

            function getCurrentHanziNum() {
                var characterDiv = document.querySelector('#character-target-div');
                var characterElements = characterDiv.children;
                var len = characterElements.length;
                // A local i, not the implicit global these functions shared:
                // showNextHanzi() calls onFinishQuiz() from inside its own loop,
                // and that path re-enters generateHanziOnFinishQuiz(). One counter
                // between all of them survived only because every loop happened to
                // break first.
                for (var i = 0; i < len; i++) {
                    var style = characterElements[i].style.display;
                    if (style === 'block' || style === "") {
                        return i;
                    }
                }
            }

            function onFinishQuizDrawHanzi() {
                var finishCharacterDiv = document.getElementById('onfinish-character-target-div');
                var characterElements = finishCharacterDiv.children;
                var len = characterElements.length;
                for (var i = 0; i < len; i++) {
                    var style = characterElements[i].style.display;
                    if (style === 'none' || style === "") {
                        characterElements[i].style.display = "unset";
                        break;
                    }
                }
            }
        }
    }

    function setStrokeColor(i) {
        if (!charClass[i]) return; // no colored span for this position (punctuation, etc.)
        if (Persistence.getItem(frontBack + "text-stroke-color") == "true") {
            var toneColor = getToneColor(charClass[i].className);
            drawing_color = toneColor;
            stroke_color = toneColor;
        }
    }

    function showNextHanzi() {
        var characterDiv = document.querySelector('#character-target-div');
        var characterElements = characterDiv.children;
        var len = characterElements.length;

        for (var i = 0; i < len; i++) {
            var style = characterElements[i].style.display;
            if (style === 'block' || style === "") {
                characterElements[i].style.display = 'none';
                characterElements[(i + 1) % characterElements.length].style.display = 'block';
                onFinishQuiz(i, len);
                break;
            }
        }
    }

    function onFinishQuiz(i, len) {
        if (i != len - 1) {
            return;
        }

        if (i + 1 == len) {
            var target = document.querySelector('#character-target-div');
            if (target) target.innerHTML = "";
            var status = document.getElementById("ch_load_status");
            if (status) status.style.display = "none";
            // A re-practised answer side goes back to being an answer side, or
            // the emptied practice cell would sit there holding open its height.
            var backEl = document.getElementById("back");
            if (backEl) backEl.classList.remove("practising");
            generateHanziOnFinishQuiz("unset", true);
        }

        playAudio();
        showHide("#char_sim", true);
        showTraditionalChar();
        showHide("#char_meaning", true, "block");
        // Rows exist only for fields this card type uses — treat a missing row as off.
        var pinyinCb = document.getElementById("text-pinyin");
        if (pinyinCb && pinyinCb.checked) showHide(".pinyin", true);
        var zhuyinCb = document.getElementById("text-zhuyin");
        if (zhuyinCb && zhuyinCb.checked) showHide(".zhuyin", true);
        showNextAndRevealBtn(false);
        // Layouts that collapse empty regions cached their emptiness before this
        // ran; every reveal above has to be counted once, at the end, or the
        // answer sits display:block inside a container still marked empty.
        if (typeof reflow === "function") reflow();
    }

    function showNextAndRevealBtn(show) {
        showHide("#btnGoNextCard", show);
        showHide("#btnRevealChar", show);
    }

    if (Persistence.isAvailable()) {
        fetch("_hanzi-writer-data.json")
            .then(function (r) { return r.json(); })
            .then(function (d) { HANZI_DATA = d; })
            .catch(function () { /* offline data missing; loader returns undefined */ })
            .finally(function () { doPractice(); });
    }
</script>`;

const DECK_HTML_WITH_HANZI_WRITER =
`
${WRITER_COLOR_JS}

<div id="char_zhuyin">{{Zhuyin}}</div>
<div id="char_pinyin">{{Pinyin}}</div>
<div id="char_sim" class="char-card">{{Simplified}}</div>
<div id="char_trad" class="char-card">{{Traditional}}</div>
<div id="onfinish-character-target-div" class="tappable"></div>
<div id="character-target-div" class="tappable"></div>
<div id="ch_load_status" style="color:#ea2322; margin-top: -36px; display: none;">&#8226;</div>
<div id='audio' style='display:none'>{{Audio}}</div>

<div class="modal-footer1">
    <a class="btn" id="btnShowMenu" onclick="openSidebar('sidebar')">
        <div class="icon"><i class="material-icons">menu</i></div>
    </a>
    <a class="btn" id='btnPlayAudio'>
        <div class="icon"><i class="material-icons">play_arrow</i></div>
    </a>
    <a class="btn" id='btnRevealChar'>
        <div class="icon"><i class="material-icons">gesture</i></div>
    </a>
    <a class="btn" id='btnReloadQuiz'>
        <div class="icon"><i class="material-icons">replay</i></div>
    </a>
    <a class="btn" id='btnGoNextCard'>
        <div class="icon"><i class="material-icons">navigate_next</i></div>
    </a>
    <a class="btn" id='btnMoreOptions' onclick="openSidebar('more-info-sidebar')">
        <div class="icon"><i class="material-icons">more_vert</i></div>
    </a>
</div>

<hr>

${MEANING_CARD}

${SIDEBAR_BLOCK}

${PERSISTENCE}

<script>
    var charClass = document.getElementById("char-sim-id").children;
    var colorIds = ["text-color-hanzi", "text-color-pinyin", "text-ex-color-hanzi", "text-ex-color-pinyin"];
    // Sidebar contents, seeded by the deck assembler from the card type's fields —
    // the same list on both sides, so the sidebar never changes shape.
    var SIDEBAR_SECTIONS = [];
    // Fields shipped but deselected for this side; they start hidden.
    var defaultOff = [];
    function colorClassOf(id) {
        if (id == "text-color-hanzi") return "no-hanzi-color";
        if (id == "text-color-pinyin") return "no-pinyin-color";
        if (id == "text-ex-color-hanzi") return "no-ex-hanzi-color";
        return "no-ex-pinyin-color";
    }

${SIDEBAR_JS}

${CARD_JS}

    buildSections("sidebar-toggles", SIDEBAR_SECTIONS);
    var switchIdList = toggleIdsOf(SIDEBAR_SECTIONS);

    // The writer only ever runs on the side it was placed on, so this sidebar and
    // these preferences belong to that side alone.
    var frontBack = document.getElementById("back") ? "back" : "front";

    function initPractice() {
        var _id = frontBack + "practice-select";
        var store = Persistence.getItem(_id);
        var idx = store == undefined ? 0 : store;
        var sel = document.getElementById("practice-select");
        if (!sel) return;
        sel.selectedIndex = idx;
        Persistence.setItem(_id, idx);
    }

    function applyField(id, isShow) {
        if (id == "text-pinyin") showHide(".pinyin", isShow);
        if (id == "text-zhuyin") showHide(".zhuyin", isShow);
        if (id == "text-sim") showHide("#char-sim-id", isShow);
        if (id == "text-trad") { showHide("#char-trad-id", isShow); showHide(".sep", isShow); }
        if (id == "text-grid") document.body.classList.toggle("no-grid", !isShow);
        if (id == "text-color-hanzi") document.body.classList.toggle("no-hanzi-color", !isShow);
        if (id == "text-color-pinyin") document.body.classList.toggle("no-pinyin-color", !isShow);
        if (id == "text-ex-color-hanzi") document.body.classList.toggle("no-ex-hanzi-color", !isShow);
        if (id == "text-ex-color-pinyin") document.body.classList.toggle("no-ex-pinyin-color", !isShow);
    }

    function initSwitchPrefs() {
        var drawIds = ["text-grid", "text-stroke-color", "text-outline"];
        for (var _id of switchIdList) {
            var cb = document.getElementById(_id);
            if (!cb) continue;
            var dv = document.getElementById(_id.replace("text-", "char_"));
            var stored = Persistence.getItem(frontBack + _id);
            var on;
            if (stored != null) on = stored != "false";
            else if (colorIds.indexOf(_id) != -1) on = !document.body.classList.contains(colorClassOf(_id));
            else on = defaultOff.indexOf(_id) == -1;
            cb.checked = on;
            if (on) Persistence.setItem(frontBack + _id, "true");
            if (!drawIds.includes(_id) && dv) {
                dv.style.display = on ? "block" : "none";
            }
            applyField(_id, on);
        }
        // Deselected fields get no row (the sidebar lists only what this side
        // shows), so hide them here — the writer page renders them regardless.
        for (var _off of defaultOff) {
            if (document.getElementById(_off)) continue;
            var offDv = document.getElementById(_off.replace("text-", "char_"));
            if (offDv) offDv.style.display = "none";
            applyField(_off, false);
        }
        showTraditionalChar();
        syncDependentRows();
    }

    function showTraditionalChar() {
        var tradChar = document.getElementById("char_trad");
        var simChar = document.getElementById("char_sim");
        if (tradChar.innerHTML != simChar.innerHTML) {
            if (Persistence.getItem(frontBack + "text-trad") == "true") tradChar.style.display = "block";
        } else if (Persistence.getItem(frontBack + "text-sim") == "true") {
            tradChar.style.display = "none";
        }
    }

    function initDrawPrefs() {
        var defaults = { "draw-size": 400, "stroke-size": 64, "hint-miss": 5 };
        for (var _id in defaults) {
            var el = document.getElementById(_id);
            if (!el) continue;
            var perId = frontBack + _id;
            var store = Persistence.getItem(perId);
            if (store) {
                el.value = store;
            } else {
                el.value = defaults[_id];
                Persistence.setItem(perId, defaults[_id]);
            }
        }
        var perIndex = Persistence.getItem(frontBack + "practice-select");
        var sel = document.getElementById("practice-select");
        if (sel) sel.selectedIndex = perIndex ? 1 : 0;
        characters = document.getElementById(perIndex ? 'char_trad' : 'char_sim').textContent;
    }

    function setPrefs(e) {
        var perId = frontBack + e.id;
        if (e.id == "practice-select") {
            Persistence.setItem(perId, e.selectedIndex);
            characters = document.getElementById(e.selectedIndex == 0 ? 'char_sim' : 'char_trad').textContent;
            doPractice();
        }
        if (e.type == "checkbox") {
            Persistence.setItem(perId, e.checked.toString());
            if (e.id == "text-stroke-color" || e.id == "text-outline") return;
            var dv = document.getElementById(e.id.replace("text-", "char_"));
            if (dv) dv.style.display = e.checked ? "block" : "none";
            applyField(e.id, e.checked);
            syncDependentRows();
        }
        if (e.type == "number") {
            Persistence.setItem(perId, e.value);
        }
    }

    // The writer reads char_sim/char_trad as plain text (textContent), so it is now
    // safe to tone-color the displayed big hanzi as well as the pinyin.
    function initWriterCard() { colorChars(); colorPinyin(); initMeaning(); }
    if (Persistence.isAvailable()) {
        ankiWhenReady(function () {
            initPractice();
            initSwitchPrefs();
            initDrawPrefs();
            initWriterCard();
        });
    }
</script>
${WRITER_ENGINE_JS}
`;

const DECK_CSS =
`:root {
  --tone-1: #f44336;
  --tone-2: #ff9800;
  --tone-3: #4caf50;
  --tone-4: #2196f3;
  --tone-5: #607d8b;
  --brand-bg1: rgb(255, 117, 195);
  --brand-bg2: rgb(157, 119, 255);
  --brand-bg-gradient: linear-gradient(
    to bottom,
    var(--brand-bg2),
    var(--brand-bg2)
  );
  --thumb-highlight-color: rgba(255, 255, 254, 0.2);
  --space-xxs: 0.25rem;
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2rem;
  --space-xl: 3rem;
  --space-xxl: 6rem;
  --isLTR: 1;
  --isRTL: -1;
}

.card {
  --title-color: var(--text2, grey);
  --time-left-color: var(--accent, teal);
  --hanzi-grid: var(--surface3, #fafafa);
  --grid-line: var(--surface4, #d4d4d4);
  --stroke: var(--text1, #555);
  --outline: var(--surface4, #ddd);
  --drawing: var(--text1, #333);
  --pinyin-color: var(--accent, #ef6c00);
  --simplified-color: var(--text1, #6495ed);
  --traditional-color: var(--text2, #00796b);
  --meaning-color: var(--text2, #607d8b);
  --icon-button-background: var(--btn-bg, var(--surface3));
  --icon-button-background-focus: var(--surface4);
  --sidebar-color: var(--text1, white);
  --sidebar-background-color: var(--surface1, #52575d);
  --header-color: var(--text1, #455a64);
  --brand-bg1: var(--accent, rgb(255, 117, 195));
  --brand-bg2: var(--accent, rgb(157, 119, 255));
  --surface1: rgb(226, 226, 226);
  --surface2: rgb(255, 255, 254);
  --surface3: rgb(249, 249, 249);
  --surface4: rgb(212, 212, 212);
  --text1: rgb(48, 48, 48);
  --text2: rgb(94, 94, 94);
  --brand: var(--accent, rgb(47, 167, 214));
  --on-accent: #ffffff;
  --thumb-highlight-color: rgba(0, 0, 0, 0.2);
  font-size: 20px;
  text-align: center;
  color: var(--text1, black);
  background-color: var(--surface2, white);
}

.card.night_mode {
  --header-color: var(--text1, white);
  --title-color: var(--text2, #00bcd4);
  --time-left-color: var(--accent, #fff);
  --hanzi-grid: var(--surface3, #262626);
  --grid-line: var(--surface4, #3b3b3b);
  --stroke: var(--text1, #ffffff);
  --outline: var(--surface4, #5b5b5b);
  --drawing: var(--text1, #fff);
  --pinyin-color: var(--accent, #27b46e);
  --simplified-color: var(--text1, #6495ed);
  --traditional-color: var(--text2, #fba910);
  --meaning-color: var(--text2, #00bfa5);
  --sidebar-color: var(--text1, white);
  --sidebar-background-color: var(--surface1, #52575d);
  --surface1: rgb(27, 27, 27);
  --surface2: rgb(37, 37, 37);
  --surface3: rgb(48, 48, 48);
  --surface4: rgb(59, 59, 59);
  --text1: rgb(240, 240, 240);
  --text2: rgb(184, 184, 184);
  --brand: var(--accent, rgb(118, 161, 184));
  --on-accent: #ffffff;
  color: var(--text1, white);
  background-color: var(--surface2, #1f1f1f);
}

.char-card {
  font-size: 3em;
}

/* Kai Ti fonts (bundle the .woff2/.ttf as media to enable) */
.win .char-card,
.mac .char-card,
.linux:not(.android) .char-card {
  font-family: "AR PL KaitiM GB", "AR PL KaitiM Big5";
}

/* Material Icon Font (bundled offline) */
@font-face {
  font-family: "Material Icons";
  font-style: normal;
  font-weight: 300;
  src: local("Material Icons"), local("MaterialIcons-Regular"),
    url(_MaterialIcons-Regular.woff2) format("woff2");
}

.material-icons {
  font-family: "Material Icons";
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  /* Preferred icon size */
  display: inline-block;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  word-wrap: normal;
  white-space: nowrap;
  direction: ltr;
  /* Support for all WebKit browsers. */
  -webkit-font-smoothing: antialiased;
  /* Support for Safari and Chrome. */
  text-rendering: optimizeLegibility;
  /* Support for Firefox. */
  -moz-osx-font-smoothing: grayscale;
  /* Support for IE. */
  font-feature-settings: "liga";
}

/* grid color for character */

.grid-color {
  margin: 6px;
  background-color: var(--hanzi-grid);
  padding: 2px;
  box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.5);
}

/* Guide lines. --grid-line defaults to --surface4; card themes repoint it to a
   text-derived tint so the lines stay visible on every theme surface. */
.char-grid line {
  stroke: var(--grid-line, var(--surface4, #d4d4d4));
}

/* "Grid" toggle hides the dashed guide lines; the writing cell stays. */
.no-grid .char-grid {
  display: none;
}

.stroke-color {
  color: var(--stroke);
}

.outline-color {
  color: var(--outline);
}

.drawing-color {
  color: var(--drawing);
}

/* bottom button */

.modal-footer1 {
  padding-top: 15px;
  text-align: center;
}

.modal-footer1 a {
  display: inline-block;
  margin: 0 8px;
  float: none;
}

.text-color1 {
  font-size: 16px;
  color: var(--pinyin-color);
}

.text-color2 {
  color: var(--traditional-color);
}

.text-color3 {
  color: var(--meaning-color);
}

.text-color4 {
  font-size: 30px;
  font-weight: bold;
  color: var(--simplified-color);
}

/* Material Icon Button */

.icon {
  margin: 3px;
  position: relative;
  display: inline-block;
  color: var(--btn-fg, var(--text2));
  background-color: var(--icon-button-background);
  border: var(--btn-border, 1px solid var(--surface4));
  width: 2rem;
  height: 2rem;
  border-radius: var(--btn-radius, 8px);
  transition: all 0.3s ease;
}

.icon .material-icons {
  font-size: 1rem;
  position: absolute;
  left: 0.5rem;
  top: 0.5rem;
  transition: all 0.3s ease;
}

.icon:hover,
.icon:focus {
  background-color: var(--icon-button-background-focus);
}

.sidebar {
  height: 100%;
  width: 0;
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
  background-color: var(--surface1);
  overflow-x: hidden;
  transition: 0.5s;
  -webkit-tap-highlight-color: transparent;
}

.more-info-sidebar {
  height: 100%;
  width: 0;
  position: fixed;
  z-index: 1;
  top: 0;
  right: 0;
  background-color: var(--surface1);
  overflow-x: hidden;
  transition: 0.5s;
  -webkit-tap-highlight-color: transparent;
}

.more-info-sidebar a {
  display: flex;
  margin: 3px;
  padding: 2px;
  border-radius: 3px;
  text-decoration: none;
  color: var(--text1);
}

.more-info-sidebar img {
  width: 28px;
  margin-right: 6px;
}

/* On smaller screens, where height is less than 450px, change the style of the sidenav (less padding and a smaller font size) */

@media screen and (max-height: 450px) {
  .sidebar {
    padding-top: 15px;
  }

  .sidebar a {
    font-size: 16px;
  }
}

.more-info-btn {
  text-align: center;
}

img {
  border-radius: 10%;
}

.practice-ch {
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  transition: all 0.3s ease;
  padding: 3px;
}

.meaning {
  text-align: left;
  display: block;
}

.tone1 {
  color: #f44336;
}

.tone2 {
  color: #fbc02d;
}

.tone3 {
  color: #4caf50;
}

.tone4 {
  color: #03a9f4;
}

.tone5 {
  color: #858585;
}

.meaning-card {
  text-align: left;
  padding: 10px;
}

.char {
  font-size: 30px;
}

.pinyin {
  font-size: 16px;
}

/* Pinyin is tone-colored per syllable at runtime (.tone1..5 spans). The sidebar
   "Color hanzi" / "Color pinyin" toggles add these classes to body. */
.no-hanzi-color .char-tone1,
.no-hanzi-color .char-tone2,
.no-hanzi-color .char-tone3,
.no-hanzi-color .char-tone4,
.no-hanzi-color .char-tone5 {
  color: inherit !important;
}

.no-pinyin-color .pinyin,
.no-pinyin-color #char_pinyin,
.no-pinyin-color .pinyin span,
.no-pinyin-color #char_pinyin span {
  color: inherit !important;
}

.zhuyin {
  font-size: 16px;
}

.py {
  font-size: 14px;
  color: var(--text2, gray);
}

.zy {
  font-size: 14px;
  color: var(--text2, gray);
}

.header {
  color: var(--header-color);
}

.question-sub-text {
  color: #f44336;
  font-weight: bold;
}

.char-tone1 {
  color: var(--tone-1);
}

.char-tone2 {
  color: var(--tone-2);
}

.char-tone3 {
  color: var(--tone-3);
}

.char-tone4 {
  color: var(--tone-4);
}

.char-tone5 {
  color: var(--tone-5);
}

.char-sim-1 {
  margin: 2px;
  font-size: 30px;
}

.char-trad-1 {
  margin: 2px;
  font-size: 30px;
}

.char-pin-1 {
  margin: 2px;
  line-height: 32px;
}

.char-zhy-1 {
  margin: 2px;
  line-height: 32px;
}

small {
  line-height: 1.5;
}

[dir="rtl"]:root {
  --isLTR: -1;
  --isRTL: 1;
}

h1,
h2,
h3 {
  margin: 0;
  font-weight: 500;
}

main {
  display: grid;
  gap: var(--space-xl);
  align-content: center;
  justify-content: center;
  place-content: center;
  padding: var(--space-sm);
}

@media (min-width: 540px) {
  main {
    padding: var(--space-lg);
  }
}

@media (min-width: 800px) {
  main {
    padding: var(--space-xl);
  }
}

form {
  max-width: 89vw;
  display: grid;
  gap: var(--space-xl) var(--space-xxl);
  --repeat: auto-fit;
  align-items: flex-start;
}

section {
  display: grid;
  gap: var(--space-md);
  margin: 6px;
}

header {
  display: grid;
  gap: var(--space-xxs);
}

fieldset {
  border: 1px solid var(--surface4);
  background: var(--surface4);
  padding: 0;
  margin: 0;
  display: grid;
  gap: 1px;
  border-radius: var(--space-sm);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

fieldset:focus-within {
  box-shadow: 0 5px 20px -10px hsla(0, 0%, 0%, 0.5);
}

fieldset a {
  text-decoration: none;
  color: var(--text1);
}

select {
  outline: none;
  border: none;
  border-radius: 12px;
  width: 34px;
  padding-left: 6px;
  color: var(--on-accent, var(--chip-fg, white));
  background: linear-gradient(to right, transparent 40px, var(--surface1) 0),
    var(--brand-bg-gradient) fixed;
  transition: background 0.5s ease;
}

select > option {
  border: none;
  border-radius: 20px;
  outline: none;
  background: var(--surface3);
  font-size: 22px;
  color: var(--text1);
}

input[type="checkbox"] {
  width: 40px;
  height: 20px;
  margin: 0;
  outline-offset: 5px;
  accent-color: var(--brand);
  position: relative;
  transform-style: preserve-3d;
  cursor: pointer;
  -webkit-appearance: none;
  background: var(--surface1);
  border-radius: 20px;
  transition: 0.5s;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
  outline: none;
}

input:checked[type="checkbox"] {
  background: linear-gradient(to right, transparent 40px, var(--surface1) 0),
    var(--brand-bg-gradient) fixed;
  transition: background 0.5s ease;
}

input[type="checkbox"]:before {
  content: "";
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 20px;
  top: 0;
  left: 0;
  background: white;
  transform: scale(1.1);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: 0.5s;
}

input:checked[type="checkbox"]:before {
  left: 20px;
}

input[type="number"] {
  width: 40px;
  height: 20px;
  margin: 0;
  padding: 4px;
  position: relative;
  cursor: text;
  -webkit-appearance: none;
  transition: 0.5s;
  border: 1px solid var(--surface1);
  background: var(--surface3);
  border-radius: var(--space-sm);
  text-align: end;
  outline: none;
  color: var(--text1);
  place-self: center;
}

.fieldset-item {
  background: var(--surface3);
  transition: background 0.2s ease;
  display: grid;
  gap: var(--space-md);
  padding-top: var(--space-sm);
  padding-bottom: var(--space-sm);
  padding-left: var(--space-md);
  padding-right: var(--space-md);
  text-align: left;
}

.fs-item-1 {
  grid-template-columns: 1fr var(--space-xl);
}

.fs-item-2 {
  grid-template-columns: 56px 1fr;
}

.fs-item-3 {
  grid-template-columns: 1fr 1fr;
}

.fieldset-item:focus-within {
  background: var(--surface2);
}

.fieldset-item:focus-within svg {
  fill: var(--text2, #fff);
}

.fieldset-item:focus-within picture {
  -webkit-clip-path: circle(50%);
  clip-path: circle(50%);
  background: var(--brand-bg-gradient) fixed;
}

.fieldset-item > :is(.input-stack, label) {
  display: grid;
  gap: var(--space-xs);
}

.fieldset-item > .input-stack > label {
  display: contents;
}

.fieldset-item svg {
  fill: var(--text2);
  height: var(--space-md);
}

.fieldset-item > input[type="checkbox"] {
  align-self: center;
  justify-self: center;
  place-self: center;
}

hr {
  border: 0;
  height: 0;
  width: 100%;
  border-bottom: 1px solid var(--surface4);
}

@keyframes hwGridFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

#character-target-div {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  animation: hwGridFadeIn 0.35s ease-out;
}

#onfinish-character-target-div {
  animation: hwGridFadeIn 0.35s ease-out;
}

/* The stroke-data status dot is pulled back up over the practice cell by its own
   inline margin-top:-36px, so it covers the bottom strip of the grid — and it
   comes later in flow, so it paints on top and swallowed every stroke that began
   down there. It is a status light, never a target. */
#ch_load_status {
  pointer-events: none;
}

#character-target-div > div {
  display: none;
}

#character-target-div > :first-child {
  display: block;
}

/* Render grid SVGs as block so the inline baseline descender gap can't make the
   prefilled placeholder taller than the writer's final SVG (caused a ~12px
   shrink/jump when the writer took over). */
#character-target-div svg,
#onfinish-character-target-div svg {
  display: block;
}

#onfinish-character-target-div::-webkit-scrollbar {
  height: 0px;
  width: 0px;
}

.close-button {
  position: absolute;
  right: 16px;
  width: 30px;
  height: 30px;
  background: var(--accent, red);
  border-radius: 24px;
  align-self: center;
  color: var(--on-accent, white);
  line-height: 1.5;
}

.close2 {
  font-size: 16px;
  text-align: center;
  line-height: 1.8;
}

.brand-title {
  text-align: left;
  font-weight: bold;
  font-size: 18px;
}

.brand-sub-title {
  text-align: left;
  font-size: 12px;
}

.more-side-brand {
  padding: 8px;
}

.sidebar-section-title {
  padding: 10px 16px 2px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text2);
}

.def-num {
  font-size: 0.7em;
  font-weight: 700;
  color: var(--def-num-color, var(--text2, #888));
  background: var(--def-num-bg, transparent);
  border: var(--def-num-border, none);
  border-radius: var(--def-num-radius, 0);
  padding: var(--def-num-pad, 0);
  vertical-align: middle;
}

.cl-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}

.cl-label {
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text2, #888);
  font-size: 0.62em;
}

.cl-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--surface4, #ddd);
  background: var(--surface3, #f5f5f5);
  font-size: 0.85em;
}

.cl-simp {
  color: var(--text2, #999);
  font-size: 0.85em;
}

.cl-pin {
  font-size: 0.7em;
  color: var(--text2, #999);
  letter-spacing: 0.02em;
}
`;

export default {
    FIELDS,
    MEANING_CARD,
    EXAMPLES_CARD,
    CONTROL_BAR,
    AUDIO_DIV,
    ANKI_TTS_SCRIPT,
    DECK_HTML_FRONT,
    DECK_HTML_FRONT_CHROME,
    DECK_HTML_BACK,
    DECK_HTML_WITH_HANZI_WRITER,
    DECK_CSS
};

// The building blocks the assembled templates above are made of. Exported so a
// template can be composed from a different layout without re-implementing the
// persistence bootstrap, the sidebar machinery or the shared card runtime.
export {
    FIELDS,
    PERSISTENCE,
    WRITER_COLOR_JS,
    WRITER_ENGINE_JS,
    MORE_INFO_SIDEBAR,
    SIDEBAR_JS,
    SIDEBAR_BLOCK,
    sidebarShell,
    CARD_JS,
    MEANING_CARD,
    EXAMPLES_CARD,
    CONTROL_BAR,
    AUDIO_DIV,
    ANKI_TTS_SCRIPT,
    DECK_CSS
};
