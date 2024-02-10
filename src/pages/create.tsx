import styles from './index.module.css';

import React, { useEffect, useRef, useState } from "react";
import Layout from '@theme/Layout';
import { RiCloseCircleFill } from "react-icons/ri";
import CONSTANTS from '../dict/contants';
import DICT from '../dict/dict';

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';

import "primereact/resources/themes/lara-light-cyan/theme.css";

import { PrimeReactProvider } from 'primereact/api';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { FileUpload, FileUploadUploadEvent } from 'primereact/fileupload';
import { Toolbar } from 'primereact/toolbar';
import { Model, Deck, Package } from "genanki-js";

import initSqlJs from "sql.js";
import { Message } from 'primereact/message';

import Chinese from 'chinese-s2t';
import pinzhu from '../dict/pinyinzhuyin';

import pinyin from "chinese-to-pinyin";

export default function CreateDeck(): JSX.Element {

    const [words, setWords] = useState<{
        Simplified: string,
        Traditional: string,
        Pinyin: string,
        Zhuyin: string,
        Definitions: string,
        Syllable: string,
    }[]>([]);

    const FIELDS = CONSTANTS.FIELDS;

    const [deckName, setDeckName] = React.useState<string>('xiehanzi');
    const [fields, setFields] = React.useState([
        FIELDS.SIMPLIFIED,
        FIELDS.TRADITIONAL,
        FIELDS.PINYIN,
        FIELDS.ZHUYIN,
        FIELDS.DEFINITIONS,
        FIELDS.AUDIO
    ]);
    const [page, setPage] = React.useState<number>(1);
    const [wordValue, setWordValue] = React.useState<string>('');
    const [selectType, setSelectType] = React.useState({ selectType: 'Word' });
    const [texAreaValue, setTexAreaValue] = React.useState<string>('');
    const [db, setDb] = useState(null);
    const dt = useRef(null);

    const exportCSV = (selectionOnly) => {
        dt.current.exportCSV({ selectionOnly });
    };

    const prevNextButtonText = [
        "",
        "Create Card Types",
        "Input Chinese Characters",
    ];

    const selectionTypes = [
        { selectType: 'Word' },
        { selectType: 'Paragraph' },
        { selectType: 'File' }
    ];

    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const id = e.target.id;
        if (e.target.checked) {
            setFields([...fields, id]);
        } else {
            setFields(fields.filter(field => field !== id));
        }
    }

    const fieldsArray = [
        { id: FIELDS.SIMPLIFIED, label: 'Simplified' },
        { id: FIELDS.TRADITIONAL, label: 'Traditional' },
        { id: FIELDS.PINYIN, label: 'Pinyin' },
        { id: FIELDS.ZHUYIN, label: 'Zhuyin' },
        { id: FIELDS.DEFINITIONS, label: 'English Definitions' },
    ];

    const additionalComponents = [
        // { id: 'coloredHanzi', label: 'Colored Hanzi' },
        { id: 'writingComponent', label: 'Writing Component' },
    ];

    const [activeTab, setActiveTab] = useState(0);
    const [tabs, setTabs] = useState(['Card 1']);
    const [tabContent, setTabContent] = useState({
        'Card 1': { front: [], back: [], additional: [] }
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
            currentTabContent[side] = currentTabContent[side].filter((id) => id !== fieldId);
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
            772: '̄',
            769: '́',
            780: '̌',
            768: '̀',
            nbsp: ' ',
            'uuml': 'ü',
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

    const searchAndAdd = async (word) => {
        let res = DICT.search(word);
        let result = await DICT.makeHtml(res, true);

        if (words.some(w => w.Simplified === result[0].simplified)) {
            return;
        }

        let Pinyin = []
        let Zhuyin = []
        let Syllable = []
        let Definitions = []

        for (let res of result) {
            if (res.simplified == result[0].simplified) {
                Pinyin.push(decodeHtmlEntities(res.pinyin));
                Zhuyin.push(decodeHtmlEntities(res.zhuyin));
                Syllable.push(res.syllable);
                Definitions.push(res.definitions)
            }
        }

        setWords([...words, {
            Simplified: result[0].simplified,
            Traditional: result[0].traditional,
            Pinyin: Pinyin.join(", "),
            Zhuyin: Zhuyin.join(", "),
            Definitions: Definitions.join(" │ "),
            Syllable: Syllable.join(", ")
        }]);
    }

    const [selectWord, setSelectWord] = useState(null);
    const [rowClick, setRowClick] = useState(true);

    useEffect(() => {
        DICT.loadDict();
        setupSql();
    }, []);

    const setupSql = async () => {
        try {
            const SQL = await initSqlJs({
                locateFile: filename => "https://cdn.jsdelivr.net/npm/sql.js/dist/sql-wasm.wasm"
            });
            let db = new SQL.Database();
            setDb(db);
            console.log("db", db);
        } catch (err) {
            console.log(err);
        }
    }

    const generateWords = async (event) => {
        let file = event.files[0];
        let reader = new FileReader();

        reader.onload = async (e) => {
            let text = reader.result as string;
            const lines = text.split('\n');

            let _words = [];
            let doNotAdd = [];

            for (let line of lines) {
                let res = DICT.search(line);
                let result = await DICT.makeHtml(res, true);
                let Pinyin = []
                let Zhuyin = []
                let Syllable = []
                let Definitions = []

                for (let res of result) {
                    if (res.simplified == result[0].simplified) {
                        if (line.trim() !== result[0].simplified) {
                            doNotAdd.push(line.trim());
                        } else {
                            Pinyin.push(decodeHtmlEntities(res.pinyin));
                            Zhuyin.push(decodeHtmlEntities(res.zhuyin));
                            Syllable.push(res.syllable);
                            Definitions.push(res.definitions)
                        }
                    }
                }

                if (words.some(w => w.Simplified === result[0].simplified)) {
                    continue;
                }

                if (doNotAdd.includes(line.trim())) {
                    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en-US&dt=t&q=${line.trim()}`;
                    const response = await fetch(url);
                    const data = await response.json();

                    result[0].simplified = line.trim();
                    result[0].traditional = Chinese.s2t(line.trim());

                    let pin = pinyin(line.trim(), {toneToNumber: true});
                    let pizh = await pinzhu.pinyinAndZhuyin(pin, "", "");

                    Pinyin = [decodeHtmlEntities(pizh[1])];
                    Zhuyin = [decodeHtmlEntities(pizh[2])];
                    Syllable = Pinyin;
                    Definitions.push(data[0][0][0]);
                }

                _words.push({
                    Simplified: result[0].simplified,
                    Traditional: result[0].traditional,
                    Pinyin: Pinyin.join(", "),
                    Zhuyin: Zhuyin.join(", "),
                    Definitions: Definitions.join(" │ "),
                    Syllable: Syllable.join(", ")
                });
            }

            setWords([...words, ..._words]);

            console.log(_words);
            console.log(doNotAdd);

            // not react way but for now use this
            document.querySelector(".p-fileupload-file-badge").classList.remove("p-badge-warning");
            document.querySelector(".p-fileupload-file-badge").innerHTML = "Completed";
            document.querySelector(".p-fileupload-file-badge").classList.add("p-badge-success");
        }

        reader.readAsText(file);
    }

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

    async function generateFromParagraph(e) {
        let text = texAreaValue;
        let _words = [];

        while (text.trim() != "") {
            let res = DICT.search(text);
            let result = await DICT.makeHtml(res, true);
            let pattern = new RegExp(result[0].simplified, "g");
            text = text.replace(pattern, "");

            let Pinyin = []
            let Zhuyin = []
            let Syllable = []
            let Definitions = []

            for (let res of result) {
                if (res.simplified == result[0].simplified) {
                    Pinyin.push(decodeHtmlEntities(res.pinyin));
                    Zhuyin.push(decodeHtmlEntities(res.zhuyin));
                    Syllable.push(res.syllable);
                    Definitions.push(res.definitions)
                }
            }

            if (words.some(w => w.Simplified === result[0].simplified)) {
                continue;
            }

            _words.push({
                Simplified: result[0].simplified,
                Traditional: result[0].traditional,
                Pinyin: Pinyin.join(", "),
                Zhuyin: Zhuyin.join(", "),
                Definitions: Definitions.join(" │ "),
                Syllable: Syllable.join(", ")
            });
        }

        setWords([...words, ..._words]);
    }

    async function generateDeck(e) {

        let flds = [];
        let req = [];
        let tmpls = [];

        fields.forEach((f, i) => {
            flds.push({ name: f })
            req.push([i, "all", [i]]);
        });

        for (let card in tabContent) {
            let hideSimp = true;
            let hideTrad = true;
            let hidePin = true;
            let hideZhu = true;
            let hideDef = true;

            let hides = []

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

            // TODO-remove redundant code
            if (hideSimp) {
                hides.push("char_sim")
            }

            if (hideTrad) {
                hides.push("char_trad")
            }

            if (hidePin) {
                hides.push("char_pinyin")
            }

            if (hideZhu) {
                hides.push("char_zhuyin")
            }

            if (hideDef) {
                hides.push("char_meaning")
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
    document.getElementById(_hide).style.display = "none";

    var isShowField = document.getElementById(_hide).style.display == "none" ? false : true;
    if (_hide == "char_pinyin") {
        showHide(".pinyin", isShowField);
    }
    if (_hide == "char_zhuyin") {
        showHide(".zhuyin", isShowField);
    }
    if (_hide == "char_sim") {
        showHide("#char-sim-id", isShowField);
    }
    if (_hide == "char_trad") {
        showHide("#char-trad-id", isShowField);
        showHide(".sep", isShowField);
    }
}
</script>`;

            let QFMT = CONSTANTS.DECK_HTML_FRONT + hideScript;
            let AFMT = CONSTANTS.DECK_HTML_BACK;

            if (tabContent[card]["additional"].includes("writingComponent")) {
                QFMT = CONSTANTS.DECK_HTML_WITH_HANZI_WRITER;
                AFMT = `<div id="back">{{FrontSide}}</div>`;
            }

            tmpls.push({
                name: card,
                qfmt: QFMT,
                afmt: AFMT,
            });
        }

        const m = new Model({
            name: "Basic - (Anki-xiehanzi)",
            id: "1372444668843",
            flds: flds,
            css: CONSTANTS.DECK_CSS,
            req: [req],
            tmpls: tmpls,
        });

        const d = new Deck(1372444668672, deckName);

        words.forEach(word => {
            let Simplified = word.Simplified;
            let Traditional = word.Traditional;
            let Pinyin = word.Pinyin;
            let Zhuyin = word.Zhuyin;
            let Definitions = word.Definitions;

            let note = [];

            flds.some(function (obj) {
                if (JSON.stringify(obj) === JSON.stringify({ name: 'Simplified' })) {
                    note.push(Simplified);
                }
                if (JSON.stringify(obj) === JSON.stringify({ name: 'Traditional' })) {
                    note.push(`〔${Traditional}〕`)
                }
                if (JSON.stringify(obj) === JSON.stringify({ name: 'Pinyin' })) {
                    note.push(Pinyin);
                }
                if (JSON.stringify(obj) === JSON.stringify({ name: 'Zhuyin' })) {
                    note.push(Zhuyin);
                }
                if (JSON.stringify(obj) === JSON.stringify({ name: 'Definitions' })) {

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
                            simp += `<span class="char-tone${k[k.length - 1]}">${simpSp[j]}</span>`
                            trad += `<span class="char-tone${k[k.length - 1]}">${tradSp[j]}</span>`
                        })

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
</div>`
                        definition.push(html);
                    }

                    note.push(definition.join("\n"));
                }
                if (JSON.stringify(obj) === JSON.stringify({ name: 'Audio' })) {
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
            "_tatoeba.png"
        ];

        const fetchFile = async (file) => {
            const response = await fetch(`./img/${file}`);
            if (!response.ok) {
                return null;
            }
            return response.blob();
        };

        Promise.all(mediaFiles.map(fetchFile))
            .then(blobs => {
                blobs.forEach((blob, index) => {
                    if (blob) {
                        p.addMedia(blob, mediaFiles[index]);
                    }
                });
            })
            .catch(error => {
                console.error("Error fetching or adding media:", error);
            }).finally(() => {
                p.writeToFile(`${deckName}.apkg`);
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
                            <InputText type="text" placeholder="Text input" onChange={(e) => setDeckName(e.target.value)}
                                style={{ width: "60%" }}
                                value={deckName}>
                            </InputText>

                            <h2 className={styles.mt}>Create Card Types</h2>
                            <div>
                                <ul className="tabs">
                                    {tabs.map((tab, index) => (
                                        <li
                                            key={index}
                                            className={`${styles.tabs__item} tabs__item ${activeTab === index ? 'tabs__item--active' : ''}`}
                                            onClick={() => handleTabClick(index)}
                                        >
                                            {tab}
                                            <span onClick={() => handleCloseTab(index)}
                                                style={{ margin: "3px 10px 0px" }}
                                            > <RiCloseCircleFill /> </span>
                                        </li>
                                    ))}
                                    <li className={`${styles.tabs__item_add} tabs__item tabs__item--add`}
                                        onClick={handleAddTab}>
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
                                                                <input type="checkbox" id={id}
                                                                    onChange={() => handleCheckboxChange(id, 'front')}
                                                                    checked={tabContent[tabs[activeTab]].front.includes(id)}
                                                                ></input>
                                                                <label htmlFor={id}>{field.label}</label>
                                                            </div>
                                                        );
                                                    }
                                                })}
                                            </div>

                                            <h3 className={styles.mt}>Back Side</h3>
                                            <div>
                                                <Message severity="info" text={`
                                            All fields are available in back side, use side bar during deck review
                                            and turn off the fields you don't want to see.
                                            `} />

                                            </div>

                                            <h3 className={styles.mt}>Additional Components</h3>
                                            <div>
                                                {additionalComponents.map((component, index) => (
                                                    <div key={index}>
                                                        <input type="checkbox" id={component.id}
                                                            onChange={() => handleCheckboxChange(component.id, 'additional')}
                                                            checked={tabContent[tabs[activeTab]].additional.includes(component.id)}
                                                        ></input>
                                                        <label htmlFor={component.id}>{component.label}</label>
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

                            <div className={styles.select_type}>
                                <span className="p-float-label w-full md:w-14rem">
                                    <Dropdown inputId="select-type" value={selectType} onChange={(e) => setSelectType(e.target.value)} options={selectionTypes} optionLabel="selectType" className="w-full" />
                                </span>
                            </div>

                            {selectType.selectType === 'Word' && (
                                <div className={styles.select_type}>
                                    <InputText value={wordValue} onChange={(e) => setWordValue(e.target.value)} style={{ width: "60%", marginRight: "20px" }} />
                                    <Button onClick={() => { searchAndAdd(wordValue); }}>Add</Button>
                                </div>
                            )}

                            {selectType.selectType === 'File' && (
                                <div className={styles.select_type}>
                                    <FileUpload name="words[]"
                                        customUpload
                                        uploadHandler={generateWords}
                                        accept="text/*"
                                        maxFileSize={1000000}
                                        uploadLabel='Generate'
                                        emptyTemplate={<p className="m-0">Drag and drop files to here to generate.</p>} />
                                </div>
                            )}

                            {selectType.selectType === 'Paragraph' && (
                                <div className={styles.select_type}>
                                    <InputTextarea value={texAreaValue} onChange={(e) => setTexAreaValue(e.target.value)} rows={5} style={{ width: "100%" }} />

                                    <div>
                                        <Button onClick={generateFromParagraph}>Generate</Button>
                                    </div>
                                </div>
                            )}

                            <div className={`${styles.button_bar}`}>
                                <Toolbar
                                    start={(
                                        <React.Fragment>
                                            <Button className={`${styles.mr_2} mr-2`} label="Delete" onClick={deleteSelectedWord} />
                                            <Button className={`${styles.mr_2} mr-2`} label="Cancel" onClick={cancelSelection} />
                                        </React.Fragment>
                                    )}
                                    end={(
                                        <React.Fragment>
                                            <Button className={`${styles.mr_2} mr-2`} label="Export CSV" onClick={exportCSV} />
                                            <Button className={`${styles.mr_2} mr-2`} label="Generate Deck" onClick={generateDeck} />
                                        </React.Fragment>
                                    )} />
                            </div>

                            <DataTable
                                ref={dt} paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50, 100, 500]}
                                selectionMode={rowClick ? null : 'radiobutton'}
                                selection={selectWord} onSelectionChange={(e) => setSelectWord(e.value)}
                                value={words} tableStyle={{ minWidth: '60rem' }}
                            >
                                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>

                                {fields.map((field, index) => (
                                    field == FIELDS.SIMPLIFIED &&
                                    <Column key={field} field={field} header={field}></Column>
                                    ||
                                    field == FIELDS.TRADITIONAL &&
                                    <Column field={field} header={field}></Column>
                                    ||
                                    field == FIELDS.PINYIN &&
                                    <Column field={field} header={field}></Column>
                                    ||
                                    field == FIELDS.ZHUYIN &&
                                    <Column field={field} header={field}></Column>
                                    ||
                                    field == FIELDS.DEFINITIONS &&
                                    <Column field={field} header={field} headerStyle={{ width: '50rem' }}></Column>
                                ))}
                            </DataTable>
                        </div>
                    )}

                    <nav className="pagination-nav docusaurus-mt-lg docusaurus-mb-lg">
                        {page > 1 ?
                            (
                                <div className="pagination-nav__item" onClick={() => setPage(page - 1)}>
                                    <a className="pagination-nav__link" href="#url">
                                        <div className="pagination-nav__sublabel">Previous</div>
                                        <div className="pagination-nav__label">{prevNextButtonText[page - 1]}</div>
                                    </a>
                                </div>
                            )
                            :
                            <div></div>
                        }

                        {page < 2 ?
                            (
                                <div className="pagination-nav__item pagination-nav__item--next" onClick={() => setPage(page + 1)}>
                                    <a className="pagination-nav__link" href="#url">
                                        <div className="pagination-nav__sublabel">Next</div>
                                        <div className="pagination-nav__label">{prevNextButtonText[page + 1]}</div>
                                    </a>
                                </div>
                            )
                            :
                            <div></div>
                        }
                    </nav>
                </section>
            </PrimeReactProvider>
        </Layout>
    );
}
