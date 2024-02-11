"use strict";(self.webpackChunkanki_xiehanzi=self.webpackChunkanki_xiehanzi||[]).push([[6688],{4256:e=>{e.exports=JSON.parse('{"blogPosts":[{"id":"/2022/09/30/create-deck-from-scratch","metadata":{"permalink":"/Anki-xiehanzi/blog/2022/09/30/create-deck-from-scratch","editUrl":"https://github.com/krmanik/Anki-xiehanzi/blog/2022-09-30-create-deck-from-scratch.md","source":"@site/blog/2022-09-30-create-deck-from-scratch.md","title":"Create new decks with customized templates","description":"First get tsv files from here","date":"2022-09-30T00:00:00.000Z","formattedDate":"September 30, 2022","tags":[],"readingTime":1.9,"hasTruncateMarker":false,"authors":[],"frontMatter":{},"unlisted":false,"nextItem":{"title":"Anki xiehanzi HSK 3.0 deck","permalink":"/Anki-xiehanzi/blog/xiehanzi-hsk-3.0"}},"content":"import ReactPlayer from \'react-player\'\\n\\n\\n## First get tsv files from here\\nDownload [HSK 1 - 9.zip](https://github.com/krmanik/Anki-xiehanzi/releases/download/v1.7.9/HSK.1-9.zip) file and extract the zip file,  the files have separated pinyin and meanings.\\n\\n## Create card template in Anki\\n\\n_Note: It is better to create new profile to create deck with following templates, then export and import in other profiles._\\n```\\nFile -> Switch Profile -> Add\\n```\\n\\n1. Create a note types with Basic templates\\n```\\nAnki -> Manage Note Types -> Add -> Add: Basic\\n```\\n2. Select newly created Note Types and add fields by clicking on `Fields`\\n3. Add five fields\\n```\\nSimplified\\nTraditional\\nPinyin\\nAudio\\nMeaning\\n```\\n4. Create new deck with any new name\\n5. Import HSK tsv files one by one to different new decks\\n6. Select Type with newly created Note Types and newly created Deck\\n7. Select `Tab` in `Fields separated by`\\n8. Select `Import even if existing note has same first field`\\n9. Allow HTML in fields\\n10. Map fields to respective columns in TSV files\\n```\\nField 1 --\x3e Simplified\\nField 2 --\x3e Traditional\\nField 3 --\x3e Pinyin\\nField 4 --\x3e Audio\\nField 5 --\x3e Meaning\\n```\\n11. Finally, import the file\\n\\n## Edit card templates\\n1. Open Card Template Editor, select the new created deck in which tsv file imported\\n```\\nTools -> Manage Note Types\\n```\\n2. Select the Note Types, then click `Cards`\\n3. Remove all content from `Front Template`, `Back Template` and `Styling` of card template\\n4. Add CSS to styling of card templates, view this page and copy all content then paste into styling of card templates\\n\\n   - [Card Styling CSS](https://raw.githubusercontent.com/krmanik/Anki-xiehanzi/master/Versions/Version%201.8/card.css)\\n\\n\\n5. To add following fields, add this to front or back side of card templates\\n\\n**Simplified**\\n```html\\n<div id=\'ch_sim\' class=\\"text-color4 \\">{{Simplified}}</div>\\n```\\n\\n**Traditional**\\n```html\\n<div id=\'ch_trad\' class=\\"text-color2\\">{{Traditional}}</div>\\n```\\n\\n**Pinyin**\\n```html\\n<div id=\'ch_pin\' class=\\"text-color1\\">{{Pinyin}}</div>\\n```\\n\\n**Audio**\\n```html\\n<div id=\'audio\' style=\'display:none\'>{{Audio}}</div>\\n```\\n\\n**Meaning**\\n```html\\n<div id=\'ch_mean\' class=\\"text-color3\\">{{Meaning}}</div>\\n```\\n\\n6. To add writing component, view this page and copy all content to front or back side of card templates\\n\\n   - [Writing Component HTML](https://raw.githubusercontent.com/krmanik/Anki-xiehanzi/master/Versions/Version%201.8/writing-component.html)\\n\\n7. Copy icons from `icons` folder in extracted zip file\\n8. Audio files need to copied from previous deck. So, import HSK decks then copy audio files to collection.media folder\\n\\n## Video \\n\\n<ReactPlayer playing controls url=\'https://user-images.githubusercontent.com/12841290/163445522-dbdc6abb-ed58-444d-93cb-f343b8f7b617.mp4\' />"},{"id":"xiehanzi-hsk-3.0","metadata":{"permalink":"/Anki-xiehanzi/blog/xiehanzi-hsk-3.0","editUrl":"https://github.com/krmanik/Anki-xiehanzi/blog/2022-09-30-xiehanzi-hsk3.0.md","source":"@site/blog/2022-09-30-xiehanzi-hsk3.0.md","title":"Anki xiehanzi HSK 3.0 deck","description":"Anki xiehanzi HSK 3.0 has been released on Ankiweb and GitHub. The deck contains five card type which help in learning meaning, pronunciation, pinyin or zhuyin of Mandarin Chinese characters with audio.","date":"2022-09-30T00:00:00.000Z","formattedDate":"September 30, 2022","tags":[{"label":"hsk","permalink":"/Anki-xiehanzi/blog/tags/hsk"}],"readingTime":0.65,"hasTruncateMarker":false,"authors":[{"name":"Mani","url":"https://github.com/krmanik","image_url":"https://github.com/krmanik.png","imageURL":"https://github.com/krmanik.png"}],"frontMatter":{"slug":"xiehanzi-hsk-3.0","title":"Anki xiehanzi HSK 3.0 deck","authors":{"name":"Mani","url":"https://github.com/krmanik","image_url":"https://github.com/krmanik.png","imageURL":"https://github.com/krmanik.png"},"tags":["hsk"]},"unlisted":false,"prevItem":{"title":"Create new decks with customized templates","permalink":"/Anki-xiehanzi/blog/2022/09/30/create-deck-from-scratch"}},"content":"import Link from \\"@docusaurus/Link\\";\\nimport styles from \'../docs/styles.module.css\';\\n\\nAnki xiehanzi HSK 3.0 has been released on Ankiweb and GitHub. The deck contains five card type which help in learning meaning, pronunciation, pinyin or zhuyin of Mandarin Chinese characters with audio.\\n\\nThe card types are\\n1. Learn meaning of characters\\n2. Learn Pinyin or Zhuyin of characters\\n3. Learn pronunciation using audio and Pinyin or Zhuyin\\n4. Learn tone marks of characters \\n5. Learn strokes order of characters\\n\\nThe deck is made possible because of [Hanzi writer](https://github.com/chanind/hanzi-writer) and [Make Me A Hanzi](https://github.com/skishore/makemeahanzi) projects. The project is licensed under open source licenses.\\n\\nDownload the decks now.\\n\\n<div className={styles.buttons}>\\n    <Link\\n    className=\\"button button--primary button--md margin--sm\\"\\n    to=\\"https://ankiweb.net/shared/info/536858343\\">\\n    Download from Ankiweb\\n    </Link>\\n</div>\\n\\n<div className={styles.buttons}>\\n    <Link\\n    className=\\"button button--primary button--md margin--sm\\"\\n    to=\\"https://github.com/krmanik/Anki-xiehanzi/releases\\">\\n    Download from GitHub\\n    </Link>\\n</div>"}]}')}}]);