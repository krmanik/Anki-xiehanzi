"use strict";(self.webpackChunkanki_xiehanzi=self.webpackChunkanki_xiehanzi||[]).push([[412],{3116:(e,t,a)=>{a.d(t,{c:()=>E});var l=a(1504),n=a(4971),r=a(2801),s=a(1432),i=a(6016),c=a(4357);const m={sidebar:"sidebar_GnOS",sidebarItemTitle:"sidebarItemTitle_aARK",sidebarItemList:"sidebarItemList_a8Ne",sidebarItem:"sidebarItem_Otbb",sidebarItemLink:"sidebarItemLink_OBo2",sidebarItemLinkActive:"sidebarItemLinkActive_guiV"};function o(e){let{sidebar:t}=e;return l.createElement("aside",{className:"col col--3"},l.createElement("nav",{className:(0,n.c)(m.sidebar,"thin-scrollbar"),"aria-label":(0,c.G)({id:"theme.blog.sidebar.navAriaLabel",message:"Blog recent posts navigation",description:"The ARIA label for recent posts in the blog sidebar"})},l.createElement("div",{className:(0,n.c)(m.sidebarItemTitle,"margin-bottom--md")},t.title),l.createElement("ul",{className:(0,n.c)(m.sidebarItemList,"clean-list")},t.items.map((e=>l.createElement("li",{key:e.permalink,className:m.sidebarItem},l.createElement(i.c,{isNavLink:!0,to:e.permalink,className:m.sidebarItemLink,activeClassName:m.sidebarItemLinkActive},e.title)))))))}var g=a(5168);function u(e){let{sidebar:t}=e;return l.createElement("ul",{className:"menu__list"},t.items.map((e=>l.createElement("li",{key:e.permalink,className:"menu__list-item"},l.createElement(i.c,{isNavLink:!0,to:e.permalink,className:"menu__link",activeClassName:"menu__link--active"},e.title)))))}function b(e){return l.createElement(g.Mx,{component:u,props:e})}function d(e){let{sidebar:t}=e;const a=(0,s.U)();return t?.items.length?"mobile"===a?l.createElement(b,{sidebar:t}):l.createElement(o,{sidebar:t}):null}function E(e){const{sidebar:t,toc:a,children:s,...i}=e,c=t&&t.items.length>0;return l.createElement(r.c,i,l.createElement("div",{className:"container margin-vert--lg"},l.createElement("div",{className:"row"},l.createElement(d,{sidebar:t}),l.createElement("main",{className:(0,n.c)("col",{"col--7":c,"col--9 col--offset-1":!c}),itemScope:!0,itemType:"http://schema.org/Blog"},s),a&&l.createElement("div",{className:"col col--2"},a))))}},2504:(e,t,a)=>{a.r(t),a.d(t,{default:()=>E});var l=a(1504),n=a(4971),r=a(4357);const s=()=>(0,r.G)({id:"theme.tags.tagsPageTitle",message:"Tags",description:"The title of the tag list page"});var i=a(5756),c=a(5864),m=a(3116),o=a(7644);const g={tag:"tag_tbrL"};function u(e){let{letterEntry:t}=e;return l.createElement("article",null,l.createElement("h2",null,t.letter),l.createElement("ul",{className:"padding--none"},t.tags.map((e=>l.createElement("li",{key:e.permalink,className:g.tag},l.createElement(o.c,e))))),l.createElement("hr",null))}function b(e){let{tags:t}=e;const a=function(e){const t={};return Object.values(e).forEach((e=>{const a=function(e){return e[0].toUpperCase()}(e.label);t[a]??=[],t[a].push(e)})),Object.entries(t).sort(((e,t)=>{let[a]=e,[l]=t;return a.localeCompare(l)})).map((e=>{let[t,a]=e;return{letter:t,tags:a.sort(((e,t)=>e.label.localeCompare(t.label)))}}))}(t);return l.createElement("section",{className:"margin-vert--lg"},a.map((e=>l.createElement(u,{key:e.letter,letterEntry:e}))))}var d=a(3520);function E(e){let{tags:t,sidebar:a}=e;const r=s();return l.createElement(i.cr,{className:(0,n.c)(c.W.wrapper.blogPages,c.W.page.blogTagsListPage)},l.createElement(i.U7,{title:r}),l.createElement(d.c,{tag:"blog_tags_list"}),l.createElement(m.c,{sidebar:a},l.createElement("h1",null,r),l.createElement(b,{tags:t})))}},7644:(e,t,a)=>{a.d(t,{c:()=>i});var l=a(1504),n=a(4971),r=a(6016);const s={tag:"tag_QDqo",tagRegular:"tagRegular_RTiO",tagWithCount:"tagWithCount_mElv"};function i(e){let{permalink:t,label:a,count:i}=e;return l.createElement(r.c,{href:t,className:(0,n.c)(s.tag,i?s.tagWithCount:s.tagRegular)},a,i&&l.createElement("span",null,i))}}}]);