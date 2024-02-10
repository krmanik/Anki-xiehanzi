"use strict";(self.webpackChunkanki_xiehanzi=self.webpackChunkanki_xiehanzi||[]).push([[472],{5788:(e,t,n)=>{n.d(t,{Iu:()=>d,yg:()=>f});var r=n(1504);function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function a(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){o(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,o=function(e,t){if(null==e)return{};var n,r,o={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(o[n]=e[n])}return o}var c=r.createContext({}),s=function(e){var t=r.useContext(c),n=t;return e&&(n="function"==typeof e?e(t):a(a({},t),e)),n},d=function(e){var t=s(e.components);return r.createElement(c.Provider,{value:t},e.children)},u="mdxType",p={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},m=r.forwardRef((function(e,t){var n=e.components,o=e.mdxType,i=e.originalType,c=e.parentName,d=l(e,["components","mdxType","originalType","parentName"]),u=s(n),m=o,f=u["".concat(c,".").concat(m)]||u[m]||p[m]||i;return n?r.createElement(f,a(a({ref:t},d),{},{components:n})):r.createElement(f,a({ref:t},d))}));function f(e,t){var n=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var i=n.length,a=new Array(i);a[0]=m;var l={};for(var c in t)hasOwnProperty.call(t,c)&&(l[c]=t[c]);l.originalType=e,l[u]="string"==typeof e?e:o,a[1]=l;for(var s=2;s<i;s++)a[s]=n[s];return r.createElement.apply(null,a)}return r.createElement.apply(null,n)}m.displayName="MDXCreateElement"},6328:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>a,default:()=>p,frontMatter:()=>i,metadata:()=>l,toc:()=>s});var r=n(6404),o=(n(1504),n(5788));const i={sidebar_position:3},a="Add More Info Button",l={unversionedId:"customization/add-more-info-button",id:"customization/add-more-info-button",title:"Add More Info Button",description:"In right side bar there are following links added for viewing more info about the characters.",source:"@site/docs/customization/add-more-info-button.md",sourceDirName:"customization",slug:"/customization/add-more-info-button",permalink:"/Anki-xiehanzi/docs/customization/add-more-info-button",draft:!1,editUrl:"https://github.com/krmanik/Anki-xiehanzi/docs/customization/add-more-info-button.md",tags:[],version:"current",sidebarPosition:3,frontMatter:{sidebar_position:3},sidebar:"tutorialSidebar",previous:{title:"Change Tone Color",permalink:"/Anki-xiehanzi/docs/customization/change-tone-color"},next:{title:"Add Custom Fonts",permalink:"/Anki-xiehanzi/docs/customization/add-fonts"}},c={},s=[],d={toc:s},u="wrapper";function p(e){let{components:t,...n}=e;return(0,o.yg)(u,(0,r.c)({},d,n,{components:t,mdxType:"MDXLayout"}),(0,o.yg)("h1",{id:"add-more-info-button"},"Add More Info Button"),(0,o.yg)("p",null,"In right side bar there are following links added for viewing more info about the characters."),(0,o.yg)("p",null,"To add more links to the sidebar, follow the steps below."),(0,o.yg)("ol",null,(0,o.yg)("li",{parentName:"ol"},"Open the notes of the deck in Edit mode"),(0,o.yg)("li",{parentName:"ol"},"Select back card template "),(0,o.yg)("li",{parentName:"ol"},"Add links in ",(0,o.yg)("inlineCode",{parentName:"li"},'<div id="more-info-sidebar" class="more-info-sidebar">'))),(0,o.yg)("p",null,"For Pleco, following HTML used."),(0,o.yg)("pre",null,(0,o.yg)("code",{parentName:"pre",className:"language-html"},'    <a class="fieldset-item" id="plecoMobile" href="plecoapi://x-callback-url/df?hw={{Simplified}}">\n        <img src="_pleco.png"></img>\n        <small>Pleco</small>\n    </a>\n')),(0,o.yg)("p",null,"Similarly, change image source, href and title for other links."))}p.isMDXComponent=!0}}]);