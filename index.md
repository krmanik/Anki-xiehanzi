# Anki- xiě hànzì (写汉字）
Learn, read, write and practice Mandarin by drawing strokes in anki and ankidroid with audio of HSK1 to HSK6 characters. I have used existing js library for implementing this in Anki and Ankidroid. It is a script written in Javascript to front/back side of cards template of anki deck. <br>Read [License.](https://github.com/krmanik/Anki-xiehanzi/blob/master/License.md)

# Demo 
![Demo GIF](https://github.com/krmanik/Anki-xiehanzi/blob/master/image/xiehanzi_anki_demo.gif?raw=true)

# Quickstart
### Download HSK Anki apkg file for Anki or AnkiDroid
Import this file to Anki or AnkiDroid for practicing HSK words.
<br>  -[HSK 1 Deck](https://github.com/krmanik/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi__HSK1.apkg?raw=true)
<br>  -[HSK 2 Deck](https://github.com/krmanik/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi__HSK2.apkg?raw=true)
<br>  -[HSK 3 Deck](https://github.com/krmanik/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi__HSK3.apkg?raw=true)
<br>  -[HSK 4 Deck](https://github.com/krmanik/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi__HSK4.apkg?raw=true)
<br>  -[HSK 5 Deck](https://github.com/krmanik/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi__HSK5.apkg?raw=true)
<br>  -[HSK 6 Deck](https://github.com/krmanik/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi__HSK6.apkg?raw=true)

## Download from Ankiweb
[Practice Mandarin HSK1--HSK6 by drawing strokes (with audio)](https://ankiweb.net/shared/info/119943820)

### Feautres
- Write characters to learn Mandarin with Simplified, Traditional, Pinyin and Meaning
- Show or hide Simplified, Traditional characters, Pinyin or Meaning
- Change drawing stroke width 
- Change size of characters
- HSK1 - HSK6 audio included in the decks 


### To import in Ankidroid
![Image Import Mobile](https://raw.githubusercontent.com/krmanik/Anki-xiehanzi/master/image/Import_in_mobile.png)

Front Side of Deck
<br>[Front Card](https://github.com/krmanik/Anki-xiehanzi/blob/master/version%201.1/frontcard_1.1.html)

Back Side of Deck
<br>[Back Card](https://github.com/krmanik/Anki-xiehanzi/blob/master/version%201.1/backcard_1.1.html)

CSS Side of Deck
<br>[Card CSS](https://github.com/krmanik/Anki-xiehanzi/blob/master/version%201.1/cardCSS_1.1.css)

## To Show / Hide Simplified, Traditional Characters, Pinyin, Meaning and To Change character stroke width and size
Note: Changes will be reflected from next card.
![Option](https://github.com/krmanik/Anki-xiehanzi/blob/master/image/image1.png?raw=true)
![Option](https://github.com/krmanik/Anki-xiehanzi/blob/master/image/image2.png?raw=true)
![Option](https://github.com/krmanik/Anki-xiehanzi/blob/master/image/image3.png?raw=true)

## Acknowledgement
I have not designed the writing chinese js library HanziWriter, it comes from the awesome [Hanziwriter](https://hanziwriter.org) JavaScript library. 

The chinese character and stroke order data used by [Hanziwriter](https://github.com/chanind/hanzi-writer)
is derived from the [ Make me a Hanzi](https://github.com/skishore/makemeahanzi).
 
 
## Disclaimer
 This implemention is in javascript. It works because the of Ankidroid uses Android Webview for flashcard review. It is just
 implementation of HanziWriter in Anki and AnkiDroid. It may not work in some devices. Please make backups of your AnkiDroid decks         before importing xiehanzi hsk decks.
 I have used [this (audio-cmn)](https://github.com/hugolpz/audio-cmn) to add audio to HSK characters. 
 Some audio files missing but using a simply python script audio file can be generated using text to speech. [Read](https://github.com/krmanik/gtts-textToMp3)

It may not work on some devices. But tested to be work on most devices.

## Contribution
 Any contribution will be appreciated.
 
## Faq?
### Did you create writing component?
 No, I have just implemeted existing js library HanziWriter in Anki and Ankidroid.
 
### Did it work on mobile?
 Yes, It is working. But you have to select card template carefully or download [Sample Deck](https://github.com/krmanik/Anki-xiehanzi/blob/master/HSK%20Anki%20apkg/Write_Chinese.apkg?raw=true). For more read below.
 
### Does it work offline?
 No, It will not work offline. 
 Reason, file size is very high. For total approx. 9000 characters size is approx. 30 mb.
 But It can be made offline. 
 
### Characters are not loading or showing?
 It may be due to slow internet. Wait for seconds to load the characters data.


## Create your own word list from this sample apkg (Anki Desktop required)
[Read more](https://github.com/krmanik/Anki-xiehanzi/blob/master/Create%20new%20Deck%20From%20Scratch.md)


## License - Anki-xiehanzi (写汉字)
The MIT License
<br>Author : krmanik
<br>[Anki-xiehanzi](https://github.com/krmanik/Anki-xiehanzi)

## Other Third Party Licenses
[Third Party License](https://github.com/krmanik/Anki-xiehanzi/blob/master/License.md)
