---
sidebar_position: 3
---

# Add More Info Button

In right side bar there are following links added for viewing more info about the characters.

To add more links to the sidebar, follow the steps below.

1. Open the notes of the deck in Edit mode
2. Select back card template 
3. Add links in `<div id="more-info-sidebar" class="more-info-sidebar">`

For Pleco, following HTML used.
```html
    <a class="fieldset-item" id="plecoMobile" href="plecoapi://x-callback-url/df?hw={{Simplified}}">
        <img src="_pleco.png"></img>
        <small>Pleco</small>
    </a>
```

Similarly, change image source, href and title for other links.
