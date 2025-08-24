/**
 * Anki-xiehanzi
 * Copyright (C) 2024 krmanik
 * https://github.com/krmanik/Anki-xiehanzi
 * This code is licensed under the GPL-3.0 License. Full license text is available in the LICENSE file.
 */

import "primereact/resources/themes/lara-light-cyan/theme.css";

import Chinese from "chinese-s2t";
import pinyin from "chinese-to-pinyin";
import { Deck, Model, Package } from "genanki-js";
import init, {cut} from 'jieba-wasm';
import { PrimeReactProvider } from "primereact/api";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { FileUpload, FileUploadUploadEvent } from "primereact/fileupload";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Toolbar } from "primereact/toolbar";
import React, { useEffect, useRef, useState } from "react";
import { RiCloseCircleFill } from "react-icons/ri";
import initSqlJs from "sql.js";

import Layout from "@theme/Layout";

import CONSTANTS from "../dict/contants";
import DICT from "../dict/dict";
import pinzhu from "../dict/pinyinzhuyin";
import styles from "./index.module.css";

import EdgeTTSBrowser from "@kingdanx/edge-tts-browser";
import { ProgressBar } from "primereact/progressbar";

let host = "https://krmanik.github.io/Anki-xiehanzi";

export default function CreateDeck(): JSX.Element {
  const [words, setWords] = useState<
    {
      Simplified: string;
      Traditional: string;
      Pinyin: string;
      Zhuyin: string;
      Definitions: string;
      Syllable: string;
    }[]
  >([]);

  const FIELDS = CONSTANTS.FIELDS;

  const [deckName, setDeckName] = React.useState<string>("xiehanzi");
  const [fields, setFields] = React.useState([
    FIELDS.SIMPLIFIED,
    FIELDS.TRADITIONAL,
    FIELDS.PINYIN,
    FIELDS.ZHUYIN,
    FIELDS.DEFINITIONS,
    FIELDS.AUDIO,
  ]);
  const [includeAudio, setIncludeAudio] = React.useState<boolean>(false);
  const [page, setPage] = React.useState<number>(1);
  const [wordValue, setWordValue] = React.useState<string>("");
  const [selectType, setSelectType] = React.useState({ selectType: "Word" });
  const [texAreaValue, setTexAreaValue] = React.useState<string>("");
  const [db, setDb] = useState(null);
  const dt = useRef(null);
  const [progressbarValue, setProgressbarValue] = useState(0);

  const exportCSV = (selectionOnly) => {
    dt.current.exportCSV({ selectionOnly });
  };

  const prevNextButtonText = [
    "",
    "Create Card Types",
    "Input Chinese Characters",
  ];

  const selectionTypes = [
    { selectType: "Word" },
    { selectType: "Paragraph" },
    { selectType: "File" },
  ];

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.id;
    if (e.target.checked) {
      setFields([...fields, id]);
    } else {
      setFields(fields.filter((field) => field !== id));
    }
  };

  // Effect to sync Audio field with includeAudio checkbox
  useEffect(() => {
    if (includeAudio && !fields.includes(FIELDS.AUDIO)) {
      setFields([...fields, FIELDS.AUDIO]);
    } else if (!includeAudio && fields.includes(FIELDS.AUDIO)) {
      setFields(fields.filter((field) => field !== FIELDS.AUDIO));
    }
  }, [includeAudio]);

  const fieldsArray = [
    { id: FIELDS.SIMPLIFIED, label: "Simplified" },
    { id: FIELDS.TRADITIONAL, label: "Traditional" },
    { id: FIELDS.PINYIN, label: "Pinyin" },
    { id: FIELDS.ZHUYIN, label: "Zhuyin" },
    { id: FIELDS.DEFINITIONS, label: "English Definitions" },
    { id: FIELDS.AUDIO, label: "Audio" },
  ];

  const additionalComponents = [
    // { id: 'coloredHanzi', label: 'Colored Hanzi' },
    { id: "writingComponent", label: "Writing Component" },
  ];

  const [activeTab, setActiveTab] = useState(0);
  const [tabs, setTabs] = useState(["Card 1"]);
  const [tabContent, setTabContent] = useState({
    "Card 1": { front: [], back: [], additional: [] },
  });

  const handleTabClick = (index) => {
    setActiveTab(index);
  };

  const handleAddTab = () => {
    const newTabNumber = findNextTabNumber();

    const newTabName = `Card ${newTabNumber}`;
    const newTabs = [...tabs, newTabName];

    setTabs(newTabs);

    setTabContent({
      ...tabContent,
      [newTabName]: { front: [], back: [], additional: [] },
    });

    setActiveTab(newTabs.length - 1);
  };

  const handleCloseTab = (index) => {
    const newTabs = tabs.filter((tab, i) => i !== index);
    setTabs(newTabs);

    const newTabContent = { ...tabContent };
    delete newTabContent[tabs[index]];
    setTabContent(newTabContent);

    setActiveTab(0);
  };

  const findNextTabNumber = () => {
    let nextTabNumber = 1;
    while (tabs.includes(`Card ${nextTabNumber}`)) {
      nextTabNumber++;
    }
    return nextTabNumber;
  };

  const handleCheckboxChange = (fieldId, side) => {
    const currentTab = tabs[activeTab];
    const currentTabContent = { ...tabContent[currentTab] };

    const isChecked = currentTabContent[side].includes(fieldId);

    if (isChecked) {
      currentTabContent[side] = currentTabContent[side].filter(
        (id) => id !== fieldId
      );
    } else {
      currentTabContent[side] = [...currentTabContent[side], fieldId];
    }

    setTabContent({
      ...tabContent,
      [currentTab]: currentTabContent,
    });
  };

  function decodeHtmlEntities(input) {
    const htmlEntityRegex = /&#(\d+);|&([^;]+);/g;
    const entityMappings = {
      772: "̄",
      769: "́",
      780: "̌",
      768: "̀",
      nbsp: " ",
      uuml: "ü",
    };

    function replaceEntity(match, decimal, named) {
      if (decimal) {
        if (entityMappings.hasOwnProperty(decimal)) {
          return entityMappings[decimal];
        } else {
          return match;
        }
      } else if (named) {
        if (entityMappings.hasOwnProperty(named)) {
          return entityMappings[named];
        } else {
          return match;
        }
      }
    }

    const decodedText = input.replace(htmlEntityRegex, replaceEntity);
    return decodedText;
  }

  const fetchMeaningGoogleTranslate = async (word) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en-US&dt=t&q=${word.trim()}`;
    const response = await fetch(url);
    const data = await response.json();

    let simplified = word.trim();
    let traditional = Chinese.s2t(word.trim());

    let pin = pinyin(word.trim(), { toneToNumber: true });
    pin = pin.replace(/0/g, "5");

    // replace v3 with u:3
    pin = pin.replace(/v/g, "u:");

    let pizh = await pinzhu.pinyinAndZhuyin(pin, "", "");

    let pinyin1 = [decodeHtmlEntities(pizh[1])];
    let zhuyin1 = [decodeHtmlEntities(pizh[2])];
    let syllable1 = [pin];
    let definitions1 = [data[0][0][0]];

    return {
      Simplified: simplified,
      Traditional: traditional,
      Pinyin: pinyin1,
      Zhuyin: zhuyin1,
      Definitions: definitions1,
      Syllable: syllable1,
    };
  };

  const searchAndAdd = async (word) => {
    let res = DICT.search(word);
    let result = await DICT.makeHtml(res, true);

    if (words.some((w) => w.Simplified === word.trim())) {
      return;
    }

    let Pinyin = [];
    let Zhuyin = [];
    let Syllable = [];
    let Definitions = [];
    let doNotAdd = [];

    for (let res of result) {
      if (res.simplified == result[0].simplified) {
        if (word.trim() !== result[0].simplified) {
          doNotAdd.push(word.trim());
        } else {
          Pinyin.push(decodeHtmlEntities(res.pinyin));
          Zhuyin.push(decodeHtmlEntities(res.zhuyin));
          Syllable.push(res.syllable);
          Definitions.push(res.definitions);
        }
      }
    }

    if (doNotAdd.includes(word.trim())) {
      const fetchedMeaning = await fetchMeaningGoogleTranslate(word);

      result[0].simplified = fetchedMeaning.Simplified;
      result[0].traditional = fetchedMeaning.Traditional;

      Pinyin = fetchedMeaning.Pinyin;
      Zhuyin = fetchedMeaning.Zhuyin;
      Syllable = fetchedMeaning.Syllable;
      Definitions = fetchedMeaning.Definitions;
    }

    setWords([
      ...words,
      {
        Simplified: result[0].simplified,
        Traditional: result[0].traditional,
        Pinyin: Pinyin.join(", "),
        Zhuyin: Zhuyin.join(", "),
        Definitions: Definitions.join(" │ "),
        Syllable: Syllable.join(", "),
      },
    ]);
  };

  const [selectWord, setSelectWord] = useState(null);
  const [rowClick, setRowClick] = useState(true);

  useEffect(() => {    
    DICT.loadDict();
    setupSql();
    init(
      `${host}/data/jieba_rs_wasm_bg.wasm`
    );
  }, []);

  const setupSql = async () => {
    try {
      const SQL = await initSqlJs({
        locateFile: (filename) =>
          `${host}/data/sql-wasm.wasm`,
      });
      let db = new SQL.Database();
      setDb(db);
      console.log("SQL DB loaded...");
    } catch (err) {
      console.log(err);
    }
  };

  const generateWords = async (event) => {
    let file = event.files[0];
    let reader = new FileReader();

    reader.onload = async (e) => {
      let text = reader.result as string;
      const lines = text.split("\n");

      let _words = [];
      let doNotAdd = [];

      for (let line of lines) {
        let res = DICT.search(line);
        let result = await DICT.makeHtml(res, true);
        let Pinyin = [];
        let Zhuyin = [];
        let Syllable = [];
        let Definitions = [];

        for (let res of result) {
          if (res.simplified == result[0].simplified) {
            if (line.trim() !== result[0].simplified) {
              doNotAdd.push(line.trim());
            } else {
              Pinyin.push(decodeHtmlEntities(res.pinyin));
              Zhuyin.push(decodeHtmlEntities(res.zhuyin));
              Syllable.push(res.syllable);
              Definitions.push(res.definitions);
            }
          }
        }

        if (words.some((w) => w.Simplified === line.trim())) {
          continue;
        }

        if (_words.some((w) => w.Simplified === line.trim())) {
          continue;
        }

        if (doNotAdd.includes(line.trim())) {
          const fetchedMeaning = await fetchMeaningGoogleTranslate(line.trim());

          result[0].simplified = fetchedMeaning.Simplified;
          result[0].traditional = fetchedMeaning.Traditional;

          Pinyin = fetchedMeaning.Pinyin;
          Zhuyin = fetchedMeaning.Zhuyin;
          Syllable = fetchedMeaning.Syllable;
          Definitions = fetchedMeaning.Definitions;
        }

        _words.push({
          Simplified: result[0].simplified,
          Traditional: result[0].traditional,
          Pinyin: Pinyin.join(", "),
          Zhuyin: Zhuyin.join(", "),
          Definitions: Definitions.join(" │ "),
          Syllable: Syllable.join(", "),
        });
      }

      setWords([...words, ..._words]);

      // not react way but for now use this
      document
        .querySelector(".p-fileupload-file-badge")
        .classList.remove("p-badge-warning");
      document.querySelector(".p-fileupload-file-badge").innerHTML =
        "Completed";
      document
        .querySelector(".p-fileupload-file-badge")
        .classList.add("p-badge-success");
    };

    reader.readAsText(file);
  };

  function deleteSelectedWord(): void {
    if (!selectWord) {
      return;
    }

    let _words = words.filter((val) => !selectWord.includes(val));
    setWords(_words);
    setSelectWord(null);
  }

  function cancelSelection(): void {
    setSelectWord(null);
  }

  function filterChineseWords(array) {
    const chineseRegex = /[\u4e00-\u9fa5]/;
    const chineseWords = array.filter((word) => chineseRegex.test(word));
    return chineseWords;
  }

  async function generateFromParagraph(e) {
    let text = texAreaValue;
    let _words = [];

    let cutWords = cut(text, true);
    cutWords = filterChineseWords(cutWords);
    cutWords = [...new Set(cutWords)];

    for (let word of cutWords) {
      let res = DICT.search(word);
      let result = await DICT.makeHtml(res, true);

      let Pinyin = [];
      let Zhuyin = [];
      let Syllable = [];
      let Definitions = [];
      let doNotAdd = [];

      for (let res of result) {
        if (res.simplified == result[0].simplified) {
          if (word.trim() !== result[0].simplified) {
            doNotAdd.push(word.trim());
          } else {
            Pinyin.push(decodeHtmlEntities(res.pinyin));
            Zhuyin.push(decodeHtmlEntities(res.zhuyin));
            Syllable.push(res.syllable);
            Definitions.push(res.definitions);
          }
        }
      }

      if (words.some((w) => w.Simplified === word.trim())) {
        continue;
      }

      if (doNotAdd.includes(word.trim())) {
        const fetchedMeaning = await fetchMeaningGoogleTranslate(word.trim());

        result[0].simplified = fetchedMeaning.Simplified;
        result[0].traditional = fetchedMeaning.Traditional;

        Pinyin = fetchedMeaning.Pinyin;
        Zhuyin = fetchedMeaning.Zhuyin;
        Syllable = fetchedMeaning.Syllable;
        Definitions = fetchedMeaning.Definitions;
      }

      _words.push({
        Simplified: result[0].simplified,
        Traditional: result[0].traditional,
        Pinyin: Pinyin.join(", "),
        Zhuyin: Zhuyin.join(", "),
        Definitions: Definitions.join(" │ "),
        Syllable: Syllable.join(", "),
      });
    }

    setWords([...words, ..._words]);
  }

  async function generateDeck(e) {
    setProgressbarValue(0); // Reset progress bar
    
    let flds = [];
    let req = [];
    let tmpls = [];

    // Filter out Audio field if includeAudio is false
    const filteredFields = includeAudio ? fields : fields.filter(f => f !== FIELDS.AUDIO);
    
    filteredFields.forEach((f, i) => {
      flds.push({ name: f });
    });

    let ri = 0;
    for (let card in tabContent) {
      req.push([ri, "any", [ri]]);
      ri++;

      let hideSimp = true;
      let hideTrad = true;
      let hidePin = true;
      let hideZhu = true;
      let hideDef = true;

      let addToFront = [];

      for (let front of tabContent[card]["front"]) {
        if (front.includes("Simplified")) {
          hideSimp = false;
        }
        if (front.includes("Traditional")) {
          hideTrad = false;
        }
        if (front.includes("Pinyin")) {
          hidePin = false;
        }
        if (front.includes("Zhuyin")) {
          hideZhu = false;
        }
        if (front.includes("Definitions")) {
          hideDef = false;
        }
      }

      // TODO-remove redundant code, used for creating in order
      if (!hideSimp) {
        addToFront.push(
          `<div id="char_sim" class="char-card">{{Simplified}}</div>`
        );
      }

      if (!hideTrad) {
        addToFront.push(
          `<div id="char_trad" class="char-card">{{Traditional}}</div>`
        );
      }

      if (!hidePin) {
        addToFront.push(`<div id="char_pinyin">{{Pinyin}}</div>`);
      }

      if (!hideZhu) {
        addToFront.push(`<div id="char_zhuyin">{{Zhuyin}}</div>`);
      }

      let hides = [];
      if (!hideDef) {
        if (hideSimp) hides.push("char_sim");
        if (hideTrad) hides.push("char_trad");
        if (hidePin) hides.push("char_pinyin");
        if (hideZhu) hides.push("char_zhuyin");

        addToFront.push(
          `<div id="char_meaning" class="meaning-card">{{Definitions}}</div>`
        );
      }

      let hideScript = `
