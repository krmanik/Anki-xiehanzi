# Loading data into ankidroid from localhost created in android devices. (For offline usage)

Use [this app](https://github.com/infinyte7/AndroidWebServer) to create localhost on android devices, other app can also be used for this but cors must be allowed in header of HTTP request otherwise you will get [this error](https://github.com/ankidroid/Anki-Android/issues/5884). <br>Also [check this](https://github.com/ankidroid/Anki-Android/pull/5890). 

This features will be available in ankidroid [2.10 version](https://github.com/ankidroid/Anki-Android/releases).

Copy the data folder of [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) to directory of localhost.

In anki deck of xiehanzi change url to following. It will be more convient to change this on anki desktop.
<br><b>from</b>
```
https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/
```
<b>to</b>
```
http://127.0.0.1:8080/data/
```
![Alt Image](https://github.com/infinyte7/Anki-xiehanzi/blob/master/image/change_url.png)

<b> The utility of this is to load data from locally, like offline scenario. </b>

![Alt Image](https://github.com/infinyte7/Anki-xiehanzi/blob/master/image/copy_to_dir.png)

## Disclaimer 
Check [License](https://github.com/infinyte7/Anki-xiehanzi/blob/master/License.md) file.
