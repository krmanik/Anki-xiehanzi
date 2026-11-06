---
title: Send to Anki
---

<script>
	import { base } from '$app/paths';
</script>

# Send to Anki

**Send to Anki** puts a deck straight into Anki on your computer. You don't need to download or import a file. It goes through **AnkiConnect**, a free Anki add-on. You set it up once.

Works with **Anki on a computer** (Windows, Mac, Linux). Phones can't receive a send. Send on your computer, then sync to AnkiWeb, and your phone gets the deck on its next sync.

## 1. Install AnkiConnect

1. Open Anki on your computer.
2. Go to **Tools → Add-ons → Get Add-ons…**
3. Paste the code **`2055492159`** and click **OK**.
4. **Restart Anki.**

## 2. Allow this site, once

Keep Anki open, then press **Send to Anki** on <a href="{base}/create">Create</a> or the <a href="{base}/hsk">HSK page</a>. Two prompts may appear the first time:

1. **Your browser** asks whether this site may reach apps on your computer. Click **Allow**.
2. **Anki** asks whether `https://krmanik.github.io` may use AnkiConnect. Click **Yes**.

Both choices are remembered, so later sends go straight through.

## 3. Send

Pick a deck, or type a new name, then **Confirm and send**. If a word is already in your collection, it gets updated where it is, and its reviews are kept. New words go into the deck you picked.

## "Could not reach Anki"

Work down this list and press **Try again** after each fix:

| Check | Fix |
| --- | --- |
| Is Anki open? | Open it. Anki has to be running during the send. |
| Is AnkiConnect installed? | It should be under **Tools → Add-ons**. If not, follow step 1 and restart Anki. |
| Did your browser block it? | Click the icon left of the address bar → **Site settings**. Allow access to apps or devices on this computer (sometimes called *local network access*), then reload the page. |
| Did you click **No** in Anki? | See *Allow the site by hand* below. |
| Is something else using port 8765? | Open <a href="http://127.0.0.1:8765" target="_blank" rel="noopener">127.0.0.1:8765</a>. It should say `AnkiConnect`. If you see a different page or an error, quit the other program, or restart your computer. |
| Mac: Anki was in the background? | macOS can pause background apps. Bring Anki to the front, or run the command below once. |
| Safari or Brave? | Try Chrome, Edge or Firefox. Brave's Shields can block it (turn Shields off for this site). |

### Allow the site by hand

1. In Anki: **Tools → Add-ons**, select **AnkiConnect**, click **Config**.
2. Add the site to `webCorsOriginList`:

   ```json
   "webCorsOriginList": [
       "http://localhost",
       "https://krmanik.github.io"
   ]
   ```

3. If `ignoreOriginList` lists `https://krmanik.github.io`, delete that entry. It's there if you ticked "ignore further requests" earlier.
4. Leave `apiKey` as `null`. This site doesn't support an API key yet.
5. Click **OK**, then **restart Anki**.

### Stop macOS pausing Anki

Run this in **Terminal** once, then restart Anki:

```bash
defaults write net.ankiweb.dtop NSAppSleepDisabled -bool true
defaults write net.ichi2.anki NSAppSleepDisabled -bool true
defaults write org.qt-project.Qt.QtWebEngineCore NSAppSleepDisabled -bool true
```

## Other messages

- **Anki said no.** You clicked No in Anki. Allow the site by hand (above).
- **AnkiConnect is out of date.** In **Tools → Add-ons**, click **Check for Updates**, then restart Anki.
- **Your AnkiConnect uses an API key.** Set `apiKey` back to `null` in the add-on's Config.

Still stuck? <a href="{base}/create">Download the `.apkg`</a> instead and import it with **File → Import**, or open an issue on [GitHub](https://github.com/krmanik/Anki-xiehanzi/issues).
