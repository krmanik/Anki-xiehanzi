(function(){function e(){if(document.getElementById(`ttsStyle`))return;let e=document.createElement(`style`);e.id=`ttsStyle`,e.innerHTML=`
/* AnkiMobile reads a tap anywhere on the card as "show answer" unless the
   element carries this class, so every clickable piece of this UI has it
   (see setupTtsConfig() in ui.ts). Purely cosmetic here — the class name
   itself is what AnkiMobile checks — but it also kills the tap highlight
   flash and the double-tap-to-zoom delay on a real touch device. */
.tappable {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
}

#ttsConfigContainer {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    box-shadow: rgba(0, 0, 0, 0.35) 0px 8px 18px;
    z-index: 99999999999;
    width: 448px;
    max-width: 92vw;
    max-height: 85vh;
    overflow-y: auto;
    padding: 14px 16px;
    text-align: left;
    border-radius: 10px;
    background: Canvas;
    color: CanvasText;
    border: 1px solid rgba(128, 128, 128, .25);
}

#ttsButtonContainer {
    margin: 10px 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

#ttsSettingsContainer {
    margin: 10px 0;
}

/* The progress bar used to be its own full-width block straight under the
   button row (it lived outside #ttsButtonContainer). Now it's inside the same
   flex row as Play/Stop so the whole group can hide as one unit (see
   syncUI() in player.ts) — flex-basis: 100% keeps it on its own line under
   the buttons instead of squeezing into the leftover row width. */
#ttsPlaybackProgress {
    flex-basis: 100%;
}

#ttsButtonContainer button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border: 1px solid rgba(128, 128, 128, .4);
    border-radius: 6px;
    cursor: pointer;
    background: Canvas;
    color: CanvasText;
    font-size: 13px;
}

#ttsButtonContainer button:hover {
    background: rgba(128, 128, 128, .12);
}

#localeSelect, #voiceSelect, #providerSelect, #speakerSelect, #relayUrlInput, #relayTokenInput {
    width: 100%;
    padding: 6px;
    margin: 4px 0 2px;
    box-sizing: border-box;
    border-radius: 5px;
    border: 1px solid rgba(128, 128, 128, .4);
    background: Canvas;
    color: CanvasText;
    font: inherit;
}

#relayRow label {
    font-weight: 400;
    font-size: 11.5px;
    opacity: .75;
    margin: 8px 0 0;
}

#closeBtn {
    float: right;
    cursor: pointer;
    opacity: .6;
    padding: 2px;
    border-radius: 4px;
}

#closeBtn:hover {
    opacity: 1;
    background: rgba(128, 128, 128, .15);
}

#ttsStatus {
    font-size: 12px;
    opacity: .75;
    min-height: 16px;
    margin-top: 6px;
}

#ttsProgress {
    width: 100%;
    display: none;
    margin: 4px 0;
}

#ttsStopButton {
    display: none;
}

#ttsPlaybackProgress {
    display: none;
    width: 100%;
    height: 6px;
    margin-top: 4px;
    accent-color: currentColor;
}

label {
    display: block;
    margin: 12px 0 2px;
    font-weight: 600;
    font-size: 13px;
}

#ttsLogSection {
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(128, 128, 128, .25);
}

#ttsLogToggleRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
}

#ttsLogTitle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    font-size: 13px;
}

#ttsLogControls {
    display: flex;
    align-items: center;
    gap: 4px;
}

#ttsLogChevron {
    transition: transform .15s ease;
}

#ttsLogSection.open #ttsLogChevron {
    transform: rotate(180deg);
}

#clearLogBtn {
    display: inline-flex;
    align-items: center;
    padding: 3px;
    border-radius: 4px;
    cursor: pointer;
    opacity: .6;
    background: none;
    border: none;
    color: inherit;
}

#clearLogBtn:hover {
    opacity: 1;
    background: rgba(128, 128, 128, .15);
}

#ttsLogBody {
    display: none;
    margin-top: 8px;
}

#ttsLogPanel {
    max-height: 220px;
    overflow-y: auto;
    background: rgba(128, 128, 128, .08);
    border-radius: 6px;
    padding: 6px 8px;
}

.ttsLogEmpty {
    opacity: .5;
    font-size: 11.5px;
    padding: 4px 2px;
}

.ttsLogLine {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 3px 2px;
    border-bottom: 1px solid rgba(128, 128, 128, .1);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 11.5px;
    line-height: 1.4;
}

.ttsLogLine:last-child {
    border-bottom: none;
}

.ttsLogTime {
    flex-shrink: 0;
    opacity: .45;
}

.ttsLogBadge {
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .03em;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(128, 128, 128, .18);
}

.ttsLogLine.warn .ttsLogBadge {
    background: rgba(201, 153, 0, .2);
    color: #c99500;
}

.ttsLogLine.error .ttsLogBadge {
    background: rgba(230, 51, 51, .18);
    color: #e33;
}

.ttsLogLine.error .ttsLogMsg {
    color: #e33;
}

.ttsLogMsg {
    word-break: break-word;
    white-space: pre-wrap;
}`,document.head.appendChild(e)}function t(e,t,n,r){let i=t.id&&document.getElementById(t.id);if(i)return i;let a=document.createElement(e);for(let e in t)a.setAttribute(e,t[e]);return n&&a.appendChild(document.createTextNode(n)),r&&r.appendChild(a),a}var n={play:`<polygon points="5 3 19 12 5 21 5 3"/>`,pause:`<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`,stop:`<rect x="4" y="4" width="16" height="16" rx="2"/>`,settings:`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,x:`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,chevronDown:`<polyline points="6 9 12 15 18 9"/>`,trash:`<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>`,terminal:`<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>`};function r(e,t=``){return`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${t}>${n[e]}</svg>`}var i=window;function a(){let e=document.getElementById(`ttsButtonContainer`),t=document.getElementById(`ttsPlayButton`),n=document.getElementById(`ttsStopButton`),a=document.getElementById(`ttsPlaybackProgress`);if(!t||!n||!a)return;let o=i.__ttsAudio;if(!o){e&&(e.style.display=`none`),t.innerHTML=`${r(`play`)}<span>Play</span>`,n.style.display=`none`,a.style.display=`none`;return}e&&(e.style.display=`flex`),n.style.display=`inline-flex`,a.style.display=`block`,a.max=o.duration||0,a.value=o.currentTime||0,t.innerHTML=o.paused?`${r(`play`)}<span>Resume</span>`:`${r(`pause`)}<span>Pause</span>`}function o(){i.__ttsAudio&&(i.__ttsAudio.pause(),i.__ttsAudio.currentTime=0),i.__ttsAudioUrl&&URL.revokeObjectURL(i.__ttsAudioUrl),i.__ttsAudio=void 0,i.__ttsAudioUrl=void 0,a()}async function s(e){o();let t=URL.createObjectURL(e),n=new Audio(t);i.__ttsAudio=n,i.__ttsAudioUrl=t,n.addEventListener(`play`,a),n.addEventListener(`pause`,a),n.addEventListener(`timeupdate`,a),n.addEventListener(`ended`,()=>{i.__ttsAudio===n&&o()}),await n.play(),a()}function c(){let e=i.__ttsAudio;return e?(e.paused?e.play():e.pause(),!0):!1}var l=null,u=null,d=`https://cdn.jsdelivr.net/npm/edge-tts-browser@latest/+esm`;async function f(){return import(d)}var p=null;function m(){return u?Promise.resolve(!0):(p||(p=(async()=>{try{console.log(`Loading Edge TTS…`);let{default:e}=await f();return l=new e,u=await e.getVoices(),console.log(`Edge TTS ready:`,u==null?void 0:u.length,`voices`),!0}catch(e){return console.error(`Failed to initialize Edge TTS:`,e),p=null,!1}})()),p)}function h(){return u}var g=`http://127.0.0.1:8811`,_=null,v=``;function y(){return{url:(localStorage.getItem(`ttsRelayUrl`)||g).replace(/\/+$/,``),token:localStorage.getItem(`ttsRelayToken`)||``}}function b(e){return e?{Authorization:`Bearer ${e}`}:{}}function x(){let{url:e,token:t}=y();return(!_||v!==e)&&(v=e,_=fetch(`${e}/health`,{headers:b(t),signal:AbortSignal.timeout(1500)}).then(e=>e.ok).catch(()=>!1).then(t=>(console.log(t?`Edge TTS relay detected at `+e:`Edge TTS relay not running — using direct connection (real Microsoft Edge only)`),t))),_}async function S(e,t){let{url:n,token:r}=y(),i=new URLSearchParams({text:e,voice:t}),a=await fetch(`${n}/tts?${i}`,{headers:b(r)});if(!a.ok)throw Error(`Edge TTS relay error: ${await a.text()}`);console.log(`Playing audio`),await s(await a.blob())}async function C(e,t){if(!l&&!await m())throw Error(`Failed to initialize Edge TTS`);l.tts.setVoiceParams({text:e,voice:t});let n=`tts-output-${crypto.randomUUID()}-${l.tts.fileType.ext}`,r;try{r=await l.ttsToFile(n)}catch(e){throw console.error(`Edge TTS websocket failed:`,e),Error(`Edge TTS only works in the real Microsoft Edge browser, or with the local relay running (npm run relay). Microsoft's server rejects this connection from Chrome, Firefox, Safari, and Anki's own review window otherwise. Switch to the Piper engine in Settings (offline, works everywhere) as another option.`)}console.log(`Playing audio`),await s(r)}async function w(e,t=`zh-CN-XiaoxiaoNeural`){if(!e||!e.trim()){console.warn(`No text provided for TTS`);return}let n=e.trim();console.log(`edgeTtsPlay:`,t,JSON.stringify(n)),await x()?await S(n,t):await C(n,t)}var T=`anki-tts-piper-v1`;async function E(e,t){let n=await caches.open(T),r=await n.match(e);if(r)return r;let i=await fetch(e);if(!i.ok)throw Error(`Fetch failed (${i.status}): ${e}`);if(t&&i.body){let r=Number(i.headers.get(`content-length`)||0),a=i.body.getReader(),o=[],s=0;for(;;){let{done:e,value:n}=await a.read();if(e)break;o.push(n),s+=n.length,t(s,r)}let c=new Response(new Blob(o),{headers:i.headers});return await n.put(e,c.clone()),c}return await n.put(e,i.clone()),i}var D=200;function O(e){return e.map(e=>e instanceof Error?e.stack||e.message:typeof e==`object`?JSON.stringify(e):String(e)).join(` `)}function k(e,...t){var n;let r=document.getElementById(`ttsLogPanel`);if(!r)return;(n=r.querySelector(`.ttsLogEmpty`))==null||n.remove();let i=document.createElement(`div`);i.className=`ttsLogLine ${e}`;let a=document.createElement(`span`);a.className=`ttsLogTime`,a.textContent=new Date().toLocaleTimeString([],{hour12:!1});let o=document.createElement(`span`);o.className=`ttsLogBadge`,o.textContent=e;let s=document.createElement(`span`);for(s.className=`ttsLogMsg`,s.textContent=O(t),i.append(a,o,s),r.appendChild(i);r.childElementCount>D;)r.firstChild&&r.removeChild(r.firstChild);if(r.scrollTop=r.scrollHeight,e===`error`){var c;(c=document.getElementById(`ttsLogSection`))==null||c.classList.add(`open`);let e=document.getElementById(`ttsLogBody`);e&&(e.style.display=`block`);let t=document.getElementById(`ttsConfigContainer`);t&&(t.style.display=`block`)}}function A(){if(window.__ttsLoggingInstalled)return;window.__ttsLoggingInstalled=!0;let e={log:console.log,warn:console.warn,error:console.error};console.log=(...t)=>{e.log(...t),k(`log`,...t)},console.warn=(...t)=>{e.warn(...t),k(`warn`,...t)},console.error=(...t)=>{e.error(...t),k(`error`,...t)},window.addEventListener(`error`,e=>k(`error`,e.message,`${e.filename}:${e.lineno}`)),window.addEventListener(`unhandledrejection`,e=>k(`error`,`Unhandled rejection:`,e.reason))}function ee(e){var t,n,r,i;let a=(t=(n=e[0])==null?void 0:n.numChannels)==null?1:t,o=(r=(i=e[0])==null?void 0:i.sampleRate)==null?22050:r,s=e.reduce((e,t)=>e+t.samples.length,0),c=0;for(let t of e)for(let e of t.samples){let t=Math.abs(e);t>c&&(c=t)}let l=1/Math.max(.01,c),u=new Int16Array(s),d=0;for(let t of e)for(let e of t.samples)u[d++]=Math.max(-32768,Math.min(32767,Math.round(e*l*32767)));let f=a*2,p=u.length*2,m=new ArrayBuffer(44+p),h=new DataView(m),g=(e,t)=>{for(let n=0;n<t.length;n++)h.setUint8(e+n,t.charCodeAt(n))};return g(0,`RIFF`),h.setUint32(4,36+p,!0),g(8,`WAVE`),g(12,`fmt `),h.setUint32(16,16,!0),h.setUint16(20,1,!0),h.setUint16(22,a,!0),h.setUint32(24,o,!0),h.setUint32(28,o*f,!0),h.setUint16(32,f,!0),h.setUint16(34,16,!0),g(36,`data`),h.setUint32(40,p,!0),new Int16Array(m,44).set(u),new Blob([m],{type:`audio/wav`})}var j=`https://huggingface.co/rhasspy/piper-voices/resolve/main/`,M=`https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/`,N=`https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/`,P={pad:`_`,bos:`^`,eos:`$`},F=null,I=null,L=null;function R(e){return new Promise((t,n)=>{if(document.querySelector(`script[data-src="${e}"]`))return t();let r=document.createElement(`script`);r.src=e,r.dataset.src=e,r.onload=()=>t(),r.onerror=()=>n(Error(`Failed to load `+e)),document.head.appendChild(r)})}async function z(){return F||(F=(async()=>{let e=localStorage.getItem(`piperVoicesJson`),t=Number(localStorage.getItem(`piperVoicesJsonAt`)||0);if(e&&Date.now()-t<168*3600*1e3)return k(`log`,`Using cached Piper voice list`),JSON.parse(e);try{k(`log`,`Fetching Piper voice list from`,`https://huggingface.co/rhasspy/piper-voices/resolve/main/voices.json`);let e=await(await fetch(`https://huggingface.co/rhasspy/piper-voices/resolve/main/voices.json`)).text();localStorage.setItem(`piperVoicesJson`,e),localStorage.setItem(`piperVoicesJsonAt`,String(Date.now()));let t=JSON.parse(e);return k(`log`,`Loaded`,Object.keys(t).length,`Piper voices`),t}catch(t){if(e)return JSON.parse(e);throw t}})(),F)}function te(){return I||(k(`log`,`Loading phonemizer (espeak-ng wasm)…`),I=R(`https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.js`).then(()=>{let e=[];return window.createPiperPhonemize({print(t){e.push(JSON.parse(t))},locateFile:e=>M+e}).then(t=>(k(`log`,`Phonemizer ready`),{phonemize(n,r){e=[];let i=t.callMain([`--espeak_data`,`/espeak-ng-data`,`--language`,r,`--input`,JSON.stringify(n.map(e=>({text:e})))]);if(i!==0)throw Error(`piper_phonemize exited with code `+i);return e}}))})),I}function ne(){return L||(k(`log`,`Loading ONNX Runtime Web…`),L=R(`https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js`).then(()=>{let e=window.ort;return e.env.wasm.wasmPaths=N,e.env.wasm.numThreads=1,k(`log`,`ONNX Runtime Web ready`),e})),L}function re(e,t){let n=t.phoneme_id_map;if(!n)throw Error(`Voice is missing phoneme_id_map`);let r=[],i=e=>{n[e]&&r.push(...n[e])};i(P.bos),i(P.pad);for(let t of e)n[t]&&(i(t),i(P.pad));return i(P.eos),r}function ie(e){let t=Object.keys(e.files).find(e=>e.endsWith(`.onnx`));if(!t)throw Error(`Can't find .onnx file for voice `+e.key);return t}var B=-1;function ae(e,t,n,r){let i=r?Math.round(n/r*100):void 0;e==null||e(`Downloading ${t}… ${i==null?``:i+`%`}`,i),i!=null&&i>=B+20&&(B=i,k(`log`,`Downloading ${t}: ${i}% (${(n/1e6).toFixed(1)}MB / ${(r/1e6).toFixed(1)}MB)`))}async function V(e,t,n,r){var i,a,o,c,l,u,d,f,p,m;if(!e||!e.trim()){console.warn(`No text provided for TTS`);return}k(`log`,`piperTtsPlay:`,t,n==null?``:`speaker=${n}`,JSON.stringify(e));let h=(await z())[t];if(!h)throw Error(`Unknown Piper voice: `+t);let g=ie(h);B=-1,r==null||r(`Loading ${h.name}…`);let[_,v,{phonemize:y},b]=await Promise.all([E(j+g,(e,t)=>ae(r,h.name,e,t)),E(j+g+`.json`),te(),ne()]);k(`log`,`Model + config downloaded:`,g);let x=await v.clone().json(),S=await _.clone().arrayBuffer(),C=(i=(a=x.audio)==null?void 0:a.sample_rate)==null?22050:i,w=(o=(c=x.inference)==null?void 0:c.noise_scale)==null?.667:o,T=(l=(u=x.inference)==null?void 0:u.length_scale)==null?1:l,D=(d=(f=x.inference)==null?void 0:f.noise_w)==null?.8:d;r==null||r(`Phonemizing…`);let[O]=y([e.trim()],x.espeak.voice),A=(p=O==null?void 0:O.phonemes)==null?[]:p,M=(m=O==null?void 0:O.phoneme_ids)==null?re(A,x):m;if(k(`log`,`Phonemes:`,A.join(` `)),k(`log`,`Phoneme ids:`,M.length,`ids`),!M.length){r==null||r(``);return}r==null||r(`Loading model…`);let N=await b.InferenceSession.create(S);try{r==null||r(`Synthesizing…`);let e={input:new b.Tensor(`int64`,M,[1,M.length]),input_lengths:new b.Tensor(`int64`,[M.length]),scales:new b.Tensor(`float32`,[w,T,D])};n!=null&&(e.sid=new b.Tensor(`int64`,[n]));let{output:t}=await N.run(e),i=t.data;k(`log`,`Synthesized ${i.length} samples @ ${C}Hz (${(i.length/C).toFixed(2)}s)`),r==null||r(``);let a=ee([{samples:i,sampleRate:C,numChannels:1}]);k(`log`,`Playing audio`),await s(a)}finally{await N.release()}}var H={},U={},W={};function G(){return localStorage.getItem(`ttsProvider`)||`edge`}function K(){return[localStorage.getItem(`ttsLocale`)||`zh`,localStorage.getItem(`ttsVoice`)||`zh-CN-XiaoxiaoNeural`]}function q(){return[localStorage.getItem(`ttsPiperLocale`)||`zh`,localStorage.getItem(`ttsPiperVoice`)||`zh_CN-huayan-medium`]}function oe(e){let t={};U={};for(let r of e){var n;let e=r.Locale.split(`-`)[0]||`default`;e in U||(U[e]=r.LocaleName.split(`(`)[0].trim()),((n=t[e])==null?t[e]=[]:n).push({value:r.ShortName,label:r.FriendlyName})}return t}function se(e){let t={};U={},W=e;for(let r of Object.values(e)){var n;let e=r.language.family||`default`;e in U||(U[e]=r.language.name_english),((n=t[e])==null?t[e]=[]:n).push({value:r.key,label:`${r.name} (${r.quality})`})}return t}function J(e){return Object.keys(e).sort().reduce((t,n)=>(t[n]=e[n],t),{})}function Y(e,t){let n=document.getElementById(`ttsStatus`);n&&(n.textContent=e);let r=document.getElementById(`ttsProgress`);r&&(t==null?r.style.display=`none`:(r.style.display=`block`,r.value=t))}async function X(){let e=G();Y(`Loading voices…`);try{e===`piper`?H=J(se(await z())):(h()||await m(),H=J(oe(h()||[]))),ce(),Y(``)}catch(e){console.error(`Error loading voices:`,e),Y(`Failed to load voices, see console.`)}}function Z(){var e;let t=document.getElementById(`localeSelect`),n=document.getElementById(`voiceSelect`),r=document.getElementById(`speakerRow`);n.innerHTML=``;for(let{value:e,label:r}of H[t.value]||[]){let t=document.createElement(`option`);t.value=e,t.text=r,n.add(t)}Q(),r.style.display=G()===`piper`&&(((e=W[n.value])==null?void 0:e.num_speakers)||0)>1?`block`:`none`}function Q(){if(G()!==`piper`)return;let e=document.getElementById(`voiceSelect`),t=document.getElementById(`speakerSelect`),n=W[e.value];if(t.innerHTML=``,n)for(let[e,r]of Object.entries(n.speaker_id_map)){let n=document.createElement(`option`);n.value=String(r),n.text=e,t.add(n)}}function ce(){let e=G(),t=document.getElementById(`localeSelect`);t.innerHTML=``;let n=Object.keys(H).sort((e,t)=>(U[e]||e).localeCompare(U[t]||t));for(let e of n){let n=document.createElement(`option`);n.value=e,n.text=U[e]?`${U[e]} (${e})`:e,t.add(n)}Z();let[r,i]=e===`piper`?q():K();H[r]&&(t.value=r,Z());let a=document.getElementById(`voiceSelect`);i&&(a.value=i);let o=localStorage.getItem(`ttsPiperSpeaker`);if(e===`piper`&&o){let e=document.getElementById(`speakerSelect`);e.value=o}t.onchange=t=>{let n=t.target.value;localStorage.setItem(e===`piper`?`ttsPiperLocale`:`ttsLocale`,n),Z()},a.onchange=t=>{var n;let r=t.target.value;localStorage.setItem(e===`piper`?`ttsPiperVoice`:`ttsVoice`,r),Q();let i=document.getElementById(`speakerRow`);i.style.display=e===`piper`&&(((n=W[r])==null?void 0:n.num_speakers)||0)>1?`block`:`none`};let s=document.getElementById(`speakerSelect`);s.onchange=e=>localStorage.setItem(`ttsPiperSpeaker`,e.target.value)}function $(){let e=document.getElementById(`ttsConfigContainer`);e.style.display=e.style.display===`none`?`block`:`none`,e.style.display===`block`&&X()}function le(){let e=document.getElementById(`ttsLogSection`),t=document.getElementById(`ttsLogBody`),n=e.classList.toggle(`open`);t.style.display=n?`block`:`none`}async function ue(e,t){o();let n=G();try{if(n===`piper`){let[,n]=q(),r=localStorage.getItem(`ttsPiperSpeaker`);await V(e,t||n,r?Number(r):void 0,Y)}else{let[,n]=K();await w(e,t||n)}}catch(e){k(`error`,`TTS playback failed:`,e),Y(`Playback failed — see Log below.`)}}function de(){e(),A();let n=t(`button`,{id:`ttsShowConfig`,class:`tappable`},null,t(`div`,{id:`ttsSettingsContainer`},null,document.body));n.innerHTML=`${r(`settings`)}<span>Settings</span>`,n.onclick=()=>$();let i=t(`div`,{id:`ttsButtonContainer`},null,document.body),a=t(`button`,{id:`ttsPlayButton`,class:`tappable`},null,i);a.innerHTML=`${r(`play`)}<span>Play</span>`,a.onclick=()=>{var e,t;c()||(e=(t=window).playTts)==null||e.call(t)};let s=t(`button`,{id:`ttsStopButton`,title:`Stop`,class:`tappable`},null,i);s.innerHTML=r(`stop`),s.onclick=()=>o(),t(`progress`,{id:`ttsPlaybackProgress`,max:`0`,value:`0`},null,i);let l=t(`div`,{id:`ttsConfigContainer`,style:`display: none`},null,document.body),u=t(`div`,{id:`msttsConfig`},null,l),d=t(`div`,{id:`closeBtn`,class:`tappable`},null,u);d.innerHTML=r(`x`),d.onclick=()=>{l.style.display=`none`},t(`label`,{id:`providerSelectLabel`,for:`providerSelect`},`TTS Engine`,u);let f=t(`select`,{id:`providerSelect`,class:`tappable`},null,u),p=[[`edge`,`Microsoft Edge (online)`],[`piper`,`Piper (offline, on-device)`]];if(f.options.length===0)for(let[e,t]of p){let n=document.createElement(`option`);n.value=e,n.text=t,f.add(n)}f.value=G(),f.onchange=e=>{localStorage.setItem(`ttsProvider`,e.target.value),_(),X()};let m=t(`div`,{id:`relayRow`},null,u);t(`label`,{id:`relayUrlLabel`,for:`relayUrlInput`},`Relay URL (optional)`,m);let h=t(`input`,{id:`relayUrlInput`,type:`text`,placeholder:`http://127.0.0.1:8811`,class:`tappable`},null,m);h.value=localStorage.getItem(`ttsRelayUrl`)||``,h.onchange=e=>localStorage.setItem(`ttsRelayUrl`,e.target.value.trim()),t(`label`,{id:`relayTokenLabel`,for:`relayTokenInput`},`Relay Token (optional)`,m);let g=t(`input`,{id:`relayTokenInput`,type:`password`,placeholder:`only needed for hosted relays`,class:`tappable`},null,m);g.value=localStorage.getItem(`ttsRelayToken`)||``,g.onchange=e=>localStorage.setItem(`ttsRelayToken`,e.target.value.trim());function _(){m.style.display=G()===`edge`?`block`:`none`}_(),t(`label`,{id:`localeSelectLabel`,for:`localeSelect`},`Locale`,u),t(`select`,{id:`localeSelect`,class:`tappable`},null,u),t(`label`,{id:`voiceSelectLabel`,for:`voiceSelect`},`Voice`,u),t(`select`,{id:`voiceSelect`,class:`tappable`},null,u);let v=t(`div`,{id:`speakerRow`,style:`display: none`},null,u);t(`label`,{id:`speakerSelectLabel`,for:`speakerSelect`},`Speaker`,v),t(`select`,{id:`speakerSelect`,class:`tappable`},null,v),t(`div`,{id:`ttsStatus`},null,u),t(`progress`,{id:`ttsProgress`,max:`100`,value:`0`},null,u);let y=`<div class="ttsLogEmpty">No log entries yet.</div>`,b=t(`div`,{id:`ttsLogSection`},null,u),x=t(`div`,{id:`ttsLogToggleRow`},null,b),S=t(`div`,{id:`ttsLogTitle`},null,x);S.innerHTML=`${r(`terminal`)}<span>Log</span>`;let C=t(`div`,{id:`ttsLogControls`},null,x),w=t(`button`,{id:`clearLogBtn`,title:`Clear log`,class:`tappable`},null,C);w.innerHTML=r(`trash`),w.onclick=e=>{e.stopPropagation();let t=document.getElementById(`ttsLogPanel`);t&&(t.innerHTML=y)};let T=t(`span`,{id:`ttsLogChevron`},null,C);T.innerHTML=r(`chevronDown`),x.classList.add(`tappable`),x.onclick=()=>le();let E=t(`div`,{id:`ttsLogPanel`},null,t(`div`,{id:`ttsLogBody`},null,b));E.hasChildNodes()||(E.innerHTML=y)}de(),o(),document.addEventListener(`DOMContentLoaded`,()=>{m().catch(e=>console.error(`Failed to initialize Edge TTS:`,e))}),window.showConfig=$,window.ttsPlay=ue,window.stopTts=o,window.getLocal=K,window.getPiperLocal=q,window.edgeTtsPlay=w,window.piperTtsPlay=V})();