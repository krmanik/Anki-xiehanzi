# Anki xiě hànzì (写汉字）

https://infinyte7.github.io/Anki-xiehanzi/

Learn, read, write and practice Mandarin by drawing strokes in [Anki Desktop](https://apps.ankiweb.net/), [AnkiDroid](https://play.google.com/store/apps/details?id=com.ichi2.anki) and [AnkiMobile](https://apps.apple.com/us/app/ankimobile-flashcards/id373493387) with audio of HSK1 to HSK6 characters. 

# Demo
<img src="https://github.com/infinyte7/Anki-xiehanzi/blob/master/image/xiehanzi_anki_demo.gif?raw=true" height="560" width="264"></img>

# Quick Start
Download HSK Anki apkg file for Anki Desktop, AnkiDroid or AnkiMobile

**Before importing Anki Deck please make backups with scheduling information.**

## Download from AnkiWeb (HSK 1- HSK 6)
[Practice Mandarin HSK1--HSK6 by drawing strokes (with audio)](https://ankiweb.net/shared/info/119943820)

### Download from GitHub (HSK 1- HSK 6)
Download latest xiehanzi anki deck from [release page](https://github.com/infinyte7/Anki-xiehanzi/releases)

### Features
- Night mode
- Change size of characters
- Change drawing stroke width
- HSK1 - HSK6 audio included in the decks
- Practice simplified as well as traditional characters
- Show or hide Simplified, Traditional characters, Pinyin or Meaning
- Draw characters to learn Mandarin with Simplified, Traditional, Pinyin and Meaning
- View meaning by opening [Pleco dictionary](https://www.pleco.com/) on phone.
- View character details using [https://hanzicraft.com/](https://hanzicraft.com/) 
- View mnemonics of characters using [http://rtega.be/chmn/](http://rtega.be/chmn/)
- Indicator at bottom for showing if character loaded or not (```green - loaded, red - not loaded or some error```)

**View [Changelog.md](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Changelog.md)**

## Acknowledgement
I have not designed the writing chinese js library Hanziwriter, it comes from the awesome [Hanziwriter](https://hanziwriter.org) JavaScript library. 

The chinese character and stroke order data used by [Hanziwriter](https://github.com/chanind/hanzi-writer)
is derived from the [ Make me a Hanzi](https://github.com/skishore/makemeahanzi).
  
## Disclaimer
 This implementation is in javascript. It works because Anki uses webview for flashcard review. It may not work on some devices. Please make backups of your decks with scheduling information before importing xiehanzi hsk decks.
 Some audio files missing but using a simple python script audio file can be generated using text to speech. [Read](https://github.com/infinyte7/gtts-textToMp3)

### To turn off auto showAnswer();
[Read](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Customize%20default%20setting.md)

### To import in AnkiDroid
![Image Import Mobile](https://github.com/infinyte7/Anki-maobi/blob/master/image/Import_in_mobile.png)

### Update xiehanzi deck on AnkiDesktop [Read more](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Update%20xiehanzi%20deck%20on%20AnkiDesktop.md)  

### Add / Remove buttons [Read More](https://github.com/infinyte7/Anki-xiehanzi/blob/master/add_remove_buttons.md) 

### Create your own deck [Read More](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Create%20new%20Deck%20From%20Scratch.md)

### Change default settings in code [Read more](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Customize%20default%20setting.md)

### To set up full screen view this. [Customize AnkiDroid fullscreen](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Version%201.3/Customize%20AnkiDroid%20Fullscreen.md) 


## Contribution
 How can I contribute to this?
 View [Contributing.md](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Contributing.md)

## Faq?
 #### Did you create writing component?
 No, I have just implemented existing js library [HanziWriter](https://hanziwriter.org) in Anki.
 
 #### Did it work on mobile?
 Yes, It is working. But you have to select card template carefully or download sample deck from [release](). <br>[Read More](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Create%20new%20Deck%20From%20Scratch.md)
 
 #### Does it work offline?
 No, It will not work offline. 
 But It can be made offline. Check this [Load local data into ankidroid using localhost](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Load%20hanzi%20data%20offline.md). <br>
 [hanzi-writer-data-in-javascript](https://github.com/infinyte7/hanzi-writer-data-in-javascript)
 
 #### Characters are not loading or showing?
 It may be due to slow internet. Wait for seconds to load the characters data.

# My other anki decks
[Anki Decks](https://ankiweb.net/shared/byauthor/2120672269) 

## License - Anki-xiehanzi (写汉字)
Author : Mani (Infinyte7)
<br>The MIT License

## Other Third Party License
[License](https://github.com/infinyte7/Anki-xiehanzi/blob/master/License.md)
