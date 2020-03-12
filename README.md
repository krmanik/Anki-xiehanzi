# Anki-maobi
Practice writing chinese by drawing stroke in anki and ankidroid.


# Download this sample apkg HSK1 
https://github.com/infinyte7/Anki-maobi/blob/master/HSK1.apkg

# Note 
   Hanziwriter is necessary for using this.
   It works fine for Anki Desktop but due to character encoding it does not work on android.

## If I change  ```var chars = document.getElementById('ch_sim').innerText;``` to var chars = '比如汉字'; (hard code)
## then it working properly in Ankidroid. But for getting info from innerText, innerHTML it does not work.
## I am working on it. 

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

![Image description](https://github.com/infinyte7/Anki-maobi/blob/master/1.png)
![Image description](https://github.com/infinyte7/Anki-maobi/blob/master/2.png)
![Image description](https://github.com/infinyte7/Anki-maobi/blob/master/3.png)
