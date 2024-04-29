const FIELDS = {
    SIMPLIFIED: 'Simplified',
    TRADITIONAL: 'Traditional',
    PINYIN: 'Pinyin',
    ZHUYIN: 'Zhuyin',
    DEFINITIONS: 'Definitions',
    AUDIO: 'Audio',
};

const DECK_HTML_FRONT =
`
<script>
// v1.0.0 - https://github.com/SimonLammer/anki-persistence/blob/eeb2e1a9e37c941dd63e1fe6c2a257f043c40e0d/script.js
if(void 0===window.Persistence){var e="github.com/SimonLammer/anki-persistence/",t="_default";if(window.Persistence_localStorage=function(){var i=!1;try{null!==window.localStorage&&"object"==typeof window.localStorage&&(i=!0,this.clear=function(){for(var t=0;t<localStorage.length;t++){var i=localStorage.key(t);0==i.indexOf(e)&&(localStorage.removeItem(i),t--)}},this.setItem=function(i,n){void 0==n&&(n=i,i=t),localStorage.setItem(e+i,JSON.stringify(n))},this.getItem=function(i){return void 0==i&&(i=t),JSON.parse(localStorage.getItem(e+i))},this.removeItem=function(i){void 0==i&&(i=t),localStorage.removeItem(e+i)})}catch(n){}this.isAvailable=function(){return i}},window.Persistence_sessionStorage=function(){var i=!1;try{"object"==typeof window.sessionStorage&&(i=!0,this.clear=function(){for(var t=0;t<sessionStorage.length;t++){var i=sessionStorage.key(t);0==i.indexOf(e)&&(sessionStorage.removeItem(i),t--)}},this.setItem=function(i,n){void 0==n&&(n=i,i=t),sessionStorage.setItem(e+i,JSON.stringify(n))},this.getItem=function(i){return void 0==i&&(i=t),JSON.parse(sessionStorage.getItem(e+i))},this.removeItem=function(i){void 0==i&&(i=t),sessionStorage.removeItem(e+i)})}catch(n){}this.isAvailable=function(){return i}},window.Persistence_windowKey=function(i){var n=window[i],o=!1;"object"==typeof n&&(o=!0,this.clear=function(){n[e]={}},this.setItem=function(i,o){void 0==o&&(o=i,i=t),n[e][i]=o},this.getItem=function(i){return void 0==i&&(i=t),void 0==n[e][i]?null:n[e][i]},this.removeItem=function(i){void 0==i&&(i=t),delete n[e][i]},void 0==n[e]&&this.clear()),this.isAvailable=function(){return o}},window.Persistence=new Persistence_sessionStorage,navigator.userAgent.indexOf("Mobile")>0&&(window.Persistence=new Persistence_localStorage,Persistence.isAvailable()||(window.Persistence=new Persistence_sessionStorage)),Persistence.isAvailable()||(window.Persistence=new Persistence_windowKey("py")),!Persistence.isAvailable()){var i=window.location.toString().indexOf("title"),n=window.location.toString().indexOf("main",i);i>0&&n>0&&n-i<10&&(window.Persistence=new Persistence_windowKey("qt"))}}
</script>

<script>
    var switchIdList = ["text-pinyin", "text-zhuyin", "text-meaning", "text-sim", "text-trad"];
    function initSwitchPrefs() {
        for (var _id of switchIdList) {
            var divId = _id.replace("text-", "char_");
            if (Persistence.getItem("back" + _id) == "false") {
                document.getElementById(divId).style.display = "none";
            }
        }
    }
    
    if (Persistence.isAvailable()) {
        if (window.ankiPlatform == "desktop" || isInWebView()) {
            initSwitchPrefs();
        } else {
            window.addEventListener("load", initSwitchPrefs, false);
        }
    }

    function isInWebView() {
        var UA = navigator.userAgent;
        if (/iPhone|iPod|iPad/.test(UA)) {
            if (/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(UA)) {
                return true;
            }
        }
        if (window.location.href.includes("ankiuser.net")) {
            return true;
        }
        return false;
    }
</script>
`;

