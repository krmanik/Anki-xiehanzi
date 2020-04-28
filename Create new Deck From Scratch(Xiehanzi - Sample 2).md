# Anki- xiě hànzì (写汉字）

https://infinyte7.github.io/Anki-xiehanzi/

# Create your own word list from this sample apkg (Anki Desktop required)

## Sample 2

  #### 1. Download [Xiehanzi Sample](https://github.com/infinyte7/Anki-xiehanzi/blob/master/HSK%20Anki%20apkg/Xiehanzi%20Sample.apkg?raw=true)
  
![Demo2](https://github.com/infinyte7/Anki-xiehanzi/blob/master/image/Create_from_scratch_demo_2.gif?raw=true)

# Sample 2 Codes
#### front side of card - add this front of the card
https://github.com/infinyte7/Anki-xiehanzi/blob/master/version%201.1/frontcard_1.1.html
#### back side of card - add this to back of card
https://github.com/infinyte7/Anki-xiehanzi/blob/master/version%201.1/backcard_1.1.html
#### css of card - add this to css of card
https://github.com/infinyte7/Anki-xiehanzi/blob/master/version%201.1/cardCSS_1.1.css

#### Five fields used in the [xiehanzi sample deck](https://github.com/infinyte7/Anki-xiehanzi/blob/master/HSK%20Anki%20apkg/Xiehanzi%20Sample.apkg?raw=true)
##### {{Simplified}}
##### {{Traditional}}
##### {{Pinyin}}
##### {{Audio}}
##### {{Meaning}}

# Note 
   Hanziwriter is necessary for using this. The full code is added to front side of card.
   For more check this. [Hanziwriter](https://hanziwriter.org/docs.html)
   
# To Check if your card template support this code or not this simple code.
### Create new Deck and add chinese character to front then
```html
<div id = 'frontText'>{{Front}}</div>
<div id = 'ch_length'></div>
<script>
var characters = document.getElementById('frontText').innerHTML;
document.getElementById('ch_length').innerHTML = characters.length;
</script>
```

### If you are getting correct length then proceed otherwise change card template to basic or use my [sample deck].
#### Incorrect length of character ‘我’. It should be 1 but due some error in card template in anki it is showing 3. So check next for correct card template. 

![Image Incorrect](https://github.com/infinyte7/Anki-maobi/blob/master/image/incorrect.png)


#### Add basic type deck in Manage note of AnkiDroid and then add and edit field for Simplified, Traditional, Pinyin and Meaning

![Image Correct](https://github.com/infinyte7/Anki-maobi/blob/master/image/correct_1.png)

### Now It gives correct length for characters

![Image Correct](https://github.com/infinyte7/Anki-maobi/blob/master/image/correct.png)

## Importing it ankiweb to practice online without installing anki app.
https://ankiweb.net/about

https://ankiweb.net/account/login

### Before doing the following steps, please make backups of anki decks. Otherwise it may overwrite previous anki decks and data may lost.
[Practice Mandarin in Anki and Ankidroid by drawing strokes .apkg file](https://ankiweb.net/shared/info/820120967)
![Image Import Anki Deck](https://github.com/infinyte7/Anki-maobi/blob/master/image/anki_demo_import.gif)

# License - Anki-xiehanzi (写汉字)
Author : Infinyte7
The MIT License
[License](https://github.com/infinyte7/Anki-xiehanzi/blob/master/License.md)
