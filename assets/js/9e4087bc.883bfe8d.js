"use strict";(self.webpackChunkanki_xiehanzi=self.webpackChunkanki_xiehanzi||[]).push([[7028],{4771:(e,a,r)=>{r.r(a),r.d(a,{default:()=>o});r(1504);var s=r(867),t=r(4357),i=r(5756),n=r(8224),c=r(8728),l=r(7624);function h(e){let{year:a,posts:r}=e;return(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(c.c,{as:"h3",id:a,children:a}),(0,l.jsx)("ul",{children:r.map((e=>(0,l.jsx)("li",{children:(0,l.jsxs)(s.c,{to:e.metadata.permalink,children:[e.metadata.formattedDate," - ",e.metadata.title]})},e.metadata.date)))})]})}function d(e){let{years:a}=e;return(0,l.jsx)("section",{className:"margin-vert--lg",children:(0,l.jsx)("div",{className:"container",children:(0,l.jsx)("div",{className:"row",children:a.map(((e,a)=>(0,l.jsx)("div",{className:"col col--4 margin-vert--lg",children:(0,l.jsx)(h,{...e})},a)))})})})}function o(e){let{archive:a}=e;const r=(0,t.G)({id:"theme.blog.archive.title",message:"Archive",description:"The page & hero title of the blog archive page"}),s=(0,t.G)({id:"theme.blog.archive.description",message:"Archive",description:"The page & hero description of the blog archive page"}),h=function(e){const a=e.reduce(((e,a)=>{const r=a.metadata.date.split("-")[0],s=e.get(r)??[];return e.set(r,[a,...s])}),new Map);return Array.from(a,(e=>{let[a,r]=e;return{year:a,posts:r}}))}(a.blogPosts);return(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(i.U7,{title:r,description:s}),(0,l.jsxs)(n.c,{children:[(0,l.jsx)("header",{className:"hero hero--primary",children:(0,l.jsxs)("div",{className:"container",children:[(0,l.jsx)(c.c,{as:"h1",className:"hero__title",children:r}),(0,l.jsx)("p",{className:"hero__subtitle",children:s})]})}),(0,l.jsx)("main",{children:h.length>0&&(0,l.jsx)(d,{years:h})})]})]})}}}]);