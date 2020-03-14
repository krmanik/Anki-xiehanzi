# Anki-maobi
Learn, read, write and practice Mandarin by drawing strokes in anki and ankidroid. I have use existing js library for implementing this in Anki and Ankidroid. It is a script written in Javascript to front side of card template of anki deck.

# Demo 
![Alt Text](https://github.com/infinyte7/Anki-maobi/blob/master/demo_ankidroid.gif)


# Quickstart
### Download HSK Anki apkg file for Anki or AnkiDroid
Import this file to Anki or AnkiDroid for practicing HSK words.
<br>[HSK 1 Deck](https://github.com/infinyte7/Anki-maobi/blob/master/HSK%20Anki%20apkg/HSK_1_Write.apkg?raw=true)
<br>[HSK 2 Deck](https://github.com/infinyte7/Anki-maobi/blob/master/HSK%20Anki%20apkg/HSK_2_Write.apkg?raw=true)
<br>[HSK 3 Deck](https://github.com/infinyte7/Anki-maobi/blob/master/HSK%20Anki%20apkg/HSK_3_Write.apkg?raw=true)
<br>[HSK 4 Deck](https://github.com/infinyte7/Anki-maobi/blob/master/HSK%20Anki%20apkg/HSK_4_Write.apkg?raw=true)
<br>[HSK 5 Deck](https://github.com/infinyte7/Anki-maobi/blob/master/HSK%20Anki%20apkg/HSK_5_Write.apkg?raw=true)
<br>[HSK 6 Deck](https://github.com/infinyte7/Anki-maobi/blob/master/HSK%20Anki%20apkg/HSK_6_Write.apkg?raw=true)

### To import in Ankidroid
![Image Import Mobile](https://github.com/infinyte7/Anki-maobi/blob/master/image/Import_in_mobile.png)


## Change preferences according to requirements 

```
<!--MIT License-->
<script>
    //customize preference
    var char_height = 300;
    var char_width = 300;
    var show_outline = 'true';
    var strokeWidth = 20;   
</script>
<!--Change it 0 or 1 for hide or show-->
<div id='ch_sim' style='opacity:1' ;>{{Simplified}}</div>
<!--Change it block or none in display to hide and show-->
<div id='ch_trad' style='display:block' ;>{{Traditional}}</div>

<div id='ch_pin' style='display:block' ;>{{Pinyin}}</div>

<div id='ch_mean' style='display:block' ;>{{Meaning}}</div>
```

## Acknowledgement
I have not designed the writing chinese js library Hanziwriter, it comes from the awesome [Hanziwriter](https://hanziwriter.org) JavaScript library.

The chinese character and stroke order data used by [Hanziwriter](https://github.com/chanind/hanzi-writer)
is derived from the [ Make me a Hanzi](https://github.com/skishore/makemeahanzi).
 
 
 ## Disclaimer
 This implemention is in javascript. It works because the of Ankidroid use Android Webview for flashcard review.
 
 ## Contribution
 Any contribution will be appreciated.
 
## Faq?
 ### Did you create writing component?
 No, I have just implemeted existing js library HanziWriter in Anki and Ankidroid.
 
 ### Did it work on mobile?
 Yes, It is working. But you have to select card template carefully or download [Sample Deck]((https://github.com/infinyte7/Anki-maobi/blob/master/HSK%20Anki%20apkg/Write_Chinese.apkg?raw=true)). For more read below.
 
 ### Does it work offline?
 No, It will not work offline. 
 Reason, file size is very high. For total approx. 9000 characters size is approx. 30 mb.
 But It can be made offline. 

## Create your own word list from this sample apkg (Anki Desktop required)
  #### 1. Download this sample apkg [Write_Chinese.apkg](https://github.com/infinyte7/Anki-maobi/blob/master/HSK%20Anki%20apkg/Write_Chinese.apkg?raw=true)
  
  #### 2. Import this sample deck in Anki Desktop
  
  ![Image Import Desktop](https://github.com/infinyte7/Anki-maobi/blob/master/image/Import_Deck_Rename.png)
  
  #### 3. After that again click import and select wordlist. Then change note type to 'Basic ( Write Chinese )' and Deck to newly imported and renamed deck. After that map the field of words list. Note:- field {{Simplified}} is used for stroke order.
  
  ![Image Import Desktop](https://github.com/infinyte7/Anki-maobi/blob/master/image/map_to_field_1.png)
  
  #### 4. After done everything done correctly.
  
  ![Image Import Desktop](https://github.com/infinyte7/Anki-maobi/blob/master/image/welcome.png)
  
  #### 5. Export that deck to apkg and import it in mobile.
  
<br>  
## Check these file
#### four field used in the sample deck 
##### {{Simplified}}
##### {{Traditional}}
##### {{Pinyin}}
##### {{Meaning}}

#### front side of card - add this front of the card
https://github.com/infinyte7/Anki-maobi/blob/master/frontcard
#### back side of card - add this to back of card
https://github.com/infinyte7/Anki-maobi/blob/master/backcard
#### css of card - add this to css of card
https://github.com/infinyte7/Anki-maobi/blob/master/cardCSS

# Note 
   Hanziwriter is necessary for using this. The full code is added to front side of card.
   For more check this. [Hanziwriter](https://hanziwriter.org/docs.html)
   
# To Check if your card template support this code or not this simple code.
### Create new Deck and add chinese character to front then
```
<div id = 'frontText'>{{Front}}</div>
<div id = 'ch_length'></div>
<script>
var characters = document.getElementById('frontText').innerHTML;
document.getElementById('ch_length').innerHTML = characters.length;
</script>
```


### If you are getting correct length then proceed otherwise change card template to basic or use my [sample deck].
#### Incorrect length of character ‘我’. It should be 1 but due some error in card template in anki it is showing 3. So check next for correct card template. 

![Image Incorrect](https://github.com/infinyte7/Anki-maobi/blob/master/image/incorrect.png)


#### Add basic type deck in Manage note of AnkiDroid and then add and edit field for Simplified, Traditional, Pinyin and Meaning

![Image Correct](https://github.com/infinyte7/Anki-maobi/blob/master/image/correct_1.png)

### Now It gives correct length for characters

![Image Correct](https://github.com/infinyte7/Anki-maobi/blob/master/image/correct.png)


## For implementing this
#### Add front side of card
##### Front

```
<!--MIT License-->
<script>
    //customize preference
    var char_height = 300;
    var char_width = 300;
    var show_outline = true;
    var strokeWidth = 20;   
</script>
<!--Change it 0 or 1 for hide or show-->
<div id='ch_sim' style='opacity:1' ;>{{Simplified}}</div>
<!--Change it block or none in display to hide and show-->
<div id='ch_trad' style='display:block' ;>{{Traditional}}</div>

<div id='ch_pin' style='display:block' ;>{{Pinyin}}</div>

<div id='ch_mean' style='display:block' ;>{{Meaning}}</div>

<div id="character-target-div"></div>
<!--Button for showing data-->
<div class="modal-footer">
    <a class="btn" type="button" id='btnRevealChar'><span>?</span></a>
    <a class="btn" type="button" id='btnGoNextCard'><span>></span></a>
</div>
<div id='test'></div>

<!--Hanziwriter js code-->
<script>
    //do not modify it
    /*! Hanzi Writer v2.2.2 | https://chanind.github.io/hanzi-writer */
    !function (t, i) { "object" == typeof exports && "object" == typeof module ? module.exports = i() : "function" == typeof define && define.amd ? define([], i) : "object" == typeof exports ? exports.HanziWriter = i() : t.HanziWriter = i() }("undefined" != typeof self ? self : this, function () { return function (n) { var r = {}; function o(t) { if (r[t]) return r[t].exports; var i = r[t] = { i: t, l: !1, exports: {} }; return n[t].call(i.exports, i, i.exports, o), i.l = !0, i.exports } return o.m = n, o.c = r, o.d = function (t, i, n) { o.o(t, i) || Object.defineProperty(t, i, { configurable: !1, enumerable: !0, get: n }) }, o.n = function (t) { var i = t && t.t ? function () { return t.default } : function () { return t }; return o.d(i, "a", i), i }, o.o = function (t, i) { return Object.prototype.hasOwnProperty.call(t, i) }, o.p = "", o(o.s = 9) }([function (c, t, i) { "use strict"; (function (t) { var u = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (t) { return typeof t } : function (t) { return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t }; var i = t.performance && function () { return t.performance.now() } || function () { return Date.now() }, n = t.requestAnimationFrame || function (t) { return setTimeout(function () { return t(i()) }, 1e3 / 60) }, r = t.cancelAnimationFrame || clearTimeout, o = function (t) { for (var n = Object(t), i = arguments.length, r = Array(1 < i ? i - 1 : 0), o = 1; o < i; o++)r[o - 1] = arguments[o]; return r.forEach(function (t) { if (null != t) for (var i in t) Object.prototype.hasOwnProperty.call(t, i) && (n[i] = t[i]) }), n }, h = Object.assign || o; var s = 0; var e = t.navigator && t.navigator.userAgent || "", a = 0 < e.indexOf("MSIE ") || 0 < e.indexOf("Trident/") || 0 < e.indexOf("Edge/"); c.exports = { e: o, arrLast: function (t) { return t[t.length - 1] }, assign: h, average: function (t) { return t.reduce(function (t, i) { return i + t }, 0) / t.length }, callIfExists: function (t, i) { return t && t(i), i }, cancelAnimationFrame: r, colorStringToVals: function (t) { var i = t.toUpperCase().trim(); if (/^#([A-F0-9]{3}){1,2}$/.test(i)) { var n = i.substring(1).split(""); 3 === n.length && (n = [n[0], n[0], n[1], n[1], n[2], n[2]]); var r = "" + n.join(""); return { r: parseInt(r.slice(0, 2), 16), g: parseInt(r.slice(2, 4), 16), b: parseInt(r.slice(4, 6), 16), a: 1 } } var o = i.match(/^RGBA?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d*\.?\d+))?\)$/); if (o) return { r: parseInt(o[1], 10), g: parseInt(o[2], 10), b: parseInt(o[3], 10), a: parseFloat(o[4] || 1, 10) }; throw new Error("Invalid color: " + t) }, copyAndMergeDeep: function t(i, n) { var r = h({}, i); for (var o in n) { var s = i[o], e = n[o]; s !== e && (s && e && "object" === (void 0 === s ? "undefined" : u(s)) && "object" === (void 0 === e ? "undefined" : u(e)) && !Array.isArray(e) ? r[o] = t(s, e) : r[o] = e) } return r }, counter: function () { return ++s }, emptyFunc: function () { }, inflate: function (t, i) { for (var n = t.split("."), r = {}, o = r, s = 0; s < n.length; s++) { var e = s === n.length - 1 ? i : {}; o[n[s]] = e, o = e } return r }, objRepeat: function (t, i) { for (var n = {}, r = 0; r < i; r++)n[r] = t; return n }, performanceNow: i, requestAnimationFrame: n, timeout: function () { var n = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : 0; return new Promise(function (t, i) { setTimeout(t, n) }) }, trim: function (t) { return t.replace(/^\s+/, "").replace(/\s+$/, "") }, isMsBrowser: a } }).call(t, i(1)) }, function (Ia, Ja) { var Ka; Ka = function () { return this }(); try { Ka = Ka || Function("return this")() || eval("this") } catch (t) { "object" == typeof window && (Ka = window) } Ia.exports = Ka }, function (t, i, n) { "use strict"; var r = n(0), e = r.average, v = r.arrLast, u = function (t, i) { return { x: t.x - i.x, y: t.y - i.y } }, s = function (t) { return Math.sqrt(Math.pow(t.x, 2) + Math.pow(t.y, 2)) }, l = function (t, i) { return s(u(t, i)) }, h = function (t) { var i = 10 * (1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : 1); return { x: Math.round(i * t.x) / i, y: Math.round(i * t.y) / i } }, d = function (t) { var r = t[0]; return t.slice(1).reduce(function (t, i) { var n = l(i, r); return r = i, t + n }, 0) }, p = function (t, i, n) { var r = u(i, t), o = n / s(r); return { x: i.x + o * r.x, y: i.y + o * r.y } }, a = function (t) { var e = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : .05, u = t.slice(0, 1); return t.slice(1).forEach(function (t) { var i = u[u.length - 1], n = l(t, i); if (e < n) for (var r = Math.ceil(n / e), o = n / r, s = 0; s < r; s++)u.push(p(t, i, -1 * o * (s + 1))); else u.push(t) }), u }, c = function (t) { for (var i = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : 30, n = d(t) / (i - 1), r = [t[0]], o = v(t), s = t.slice(1), e = 0; e < i - 2; e++)for (var u = v(r), h = n, a = !1; !a;) { var c = l(u, s[0]); if (c < h) h -= c, u = s.shift(); else { var f = p(u, s[0], h - c); r.push(f), a = !0 } } return r.push(o), r }, f = function (t) { if (t.length < 3) return t; var s = [t[0], t[1]]; return t.slice(2).forEach(function (t, i) { var n = s.length, r = u(t, s[n - 1]), o = u(s[n - 1], s[n - 2]); r.y * o.x - r.x * o.y == 0 && s.pop(), s.push(t) }), s }; t.exports = { round: h, equals: function (t, i) { return t.x === i.x && t.y === i.y }, distance: l, getPathString: function (t) { var i = 1 < arguments.length && void 0 !== arguments[1] && arguments[1], n = h(t[0]), r = t.slice(1), o = "M " + n.x + " " + n.y; return r.forEach(function (t) { var i = h(t); o += " L " + i.x + " " + i.y }), i && (o += "Z"), o }, frechetDist: function (r, o) { for (var s = [], t = 0; t < r.length; t++) { s.push([]); for (var i = 0; i < o.length; i++)s[t].push(-1) } return function t(i, n) { return -1 < s[i][n] || (s[i][n] = 0 === i && 0 === n ? l(r[0], o[0]) : 0 < i && 0 === n ? Math.max(t(i - 1, 0), l(r[i], o[0])) : 0 === i && 0 < n ? Math.max(t(0, n - 1), l(r[0], o[n])) : 0 < i && 0 < n ? Math.max(Math.min(t(i - 1, n), t(i - 1, n - 1), t(i, n - 1)), l(r[i], o[n])) : 1 / 0), s[i][n] }(r.length - 1, o.length - 1) }, length: d, rotate: function (t, i) { return t.map(function (t) { return { x: Math.cos(i) * t.x - Math.sin(i) * t.y, y: Math.sin(i) * t.x + Math.cos(i) * t.y } }) }, subtract: u, extendStart: function (t, i) { var n = f(t); if (n.length < 2) return n; var r = n[1], o = n[0], s = p(r, o, i), e = n.slice(1); return e.unshift(s), e }, cosineSimilarity: function (t, i) { return (t.x * i.x + t.y * i.y) / s(t) / s(i) }, outlineCurve: c, u: p, h: f, subdivideCurve: a, normalizeCurve: function (t) { var i = c(t), n = { x: e(i.map(function (t) { return t.x })), y: e(i.map(function (t) { return t.y })) }, r = i.map(function (t) { return u(t, n) }), o = Math.sqrt(e([Math.pow(r[0].x, 2) + Math.pow(r[0].y, 2), Math.pow(v(r).x, 2) + Math.pow(v(r).y, 2)])), s = r.map(function (t) { return { x: t.x / o, y: t.y / o } }); return a(s) } } }, function (t, i, n) { "use strict"; (function (n) { function r(t, i, n) { t.setAttributeNS(null, i, n) } t.exports = { createElm: function (t) { return n.document.createElementNS("http://www.w3.org/2000/svg", t) }, attrs: function (i, n) { Object.keys(n).forEach(function (t) { return r(i, t, n[t]) }) }, attr: r, removeElm: function (t) { t && t.parentNode.removeChild(t) }, urlIdRef: function (t) { var i = ""; return n.location && n.location.href && (i = n.location.href.replace(/#[^#]*$/, "")), "url(" + i + "#" + t + ")" } } }).call(i, n(1)) }, function (t, i, n) { "use strict"; function s(t, i, n) { return i in t ? Object.defineProperty(t, i, { value: n, enumerable: !0, configurable: !0, writable: !0 }) : t[i] = n, t } var u = n(5), e = n(0).objRepeat, h = function (t, i, n) { return [new u("character." + t + ".strokes", e({ opacity: 1, displayPortion: 1 }, i.strokes.length), { duration: n, force: !0 })] }, a = function (t, i, n) { return [new u("character." + t + ".opacity", 0, { duration: n, force: !0 })].concat(h(t, i, 0)) }, c = function (t, i, n) { var r = i.strokeNum, o = (i.getLength() + 600) / (3 * n); return [new u("character." + t, { opacity: 1, strokes: s({}, r, { displayPortion: 0, opacity: 1 }) }), new u("character." + t + ".strokes." + r + ".displayPortion", 1, { duration: o })] }, f = function (n, t, i, r, o) { var s = a(n, t, i); return (s = s.concat(h(n, t, 0))).push(new u("character." + n, { opacity: 1, strokes: e({ opacity: 0 }, t.strokes.length) }, { force: !0 })), t.strokes.forEach(function (t, i) { 0 < i && s.push(new u.Delay(o)), s = s.concat(c(n, t, r)) }), s }; t.exports = { showStrokes: h, showCharacter: function (t, i, n) { return [new u("character." + t, { opacity: 1, strokes: e({ opacity: 1, displayPortion: 1 }, i.strokes.length) }, { duration: n, force: !0 })] }, hideCharacter: a, highlightStroke: function (t, i, n) { var r = t.strokeNum, o = (t.getLength() + 600) / (3 * n); return [new u("character.highlight.strokeColor", i), new u("character.highlight", { opacity: 1, strokes: s({}, r, { displayPortion: 0, opacity: 0 }) }), new u("character.highlight.strokes." + r, { displayPortion: 1, opacity: 1 }, { duration: o }), new u("character.highlight.strokes." + r + ".opacity", 0, { duration: o })] }, animateCharacter: f, animateCharacterLoop: function (t, i, n, r, o, s) { var e = f(t, i, n, r, o); return e.push(new u.Delay(s)), e }, animateStroke: c, animateSingleStroke: function (o, s, t, i) { return [new u("character." + o, function (t) { for (var i = t.character[o], n = { opacity: 1, strokes: {} }, r = 0; r < s.strokes.length; r++)n.strokes[r] = { opacity: i.opacity * i.strokes[r].opacity }; return n })].concat(c(o, s.strokes[t], i)) }, showStroke: function (t, i, n) { return [new u("character." + t + ".strokes." + i, { displayPortion: 1, opacity: 1 }, { duration: n, force: !0 })] }, updateColor: function (t, i, n) { return [new u("options." + t, i, { duration: n })] } } }, function (t, i, n) { "use strict"; var r = n(0), o = r.inflate, s = r.performanceNow, e = r.requestAnimationFrame, u = r.cancelAnimationFrame; function h(t, i) { var n = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {}; this.scope = t, this.f = i, this.v = n.duration || 0, this.w = n.force, this.k = 0, this.C = this.M.bind(this), this.S = null } function a(t) { this.v = t, this.j = null, this.P = !1 } h.prototype.run = function (t) { var i = this; return this.O || this.A(t), 0 === this.v && t.updateState(this.O), 0 === this.v || function t(i, n) { for (var r in n) if (n.hasOwnProperty(r)) { var o = n[r], s = i[r]; if (0 <= o) { if (o !== s) return !1 } else if (!t(s, o)) return !1 } return !0 }(t.state, this.O) ? Promise.resolve() : (this.F = t, this.D = t.state, this.j = s(), this.T = e(this.C), new Promise(function (t) { i.I = t })) }, h.prototype.pause = function () { null === this.S && (this.T && u(this.T), this.S = s()) }, h.prototype.resume = function () { null !== this.S && (this.T = e(this.C), this.k += s() - this.S, this.S = null) }, h.prototype.M = function (t) { if (null === this.S) { var i, n = Math.min(1, (t - this.j - this.k) / this.v); if (1 === n) this.F.updateState(this.O), this.T = null, this.cancel(this.F); else { var r = (i = n, -Math.cos(i * Math.PI) / 2 + .5); this.F.updateState(function t(i, n, r) { var o = {}; for (var s in n) { var e = n[s], u = i[s]; o[s] = 0 <= e ? r * (e - u) + u : t(u, e, r) } return o }(this.D, this.O, r)), this.T = e(this.C) } } }, h.prototype.A = function (t) { var i = this.f; "function" == typeof this.f && (i = this.f(t.state)), this.O = o(this.scope, i) }, h.prototype.cancel = function (t) { this.I && this.I(), this.I = null, this.T && u(this.T), this.T = null, this.w && (this.O || this.A(t), t.updateState(this.O)) }, a.prototype.pause = function () { if (!this.P) { var t = s() - this.j; this.v = Math.max(0, this.v - t), clearTimeout(this.W), this.P = !0 } }, a.prototype.resume = function () { var t = this; this.P && (this.j = s(), this.W = setTimeout(function () { return t.cancel() }, this.v), this.P = !1) }, a.prototype.run = function () { var i = this, t = new Promise(function (t) { i.I = t }); return this.j = s(), this.W = setTimeout(function () { return i.cancel() }, this.v), t }, a.prototype.cancel = function () { clearTimeout(this.W), this.I && this.I(), this.I = !1 }, h.Delay = a, t.exports = h }, function (t, i, n) { "use strict"; function r() { } r.prototype.z = function (t) { return .999 * this.R * (1 - t) }, r.prototype.H = function (t) { var i = t.strokeColor, n = t.radicalColor; return n && this.L.isInRadical ? n : i }, t.exports = r }, function (n, t, i) { "use strict"; (function (i) { function t() { } t.prototype.addPointerStartListener = function (i) { var n = this; this.node.addEventListener("mousedown", function (t) { i(n.U(t, n._)) }), this.node.addEventListener("touchstart", function (t) { i(n.U(t, n.K)) }) }, t.prototype.addPointerMoveListener = function (i) { var n = this; this.node.addEventListener("mousemove", function (t) { i(n.U(t, n._)) }), this.node.addEventListener("touchmove", function (t) { i(n.U(t, n.K)) }) }, t.prototype.addPointerEndListener = function (t) { i.document.addEventListener("mouseup", t), i.document.addEventListener("touchend", t) }, t.prototype.getBoundingClientRect = function () { return this.node.getBoundingClientRect() }, t.prototype.U = function (t, i) { var n = this; return { getPoint: function () { return i.call(n, t) }, preventDefault: function () { return t.preventDefault() } } }, t.prototype._ = function (t) { var i = this.getBoundingClientRect(); return { x: t.clientX - i.left, y: t.clientY - i.top } }, t.prototype.K = function (t) { var i = this.getBoundingClientRect(); return { x: t.touches[0].clientX - i.left, y: t.touches[0].clientY - i.top } }, n.exports = t }).call(t, i(1)) }, function (t, i, n) { "use strict"; t.exports = { drawPath: function (i, t) { i.beginPath(); var n = t[0], r = t.slice(1); i.moveTo(n.x, n.y), r.forEach(function (t) { i.lineTo(t.x, t.y) }), i.stroke() }, pathStringToCanvas: function (t) { var i = t.split(/(^|\s+)(?=[A-Z])/).filter(function (t) { return " " !== t }), e = [function (t) { return t.beginPath() }]; return i.forEach(function (t) { var i, n = t.split(/\s+/), r = (i = n, Array.isArray(i) ? i : Array.from(i)), o = r[0], s = r.slice(1).map(function (t) { return parseFloat(t) }); "M" === o ? e.push(function (t) { return t.moveTo.apply(t, s) }) : "L" === o ? e.push(function (t) { return t.lineTo.apply(t, s) }) : "C" === o ? e.push(function (t) { return t.bezierCurveTo.apply(t, s) }) : "Q" === o && e.push(function (t) { return t.quadraticCurveTo.apply(t, s) }) }), function (i) { return e.forEach(function (t) { return t(i) }) } } } }, function (t, i, n) { "use strict"; var o = n(10), s = n(11), e = n(14), r = n(15), u = n(19), h = n(25), a = n(31), c = n(32), f = n(4), v = n(0), l = v.assign, d = v.callIfExists, p = v.trim, y = v.colorStringToVals, w = { charDataLoader: a, onLoadCharDataError: null, onLoadCharDataSuccess: null, showOutline: !0, showCharacter: !0, renderer: "svg", width: null, height: null, padding: 20, strokeAnimationSpeed: 1, strokeFadeDuration: 400, strokeHighlightDuration: 200, strokeHighlightSpeed: 2, delayBetweenStrokes: 1e3, delayBetweenLoops: 2e3, strokeColor: "#555", radicalColor: null, highlightColor: "#AAF", outlineColor: "#DDD", drawingColor: "#333", leniency: 1, showHintAfterMisses: 3, highlightOnComplete: !0, highlightCompleteColor: null, drawingFadeDuration: 300, drawingWidth: 4, strokeWidth: 2, outlineWidth: 2, rendererOverride: {} }; function g() { if (0 < arguments.length) { var t = void 0, i = {}, n = arguments.length <= 0 ? void 0 : arguments[0]; 1 < arguments.length && (i = "string" == typeof (arguments.length <= 1 ? void 0 : arguments[1]) ? (console.warn("Using new HanziWriter() to set a character is deprecated. Use HanziWriter.create() instead"), t = arguments.length <= 1 ? void 0 : arguments[1], (arguments.length <= 2 ? void 0 : arguments[2]) || {}) : arguments.length <= 1 ? void 0 : arguments[1]), this.N(n, i), t && this.setCharacter(t) } } g.prototype.showCharacter = function () { var t = this, i = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {}; return this.B.showCharacter = !0, this.G(function () { return t.F.run(f.showCharacter("main", t.V, "number" == typeof i.duration ? i.duration : t.B.strokeFadeDuration)).then(function (t) { return d(i.onComplete, t) }) }) }, g.prototype.hideCharacter = function () { var t = this, i = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {}; return this.B.showCharacter = !1, this.G(function () { return t.F.run(f.hideCharacter("main", t.V, "number" == typeof i.duration ? i.duration : t.B.strokeFadeDuration)).then(function (t) { return d(i.onComplete, t) }) }) }, g.prototype.animateCharacter = function () { var t = this, i = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {}; return this.cancelQuiz(), this.G(function () { return t.F.run(f.animateCharacter("main", t.V, t.B.strokeFadeDuration, t.B.strokeAnimationSpeed, t.B.delayBetweenStrokes)).then(function (t) { return d(i.onComplete, t) }) }) }, g.prototype.animateStroke = function (t) { var i = this, n = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}; return this.cancelQuiz(), this.G(function () { return i.F.run(f.animateSingleStroke("main", i.V, t, i.B.strokeAnimationSpeed)).then(function (t) { return d(n.onComplete, t) }) }) }, g.prototype.highlightStroke = function (t) { var i = this, n = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}; return this.G(function () { return i.F.run(f.highlightStroke(i.V.strokes[t], i.B.highlightColor, i.B.strokeHighlightSpeed)).then(function (t) { return d(n.onComplete, t) }) }) }, g.prototype.loopCharacterAnimation = function () { var t = this; 0 < arguments.length && void 0 !== arguments[0] && arguments[0]; return this.cancelQuiz(), this.G(function () { return t.F.run(f.animateCharacterLoop("main", t.V, t.B.strokeFadeDuration, t.B.strokeAnimationSpeed, t.B.delayBetweenStrokes, t.B.delayBetweenLoops), { loop: !0 }) }) }, g.prototype.pauseAnimation = function () { var t = this; return this.G(function () { return t.F.pauseAll() }) }, g.prototype.resumeAnimation = function () { var t = this; return this.G(function () { return t.F.resumeAll() }) }, g.prototype.showOutline = function () { var t = this, i = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {}; return this.B.showOutline = !0, this.G(function () { return t.F.run(f.showCharacter("outline", t.V, "number" == typeof i.duration ? i.duration : t.B.strokeFadeDuration)).then(function (t) { return d(i.onComplete, t) }) }) }, g.prototype.hideOutline = function () { var t = this, i = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {}; return this.B.showOutline = !1, this.G(function () { return t.F.run(f.hideCharacter("outline", t.V, "number" == typeof i.duration ? i.duration : t.B.strokeFadeDuration)).then(function (t) { return d(i.onComplete, t) }) }) }, g.prototype.updateColor = function (o, s) { var e = this, u = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {}; return this.G(function () { var t = "number" == typeof u.duration ? u.duration : e.B.strokeFadeDuration, i = s; "radicalColor" !== o || s || (i = e.B.strokeColor); var n = y(i); e.B[o] = s; var r = f.updateColor(o, n, t); return "radicalColor" !== o || s || (r = r.concat(f.updateColor(o, null, 0))), e.F.run(r).then(function (t) { return d(u.onComplete, t) }) }) }, g.prototype.quiz = function () { var t = this, i = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {}; this.G(function () { t.cancelQuiz(), t.$ = new r(t.V, t.F, t.q), t.$.startQuiz(l({}, t.B, i)) }) }, g.prototype.cancelQuiz = function () { this.$ && (this.$.cancel(), this.$ = null) }, g.prototype.setCharacter = function (n) { var r = this; return this.cancelQuiz(), this.J = n, this.Q && this.Q.destroy(), this.F && this.F.cancelAll(), this.Q = null, this.Z = this.X.loadCharData(n).then(function (t) { if (!r.X.loadingFailed) { r.V = s(n, t), r.q = new e(r.B); var i = new r.Y.HanziWriterRenderer(r.V, r.q); r.Q = i, r.F = new o(r.V, r.B, function (t) { i.render(t) }), r.Q.mount(r.target, r.F.state), r.Q.render(r.F.state) } }), this.Z }, g.prototype.N = function (t, i) { var n = "canvas" === i.renderer ? h : u, r = i.rendererOverride || {}; return this.Y = { HanziWriterRenderer: r.HanziWriterRenderer || n.HanziWriterRenderer, createRenderTarget: r.createRenderTarget || n.createRenderTarget }, this.target = this.Y.createRenderTarget(t, i.width, i.height), this.B = this.tt(i), this.X = new c(this.B), this.it(), this.$ = null, this }, g.prototype.tt = function (t) { var i = l({}, w, t); return t.strokeAnimationDuration && !t.strokeAnimationSpeed && (i.strokeAnimationSpeed = 500 / i.strokeAnimationDuration), t.strokeHighlightDuration && !t.strokeHighlightSpeed && (i.strokeHighlightSpeed = 500 / i.strokeHighlightDuration), t.highlightCompleteColor || (i.highlightCompleteColor = i.highlightColor), this.nt(i) }, g.prototype.nt = function (t) { var i = l({}, t); if (i.width && !i.height) i.height = i.width; else if (i.height && !i.width) i.width = i.height; else if (!i.width && !i.height) { var n = this.target.getBoundingClientRect(), r = n.width, o = n.height, s = Math.min(r, o); i.width = s, i.height = s } return i }, g.prototype.G = function (t) { var i = this; if (this.X.loadingFailed) throw Error("Failed to load character data. Call setCharacter and try again."); return this.Z.then(function () { if (!i.X.loadingFailed) return t() }) }, g.prototype.it = function () { var i = this; this.target.addPointerStartListener(function (t) { !i.isLoadingCharData && i.$ && (t.preventDefault(), i.rt("startUserStroke", t.getPoint())) }), this.target.addPointerMoveListener(function (t) { !i.isLoadingCharData && i.$ && (t.preventDefault(), i.rt("continueUserStroke", t.getPoint())) }), this.target.addPointerEndListener(function () { return i.rt("endUserStroke") }) }, g.prototype.rt = function (t) { var i; if (this.$) { for (var n = arguments.length, r = Array(1 < n ? n - 1 : 0), o = 1; o < n; o++)r[o - 1] = arguments[o]; (i = this.$)[t].apply(i, r) } }, g.create = function (t, i) { var n = new g(t, 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {}); return n.setCharacter(i), n }; var k = null, m = null; g.loadCharacterData = function (t) { var i = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, n = void 0; return n = k && m === i ? k : new c(l({}, w, i)), m = i, (k = n).loadCharData(t) }, g.getScalingTransform = function (t, i) { var n = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : 0, r = new e({ width: t, height: i, padding: n }); return { x: r.xOffset, y: r.yOffset, scale: r.scale, transform: p("\n      translate(" + r.xOffset + ", " + (r.height - r.yOffset) + ")\n      scale(" + r.scale + ", " + -1 * r.scale + ")\n    ").replace(/\s+/g, " ") } }, t.exports = g }, function (t, i, n) { "use strict"; var r = n(0), o = r.copyAndMergeDeep, s = r.colorStringToVals; function e(t, i, n) { this.ot = n, this.st = [], this.state = { options: { drawingFadeDuration: i.drawingFadeDuration, drawingWidth: i.drawingWidth, drawingColor: s(i.drawingColor), strokeColor: s(i.strokeColor), outlineColor: s(i.outlineColor), radicalColor: s(i.radicalColor || i.strokeColor), highlightColor: s(i.highlightColor) }, character: { main: { opacity: i.showCharacter ? 1 : 0, strokes: {} }, outline: { opacity: i.showOutline ? 1 : 0, strokes: {} }, highlight: { opacity: 1, strokes: {} } }, userStrokes: null }; for (var r = 0; r < t.strokes.length; r++)this.state.character.main.strokes[r] = { opacity: 1, displayPortion: 1 }, this.state.character.outline.strokes[r] = { opacity: 1, displayPortion: 1 }, this.state.character.highlight.strokes[r] = { opacity: 0, displayPortion: 1 } } e.prototype.updateState = function (t) { var i = o(this.state, t); this.ot(i, this.state), this.state = i }, e.prototype.run = function (n) { var r = this, o = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, s = n.map(function (t) { return t.scope }).filter(function (t) { return t }); return this.cancelMutations(s), new Promise(function (t) { var i = { et: !0, ut: 0, I: t, ht: n, at: o.loop, ct: s }; r.st.push(i), r.ft(i) }) }, e.prototype.ft = function (i) { var t = this; if (i.et) { var n = i.ht; if (i.ut >= n.length) { if (!i.at) return i.et = !1, this.st = this.st.filter(function (t) { return t !== i }), void i.I({ canceled: !1 }); i.ut = 0 } i.ht[i.ut].run(this).then(function () { i.et && (i.ut++ , t.ft(i)) }) } }, e.prototype.vt = function () { return this.st.map(function (t) { return t.ht[t.ut] }) }, e.prototype.pauseAll = function () { this.vt().forEach(function (t) { return t.pause() }) }, e.prototype.resumeAll = function () { this.vt().forEach(function (t) { return t.resume() }) }, e.prototype.cancelMutations = function (t) { var r = this; this.st.forEach(function (n) { n.ct.forEach(function (i) { t.forEach(function (t) { (0 <= i.indexOf(t) || 0 <= t.indexOf(i)) && r.lt(n) }) }) }) }, e.prototype.cancelAll = function () { this.cancelMutations([""]) }, e.prototype.lt = function (i) { i.et = !1; for (var t = i.ut; t < i.ht.length; t++)i.ht[t].cancel(this); i.I && i.I({ canceled: !0 }), this.st = this.st.filter(function (t) { return t !== i }) }, t.exports = e }, function (t, i, n) { "use strict"; var s = function (t, i) { if (Array.isArray(t)) return t; if (Symbol.iterator in Object(t)) return function (t, i) { var n = [], r = !0, o = !1, s = void 0; try { for (var e, u = t[Symbol.iterator](); !(r = (e = u.next()).done) && (n.push(e.value), !i || n.length !== i); r = !0); } catch (t) { o = !0, s = t } finally { try { !r && u.return && u.return() } finally { if (o) throw s } } return n }(t, i); throw new TypeError("Invalid attempt to destructure non-iterable instance") }, e = n(12), r = n(13), o = function (o) { return o.strokes.map(function (t, i) { var n, r = o.medians[i].map(function (t) { var i = s(t, 2); return { x: i[0], y: i[1] } }); return new e(t, r, i, (n = i, o.radStrokes && 0 <= o.radStrokes.indexOf(n))) }) }; t.exports = function (t, i) { var n = o(i); return new r(t, n) } }, function (t, i, n) { "use strict"; var r = n(2), o = r.subtract, s = r.distance, e = r.length; function u(t, i, n) { var r = 3 < arguments.length && void 0 !== arguments[3] && arguments[3]; this.path = t, this.points = i, this.strokeNum = n, this.isInRadical = r } u.prototype.getStartingPoint = function () { return this.points[0] }, u.prototype.getEndingPoint = function () { return this.points[this.points.length - 1] }, u.prototype.getLength = function () { return e(this.points) }, u.prototype.getVectors = function () { var n = this.points[0]; return this.points.slice(1).map(function (t) { var i = o(t, n); return n = t, i }) }, u.prototype.getDistance = function (i) { var t = this.points.map(function (t) { return s(t, i) }); return Math.min.apply(Math, t) }, u.prototype.getAverageDistance = function (t) { var n = this; return t.reduce(function (t, i) { return t + n.getDistance(i) }, 0) / t.length }, t.exports = u }, function (t, i, n) { "use strict"; t.exports = function (t, i) { this.symbol = t, this.strokes = i } }, function (t, i, n) { "use strict"; var a = [{ x: 0, y: -124 }, { x: 1024, y: 900 }]; function r(t) { this.B = t, this.width = t.width, this.height = t.height, this.dt() } r.prototype.convertExternalPoint = function (t) { return { x: (t.x - this.xOffset) / this.scale, y: (this.height - this.yOffset - t.y) / this.scale } }, r.prototype.dt = function () { var t = a, i = t[1].x - t[0].x, n = t[1].y - t[0].y, r = this.width - 2 * this.B.padding, o = this.height - 2 * this.B.padding, s = r / i, e = o / n; this.scale = Math.min(s, e); var u = this.B.padding + (r - this.scale * i) / 2, h = this.B.padding + (o - this.scale * n) / 2; this.xOffset = -1 * t[0].x * this.scale + u, this.yOffset = -1 * t[0].y * this.scale + h }, t.exports = r }, function (t, i, n) { "use strict"; var r = n(16), o = n(17), s = n(0), e = s.callIfExists, u = s.counter, h = n(18), a = n(2), c = n(4), f = function (t) { return { pathString: a.getPathString(t.externalPoints), points: t.points.map(function (t) { return a.round(t) }) } }; function v(t, i, n) { this.V = t, this.F = i, this.et = !1, this.q = n } v.prototype.startQuiz = function (t) { this.et = !0, this.B = t, this.pt = 0, this.yt = 0, this.wt = 0, this.gt = [], this.F.run(h.startQuiz(this.V, t.strokeFadeDuration)) }, v.prototype.startUserStroke = function (t) { var i = this.q.convertExternalPoint(t); if (!this.et) return null; if (this.kt) return this.endUserStroke(); var n = u(); this.kt = new o(n, i, t), this.F.run(h.startUserStroke(n, i)) }, v.prototype.continueUserStroke = function (t) { if (this.kt) { var i = this.q.convertExternalPoint(t); this.kt.appendPoint(i, t); var n = this.kt.points.slice(0); this.F.run(h.updateUserStroke(this.kt.id, n)) } }, v.prototype.endUserStroke = function () { if (this.kt) if (this.F.run(h.removeUserStroke(this.kt.id, this.B.drawingFadeDuration)), 1 !== this.kt.points.length) { var t = this.mt(), i = 0 < this.F.state.character.outline.opacity; r(this.kt, this.V, this.pt, { isOutlineVisible: i, leniency: this.B.leniency }) ? this.bt(t) : (this.Ct(), this.yt >= this.B.showHintAfterMisses && this.F.run(h.highlightStroke(t, this.B.highlightColor, this.B.strokeHighlightSpeed))), this.kt = null } else this.kt = null }, v.prototype.cancel = function () { this.et = !1, this.kt && this.F.run(h.removeUserStroke(this.kt.id, this.B.drawingFadeDuration)) }, v.prototype.bt = function (t) { e(this.B.onCorrectStroke, { character: this.V.symbol, strokeNum: this.pt, mistakesOnStroke: this.yt, totalMistakes: this.wt, strokesRemaining: this.V.strokes.length - this.pt - 1, drawnPath: f(this.kt) }); var i = c.showStroke("main", this.pt, this.B.strokeFadeDuration); this.pt += 1, this.yt = 0, this.pt === this.V.strokes.length && (this.et = !1, e(this.B.onComplete, { character: this.V.symbol, totalMistakes: this.wt }), this.B.highlightOnComplete && (i = i.concat(h.highlightCompleteChar(this.V, this.B.highlightCompleteColor, 2 * this.B.strokeHighlightDuration)))), this.F.run(i) }, v.prototype.Ct = function () { this.yt += 1, this.wt += 1, e(this.B.onMistake, { character: this.V.symbol, strokeNum: this.pt, mistakesOnStroke: this.yt, totalMistakes: this.wt, strokesRemaining: this.V.strokes.length - this.pt, drawnPath: f(this.kt) }) }, v.prototype.mt = function () { return this.V.strokes[this.pt] }, t.exports = v }, function (t, i, n) { "use strict"; var r = n(0), h = r.average, l = r.assign, o = n(2), a = o.cosineSimilarity, d = o.equals, j = o.frechetDist, P = o.distance, c = o.subtract, x = o.normalizeCurve, O = o.rotate, A = o.length, F = function (t, i) { var n, r, o, s = (r = [], o = (n = t)[0], n.slice(1).forEach(function (t) { r.push(c(t, o)), o = t }), r), e = i.getVectors(), u = s.map(function (i) { var t = e.map(function (t) { return a(t, i) }); return Math.max.apply(Math, t) }); return 0 < h(u) }, D = [Math.PI / 16, Math.PI / 32, 0, -1 * Math.PI / 32, -1 * Math.PI / 16], p = function (t, i, n) { var r = n.leniency, o = void 0 === r ? 1 : r, s = n.isOutlineVisible, e = void 0 !== s && s, u = i.getAverageDistance(t), h = u <= 350 * (e || 0 < i.strokeNum ? .5 : 1) * o; if (!h) return { isMatch: !1, avgDist: u }; var a, c, f, v, l, d, p, y, w, g, k, m, b = (a = t, f = o, v = P((c = i).getStartingPoint(), a[0]), l = P(c.getEndingPoint(), a[a.length - 1]), v <= 250 * f && l <= 250 * f), C = F(t, i), M = (d = t, p = i.points, y = o, w = x(d), g = x(p), k = 1 / 0, D.forEach(function (t) { var i = j(w, O(g, t)); i < k && (k = i) }), k <= .4 * y), S = (m = i, .35 <= o * (A(t) + 25) / (m.getLength() + 25)); return { isMatch: h && b && C && M && S, avgDist: u } }; t.exports = function (t, i, n) { var r = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : {}, o = function (t) { if (t.length < 2) return t; var i = [t[0]]; return t.slice(1).forEach(function (t) { d(t, i[i.length - 1]) || i.push(t) }), i }(t.points); if (o.length < 2) return null; var s = p(o, i.strokes[n], r); if (!s.isMatch) return !1; for (var e = i.strokes.slice(n + 1), u = s.avgDist, h = 0; h < e.length; h++) { var a = p(o, e[h], r); a.isMatch && a.avgDist < u && (u = a.avgDist) } if (u < s.avgDist) { var c = .6 * (u + s.avgDist) / (2 * s.avgDist), f = (r.leniency || 1) * c, v = l({}, r, { leniency: f }); return p(o, i.strokes[n], v).isMatch } return !0 } }, function (t, i, n) { "use strict"; function r(t, i, n) { this.id = t, this.points = [i], this.externalPoints = [n] } r.prototype.appendPoint = function (t, i) { this.points.push(t), this.externalPoints.push(i) }, t.exports = r }, function (t, i, n) { "use strict"; var r = n(5), o = n(4), s = n(0).objRepeat; t.exports = { highlightCompleteChar: function (t, i, n) { return [new r("character.highlight.strokeColor", i)].concat(o.hideCharacter("highlight", t)).concat(o.showCharacter("highlight", t, n / 2)).concat(o.hideCharacter("highlight", t, n / 2)) }, highlightStroke: o.highlightStroke, startQuiz: function (t, i) { return o.hideCharacter("main", t, i).concat([new r("character.highlight", { opacity: 1, strokes: s({ opacity: 0 }, t.strokes.length) }, { force: !0 }), new r("character.main", { opacity: 1, strokes: s({ opacity: 0 }, t.strokes.length) }, { force: !0 })]) }, startUserStroke: function (t, i) { return [new r("quiz.activeUserStrokeId", t, { force: !0 }), new r("userStrokes." + t, { points: [i], opacity: 1 }, { force: !0 })] }, updateUserStroke: function (t, i) { return [new r("userStrokes." + t + ".points", i, { force: !0 })] }, removeUserStroke: function (t, i) { return [new r("userStrokes." + t + ".opacity", 0, { duration: i }), new r("userStrokes." + t, null, { force: !0 })] } } }, function (t, i, n) { "use strict"; var r = n(20), o = n(24); t.exports = { HanziWriterRenderer: r, createRenderTarget: o.init } }, function (t, i, n) { "use strict"; var r = n(21), e = n(23), u = n(0).assign, o = n(3); function s(t, i) { this.V = t, this.q = i, this.Mt = new r(t), this.St = new r(t), this.jt = new r(t), this.Pt = {} } s.prototype.mount = function (t) { var i = t.createSubRenderTarget(), n = i.svg; o.attr(n, "transform", "\n    translate(" + this.q.xOffset + ", " + (this.q.height - this.q.yOffset) + ")\n    scale(" + this.q.scale + ", " + -1 * this.q.scale + ")\n  "), this.St.mount(i), this.Mt.mount(i), this.jt.mount(i), this.xt = i }, s.prototype.render = function (r) { var o = this; this.St.render({ opacity: r.character.outline.opacity, strokes: r.character.outline.strokes, strokeColor: r.options.outlineColor }), this.Mt.render({ opacity: r.character.main.opacity, strokes: r.character.main.strokes, strokeColor: r.options.strokeColor, radicalColor: r.options.radicalColor }), this.jt.render({ opacity: r.character.highlight.opacity, strokes: r.character.highlight.strokes, strokeColor: r.options.highlightColor }); var s = r.userStrokes || {}; Object.keys(this.Pt).forEach(function (t) { s[t] || (o.Pt[t].destroy(), delete o.Pt[t]) }), Object.keys(s).forEach(function (t) { if (s[t]) { var i = u({ strokeWidth: r.options.drawingWidth, strokeColor: r.options.drawingColor }, s[t]), n = o.Pt[t]; n || ((n = new e).mount(o.xt, i), o.Pt[t] = n), n.render(i) } }) }, s.prototype.destroy = function () { o.removeElm(this.xt.svg), this.xt.defs.innerHTML = "" }, t.exports = s }, function (t, i, n) { "use strict"; var r = n(0).isMsBrowser, o = n(22); function s(t) { this.Ot = {}, this.At = t.strokes.map(function (t) { return new o(t) }) } s.prototype.mount = function (t) { var n = t.createSubRenderTarget(); this.Ft = n.svg, this.At.forEach(function (t, i) { t.mount(n) }) }, s.prototype.render = function (t) { if (t !== this.Ot) { t.opacity !== this.Ot.opacity && (this.Ft.style.opacity = t.opacity, r || (0 === t.opacity ? this.Ft.style.display = "none" : 0 === this.Ot.opacity && this.Ft.style.removeProperty("display"))); var i = !this.Ot || t.strokeColor !== this.Ot.strokeColor || t.radicalColor !== this.Ot.radicalColor; if (i || t.strokes !== this.Ot.strokes) for (var n = 0; n < this.At.length; n++)!i && this.Ot.strokes && t.strokes[n] === this.Ot.strokes[n] || this.At[n].render({ strokeColor: t.strokeColor, radicalColor: t.radicalColor, opacity: t.strokes[n].opacity, displayPortion: t.strokes[n].displayPortion }); this.Ot = t } }, t.exports = s }, function (t, i, n) { "use strict"; var r = n(0).counter, e = n(3), o = n(2), s = o.extendStart, u = o.getPathString, h = n(6); function a(t) { this.Ot = {}, this.L = t, this.R = t.getLength() + 100 } (a.prototype = Object.create(h.prototype)).mount = function (t) { this.Dt = e.createElm("path"), this.Tt = e.createElm("clipPath"), this.Et = e.createElm("path"); var i = "mask-" + r(); e.attr(this.Tt, "id", i), e.attr(this.Et, "d", this.L.path), this.Dt.style.opacity = 0, e.attr(this.Dt, "clip-path", e.urlIdRef(i)); var n = s(this.L.points, 100); return e.attr(this.Dt, "d", u(n)), e.attrs(this.Dt, { stroke: "#FFFFFF", "stroke-width": 200, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "miter", "stroke-dasharray": this.R + "," + this.R }), this.Tt.appendChild(this.Et), t.defs.appendChild(this.Tt), t.svg.appendChild(this.Dt), this }, a.prototype.render = function (t) { if (t !== this.Ot) { t.displayPortion !== this.Ot.displayPortion && (this.Dt.style.strokeDashoffset = this.z(t.displayPortion)); var i = this.H(t); if (i !== this.H(this.Ot)) { var n = i.r, r = i.g, o = i.b, s = i.a; e.attrs(this.Dt, { stroke: "rgba(" + n + "," + r + "," + o + "," + s + ")" }) } t.opacity !== this.Ot.opacity && (this.Dt.style.opacity = t.opacity), this.Ot = t } }, t.exports = a }, function (t, i, n) { "use strict"; var e = n(3), u = n(2).getPathString; function r() { this.Ot = {} } r.prototype.mount = function (t) { this.It = e.createElm("path"), t.svg.appendChild(this.It) }, r.prototype.render = function (t) { if (t !== this.Ot) { if (t.strokeColor !== this.Ot.strokeColor || t.strokeWidth !== this.Ot.strokeWidth) { var i = t.strokeColor, n = i.r, r = i.g, o = i.b, s = i.a; e.attrs(this.It, { fill: "none", stroke: "rgba(" + n + "," + r + "," + o + "," + s + ")", "stroke-width": t.strokeWidth, "stroke-linecap": "round", "stroke-linejoin": "round" }) } t.opacity !== this.Ot.opacity && e.attr(this.It, "opacity", t.opacity), t.points !== this.Ot.points && e.attr(this.It, "d", u(t.points)), this.Ot = t } }, r.prototype.destroy = function () { e.removeElm(this.It) }, t.exports = r }, function (i, t, r) { "use strict"; (function (u) { var t = r(3), h = t.createElm, a = t.attrs, n = r(7); function c(t, i) { this.svg = t, this.defs = i, this.node = t, this.node.createSVGPoint && (this.Wt = this.node.createSVGPoint()) } (c.prototype = Object.create(n.prototype)).createSubRenderTarget = function () { var t = h("g"); return this.svg.appendChild(t), new c(t, this.defs) }, c.prototype._ = function (t) { if (this.Wt) { this.Wt.x = t.clientX, this.Wt.y = t.clientY; var i = this.Wt.matrixTransform(this.node.getScreenCTM().inverse()); return { x: i.x, y: i.y } } return n.prototype._.call(this, t) }, c.prototype.K = function (t) { if (this.Wt) { this.Wt.x = t.touches[0].clientX, this.Wt.y = t.touches[0].clientY; var i = this.Wt.matrixTransform(this.node.getScreenCTM().inverse()); return { x: i.x, y: i.y } } return n.prototype.K.call(this, t) }, c.init = function (t) { var i = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : "100%", n = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : "100%", r = void 0, o = t; if ("string" == typeof t && (o = u.document.getElementById(t)), !o) throw new Error("HanziWriter target element not found: " + t); var s = o.nodeName.toUpperCase(); "SVG" === s || "G" === s ? r = o : (r = h("svg"), o.appendChild(r)), a(r, { width: i, height: n }); var e = h("defs"); return r.appendChild(e), new c(r, e) }, i.exports = c }).call(t, r(1)) }, function (t, i, n) { "use strict"; var r = n(26), o = n(30); t.exports = { HanziWriterRenderer: r, createRenderTarget: o.init } }, function (t, i, n) { "use strict"; var r = n(27), s = n(29), e = n(0).assign; function o(t, i) { this.V = t, this.q = i, this.Mt = new r(t), this.St = new r(t), this.jt = new r(t) } o.prototype.mount = function (t) { this.zt = t }, o.prototype.Rt = function (t) { var i = this.zt.getContext(); i.clearRect(0, 0, this.q.width, this.q.height), i.save(), i.translate(this.q.xOffset, this.q.height - this.q.yOffset), i.transform(1, 0, 0, -1, 0, 0), i.scale(this.q.scale, this.q.scale), t(i), i.restore(), i.draw && i.draw() }, o.prototype.render = function (o) { var t = this; this.Rt(function (n) { t.St.render(n, { opacity: o.character.outline.opacity, strokes: o.character.outline.strokes, strokeColor: o.options.outlineColor }), t.Mt.render(n, { opacity: o.character.main.opacity, strokes: o.character.main.strokes, strokeColor: o.options.strokeColor, radicalColor: o.options.radicalColor }), t.jt.render(n, { opacity: o.character.highlight.opacity, strokes: o.character.highlight.strokes, strokeColor: o.options.highlightColor }); var r = o.userStrokes || {}; Object.keys(r).forEach(function (t) { if (r[t]) { var i = e({ strokeWidth: o.options.drawingWidth, strokeColor: o.options.drawingColor }, r[t]); s(n, i) } }) }) }, o.prototype.destroy = function () { }, t.exports = o }, function (t, i, n) { "use strict"; var r = n(28); function o(t) { this.At = t.strokes.map(function (t) { return new r(t) }) } o.prototype.render = function (t, i) { if (!(i.opacity < .05)) for (var n = 0; n < this.At.length; n++)this.At[n].render(t, { strokeColor: i.strokeColor, radicalColor: i.radicalColor, opacity: i.strokes[n].opacity * i.opacity, displayPortion: i.strokes[n].displayPortion }) }, t.exports = o }, function (e, t, u) { "use strict"; (function (n) { var r = u(2).extendStart, t = u(8), a = t.drawPath, o = t.pathStringToCanvas, i = u(6); function s(t) { var i = !(1 < arguments.length && void 0 !== arguments[1]) || arguments[1]; this.L = t, this.R = t.getLength() + 100, i && n.Path2D ? this.Ht = new n.Path2D(this.L.path) : this.Lt = o(this.L.path), this.Ut = r(this.L.points, 100) } (s.prototype = Object.create(i.prototype)).render = function (t, i) { if (!(i.opacity < .05)) { t.save(), this.Ht ? t.clip(this.Ht) : (this.Lt(t), t.globalAlpha = 0, t.stroke(), t.clip()); var n = this.H(i), r = n.r, o = n.g, s = n.b, e = n.a, u = 1 === e ? "rgb(" + r + "," + o + "," + s + ")" : "rgb(" + r + "," + o + "," + s + "," + e + ")", h = this.z(i.displayPortion); t.globalAlpha = i.opacity, t.strokeStyle = u, t.fillStyle = u, t.lineWidth = 200, t.lineCap = "round", t.lineJoin = "round", t.setLineDash([this.R, this.R], h), t.lineDashOffset = h, a(t, this.Ut), t.restore() } }, e.exports = s }).call(t, u(1)) }, function (t, i, n) { "use strict"; var u = n(8).drawPath; t.exports = function (t, i) { if (!(i.opacity < .05)) { var n = i.strokeColor, r = n.r, o = n.g, s = n.b, e = n.a; t.save(), t.globalAlpha = i.opacity, t.lineWidth = i.strokeWidth, t.strokeStyle = "rgba(" + r + "," + o + "," + s + "," + e + ")", t.lineCap = "round", t.lineJoin = "round", u(t, i.points), t.restore() } } }, function (i, t, n) { "use strict"; (function (s) { var t = n(7); function e(t) { this.node = t } (e.prototype = Object.create(t.prototype)).getContext = function () { return this.node.getContext("2d") }, e.init = function (t) { var i = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : "100%", n = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : "100%", r = void 0, o = t; if ("string" == typeof t && (o = s.document.getElementById(t)), !o) throw new Error("HanziWriter target element not found: " + t); return "CANVAS" === o.nodeName.toUpperCase() ? r = o : (r = s.document.createElement("canvas"), o.appendChild(r)), r.setAttribute("width", i), r.setAttribute("height", n), new e(r) }, i.exports = e }).call(t, n(1)) }, function (t, i, n) { "use strict"; (function (o) { t.exports = function (t, i, n) { var r = new o.XMLHttpRequest; r.overrideMimeType && r.overrideMimeType("application/json"), r.open("GET", "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/" + t + ".json", !0), r.onerror = function (t) { n(r, t) }, r.onreadystatechange = function () { 4 === r.readyState && (200 === r.status ? i(JSON.parse(r.responseText)) : 0 !== r.status && n && n(r)) }, r.send(null) } }).call(i, n(1)) }, function (t, i, n) { "use strict"; var r = n(0).callIfExists; function o(t) { this._t = 0, this.B = t, this.Kt = !1, this.loadingFailed = !1 } o.prototype.Nt = function (t, i) { var n = this, r = function (t) { i === n._t && n.I(t) }, o = this.B.charDataLoader(t, r, function (t) { i === n._t && n.Bt(t) }); o && r(o) }, o.prototype.Gt = function () { var n = this; return new Promise(function (t, i) { n.I = t, n.Bt = i }).then(function (t) { return n.Kt = !1, r(n.B.onLoadCharDataSuccess, t), t }, function (t) { if (n.Kt = !1, n.loadingFailed = !0, r(n.B.onLoadCharDataError, t), !n.B.onLoadCharDataError) { if (t instanceof Error) throw t; var i = new Error("Failed to load char data for " + n.Vt); throw i.reason = t, i } }) }, o.prototype.loadCharData = function (t) { this.Vt = t; var i = this.Gt(); return this.loadingFailed = !1, this.Kt = !0, this._t++ , this.Nt(t, this._t), i }, t.exports = o }]) });
</script>

<!--Author:Infinyte7-->
<!--MIT License-->
<script>
    var characters = document.getElementById('ch_sim').innerHTML;
    var grid_data = "<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' id='grid-background-target'> <line x1='0' y1='0' x2='100%' y2='100%' stroke='#DDD' /><line x1='100%' y1='0' x2='0' y2='100%' stroke='#DDD' /><line x1='50%' y1='0' x2='50%' y2='100%' stroke='#DDD' /><line x1='0' y1='50%' x2='100%' y2='50%' stroke='#DDD' /></svg>";
    (async function () { // <-- add this wrapper
        var chars = characters;
        for (i = 0; i < chars.length; i++) {
            var draw_grid = document.getElementById('character-target-div');
            draw_grid.innerHTML = grid_data;

            await writeFunction(chars[i]); document.getElementById('grid-background-target').innerHTML = "";
            draw_grid.innerHTML = grid_data;
            if (i == chars.length - 1) {
                document.getElementById('test').innerHTML = "Click Show Answer";
                document.getElementById('grid-background-target').innerHTML = "";
                draw_grid.innerHTML = "";
            }
        }
    })(); // execute immediately

    // Make the function async, so it returns a promise
    async function writeFunction(c) {

        // Wrap the code inside a Promise constructor callback:
        return new Promise(function (resolve, reject) {
            var writer = HanziWriter.create('grid-background-target', c, {
                width: char_width,
                height: char_height,
                showCharacter: false,
                showOutline: show_outline,
                showHintAfterMisses: 2,
                highlightOnComplete: true,
                drawingWidth: strokeWidth,
                padding: 5
            });
            document.getElementById("btnGoNextCard").onclick = function () {
                writer.showCharacter();
                setTimeout(function () {
                    //After 1 seconds
                    resolve();
                }, 1000)
            }; document.getElementById("btnRevealChar").onclick = function () {
                writer.showOutline();
            };
            writer.quiz({
                onMistake: function (strokeData) {
                },
                onCorrectStroke: function (strokeData) {
                },
                onComplete: function (summaryData) {
                    // call resolve: that does the magic!
                    setTimeout(function () {
                        //alert("After 1 seconds!"); 
                        resolve();
                    }, 1000)

                }
            });
        });
    }
```

### Back Side of card
```
<div class='center-vertical'>
<div>
<h3>{{Simplified}}</h3>
<h4>{{Traditional}}</h4>
<h5>{{Pinyin}}</h5>
<h3>{{Meaning}}</h3>
</div>
</div>
```

### CSS of card
```
.card {
 font-family: arial;
 font-size: 20px;
 text-align: center;
 color: black;
 background-color: white;
}

.modal-footer {
	text-align:center;
}
.modal-footer a {
	display:inline-block;
	margin:0 15px;
	float:none; 
}

/*https://codepen.io/sebj54/pen/oxluI*/
.btn {
  position: relative;

  display: block;
  margin: 10px auto;
  padding: 0;

  overflow: hidden;

  border-width: 0;
  outline: none;
  border-radius: 2px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .6);
  
  background-color: #2ecc71;
  color: #ecf0f1;
  
  transition: background-color .3s;
}

.btn:hover, .btn:focus {
  background-color: #27ae60;
}

.btn > * {
  position: relative;
}

.btn span {
  display: block;
  padding: 12px 24px;
}

.btn:before {
  content: "";
  
  position: absolute;
  top: 50%;
  left: 50%;
  
  display: block;
  width: 0;
  padding-top: 0;
    
  border-radius: 100%;
  
  background-color: rgba(236, 240, 241, .3);
  
  -webkit-transform: translate(-50%, -50%);
  -moz-transform: translate(-50%, -50%);
  -ms-transform: translate(-50%, -50%);
  -o-transform: translate(-50%, -50%);
  transform: translate(-50%, -50%);
}

.btn:active:before {
  width: 120%;
  padding-top: 120%;
  
  transition: width .2s ease-out, padding-top .2s ease-out;
}
```

### Add your word meaning. If everything done correctly then you will get the following result

## Image - AnkiDroid 
![Image Result](https://github.com/infinyte7/Anki-maobi/blob/master/image/result.png)


## Image - Anki Desktop
![Image Import Desktop](https://github.com/infinyte7/Anki-maobi/blob/master/image/welcome.png)


# Todo
 1. Loading character when offline
 2. Add sound effects
 3. Auto Show Answer 
 4. One Button to Show details about characters fetch from dictionary / internet
 5. One Button to show and customize preference
 6. Automatic add of word list


# License
### HanziWriter
https://hanziwriter.org/docs.html

The Hanzi Writer source code is released under terms of the MIT license. The MIT License is simple and easy to understand and it places almost no restrictions on what you can do with the Project. You are free to use the Project in any other project (even commercial projects) as long as the copyright header is left intact.

The Hanzi Writer data comes from the [Make Me A Hanzi](https://github.com/skishore/makemeahanzi) project, which extracted the data from fonts by Arphic Technology, a Taiwanese font forge that released their work under a permissive license in 1999. You can redistribute and/or modify this data under the terms of the Arphic Public License as published by Arphic Technology Co., Ltd. A copy of this license can be found in  [ARPHICPL.TXT](https://github.com/infinyte7/Anki-maobi/blob/master/ARPHICPL.TXT).

### New HSK Word Lists
Copyright Alan Davies, alan@hskhsk.com 2013-2020
Free to be copied, distributed, or modified for non-commercial use.
http://www.hskhsk.com/word-lists.html

### Make Me a Hanzi
Copyright 1999 Arphic Technology Co., Ltd.; Copyright 2016 Shaunak Kishore.
Licensed under the Arphic Public License.
https://github.com/skishore/makemeahanzi

### Arphic PL KaitiM GB and UKai
Copyright 1999 Arphic Technology Co., Ltd.
Licensed under the Arphic Public License.
http://www.arphic.com.tw/en/home/index

### Button CSS
I used css for button from following codepen. 
https://codepen.io/sebj54/pen/oxluI

### Earlier I asked questions on Stackoverflow for showing character one by one
I asked this question on Stackoverflow for my project in Cordova.
https://stackoverflow.com/questions/60285131/i-want-one-character-at-a-time-on-html-page-after-completion-load-next-one

# License - Anki-maobi
Author : Infinyte7
MIT License for using this code.

The MIT License
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software or code and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE / CODE.
