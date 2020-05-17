### Card.html
#### Note: But before removing button with id, check in javadcript tag also for that button usage.
Read comments in following html

```html
<div id='ch_sim' class="text-color4 ">{{Simplified}}</div>
<div id='ch_trad' class="text-color2">{{Traditional}}</div>
<div id='ch_pin' class="text-color1">{{Pinyin}}</div>
<div id='ch_mean' class="text-color3">{{Meaning}}</div>
<br>
<div id="character-target-div"></div>
<br>
<div id='audio' style='display:none'>{{Audio}}</div>
<div class="modal-footer ">
    <a class="btn" type="button" id="btnShowMenu" onclick="openNav()">
        <div class="icon">
            <i class="material-icons">menu</i>
        </div>
    </a>
    <a class="btn" type="button" id='btnRevealWrite' style='display:none'>
        <div class="icon">
            <i class="material-icons">remove_red_eye</i>
        </div>
    </a>
    <a class="btn" type="button" id='btnRevealChar'>
        <div class="icon">
            <i class="material-icons">gesture</i>
        </div>
    </a>
    <a class="btn" type="button" id='btnShowMean' style='display:none'> 
        <div class="icon">
            <i class="material-icons">flash_auto</i>
        </div>
    </a>
    <a class="btn" type="button" id='btnPlayAudio'>
        <div class="icon">
            <i class="material-icons">play_arrow</i>
        </div>
    </a>
    <a href="plecoapi://x-callback-url/df?hw={{Simplified}}" class="btn" type="button">
        <div class="icon">
            <i class="material-icons">translate</i>
        </div>
    </a>
    <a href="https://hanzicraft.com/character/{{Simplified}}" class="btn" type="button">
        <div class="icon">
            <i class="material-icons">chrome_reader_mode</i>
        </div>
    </a>
    <a class="btn" type="button" id='btnGoNextCard'>
        <div class="icon">
            <i class="material-icons">navigate_next</i>
        </div>
    </a>
</div>
```

## Adding this link as button to above html
```
http://rtega.be/chmn/index.php
```
This link have mnemonics for chinese characters.
```html
    <a href="http://rtega.be/chmn/index.php?c={{Simplified}}" class="btn" type="button">
        <div class="icon">
            <i class="material-icons">find_in_page</i>
        </div>
    </a>
```
So final html

```html
<div id='ch_sim' class="text-color4 ">{{Simplified}}</div>
<div id='ch_trad' class="text-color2">{{Traditional}}</div>
<div id='ch_pin' class="text-color1">{{Pinyin}}</div>
<div id='ch_mean' class="text-color3">{{Meaning}}</div>
<br>
<div id="character-target-div"></div>
<br>
<div id='audio' style='display:none'>{{Audio}}</div>
<div class="modal-footer ">
    <a class="btn" type="button" id="btnShowMenu" onclick="openNav()">
        <div class="icon">
            <i class="material-icons">menu</i>
        </div>
    </a>
    <a class="btn" type="button" id='btnRevealWrite' style='display:none'>
        <div class="icon">
            <i class="material-icons">remove_red_eye</i>
        </div>
    </a>
    <a class="btn" type="button" id='btnRevealChar'>
        <div class="icon">
            <i class="material-icons">gesture</i>
        </div>
    </a>
    <a class="btn" type="button" id='btnShowMean' style='display:none'> 
        <div class="icon">
            <i class="material-icons">flash_auto</i>
        </div>
    </a>
    <!-- can be removed but also check usage in javascript tag-->
    <a class="btn" type="button" id='btnPlayAudio'>
        <div class="icon">
            <i class="material-icons">play_arrow</i>
        </div>
    </a>
    
    <!-- can be removed -->
    <a href="plecoapi://x-callback-url/df?hw={{Simplified}}" class="btn" type="button">
        <div class="icon">
            <i class="material-icons">translate</i>
        </div>
    </a>
    
    <!-- can be removed -->
    <a href="https://hanzicraft.com/character/{{Simplified}}" class="btn" type="button">
        <div class="icon">
            <i class="material-icons">chrome_reader_mode</i>
        </div>
    </a>
    
    <!-- button added here -->
    <a href="http://rtega.be/chmn/index.php?c={{Simplified}}" class="btn" type="button">
        <div class="icon">
            <i class="material-icons">find_in_page</i>
        </div>
    </a>
    
    <a class="btn" type="button" id='btnGoNextCard'>
        <div class="icon">
            <i class="material-icons">navigate_next</i>
        </div>
    </a>
</div>
```
