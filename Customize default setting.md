## Change default setting of showing and hiding characters, pinyin and meaning in card.html
Read commented out line to change.
## Simplified 
### To show simplified characters
Note : It use [anki-persistence](https://github.com/SimonLammer/anki-persistence) to pass value to all cards.
Also opacity is used to show/hide characters because xiehanzi fetch characters details using this feild. If 'display:none' or 'display:block' used then it will not fetch characters details.
```javascript
if (showSimpState == null) {
    showSimpState = true;    // <--- the default state of showing simplified
    document.getElementById("showSimpId").checked = true;   // <--- switch in side menu toggle ON showing that simpilfied is shown 
    document.getElementById("ch_sim").style.opacity = "1";   // <--- used as opacity 1 to showing 
    Persistence.setItem("simp_per", showSimpState);    // <--- storing the value to be passed to next card
}
```

### To hide simplified characters as default
```javascript
if (showSimpState == null) {
    showSimpState = false;    // <--- the state changed to hide simplified characters
    document.getElementById("showSimpId").checked = false;   // <--- switch in side menu toggle OFF showing that simpilfied is hidden 
    document.getElementById("ch_sim").style.opacity = "0";   // <--- used as opacity 1 to hiding 
    Persistence.setItem("simp_per", showSimpState);    // <--- storing the value to be passed to next card
}
```

## Characters outline
### To show characters outline
```javascript
var show_outline = true;  // default value to show outline, globally accessible to Hanziwriter function
...
...
...
if (showOutlineState == null) {
    showOutlineState = true;   // default state to show outline
    show_outline = showOutlineState;
    document.getElementById("showOutLineId").checked = true;  // default
    Persistence.setItem("outline_per", showOutlineState);
}
```
### To hide characters outline
```javascript
var show_outline = false; // <-- change this to false
...
...
if (showOutlineState == null) {
    showOutlineState = false;  // <-- change this to false
    show_outline = showOutlineState;
    document.getElementById("showOutLineId").checked = false;   // <-- change this to false
    Persistence.setItem("outline_per", showOutlineState);
}
```

## Traditional 
### By default the traditional field is hidden.
```javascript
if (showTradState == null) {
    showTradState = false;
    document.getElementById("showTradId").checked = false;
    document.getElementById("ch_trad").style.display = "none";  
    Persistence.setItem("trad_per", showTradState);
}
```
### To show traditional characters as default
```javascript
if (showTradState == null) {
    showTradState = true;   // <--- change it - true
    document.getElementById("showTradId").checked = true;  // <-- change this to - true
    document.getElementById("ch_trad").style.display = "block";   // <-- change it to - block
    Persistence.setItem("trad_per", showTradState);
}
```

## Pinyin 
### To show< pinyin as default
```javascript
if (showPinyinState == null) {
    showPinyinState = true;
    document.getElementById("showPinId").checked = true;
    document.getElementById("ch_pin").style.display = "block";
    Persistence.setItem("pinyin_per", showPinyinState);
}
```
### To hide pinyin as default
```javascript
if (showPinyinState == null) {
    showPinyinState = false;
    document.getElementById("showPinId").checked = false;
    document.getElementById("ch_pin").style.display = "none";
    Persistence.setItem("pinyin_per", showPinyinState);
}
```

## Meaning
### To show meaning
```javascript
if (showMeaningState == null) {
    showMeaningState = true;
    document.getElementById("showMeanId").checked = true;
    document.getElementById("ch_mean").style.display = "block";
    Persistence.setItem("meaning_per", showMeaningState);
}
```
### To hide meaning
```javascript
if (showMeaningState == null) {
    showMeaningState = false;
    document.getElementById("showMeanId").checked = false;
    document.getElementById("ch_mean").style.display = "none";
    Persistence.setItem("meaning_per", showMeaningState);
}
```

## Change characters width

```javascript
 // START --- Stroke width of Characters
 
    var strokeWidth = 10;  // <-- default value, can be change other value but lower value of stroke with take less memory. Globally accessible to Hanziwriter function
    
    var slider = document.getElementById("strokeSizeId");
    slider.oninput = function () {
        strokeWidth = this.value;
        if (Persistence.isAvailable()) {
            Persistence.setItem("stroke_per", strokeWidth);
        }
    }
    ...
    ...
    if (strokeWidthState == null) {
    
            strokeWidthState = 10;  // <-- also change this to desired value 
            
            strokeWidth = strokeWidthState;
            Persistence.setItem("stroke_per", strokeWidthState);
        }
```
## Change characters size

```javascript
    var charHW = 70;  // default value, globally accessible to Hanziwriter function
    var slider2 = document.getElementById("charHWId");
    slider2.oninput = function () {
     ...
     ...
      
      if (charHWState == null) {
            charHWState = 70;   // default value, change it to desired value.
            charHW = charHWState;
            Persistence.setItem("charHW_per", charHWState);
        }
```

## To change background, color of buttons etc, change in card.css file (Styling)
To add background, add _ _background.png_ file to collection.media folder in Ankidroid then add this to .card in Styling
### Card Background
```css
background : url(_background.png); 
```
```css
.card {
	font-family: arial;
	font-size: 20px;
	text-align: center;
	color: black;
	background-color: white;
}
```
Also grid background can be changed like above.
### Grid color / background
```css
.grid-color{
 background-color: #FAFAFA;
}
```

### Button icon color and size
```css
.icon {
	margin: 3px;
	position: relative;
	display: inline-block;
	color: white;
	background-color: #00BCD4;
	width: 2.0rem;
	height: 2.0rem;
	border-radius: 8px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
	transition: all 0.3s ease;
}

.icon .material-icons {
	font-size: 1.0rem;
	position: absolute;
	left: 0.5rem;
	top: 0.5rem;
	transition: all 0.3s ease;
}

.icon:hover,
.icon:focus {
	background-color: #00ACC1;
}
```
### Sidebar color
```css
.sidebar {
  height: 100%;
  width: 0;
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
  color: white;
  background-color: #455A64;
  overflow-x: hidden;
  transition: 0.5s;
  padding-top: 60px;

}
```

### Code with default settings in card.html 
[card.html](https://github.com/infinyte7/Anki-xiehanzi/blob/master/version%201.2/card.html)
[card.css](https://github.com/infinyte7/Anki-xiehanzi/blob/master/version%201.2/card.css)
