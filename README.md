# Anki- xiě hànzì (写汉字）

https://infinyte7.github.io/Anki-xiehanzi/

Learn, read, write and practice Mandarin by drawing strokes in anki and ankidroid with audio of HSK1 to HSK6 characters. I have used existing js library for implementing this in Anki and Ankidroid. It is a script written in Javascript to front side of card template of anki deck. <br>Read [License](https://github.com/infinyte7/Anki-xiehanzi/blob/master/License.md)

# Demo 
![Alt Text](https://github.com/infinyte7/Anki-xiehanzi/blob/master/image/xiehanzi_anki_demo.gif?raw=true)


# Quickstart
### Download HSK Anki apkg file for Anki or AnkiDroid
#### Before importing Anki Deck please make backups.

Import this file to Anki or AnkiDroid for practicing HSK words.
<br>[HSK 1 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi_HSK1.apkg?raw=true)
<br>[HSK 2 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi_HSK2.apkg?raw=true)
<br>[HSK 3 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi_HSK3.apkg?raw=true)
<br>[HSK 4 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi_HSK4.apkg?raw=true)
<br>[HSK 5 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi_HSK5.apkg?raw=true)
<br>[HSK 6 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi_HSK6.apkg?raw=true)

## Download from Ankiweb
[Practice Mandarin HSK1--HSK6 by drawing strokes (with audio)](https://ankiweb.net/shared/info/119943820)

### Feautres
- Write characters to learn Mandarin with Simplified, Traditional, Pinyin and Meaning
- Show or hide Simplified, Traditional characters, Pinyin or Meaning
- Change drawing stroke width 
- Change size of characters
- HSK1 - HSK6 audio included in the decks 

# Update
### Download from GitHub
<br>[Updated Xiehanzi Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Updated%20Existing%20Deck/xiehanzi.apkg?raw=true)

### Download from Ankiweb
[Practice Mandarin HSK1--HSK6 by drawing strokes (with audio)](https://ankiweb.net/shared/info/119943820)

Added following features in existing deck. Just download and import, it will get updated without any problem.
- View meaning by opening [Pleco dictionary](https://www.pleco.com/)
- View character details by opening link [https://hanzicraft.com/character/](https://hanzicraft.com/character/) 
- Separate button for animation and revealing character during practice. 
- Added missing audio of characters.

- Auto show answer (in Ankidroid 2.10 [#5817](https://github.com/ankidroid/Anki-Android/pull/5817))
- Offline loading of character using localhost. (in Ankidroid 2.10 [#5890](https://github.com/ankidroid/Anki-Android/pull/5890)) [For more](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Load%20hanzi%20data%20offline.md) 


### To import in Ankidroid
![Image Import Mobile](https://github.com/infinyte7/Anki-maobi/blob/master/image/Import_in_mobile.png)


### Create your own deck then [Read More](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Create%20new%20Deck%20From%20Scratch.md)

## Acknowledgement
I have not designed the writing chinese js library Hanziwriter, it comes from the awesome [Hanziwriter](https://hanziwriter.org) JavaScript library. 

The chinese character and stroke order data used by [Hanziwriter](https://github.com/chanind/hanzi-writer)
is derived from the [ Make me a Hanzi](https://github.com/skishore/makemeahanzi).
 
 
 ## Disclaimer
 This implemention is in javascript. It works because Ankidroid uses Android Webview for flashcard review. It is just implementation of HanziWriter in Anki and AnkiDroid. It may not work in some devices. Please make backups of your AnkiDroid decks before importing xiehanzi hsk decks.
 Some audio files missing but using a simply python script audio file can be generated using text to speech. [Read](https://github.com/infinyte7/gtts-textToMp3)
 
 ## Contribution
 Any contribution will be appreciated.
 
## Faq?
 #### Did you create writing component?
 No, I have just implemeted existing js library HanziWriter in Anki and Ankidroid.
 
 #### Did it work on mobile?
 Yes, It is working. But you have to select card template carefully or download [Sample Deck](https://github.com/infinyte7/Anki-maobi/blob/master/HSK%20Anki%20apkg/Write_Chinese.apkg?raw=true). <br>[Read More](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Create%20new%20Deck%20From%20Scratch.md)
 
 #### Does it work offline?
 No, It will not work offline. 
 But It can be made offline. Check this [Load local data into ankidroid using localhost](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Load%20hanzi%20data%20offline.md).
 
 #### Characters are not loading or showing?
 It may be due to slow internet. Wait for seconds to load the characters data.
 
## License - Anki-xiehanzi (写汉字)
Author : Infinyte7
The MIT License

## Other Third Party License
[License](https://github.com/infinyte7/Anki-xiehanzi/blob/master/License.md)
