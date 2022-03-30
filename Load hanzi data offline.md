# Loading data into ankidroid from localhost created in android devices. (For offline usage)

1. Use [this app](https://github.com/krmanik/AndroidWebServer) to create localhost on android devices, other app can also be used for this but cors must be allowed in header of HTTP request otherwise you will get [this error](https://github.com/ankidroid/Anki-Android/issues/5884). <br>Also [check this](https://github.com/ankidroid/Anki-Android/pull/5890). 

This features will be available in ankidroid [2.10 version](https://github.com/ankidroid/Anki-Android/releases).

2. Copy the data folder of [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) to directory of localhost.

3. In anki deck of xiehanzi change url to following. It will be more convient to change this on anki desktop.
<br><b>from</b>
```
https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/
```
<b>to</b>
```
http://127.0.0.1:8080/data/
```
![Alt Image](https://github.com/krmanik/Anki-xiehanzi/blob/master/image/change_url.png)

<b> The utility of this is to load data from locally, like offline scenario. </b>

![Alt Image](https://github.com/krmanik/Anki-xiehanzi/blob/master/image/copy_to_dir.png)

## Disclaimer 
Check [License](https://github.com/krmanik/Anki-xiehanzi/blob/master/License.md) file.
