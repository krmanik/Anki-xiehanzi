import ReactPlayer from 'react-player'

# Create new decks with customized templates

## First get tsv files from here
Download [HSK 1 - 9.zip](https://github.com/krmanik/Anki-xiehanzi/releases/download/v1.7.9/HSK.1-9.zip) file and extract the zip file,  the files have separated pinyin and meanings.

## Create card template in Anki

_Note: It is better to create new profile to create deck with following templates, then export and import in other profiles._
```
File -> Switch Profile -> Add
```

1. Create a note types with Basic templates
```
Anki -> Manage Note Types -> Add -> Add: Basic
```
2. Select newly created Note Types and add fields by clicking on `Fields`
3. Add five fields
```
Simplified
Traditional
Pinyin
Audio
Meaning
```
4. Create new deck with any new name
5. Import HSK tsv files one by one to different new decks
6. Select Type with newly created Note Types and newly created Deck
7. Select `Tab` in `Fields separated by`
8. Select `Import even if existing note has same first field`
9. Allow HTML in fields
10. Map fields to respective columns in TSV files
```
Field 1 --> Simplified
Field 2 --> Traditional
Field 3 --> Pinyin
Field 4 --> Audio
Field 5 --> Meaning
```
11. Finally, import the file

## Edit card templates
1. Open Card Template Editor, select the new created deck in which tsv file imported
```
Tools -> Manage Note Types
```
2. Select the Note Types, then click `Cards`
3. Remove all content from `Front Template`, `Back Template` and `Styling` of card template
4. Add CSS to styling of card templates, view this page and copy all content then paste into styling of card templates

   - [Card Styling CSS](https://raw.githubusercontent.com/krmanik/Anki-xiehanzi/master/Versions/Version%201.8/card.css)


5. To add following fields, add this to front or back side of card templates

**Simplified**
```html
<div id='ch_sim' class="text-color4 ">{{Simplified}}</div>
```

**Traditional**
```html
<div id='ch_trad' class="text-color2">{{Traditional}}</div>
```

**Pinyin**
```html
<div id='ch_pin' class="text-color1">{{Pinyin}}</div>
```

**Audio**
```html
<div id='audio' style='display:none'>{{Audio}}</div>
```

**Meaning**
```html
<div id='ch_mean' class="text-color3">{{Meaning}}</div>
```

6. To add writing component, view this page and copy all content to front or back side of card templates

   - [Writing Component HTML](https://raw.githubusercontent.com/krmanik/Anki-xiehanzi/master/Versions/Version%201.8/writing-component.html)

7. Copy icons from `icons` folder in extracted zip file
8. Audio files need to copied from previous deck. So, import HSK decks then copy audio files to collection.media folder

## Video 

<ReactPlayer playing controls url='https://user-images.githubusercontent.com/12841290/163445522-dbdc6abb-ed58-444d-93cb-f343b8f7b617.mp4' />