# Anki- xiě hànzì (写汉字）
Learn, read, write and practice Mandarin by drawing strokes in anki and ankidroid. I have used existing js library for implementing this in Anki and Ankidroid. It is a script written in Javascript to front side of card template of anki deck.

# Demo 


# Quickstart
### Download HSK Anki apkg file for Anki or AnkiDroid
Import this file to Anki or AnkiDroid for practicing HSK words.
<br>[HSK 1 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi_HSK1.apkg?raw=true)
<br>[HSK 2 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi_HSK2.apkg?raw=true)
<br>[HSK 3 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi_HSK3.apkg?raw=true)
<br>[HSK 4 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi_HSK4.apkg?raw=true)
<br>[HSK 5 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi_HSK5.apkg?raw=true)
<br>[HSK 6 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi_HSK6.apkg?raw=true)


### To import in Ankidroid
![Image Import Mobile](https://raw.githubusercontent.com/infinyte7/Anki-xiehanzi/master/image/import_in_mobile.png)


#### Note: changes will be reflected to next card. 
It may not work on some devices. But tested to be work on most devices.

[Front Card 1.1](https://github.com/infinyte7/Anki-xiehanzi/blob/master/version%201.1/frontcard_1.1.html)

[Back Card 1.1](https://github.com/infinyte7/Anki-xiehanzi/blob/master/version%201.1/backcard_1.1.html)

[Card CSS 1.1](https://github.com/infinyte7/Anki-xiehanzi/blob/master/version%201.1/cardCSS_1.1.css)


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
 Yes, It is working. But you have to select card template carefully or download [Sample Deck](https://github.com/infinyte7/Anki-maobi/blob/master/HSK%20Anki%20apkg/Write_Chinese.apkg?raw=true). For more read below.
 
 ### Does it work offline?
 No, It will not work offline. 
 Reason, file size is very high. For total approx. 9000 characters size is approx. 30 mb.
 But It can be made offline. 
 
 ### Characters are not loading or showing?
 It may be due to slow internet. Wait for seconds to load the characters data.


## Create your own word list from this sample apkg (Anki Desktop required)
  #### Visit https://github.com/infinyte7/Anki-xiehanzi/




# License
### HanziWriter
The MIT License (MIT)
Copyright (c) 2014 David Chanin
https://hanziwriter.org/docs.html

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

### audio-cmn (HSK1 - HSK6 Audio)
hugolpz CC-by-sa
https://github.com/hugolpz/audio-cmn

### Free Audio Collection of Chinese Words (Mandarins) registered by the University of Caen
Copyright (c) 2009 Yue Tan 
http://packs.shtooka.net/cmn-caen-tan/readme.txt

### Button tap audio and Other Audio
License: Standard License
Sound effects obtained from https://www.zapsplat.com

### Anki Persistence
MIT License
Copyright (c) 2018 Simon Lammer.
<br>https://github.com/SimonLammer/anki-persistence

### Google Material Design Icons
Apache License
Version 2.0, January 2004
https://github.com/google/material-design-icons

### Button CSS
I used css for button from following codepen.
<br>https://codepen.io/sebj54/pen/oxluI

### Earlier I asked questions on Stackoverflow for showing character one by one
I asked this question on Stackoverflow for my project in Cordova.
<br>https://stackoverflow.com/questions/60285131/i-want-one-character-at-a-time-on-html-page-after-completion-load-next-one

# License - Anki-xiehanzi (写汉字)
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