const DECK_HTML_BACK =
`<div id="char_zhuyin">{{Zhuyin}}</div>
<div id="char_pinyin">{{Pinyin}}</div>
<div id="char_sim" class="char-card">{{Simplified}}</div>
<div id="char_trad" class="char-card">{{Traditional}}</div>
<div id='audio' style='display:none'>{{Audio}}</div>

<div class="modal-footer1">
    <a class="btn" id="btnShowMenu" onclick="openSidebar('sidebar')">
        <div class="icon">
            <i class="material-icons">menu</i>
        </div>
    </a>
    <a class="btn" id='btnPlayAudio'>
        <div class="icon">
            <i class="material-icons">play_arrow</i>
        </div>
    </a>
    <a class="btn" id='btnMoreOptions' onclick="openSidebar('more-info-sidebar')">
        <div class="icon">
            <i class="material-icons">more_vert</i>
        </div>
    </a>
</div>

<hr>

<div id="char_meaning" class="meaning-card">{{Definitions}}</div>

<script>
// v1.0.0 - https://github.com/SimonLammer/anki-persistence/blob/eeb2e1a9e37c941dd63e1fe6c2a257f043c40e0d/script.js
if(void 0===window.Persistence){var e="github.com/SimonLammer/anki-persistence/",t="_default";if(window.Persistence_localStorage=function(){var i=!1;try{null!==window.localStorage&&"object"==typeof window.localStorage&&(i=!0,this.clear=function(){for(var t=0;t<localStorage.length;t++){var i=localStorage.key(t);0==i.indexOf(e)&&(localStorage.removeItem(i),t--)}},this.setItem=function(i,n){void 0==n&&(n=i,i=t),localStorage.setItem(e+i,JSON.stringify(n))},this.getItem=function(i){return void 0==i&&(i=t),JSON.parse(localStorage.getItem(e+i))},this.removeItem=function(i){void 0==i&&(i=t),localStorage.removeItem(e+i)})}catch(n){}this.isAvailable=function(){return i}},window.Persistence_sessionStorage=function(){var i=!1;try{"object"==typeof window.sessionStorage&&(i=!0,this.clear=function(){for(var t=0;t<sessionStorage.length;t++){var i=sessionStorage.key(t);0==i.indexOf(e)&&(sessionStorage.removeItem(i),t--)}},this.setItem=function(i,n){void 0==n&&(n=i,i=t),sessionStorage.setItem(e+i,JSON.stringify(n))},this.getItem=function(i){return void 0==i&&(i=t),JSON.parse(sessionStorage.getItem(e+i))},this.removeItem=function(i){void 0==i&&(i=t),sessionStorage.removeItem(e+i)})}catch(n){}this.isAvailable=function(){return i}},window.Persistence_windowKey=function(i){var n=window[i],o=!1;"object"==typeof n&&(o=!0,this.clear=function(){n[e]={}},this.setItem=function(i,o){void 0==o&&(o=i,i=t),n[e][i]=o},this.getItem=function(i){return void 0==i&&(i=t),void 0==n[e][i]?null:n[e][i]},this.removeItem=function(i){void 0==i&&(i=t),delete n[e][i]},void 0==n[e]&&this.clear()),this.isAvailable=function(){return o}},window.Persistence=new Persistence_sessionStorage,navigator.userAgent.indexOf("Mobile")>0&&(window.Persistence=new Persistence_localStorage,Persistence.isAvailable()||(window.Persistence=new Persistence_sessionStorage)),Persistence.isAvailable()||(window.Persistence=new Persistence_windowKey("py")),!Persistence.isAvailable()){var i=window.location.toString().indexOf("title"),n=window.location.toString().indexOf("main",i);i>0&&n>0&&n-i<10&&(window.Persistence=new Persistence_windowKey("qt"))}}
</script>

<!--sidebar-->
<script>
    function playAudio() {
        var audioDiv = document.getElementById('audio');
        var audio = audioDiv.getElementsByTagName("*");
        audio[0].tagName == "AUDIO" ? audio[0].play() : audio[0].click();
    }

    document.getElementById("btnPlayAudio").onclick = function () {
        playAudio();
    };

    var frontBack = "back";
    var switchIdList = ["text-pinyin", "text-zhuyin", "text-meaning", "text-sim", "text-trad"];
    function initSwitchPrefs() {
        for (var _id of switchIdList) {
            var perId = frontBack + _id;
            var divId = _id.replace("text-", "char_");
            if (Persistence.getItem(perId) == "false") {
                document.getElementById(_id).checked = false;
                document.getElementById(divId).style.display = "none";
            } else {
                document.getElementById(_id).checked = true;
                Persistence.setItem(perId, "true");
                document.getElementById(divId).style.display = "block";
            }

            var isShow = document.getElementById(_id).checked ? true : false;
            if (_id == "text-pinyin") {
                showHide(".pinyin", isShow);
            }
            if (_id == "text-zhuyin") {
                showHide(".zhuyin", isShow);
            }
            if (_id == "text-sim") {
                showHide("#char-sim-id", isShow);
            }
            if (_id == "text-trad") {
                showHide("#char-trad-id", isShow);
                showHide(".sep", isShow);
            }
        }
    }

    function setPrefs(e) {
        var perId = frontBack + e.id;
        if (e.type == "checkbox") {
            Persistence.setItem(perId, e.checked.toString());
            var divId = e.id.replace("text-", "char_");
            if (e.checked) {
                document.getElementById(divId).style.display = "block";
            } else {
                document.getElementById(divId).style.display = "none";
            }

            var isShow = document.getElementById(divId).style.display == "none" ? false : true;
            if (e.id == "text-pinyin") {
                showHide(".pinyin", isShow);
            }
            if (e.id == "text-zhuyin") {
                showHide(".zhuyin", isShow);
            }
            if (e.id == "text-sim") {
                showHide("#char-sim-id", isShow);
            }
            if (e.id == "text-trad") {
                showHide("#char-trad-id", isShow);
                showHide(".sep", isShow);
            }
        }
    }

    function showHide(type, isShow) {
        if (isShow) {
            document.querySelectorAll(type).forEach(function (val) {
                val.style.display = 'inline';
            });
        } else {
            document.querySelectorAll(type).forEach(function (val) {
                val.style.display = 'none';
            });
        }
    }

    function openSidebar(id) {
        var width = id == "sidebar" ? "250px" : "160px";
        document.getElementById(id).style.width = width;
    }

    function closeSidebar(id) {
        document.getElementById(id).style.width = "0";
    }

    document.addEventListener('click', function (event) {
        if (!document.getElementById("sidebar") || !document.getElementById("more-info-sidebar")) { return };

        if (!document.getElementById("sidebar").contains(event.target)) {
            closeSidebar("sidebar");
        }

        if (!document.getElementById("more-info-sidebar").contains(event.target)) {
            closeSidebar("more-info-sidebar");
        }

        if (document.getElementById("btnShowMenu").contains(event.target)) {
            openSidebar("sidebar");
        }

        if (document.getElementById("btnMoreOptions").contains(event.target)) {
            openSidebar("more-info-sidebar");
        }
    });

    if (Persistence.isAvailable()) {
        if (window.ankiPlatform == "desktop" || isInWebView()) {
            initSwitchPrefs();
        } else {
            window.addEventListener("load", initSwitchPrefs, false);
        }
    }

    function isInWebView() {
        var UA = navigator.userAgent;
        if (/iPhone|iPod|iPad/.test(UA)) {
            if (/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(UA)) {
                return true;
            }
        }
        if (window.location.href.includes("ankiuser.net")) {
            return true;
        }
        return false;
    }
</script>

<div id="sidebar" class="sidebar">
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

    <section>
        <fieldset>
            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="text-pinyin">
                        Pinyin
                    </label>
                </div>
                <input class="tappable" type="checkbox" id="text-pinyin" name="text-pinyin" onchange=setPrefs(this)>
            </div>

            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="text-zhuyin">
                        Zhuyin
                    </label>
                </div>
                <input class="tappable" type="checkbox" id="text-zhuyin" name="text-zhuyin" onchange=setPrefs(this)>
            </div>

            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="text-meaning">
                        Meaning
                    </label>
                </div>
                <input class="tappable" type="checkbox" id="text-meaning" name="text-meaning" onchange=setPrefs(this)>
            </div>

            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="text-sim">
                        Simplified
                    </label>
                </div>
                <input class="tappable" type="checkbox" id="text-sim" name="text-sim" onchange=setPrefs(this)>
            </div>

            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="text-trad">
                        Traditional
                    </label>
                </div>
                <input class="tappable" type="checkbox" id="text-trad" name="text-trad" onchange=setPrefs(this)>
            </div>
        </fieldset>
    </section>

    <section>
        <fieldset>
            <a href="https://github.com/krmanik/Anki-xiehanzi">
                <div class="fieldset-item tappable">
                    <span style="font-size:14px; text-align:center;">View it on GitHub</span>
                </div>
            </a>
        </fieldset>
    </section>
</div>

<div id="more-info-sidebar" class="more-info-sidebar">
    <a class="fieldset-item tappable">
        <div class="more-side-brand">
            <div class="brand-title">写汉字</div>
            <div class="brand-sub-title">xiě hànzì</div>
        </div>
        <div onclick="closeSidebar('more-info-sidebar')" class="close-button close2">✖</div>
    </a>
    <a class="fieldset-item tappable" id="plecoMobile" href="plecoapi://x-callback-url/df?hw={{Simplified}}">
        <img src="_pleco.png"></img>
        <small>Pleco</small>
    </a>
    <a class="fieldset-item tappable" href="http://dict.youdao.com/search?q={{Simplified}}">
        <img src="_youdao.png"></img>
        <small>Youdao</small>
    </a>
    <a class="fieldset-item tappable" href="https://hanzicraft.com/character/{{Simplified}}">
        <img src="_hanzicraft.png"></img>
        <small>HanziCraft</small>
    </a>
    <a class="fieldset-item tappable" href="https://characterpop.com/characters/{{Simplified}}">
        <img src="_characterpop.svg"></img>
        <small>CharacterPop</small>
    </a>
    <a class="fieldset-item tappable" href="http://rtega.be/chmn/index.php?c={{Simplified}}">
        <img src="_rtega.png"></img>
        <small>Rtega</small>
    </a>
    <a class="fieldset-item tappable" href="https://tatoeba.org/en/sentences/search?from=cmn&query={{Simplified}}&to=">
        <img src="_tatoeba.png"></img>
        <small>Tatoeba</small>
    </a>
</div>
<!-----sidebar------>
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
  --title-color: grey;
  --time-left-color: teal;
  --hanzi-grid: #fafafa;
  --stroke: #555;
  --outline: #ddd;
  --drawing: #333;
  --pinyin-color: #ef6c00;
  --simplified-color: #6495ed;
  --traditional-color: #00796b;
  --meaning-color: #607d8b;
  --icon-button-background: #63759d;
  --icon-button-background-focus: #7d92c2;
  --sidebar-color: white;
  --sidebar-background-color: #52575d;
  --header-color: #455a64;
  --surface1: rgb(226, 226, 226);
  --surface2: rgb(255, 255, 254);
  --surface3: rgb(249, 249, 249);
  --surface4: rgb(212, 212, 212);
  --text1: rgb(48, 48, 48);
  --text2: rgb(94, 94, 94);
  --brand: rgb(47, 167, 214);
  --thumb-highlight-color: rgba(0, 0, 0, 0.2);
  font-size: 20px;
  text-align: center;
  color: black;
  background-color: white;
}

.card.night_mode {
  --header-color: white;
  --title-color: #00bcd4;
  --time-left-color: #fff;
  --hanzi-grid: #262626;
  --stroke: #ffffff;
  --outline: #5b5b5b;
  --drawing: #fff;
  --pinyin-color: #27b46e;
  --simplified-color: #6495ed;
  --traditional-color: #fba910;
  --meaning-color: #00bfa5;
  --icon-button-background: #63759d;
  --icon-button-background-focus: #7d92c2;
  --sidebar-color: white;
  --sidebar-background-color: #52575d;
  --surface1: rgb(27, 27, 27);
  --surface2: rgb(37, 37, 37);
  --surface3: rgb(48, 48, 48);
  --surface4: rgb(59, 59, 59);
  --text1: rgb(240, 240, 240);
  --text2: rgb(184, 184, 184);
  --brand: rgb(118, 161, 184);
  color: white;
  background-color: #1f1f1f;
}

/* Simplified and Traditional Kai Ti Fonts */
/*
@font-face {
    font-family: 'AR PL KaitiM Big5';
    src: url('_ZenKai-Medium.ttf') format('ttf'),
        url('_ZenKai-Medium.woff2') format('woff2'),
        url('_ZenKai-Medium.woff') format('woff');
    font-weight: 500;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'AR PL KaitiM GB';
    src: url('_GBZenKai-Medium.ttf') format('ttf'),
        url('_GBZenKai-Medium.woff2') format('woff2'),
        url('_GBZenKai-Medium.woff') format('woff');
    font-weight: 500;
    font-style: normal;
    font-display: swap;
}
*/

.char-card {
  font-size: 3em;
}

/* Windows */
.win .char-card {
  font-family: "AR PL KaitiM GB", "AR PL KaitiM Big5";
}
/* macOS */
.mac .char-card {
  font-family: "AR PL KaitiM GB", "AR PL KaitiM Big5";
}
/* Linux desktops */
.linux:not(.android) .char-card {
  font-family: "AR PL KaitiM GB", "AR PL KaitiM Big5";
}

/* Material Icon Font */

@font-face {
  font-family: "Material Icons";
  font-style: normal;
  font-weight: 300;
  src: url(MaterialIcons-Regular.eot);
  /* For IE6-8 */
  src: local("Material Icons"), local("MaterialIcons-Regular"),
    url(_MaterialIcons-Regular.woff2) format("woff2"),
    url(_MaterialIcons-Regular.woff) format("woff"),
    url(_MaterialIcons-Regular.ttf) format("truetype"),
    url(https://fonts.gstatic.com/s/materialicons/v141/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2) format('woff2');
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
  -webkit-box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.5);
  -moz-box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.5);
  box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.5);
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

/*https://codepen.io/colewaldrip/pen/gpEaWb*/

/* Material Icon Button */

.icon {
  margin: 3px;
  position: relative;
  display: inline-block;
  color: white;
  background-color: var(--icon-button-background);
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
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
  margin-bottom: 6px;
  padding: 2px;
  margin: 3px;
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

.meaning {
  display: block;
}

.char {
  font-size: 30px;
}

.pinyin {
  font-size: 16px;
}

.zhuyin {
  font-size: 16px;
}

.py {
  font-size: 14px;
  color: gray;
}

.zy {
  font-size: 14px;
  color: gray;
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

fieldset[focus-within] {
  box-shadow: 0 5px 20px -10px hsla(0, 0%, 0%, 0.5);
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
  color: white;
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
  -webkit-transition: background 0.5s ease;
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

.fs-item-front-back {
  padding: unset;
  text-align: center;
  gap: unset;
  cursor: pointer;
}

.front-back {
  padding: var(--space-xs);
}

.btn-active {
  color: white;
  background: var(--brand-bg2);
}

.fieldset-item[focus-within] {
  background: var(--surface2);
}

.fieldset-item:focus-within {
  background: var(--surface2);
}

.fieldset-item[focus-within] svg {
  fill: #fff;
}

.fieldset-item:focus-within svg {
  fill: #fff;
}

.fieldset-item[focus-within] picture {
  -webkit-clip-path: circle(50%);
  clip-path: circle(50%);
  background: var(--brand-bg-gradient) fixed;
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

#character-target-div {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

#character-target-div > div {
  display: none;
}

#character-target-div > :first-child {
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
  background: red;
  border-radius: 24px;
  align-self: center;
  color: white;
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
`;