<script>
var hideList = ['${hides.join("', '")}'];

function showHide(type, isShow, style = "inline") {
    if (isShow) {
        document.querySelectorAll(type).forEach(function (val) {
            val.style.display = style;
        });
    } else {
        document.querySelectorAll(type).forEach(function (val) {
            val.style.display = 'none';
        });
    }
}

for (var _hide of hideList) {
    var el = document.getElementById(_hide);
    if (el) {
        el.style.display = "none";
    }

    if (_hide == "char_pinyin") {
        showHide(".pinyin", false);
    }
    if (_hide == "char_zhuyin") {
        showHide(".zhuyin", false);
    }
    if (_hide == "char_sim") {
        showHide("#char-sim-id", false);
    }
    if (_hide == "char_trad") {
        showHide("#char-trad-id", false);
        showHide(".sep", false);
    }
}
</script>`;

      hideScript = hideDef ? "" : hideScript;

      let QFMT = addToFront.join("\n") + hideScript + CONSTANTS.DECK_HTML_FRONT;
      
      // Create dynamic back template based on includeAudio setting
      let AFMT = CONSTANTS.DECK_HTML_BACK;
      if (!includeAudio) {
        // Remove audio div and play button if audio is not included
        AFMT = AFMT.replace(`<div id='audio' style='display:none'>{{Audio}}</div>`, '');
        AFMT = AFMT.replace(`    <a class="btn" id='btnPlayAudio'>
        <div class="icon">
            <i class="material-icons">play_arrow</i>
        </div>
    </a>`, '');
      }

      if (tabContent[card]["additional"].includes("writingComponent")) {
        QFMT = CONSTANTS.DECK_HTML_WITH_HANZI_WRITER;

        if (!includeAudio) {
          // Adjust QFMT and AFMT if audio is not included
          QFMT = QFMT.replace(`<div id='audio' style='display:none'>{{Audio}}</div>`, '');
          QFMT = QFMT.replace(`    <a class="btn" id='btnPlayAudio'>
        <div class="icon"><i class="material-icons">play_arrow</i></div>
    </a>`, '');
        }
        
        // console.log(QFMT)

        AFMT = `<div id="back">{{FrontSide}}</div>`;
      }

      tmpls.push({
        name: card,
        qfmt: QFMT,
        afmt: AFMT,
      });
    }

    // const modelId = Math.floor(Math.random() * (1 << 30) + (1 << 30));

    const m = new Model({
      name: includeAudio ? "Basic - (Anki-xiehanzi)" : "Basic - (Anki-xiehanzi) - No Audio",
      id: "1969669503",
      flds: flds,
      css: CONSTANTS.DECK_CSS,
      req: req,
      tmpls: tmpls,
    });

    const deckId = Math.floor(Math.random() * (1 << 30) + (1 << 30));
    const d = new Deck(deckId, deckName);

    words.forEach((word) => {
      let Simplified = word.Simplified;
      let Traditional = word.Traditional;
      let Pinyin = word.Pinyin;
      let Zhuyin = word.Zhuyin;
      let Definitions = word.Definitions;

      let note = [];

      flds.some(function (obj) {
        if (JSON.stringify(obj) === JSON.stringify({ name: "Simplified" })) {
          note.push(Simplified);
        }
        if (JSON.stringify(obj) === JSON.stringify({ name: "Traditional" })) {
          note.push(`〔${Traditional}〕`);
        }
        if (JSON.stringify(obj) === JSON.stringify({ name: "Pinyin" })) {
          note.push(Pinyin);
        }
        if (JSON.stringify(obj) === JSON.stringify({ name: "Zhuyin" })) {
          note.push(Zhuyin);
        }
        if (JSON.stringify(obj) === JSON.stringify({ name: "Definitions" })) {
          let pin = Pinyin.split(", ");
          let zhu = Zhuyin.split(", ");
          let def = Definitions.split(" │ ");
          let definition = [];

          let syllable = word.Syllable;
          let syllableSp = syllable.split(", ");

          for (let i = 0; i < pin.length; i++) {
            let sp = syllableSp[i].split(" ");
            let simp = "";
            let trad = "";
            let simpSp = Simplified.split("");
            let tradSp = Traditional.split("");

            sp.forEach((k, j) => {
              simp += `<span class="char-tone${k[k.length - 1]}">${
                simpSp[j]
              }</span>`;
              trad += `<span class="char-tone${k[k.length - 1]}">${
                tradSp[j]
              }</span>`;
            });

            let html = `<div class="meaning-container">
    <div class="char">
        <span id="char-sim-id">${simp}</span>
        <span class="sep">〔</span>
            <span id="char-trad-id">${trad}</span>
        <span class="sep">〕</span>
        </span>
    </div>
    <div class="pinyin">${pin[i]}</div>
    <div class="zhuyin">${zhu[i]}</div>
    <div class="meaning">${def[i]}</div>
