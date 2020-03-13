# Anki-maobi
Practice writing chinese by drawing stroke in anki and ankidroid.


## Check these file
### frontcard
### backcard
### cardcss

# Download this sample apkg HSK1 
https://github.com/infinyte7/Anki-maobi/blob/master/HSK1.apkg

# Note 
   Hanziwriter is necessary for using this.
   It works fine for Anki Desktop but due to character encoding it does not work on android.

## If I change  ```var chars = document.getElementById('ch_sim').innerText;``` to var chars = '比如汉字'; (hard code)
## then it working properly in Ankidroid. But for getting info from innerText, innerHTML it does not work.
## I am working on it. The error is related to character encoding.

```
....
(async function() { // <-- add this wrapper
       var chars = document.getElementById('ch_sim').innerText; 
       var charray = chars.toString();  
//alert(charray);
       for(i=0; i< chars.length; i++){
           await writeFunction(chars[i]);
           document.getElementById('character-target-div').innerHTML = "";            
       }
   })(); 
 ...
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
# License
MIT License for this code

# License for respective author's code used in this code
https://hanziwriter.org/docs.html

wordlist
    - http://www.hskhsk.com/

# Image Anki Desktop
![Image description](https://github.com/infinyte7/Anki-maobi/blob/master/1.png)
![Image description](https://github.com/infinyte7/Anki-maobi/blob/master/2.png)
![Image description](https://github.com/infinyte7/Anki-maobi/blob/master/3.png)

# Image AnkiDroid 
Note : The character is not taken from {{Simplified}}, it hard coded to
```
var chars = document.getElementById('ch_sim').innerText;``` to var chars = '事';
```
If android webview change then it work properly. I used it in cordova app. It working fine there. 
![Image description](https://github.com/infinyte7/Anki-maobi/blob/master/4.jpg)
