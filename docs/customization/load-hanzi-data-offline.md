---
sidebar_position: 5
---

# Load Hanzi Data Offline

The [Hanzi writer](https://github.com/chanind/hanzi-writer-data) data can be served from localhost to use it as offline. 

Then in front side of `Card 5` change the url to the localhost.

```js
// var url_hanzi = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/";

var url_hanzi = "http://localhost:8080/data/";
```