const DECK_HTML_WITH_HANZI_WRITER =
    `
<script>
    var url_hanzi = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/";

    // change color
    var stroke_color = "#555";
    var outline_color = "#DDD";
    var drawing_color = "#333";

    if (document.body.classList.contains("night_mode")) {
        stroke_color = "#ffffff";
        outline_color = "#5B5B5B";
        drawing_color = "#fff";
    }

    function getToneColor(char) {
        stroke_color = "#555";
        if (document.body.classList.contains("night_mode")) {
            stroke_color = "#ffffff";
        }
        switch (char) {
            case "char-tone1": return "#f44336";
            case "char-tone2": return "#ff9800";
            case "char-tone3": return "#4caf50";
            case "char-tone4": return "#2196f3";
            case "char-tone0": return stroke_color;
            case "char-tone5": return stroke_color;
        }
    }
</script>

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
        <div class="icon">
            <i class="material-icons">gesture</i>
        </div>
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

<div id="char_meaning" class="meaning-card">{{Definitions}}</div>


<!--sidebar-->

<div id="sidebar" class="sidebar">
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
    <section>
        <fieldset>
            <div class="fieldset-item fs-item-3 practice fs-item-front-back">
                <div id="text-front" class="input-stack front-back" onclick="setActive('text-front')">Front</div>
                <div id="text-back" class="input-stack front-back" onclick="setActive('text-back')">Back</div>
            </div>
        </fieldset>
    </section>
    <section>
        <fieldset>
            <div class="fieldset-item fs-item-1 practice">
                <div class="input-stack">
                    <label for="practice-select">Practice</label>
                </div>
                <select name="practice" id="practice-select" onchange=setPrefs(this)>
                    <option>简</option>
                    <option>繁</option>
                </select>
            </div>
        </fieldset>
    </section>
    <section>
        <fieldset>
            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="text-pinyin">
                        Pinyin
                    </label>
                </div>
                <input class="tappable" type="checkbox" id="text-pinyin" name="text-pinyin" onchange=setPrefs(this)>
            </div>
            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="text-zhuyin">
                        Zhuyin
                    </label>
                </div>
                <input class="tappable" type="checkbox" id="text-zhuyin" name="text-zhuyin" onchange=setPrefs(this)>
            </div>
            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="text-meaning">
                        Meaning
                    </label>
                </div>
                <input class="tappable" type="checkbox" id="text-meaning" name="text-meaning" onchange=setPrefs(this)>
            </div>
            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="text-sim">
                        Simplified
                    </label>
                </div>
                <input class="tappable" type="checkbox" id="text-sim" name="text-sim" onchange=setPrefs(this)>
            </div>
            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="text-trad">
                        Traditional
                    </label>
                </div>
                <input class="tappable" type="checkbox" id="text-trad" name="text-trad" onchange=setPrefs(this)>
            </div>
            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="text-grid">
                        Grid
                    </label>
                </div>
                <input class="tappable" type="checkbox" id="text-grid" name="text-grid" onchange=setPrefs(this)>
            </div>
            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="text-outline">
                        Outline
                    </label>
                </div>
                <input class="tappable" type="checkbox" id="text-outline" name="text-outline" onchange=setPrefs(this)>
            </div>
            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="text-stroke-color">
                        Stroke tone color
                    </label>
                </div>
                <input class="tappable" type="checkbox" id="text-stroke-color" name="text-stroke-color"
                    onchange=setPrefs(this)>
            </div>
        </fieldset>
    </section>
    <section>
        <fieldset>
            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="draw-size" id="text-draw-size" aria-hidden="true"><small>Grid size</small></label>
                </div>
                <input class="tappable" name="draw-size" id="draw-size" aria-labelledby="draw-size" type="number"
                    value="250" min="100" max="1000" oninput=setPrefs(this)>
            </div>
            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="stroke-size" id="text-stroke-size" aria-hidden="true"><small>Stroke
                            width</small></label>
                </div>
                <input class="tappable" name="stroke-size" id="stroke-size" aria-labelledby="stroke-size" type="number"
                    value="6" min="2" max="50" oninput=setPrefs(this)>
            </div>
            <div class="fieldset-item fs-item-1">
                <div class="input-stack">
                    <label for="hint-miss" id="text-hint-miss" aria-hidden="true"><small>Hint after
                            misses</small></label>
                </div>
                <input class="tappable" name="hint-miss" id="hint-miss" aria-labelledby="hint-miss" type="number"
                    value="3" min="1" max="10" oninput=setPrefs(this)>
            </div>
        </fieldset>
    </section>
    <section>
        <fieldset>
            <a href="https://github.com/krmanik/Anki-xiehanzi">
                <div class="fieldset-item tappable">
                    <span style="font-size:14px; text-align:center;">View it on GitHub</span>
                </div>
            </a>
        </fieldset>
    </section>
</div>
<div id="more-info-sidebar" class="more-info-sidebar">
    <a class="fieldset-item tappable">
        <div class="more-side-brand">
            <div class="brand-title">写汉字</div>
            <div class="brand-sub-title">xiě hànzì</div>
        </div>
        <div onclick="closeSidebar('more-info-sidebar')" class="close-button close2">✖</div>
    </a>
    <a class="fieldset-item tappable" id="plecoMobile" href="plecoapi://x-callback-url/df?hw={{Simplified}}">
        <img src="_pleco.png"></img>
        <small>Pleco</small>
    </a>
    <a class="fieldset-item tappable" href="http://dict.youdao.com/search?q={{Simplified}}">
        <img src="_youdao.png"></img>
        <small>Youdao</small>
    </a>
    <a class="fieldset-item tappable" href="https://hanzicraft.com/character/{{Simplified}}">
        <img src="_hanzicraft.png"></img>
        <small>HanziCraft</small>
    </a>
    <a class="fieldset-item tappable" href="https://characterpop.com/characters/{{Simplified}}">
        <img src="_characterpop.svg"></img>
        <small>CharacterPop</small>
    </a>
    <a class="fieldset-item tappable" href="http://rtega.be/chmn/index.php?c={{Simplified}}">
        <img src="_rtega.png"></img>
        <small>Rtega</small>
    </a>
    <a class="fieldset-item tappable" href="https://tatoeba.org/en/sentences/search?from=cmn&query={{Simplified}}&to=">
        <img src="_tatoeba.png"></img>
        <small>Tatoeba</small>
    </a>
</div>
<!-----sidebar------>

<script>
    // v1.0.0 - https://github.com/SimonLammer/anki-persistence/blob/eeb2e1a9e37c941dd63e1fe6c2a257f043c40e0d/script.js
    if (void 0 === window.Persistence) { var e = "github.com/SimonLammer/anki-persistence/", t = "_default"; if (window.Persistence_localStorage = function () { var i = !1; try { null !== window.localStorage && "object" == typeof window.localStorage && (i = !0, this.clear = function () { for (var t = 0; t < localStorage.length; t++) { var i = localStorage.key(t); 0 == i.indexOf(e) && (localStorage.removeItem(i), t--) } }, this.setItem = function (i, n) { void 0 == n && (n = i, i = t), localStorage.setItem(e + i, JSON.stringify(n)) }, this.getItem = function (i) { return void 0 == i && (i = t), JSON.parse(localStorage.getItem(e + i)) }, this.removeItem = function (i) { void 0 == i && (i = t), localStorage.removeItem(e + i) }) } catch (n) { } this.isAvailable = function () { return i } }, window.Persistence_sessionStorage = function () { var i = !1; try { "object" == typeof window.sessionStorage && (i = !0, this.clear = function () { for (var t = 0; t < sessionStorage.length; t++) { var i = sessionStorage.key(t); 0 == i.indexOf(e) && (sessionStorage.removeItem(i), t--) } }, this.setItem = function (i, n) { void 0 == n && (n = i, i = t), sessionStorage.setItem(e + i, JSON.stringify(n)) }, this.getItem = function (i) { return void 0 == i && (i = t), JSON.parse(sessionStorage.getItem(e + i)) }, this.removeItem = function (i) { void 0 == i && (i = t), sessionStorage.removeItem(e + i) }) } catch (n) { } this.isAvailable = function () { return i } }, window.Persistence_windowKey = function (i) { var n = window[i], o = !1; "object" == typeof n && (o = !0, this.clear = function () { n[e] = {} }, this.setItem = function (i, o) { void 0 == o && (o = i, i = t), n[e][i] = o }, this.getItem = function (i) { return void 0 == i && (i = t), void 0 == n[e][i] ? null : n[e][i] }, this.removeItem = function (i) { void 0 == i && (i = t), delete n[e][i] }, void 0 == n[e] && this.clear()), this.isAvailable = function () { return o } }, window.Persistence = new Persistence_sessionStorage, navigator.userAgent.indexOf("Mobile") > 0 && (window.Persistence = new Persistence_localStorage, Persistence.isAvailable() || (window.Persistence = new Persistence_sessionStorage)), Persistence.isAvailable() || (window.Persistence = new Persistence_windowKey("py")), !Persistence.isAvailable()) { var i = window.location.toString().indexOf("title"), n = window.location.toString().indexOf("main", i); i > 0 && n > 0 && n - i < 10 && (window.Persistence = new Persistence_windowKey("qt")) } }
</script>

<script>
    var charClass = document.getElementById("char-sim-id").children;

    var switchIdList = ["text-grid", "text-pinyin", "text-zhuyin", "text-meaning", "text-sim", "text-trad", "text-stroke-color", "text-outline"];

    var frontBack = "front";
    function setActive(side) {
        if (side == "text-front") {
            frontBack = "front";
            document.getElementById("text-front").classList.add("btn-active")
            document.getElementById("text-back").classList.remove("btn-active")
        }
        if (side == "text-back") {
            frontBack = "back";
            document.getElementById("text-front").classList.remove("btn-active")
            document.getElementById("text-back").classList.add("btn-active")
        }
        initSwitchPrefs();
    }

    if (!document.getElementById("back")) {
        setActive("text-front");
    } else {
        setActive("text-back");
    }

    function initPractice() {
        var _selectPracticeId = frontBack + "practice-select";
        var selectPracticeElem = document.getElementById("practice-select");
        var selectPracticeStore = Persistence.getItem(_selectPracticeId);

        if (selectPracticeStore == undefined) {
            selectPracticeElem.selectedIndex = 0;
            Persistence.setItem(_selectPracticeId, 0);
        } else {
            selectPracticeElem.selectedIndex = selectPracticeStore;
            Persistence.setItem(_selectPracticeId, selectPracticeStore);
        }
    }

    function initSwitchPrefs() {
        for (var _id of switchIdList) {
            var perId = frontBack + _id;
            var divId = _id.replace("text-", "char_");
            var drawIds = ["text-grid", "text-stroke-color", "text-outline"];
            if (Persistence.getItem(perId) == "false") {
                document.getElementById(_id).checked = false;
                if (!drawIds.includes(_id)) {
                    document.getElementById(divId).style.display = "none";
                }
            } else {
                document.getElementById(_id).checked = true;
                Persistence.setItem(perId, "true");
                if (!drawIds.includes(_id)) {
                    document.getElementById(divId).style.display = "block";
                }
            }

            var isShowField = document.getElementById(_id).checked ? true : false;
            if (_id == "text-pinyin") {
                showHide(".pinyin", isShowField);
            }
            if (_id == "text-zhuyin") {
                showHide(".zhuyin", isShowField);
            }
            if (_id == "text-sim") {
                showHide("#char-sim-id", isShowField);
            }
            if (_id == "text-trad") {
                showHide("#char-trad-id", isShowField);
                showHide(".sep", isShowField);
            }
        }

        showTraditionalChar();
    }

    function showTraditionalChar() {
        var tradChar = document.getElementById("char_trad");
        var simChar = document.getElementById("char_sim");
        var tradPer = Persistence
        if (tradChar.innerHTML != simChar.innerHTML) {
            if (Persistence.getItem(frontBack + "text-trad") == "true") {
                tradChar.style.display = "block";
            }
        } else {
            if (Persistence.getItem(frontBack + "text-sim") == "true") {
                tradChar.style.display = "none";
            }
        }
    }

    function initDrawPrefs() {
        var drawPrefsList = ["draw-size", "stroke-size", "hint-miss"];
        for (var _id of drawPrefsList) {
            var perId = frontBack + _id;
            var elem = document.getElementById(_id);
            var store = Persistence.getItem(perId);
            if (store) {
                elem.value = store;
            } else {
                var value = _id == "draw-size" ? 400 : _id == "stroke-size" ? 64 : 5; 2
                
                elem.value = value;
                Persistence.setItem(perId, value);
            }
        }

        var perIndex = Persistence.getItem(frontBack + "practice-select");
        if (perIndex) {
            characters = document.getElementById('char_trad').innerHTML;
            document.getElementById("practice-select").selectedIndex = 1;
        } else {
            characters = document.getElementById('char_sim').innerHTML;
            document.getElementById("practice-select").selectedIndex = 0;
        }
    }

    function setPrefs(e) {
        var perId = frontBack + e.id;
        if (e.id == "practice-select") {
            Persistence.setItem(perId, e.selectedIndex);
            characters = document.getElementById("practice-select").selectedIndex == 0
                ? document.getElementById('char_sim').innerHTML
                : document.getElementById('char_trad').innerHTML;
            doPractice();
        }

        if (e.type == "checkbox") {
            Persistence.setItem(perId, e.checked.toString());
            var divId = e.id.replace("text-", "char_");
            if (e.id == "text-stroke-color" || e.id == "text-outline") {
                return;
            }

            if (e.checked) {
                document.getElementById(divId).style.display = "block";
            } else {
                document.getElementById(divId).style.display = "none";
            }

            var isShowField = document.getElementById(divId).style.display == "none" ? false : true;
            if (e.id == "text-pinyin") {
                showHide(".pinyin", isShowField);
            }
            if (e.id == "text-zhuyin") {
                showHide(".zhuyin", isShowField);
            }
            if (e.id == "text-sim") {
                showHide("#char-sim-id", isShowField);
            }
            if (e.id == "text-trad") {
                showHide("#char-trad-id", isShowField);
                showHide(".sep", isShowField);
            }
        }

        if (e.type == "number") {
            Persistence.setItem(perId, e.value);
            var elem = document.getElementById(e.id);
            elem.value = e.value;
        }
    }

    function showHide(type, isShow, style = "inline") {
        if (isShow) {
            document.querySelectorAll(type).forEach(function (val) {
                val.style.display = style;
            });
        } else {
            document.querySelectorAll(type).forEach(function (val) {
                val.style.display = 'none';
            });
        }
    }

    function openSidebar(id) {
        var width = id == "sidebar" ? "250px" : "160px";
        document.getElementById(id).style.width = width;
    }

    function closeSidebar(id) {
        document.getElementById(id).style.width = "0";
    }

    document.addEventListener('click', function (event) {
        if (!document.getElementById("sidebar") || !document.getElementById("more-info-sidebar")) { return };
        if (!document.getElementById("sidebar").contains(event.target)) {
            closeSidebar("sidebar");
        }
        if (!document.getElementById("more-info-sidebar").contains(event.target)) {
            closeSidebar("more-info-sidebar");
        }
        if (document.getElementById("btnShowMenu").contains(event.target)) {
            openSidebar("sidebar");
        }
        if (document.getElementById("btnMoreOptions").contains(event.target)) {
            openSidebar("more-info-sidebar");
        }
    });

    if (Persistence.isAvailable()) {
        if (window.ankiPlatform == "desktop" || isInWebView()) {
            initPractice();
            initSwitchPrefs();
            initDrawPrefs();
        } else {
            window.addEventListener("load", initPractice, false);
            window.addEventListener("load", initSwitchPrefs, false);
            window.addEventListener("load", initDrawPrefs, false);
        }
    }
    // audio in Anki Web on different systems

    function isInWebView() {
        var UA = navigator.userAgent;
        if (/iPhone|iPod|iPad/.test(UA)) {
            if (/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(UA)) {
                return true;
            }
        }
        if (window.location.href.includes("ankiuser.net")) {
            return true;
        }
        return false;
    }
</script>
<script src="https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js"></script>
<script>
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
        var audioDiv = document.getElementById('audio');
        var audio = audioDiv.getElementsByTagName("*");
        audio[0].tagName == "AUDIO" ? audio[0].play() : audio[0].click();
    }

    document.getElementById("btnPlayAudio").onclick = function () {
        playAudio();
    };

    var grid_data = \`<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' class='grid-color'  id='grid-background-target'><g id="char_grid"><line x1='0' y1='0' x2='100%' y2='100%' stroke='var(--surface1)' /><line x1='100%' y1='0' x2='0' y2='100%' stroke='var(--surface1)' /><line x1='50%' y1='0' x2='50%' y2='100%' stroke='var(--surface1)' /><line x1='0' y1='50%' x2='100%' y2='50%' stroke='var(--surface1)' /></g></svg>\`;

    var characters = document.getElementById("practice-select").selectedIndex == "0"
        ? document.getElementById('char_sim').innerHTML
        : document.getElementById('char_trad').innerHTML;

    function generateHanziOnFinishQuiz(style = "none", finish = false) {
        var drawGrid = document.getElementById('onfinish-character-target-div');
        drawGrid.innerHTML = "";
        drawGrid.style = "";
        drawGrid.style.position = "absolute";
        drawGrid.style.display = "grid";
        var size = 40;
        if (finish) {
            size = 100;
            drawGrid.style.position = "unset";
            drawGrid.style.display = "block";
            drawGrid.style.whiteSpace = "nowrap";
            drawGrid.style.overflow = "scroll";
        }

        for (i = 0; i < characters.length; i++) {
            var hanzi = characters[i];
            var span = document.createElement('span');
            span.innerHTML = grid_data;
            span.children[0].id = "onfinish-grid-background-target" + i;
            span.children[0].style.margin = finish ? "6px" : "2px";
            span.style.display = style;
            drawGrid.appendChild(span);
            setStrokeColor(i);
            var writer = HanziWriter.create("onfinish-grid-background-target" + i, hanzi, {
                width: size,
                height: size,
                padding: 5,
                strokeColor: stroke_color
            })
        }
    }

    document.getElementById("btnReloadQuiz").onclick = function () {
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

        document.getElementById("ch_load_status").innerHTML = "&#8226;";
        document.getElementById("ch_load_status").style.marginBottom = "0px";
        document.getElementById("ch_load_status").style.display = "block";

        var hanziWriterList = [];
        var drawGrid = document.getElementById('character-target-div');
        drawGrid.innerHTML = "";

        for (i = 0; i < characters.length; i++) {
            var div = document.createElement('div');
            div.id = "div" + i;
            div.innerHTML = grid_data;
            div.children[0].id = "grid-background-target" + i;
            drawGrid.appendChild(div);
            setStrokeColor(i);
            var hanzi = characters[i];
            var writer = HanziWriter.create('grid-background-target' + i, hanzi, {
                onLoadCharDataSuccess: function (data) {
                    document.getElementById("ch_load_status").style.color = "#4caf50";
                },
                onLoadCharDataError: function (reason) {
                    document.getElementById("ch_load_status").style.color = "#ea2322";
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

            document.getElementById("text-outline").onclick = function () {
                btnTapAudio();
                document.getElementById("text-outline").checked ?
                    writer.showOutline() : writer.hideOutline();
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
                for (i = 0; i < len; i++) {
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
                for (i = 0; i < len; i++) {
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

        for (i = 0; i < len; i++) {
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
            document.querySelector('#character-target-div').innerHTML = "";
            document.getElementById("ch_load_status").style.display = "none";
            generateHanziOnFinishQuiz("unset", true);
        }

        playAudio();
        showHide("#char_sim", true);
        showTraditionalChar();
        showHide("#char_meaning", true, "block");
        if (document.getElementById("text-pinyin").checked) {
            showHide(".pinyin", true);
        }
        if (document.getElementById("text-zhuyin").checked) {
            showHide(".zhuyin", true);
        }
        showNextAndRevealBtn(false);
    }

    function showNextAndRevealBtn(show) {
        showHide("#btnGoNextCard", show);
        showHide("#btnRevealChar", show);
    }

    if (Persistence.isAvailable()) {
        doPractice();
    }
</script>
`

export default {
    FIELDS,
    DECK_HTML_FRONT,
    DECK_HTML_BACK,
    DECK_HTML_WITH_HANZI_WRITER,
    DECK_CSS
};
