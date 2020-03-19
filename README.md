# Anki- xiě hànzì (写汉字）

https://infinyte7.github.io/Anki-xiehanzi/

Learn, read, write and practice Mandarin by drawing strokes in anki and ankidroid. I have used existing js library for implementing this in Anki and Ankidroid. It is a script written in Javascript to front side of card template of anki deck.

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


### To import in Ankidroid
![Image Import Mobile](https://github.com/infinyte7/Anki-maobi/blob/master/image/Import_in_mobile.png)


### Create your own deck then [Read More](https://github.com/infinyte7/Anki-xiehanzi/blob/master/Create%20new%20Deck%20From%20Scratch.md)

## Acknowledgement
I have not designed the writing chinese js library Hanziwriter, it comes from the awesome [Hanziwriter](https://hanziwriter.org) JavaScript library. 

The chinese character and stroke order data used by [Hanziwriter](https://github.com/chanind/hanzi-writer)
is derived from the [ Make me a Hanzi](https://github.com/skishore/makemeahanzi).
 
 
 ## Disclaimer
 This implemention is in javascript. It works because the of Ankidroid use Android Webview for flashcard review.
 
 ## Contribution
 Any contribution will be appreciated.
 
## Faq?
 #### Did you create writing component?
 No, I have just implemeted existing js library HanziWriter in Anki and Ankidroid.
 
 #### Did it work on mobile?
 Yes, It is working. But you have to select card template carefully or download [Sample Deck](https://github.com/infinyte7/Anki-maobi/blob/master/HSK%20Anki%20apkg/Write_Chinese.apkg?raw=true). For more read below.
 
 #### Does it work offline?
 No, It will not work offline. 
 Reason, file size is very high. For total approx. 9000 characters size is approx. 30 mb.
 But It can be made offline. 
 
 #### Characters are not loading or showing?
 It may be due to slow internet. Wait for seconds to load the characters data.
 
## License - Anki-xiehanzi (写汉字)
Author : Infinyte7
The MIT License

## Other Third Party License
[License](https://github.com/infinyte7/Anki-xiehanzi/blob/master/License.md)
