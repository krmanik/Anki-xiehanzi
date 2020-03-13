# Anki-maobi
Practice writing chinese by drawing stroke in anki and ankidroid. I have use existing js library for implementing this in Anki and Ankidroid. [Hanziwriter](https://github.com/chanind/hanzi-writer)

## Check these file
#### four field used in the deck
###### {{Simplified}}
###### {{Traditional}}
###### {{Pinyin}}
###### {{English}}

#### front side of card - add this front of the card
https://github.com/infinyte7/Anki-maobi/blob/master/frontcard
#### back side of card - add this to back of card
https://github.com/infinyte7/Anki-maobi/blob/master/backcard
#### css of card - add this to css of card
https://github.com/infinyte7/Anki-maobi/blob/master/cardCSS

# Download this sample apkg HSK1 
https://github.com/infinyte7/Anki-maobi/blob/master/HSK1.apkg

# Note 
   Hanziwriter is necessary for using this. The full code is added to front side of card.
   [Hanziwriter](https://hanziwriter.org/docs.html)
   It works fine for Anki Desktop but due to character encoding it does not work on Ankidroid.

##### If I change  ```var chars = document.getElementById('ch_sim').innerText;``` to ```var chars = '比如汉字';``` (hard code) then it working properly in Ankidroid. But for getting info from innerText, innerHTML it does not work. I am working on it. The error is related to character encoding. 

### Contributions to code will be appreciated. 

```
.....
.....
(async function() { // <-- add this wrapper
       var chars = document.getElementById('ch_sim').innerText; 
       var charray = chars.toString();  
//alert(charray);
       for(i=0; i< chars.length; i++){
           await writeFunction(chars[i]);
           document.getElementById('character-target-div').innerHTML = "";            
       }
   })(); 
 .....
 .....
```

# Change preferences according to requirements 
```
var writer = HanziWriter.create('character-target-div', c, {
                           width: 200,
                           height: 200,
                           showCharacter: false, 
                           showOutline: true,
                           showHintAfterMisses: 2,
                           highlightOnComplete: true,
   		                  drawingWidth:20,
   		                  leniency:1,
                           padding: 5
                       });
```
# License - Anki-maobi
MIT License for this code


# License - HanziWriter
https://hanziwriter.org/docs.html
Hanzi Writer is released under an MIT license.

The Hanzi Writer data comes from the [Make Me A Hanzi](https://github.com/skishore/makemeahanzi) project, which extracted the data from fonts by Arphic Technology, a Taiwanese font forge that released their work under a permissive license in 1999. You can redistribute and/or modify this data under the terms of the Arphic Public License as published by Arphic Technology Co., Ltd. A copy of this license can be found in  [ARPHICPL.TXT](https://raw.githubusercontent.com/chanind/hanzi-writer-data/master/ARPHICPL.TXT).

## wordlist
[www.hskhsk.com](http://www.hskhsk.com/)

# Note:
I have not implemented HanziWriter. It can be found at [hanziwriter](https://github.com/chanind/hanzi-writer).

# Image - Anki Desktop
![Image description](https://github.com/infinyte7/Anki-maobi/blob/master/1.png)
![Image description](https://github.com/infinyte7/Anki-maobi/blob/master/2.png)
![Image description](https://github.com/infinyte7/Anki-maobi/blob/master/3.png)

# Image - AnkiDroid 
Note : The character is not taken from {{Simplified}} from front side of card, it hard coded.
```var chars = document.getElementById('ch_sim').innerText;``` to ```var chars = '事';```

If android webview change then it work properly. I used it in cordova app. It is working fine there. 

![Image description](https://github.com/infinyte7/Anki-maobi/blob/master/4.jpg)