</div>`;
            definition.push(html);
          }

          note.push(definition.join("\n"));
        }
        if (JSON.stringify(obj) === JSON.stringify({ name: "Audio" })) {
          note.push(`[sound:cmn-${Simplified}.mp3]`);
        }
      });

      d.addNote(m.note(note));
    });

    const p = new Package();
    await setupSql();
    p.setSqlJs(db);
    p.addDeck(d);

    const mediaFiles = [
      "_MaterialIcons-Regular.woff2",
      "_characterpop.svg",
      "_hanzicraft.png",
      "_pleco.png",
      "_rtega.png",
      "_youdao.png",
      "_tatoeba.png",
    ];

    const fetchFile = async (file) => {
      const response = await fetch(`https://krmanik.github.io/Anki-xiehanzi/img/${file}`);
      if (!response.ok) {
        return null;
      }

      progress += 1;
      setProgressbarValue((progress / total) * 100);

      return response.blob();
    };

    const wordFiles = words.map((word) => word.Simplified);

    let progress = 0;
    let total = mediaFiles.length + (includeAudio ? wordFiles.length : 0);

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const fetchAudio = async (word) => {
      const tts = new EdgeTTSBrowser();
      tts.tts.setVoiceParams({
        text: word,
        voice: "zh-CN-XiaoxiaoNeural"
      });
      
      const fileName = `cmn-${word}.mp3`;
      const blob = await tts.ttsToFile(fileName);
      progress += 1;
      setProgressbarValue((progress / total) * 100);
      // random delay value
      const randomDelay = Math.floor(Math.random() * 1000) + 500; // 500ms to 1500ms
      await delay(randomDelay);
      return blob;
    };

    const batchSize = 4;
    const fetchBatch = async (batch) => {
      const blobs = await Promise.all(batch.map(fetchAudio));
      blobs.forEach((blob, index) => {
        p.addMedia(blob, `cmn-${batch[index]}.mp3`);
      });
    };

    const processWordsSequentially = async (wordFiles) => {
      const totalBatches = Math.ceil(wordFiles.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = start + batchSize;
        const currentBatch = wordFiles.slice(start, end);

        await fetchBatch(currentBatch);
      }
    };

    // Only process audio if includeAudio is true
    if (includeAudio) {
      await processWordsSequentially(wordFiles);
    }

    // sidebar icons
    Promise.all(mediaFiles.map(fetchFile))
      .then((blobs) => {
        blobs.forEach((blob, index) => {
          if (blob) {
            p.addMedia(blob, mediaFiles[index]);
          }
        });
      })
      .catch((error) => {
        console.error("Error fetching or adding media:", error);
      })
      .finally(async () => {
        p.writeToFile(`${deckName}.apkg`);
        setProgressbarValue(100); // Complete the progress bar
        setTimeout(() => setProgressbarValue(0), 2000); // Reset after 2 seconds
      });
  }

  return (
    <Layout>
      <PrimeReactProvider>
        <section>
          <h1>Create Deck</h1>

          {page === 1 && (
            <div>
              <h2 className={styles.mt}>Enter Deck Title</h2>
              <InputText
                type="text"
                placeholder="Text input"
                onChange={(e) => setDeckName(e.target.value)}
                style={{ width: "60%" }}
                value={deckName}
              ></InputText>

              <h2 className={styles.mt}>Audio Settings</h2>
              <div>
                <input
                  type="checkbox"
                  id="includeAudio"
                  checked={includeAudio}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                />
                <label htmlFor="includeAudio" style={{ marginLeft: "8px" }}>
                  Include Audio (Text-to-Speech)
                </label>
                <div style={{ marginTop: "8px", fontSize: "0.9em", color: "#666" }}>
                  {includeAudio 
                    ? "⚠️ Audio generation may take longer and requires internet connection" 
                    : "Audio files will not be generated for faster deck creation"
                  }
                </div>
              </div>

              <h2 className={styles.mt}>Create Card Types</h2>
              <div>
                <ul className="tabs">
                  {tabs.map((tab, index) => (
                    <li
                      key={index}
                      className={`${styles.tabs__item} tabs__item ${
                        activeTab === index ? "tabs__item--active" : ""
                      }`}
                      onClick={() => handleTabClick(index)}
                    >
                      {tab}
                      <span
                        onClick={() => handleCloseTab(index)}
                        style={{ margin: "3px 10px 0px" }}
                      >
                        {" "}
                        <RiCloseCircleFill />{" "}
                      </span>
                    </li>
                  ))}
                  <li
                    className={`${styles.tabs__item_add} tabs__item tabs__item--add`}
                    onClick={handleAddTab}
                  >
                    +
                  </li>
                </ul>

                <div className={styles.tab_content}>
                  {tabContent[tabs[activeTab]] && (
                    <div>
                      <h3 className={styles.mt}>Front Side</h3>
                      <div>
                        {fieldsArray.map((field, index) => {
                          if (fields.includes(field.id)) {
                            let id = `front${field.id}`;
                            return (
                              <div key={index}>
                                <input
                                  type="checkbox"
                                  id={id}
                                  onChange={() =>
                                    handleCheckboxChange(id, "front")
                                  }
                                  checked={tabContent[
                                    tabs[activeTab]
                                  ].front.includes(id)}
                                ></input>
                                <label htmlFor={id}>{field.label}</label>
                              </div>
                            );
                          }
                        })}
                      </div>

                      <h3 className={styles.mt}>Back Side</h3>
                      <div>
                        <Message
                          severity="info"
                          text={`
                                            All fields are available in back side, use side bar during deck review
                                            and turn off the fields you don't want to see.
                                            `}
                        />
                      </div>

                      <h3 className={styles.mt}>Additional Components</h3>
                      <div>
                        {additionalComponents.map((component, index) => (
                          <div key={index}>
                            <input
                              type="checkbox"
                              id={component.id}
                              onChange={() =>
                                handleCheckboxChange(component.id, "additional")
                              }
                              checked={tabContent[
                                tabs[activeTab]
                              ].additional.includes(component.id)}
                            ></input>
                            <label htmlFor={component.id}>
                              {component.label}
                            </label>
                          </div>
                        ))}
                      </div>

                      {/* <h3 className={styles.mt}>Preview</h3>
                                            <div>
                                                <div className={styles.card_preview}>
                                                    <div className={styles.card_preview__front}>
                                                        {tabContent[tabs[activeTab]].front.map((field, index) => (
                                                            <div key={index}>
                                                                <p>{field}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className={styles.card_preview__back}>
                                                        {tabContent[tabs[activeTab]].back.map((field, index) => (
                                                            <div key={index}>
                                                                <p>{field}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div> */}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {page === 2 && (
            <div>
              <h2>Enter Chinese Characters</h2>

              <div className={`${styles.select_type}`}>
                <span className="p-float-label w-full md:w-14rem">
                  <Dropdown
                    inputId="select-type"
                    value={selectType}
                    onChange={(e) => setSelectType(e.target.value)}
                    options={selectionTypes}
                    optionLabel="selectType"
                    className="w-full"
                  />
                </span>
              </div>

              {selectType.selectType === "Word" && (
                <div className={styles.select_type}>
                  <InputText
                    value={wordValue}
                    onChange={(e) => setWordValue(e.target.value)}
                    style={{ width: "60%", marginRight: "20px" }}
                  />
                  <Button
                    onClick={() => {
                      searchAndAdd(wordValue);
                    }}
                  >
                    Add
                  </Button>
                </div>
              )}

              {selectType.selectType === "File" && (
                <div className={styles.select_type}>
                  <FileUpload
                    name="words[]"
                    customUpload
                    uploadHandler={generateWords}
                    accept="text/*"
                    maxFileSize={1000000}
                    uploadLabel="Generate"
                    emptyTemplate={
                      <p className="m-0">
                        Drag and drop files to here to generate.
                      </p>
                    }
                  />
                </div>
              )}

              {selectType.selectType === "Paragraph" && (
                <div className={styles.select_type}>
                  <InputTextarea
                    value={texAreaValue}
                    onChange={(e) => setTexAreaValue(e.target.value)}
                    rows={5}
                    style={{ width: "100%" }}
                  />

                  <div>
                    <Button onClick={generateFromParagraph}>Generate</Button>
                  </div>
                </div>
              )}

              <ProgressBar 
                value={progressbarValue.toFixed(2)}
                displayValueTemplate={() => 
                  progressbarValue > 0 
                    ? `${progressbarValue.toFixed(1)}% - ${includeAudio ? 'Processing audio...' : 'Processing...'}`
                    : includeAudio ? 'Ready to generate (includes audio)' : 'Ready to generate (no audio)'
                }
              ></ProgressBar>

              <div className={`${styles.button_bar}`}>
                <Toolbar
                  start={
                    <React.Fragment>
                      <Button
                        className={`${styles.mr_2} mr-2`}
                        label="Delete"
                        onClick={deleteSelectedWord}
                      />
                      <Button
                        className={`${styles.mr_2} mr-2`}
                        label="Cancel"
                        onClick={cancelSelection}
                      />
                    </React.Fragment>
                  }
                  end={
                    <React.Fragment>
                      <Button
                        className={`${styles.mr_2} mr-2`}
                        label="Export CSV"
                        onClick={exportCSV}
                      />
                      <Button
                        className={`${styles.mr_2} mr-2`}
                        label="Generate Deck"
                        onClick={generateDeck}
                      />
                    </React.Fragment>
                  }
                />
              </div>

              <DataTable
                ref={dt}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25, 50, 100, 500]}
                selectionMode={rowClick ? null : "radiobutton"}
                selection={selectWord}
                onSelectionChange={(e) => setSelectWord(e.value)}
                value={words}
                tableStyle={{ minWidth: "60rem" }}
              >
                <Column
                  selectionMode="multiple"
                  headerStyle={{ width: "3rem" }}
                ></Column>

                {fields.map(
                  (field, index) =>
                    (field == FIELDS.SIMPLIFIED && (
                      <Column key={field} field={field} header={field}></Column>
                    )) ||
                    (field == FIELDS.TRADITIONAL && (
                      <Column field={field} header={field}></Column>
                    )) ||
                    (field == FIELDS.PINYIN && (
                      <Column field={field} header={field}></Column>
                    )) ||
                    (field == FIELDS.ZHUYIN && (
                      <Column field={field} header={field}></Column>
                    )) ||
                    (field == FIELDS.DEFINITIONS && (
                      <Column
                        field={field}
                        header={field}
                        headerStyle={{ width: "50rem" }}
                      ></Column>
                    ))
                )}
              </DataTable>
            </div>
          )}

          <nav className="pagination-nav docusaurus-mt-lg docusaurus-mb-lg">
            {page > 1 ? (
              <div
                className="pagination-nav__item"
                onClick={() => setPage(page - 1)}
              >
                <a className="pagination-nav__link" href="#url">
                  <div className="pagination-nav__sublabel">Previous</div>
                  <div className="pagination-nav__label">
                    {prevNextButtonText[page - 1]}
                  </div>
                </a>
              </div>
            ) : (
              <div></div>
            )}

            {page < 2 ? (
              <div
                className="pagination-nav__item pagination-nav__item--next"
                onClick={() => setPage(page + 1)}
              >
                <a className="pagination-nav__link" href="#url">
                  <div className="pagination-nav__sublabel">Next</div>
                  <div className="pagination-nav__label">
                    {prevNextButtonText[page + 1]}
                  </div>
                </a>
              </div>
            ) : (
              <div></div>
            )}
          </nav>
        </section>
      </PrimeReactProvider>
    </Layout>
  );
}
