# Anki- xiě hànzì (写汉字）

https://infinyte7.github.io/Anki-xiehanzi/

Learn, read, write and practice Mandarin by drawing strokes in anki and ankidroid with audio of HSK1 to HSK6 characters. I have used existing js library for implementing this in Anki and Ankidroid. It is a script written in Javascript to front side of card template of anki deck. <br>Read [License](https://github.com/infinyte7/Anki-xiehanzi/blob/master/License.md)

# Demo 
![Alt Text](https://github.com/infinyte7/Anki-xiehanzi/blob/master/image/xiehanzi_anki_demo.gif?raw=true)

# Quickstart
### Download HSK Anki apkg file for Anki or AnkiDroid
#### Before importing Anki Deck please make backups.

## Download from Ankiweb (HSK 1- HSK 6)
[Practice Mandarin HSK1--HSK6 by drawing strokes (with audio)](https://ankiweb.net/shared/info/119943820)

### Download from GitHub (HSK 1- HSK 6)
#### Version 1.3 Downloads
This deck do not contain audio. For audio download earlier version deck, then import this deck to update.
<br>[xiehanzi Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Versions/Version%201.3/xiehanzi_v1.3.apkg?raw=true)

To set up full screen view this. [Customize AnkiDroid fullscreen](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Version%201.3/Customize%20AnkiDroid%20Fullscreen.md) 

#### Version 1.2 Downloads
[xiehanzi Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Versions/version%201.2/xiehanzi.apkg?raw=true)

Import this file to Anki or AnkiDroid for practicing HSK words.
<br>[HSK 1 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi__HSK1.apkg?raw=true)
<br>[HSK 2 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi__HSK2.apkg?raw=true)
<br>[HSK 3 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi__HSK3.apkg?raw=true)
<br>[HSK 4 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi__HSK4.apkg?raw=true)
<br>[HSK 5 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi__HSK5.apkg?raw=true)
<br>[HSK 6 Deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/xiehanzi%20Anki%20Deck/xiehanzi__HSK6.apkg?raw=true)

### Feautres
- Write characters to learn Mandarin with Simplified, Traditional, Pinyin and Meaning
- Show or hide Simplified, Traditional characters, Pinyin or Meaning
- Change drawing stroke width 
- Change size of characters
- HSK1 - HSK6 audio included in the decks 

# Update 2020-06-30
- Indicator at bottom for showing if character loaded or not (```green - loaded, red - not loaded or some error```)
- Added sidebar at right side with more button
- Added http://rtega.be/chmn/ for mnemonics
- By default all option turned off, to make it work on AnkiDesktop as well as AnkiDroid
- Changes will get reflect in current card except for stroke size, characters height and width.
- New images for button that open ```Pleco Dictionary```, ```hanzicraft.com``` and ```rtega.be/chmn/``` 
- Bug fixes
View this for more . [Readme V 1.4](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Versions/Version%201.4/README.md)

# Update 2020-06-29
- Night mode 
- Custom top bar to show title, time & card counts
- Updated new button & text color
- Default show answer function turned off
### Demo
![Night Mode Demo](https://raw.githubusercontent.com/infinyte7/Anki-xiehanzi/master/image/night_mode.PNG)

# Update 2020-05-13
- In earlier version, changes get reflect in next card but from now changes will get reflected in current card. [For more #6134](https://github.com/ankidroid/Anki-Android/pull/6134)
( Note : After AnkiDroid 2.10 )

### Related files
[Version 1.2](https://github.com/infinyte7/Anki-xiehanzi/tree/master/Versions/version%201.2)

# Update 2020-04-08
Added following features in existing deck. Just download and import, it will get updated without any problem.
- View meaning by opening [Pleco dictionary](https://www.pleco.com/)
- View character details by opening link [https://hanzicraft.com/](https://hanzicraft.com/) 
- Separate button for animation and revealing character during practice. 
- Added missing audio of characters.

- Auto show answer (After Ankidroid 2.10 [#5817](https://github.com/ankidroid/Anki-Android/pull/5817))
- Offline loading of character using localhost. (After Ankidroid 2.10 [#5890](https://github.com/ankidroid/Anki-Android/pull/5890)) [For more](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Load%20hanzi%20data%20offline.md) 
### Related files 
[Version 1.1](https://github.com/infinyte7/Anki-xiehanzi/tree/master/Versions/version%201.1)


## To turn off auto showAnswer();
This is <b>front side</b> of card template. Just remove the contents in <b><script></b> tag.
```javascript
{{Pinyin}}
<script>
var isMobile = /Android/i.test(navigator.userAgent);
if (isMobile) {
  showAnswer();    // <---   remove this function or comment it.
}else{
  pycmd('ans');
}
</script>
```

#### Afetr removing above, the front side of card template will like this.
```
{{Pinyin}}
```


### To import in Ankidroid
![Image Import Mobile](https://github.com/infinyte7/Anki-maobi/blob/master/image/Import_in_mobile.png)

## Acknowledgement
I have not designed the writing chinese js library Hanziwriter, it comes from the awesome [Hanziwriter](https://hanziwriter.org) JavaScript library. 

The chinese character and stroke order data used by [Hanziwriter](https://github.com/chanind/hanzi-writer)
is derived from the [ Make me a Hanzi](https://github.com/skishore/makemeahanzi).
  
## Disclaimer
 This implemention is in javascript. It works because Ankidroid uses Android Webview for flashcard review. It is just implementation of HanziWriter in Anki and AnkiDroid. It may not work in some devices. Please make backups of your AnkiDroid decks before importing xiehanzi hsk decks.
 Some audio files missing but using a simply python script audio file can be generated using text to speech. [Read](https://github.com/infinyte7/gtts-textToMp3)

### Add / Remove buttons [Read More](https://github.com/infinyte7/Anki-xiehanzi/blob/master/add_remove_buttons.md) 

### Create your own deck [Read More](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Create%20new%20Deck%20From%20Scratch.md)

### Change default settings in code [Read more](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Customize%20default%20setting.md)

 ## Contribution
 Any contribution will be appreciated.
 
## Faq?
 #### Did you create writing component?
 No, I have just implemeted existing js library HanziWriter in Anki and Ankidroid.
 
 #### Did it work on mobile?
 Yes, It is working. But you have to select card template carefully or download [Sample Deck](https://github.com/infinyte7/Anki-maobi/blob/master/HSK%20Anki%20apkg/Write_Chinese.apkg?raw=true). <br>[Read More](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Create%20new%20Deck%20From%20Scratch.md)
 
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
