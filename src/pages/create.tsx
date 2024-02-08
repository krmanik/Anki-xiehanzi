import styles from './index.module.css';

import React, { useEffect, useState } from "react";
import Layout from '@theme/Layout';
import { RiCloseCircleFill } from "react-icons/ri";
import FIELDS from '../dict/contants';
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

export default function CreateDeck(): JSX.Element {

    const [words, setWords] = useState<{
        simplified: string,
        traditional: string,
        pinyin: string,
        zhuyin: string,
        definitions: string,
    }[]>([]);

    const [deckName, setDeckName] = React.useState<string>('');
    const [fields, setFields] = React.useState<string[]>([]);
    const [page, setPage] = React.useState<number>(1);
    const [wordValue, setWordValue] = React.useState<string>('');
    const [selectType, setSelectType] = React.useState({ selectType: 'Word' });
    const [texAreaValue, setTexAreaValue] = React.useState<string>('');
    const [db, setDb] = useState(null);

    const prevNextButtonText = [
        "",
        "Create Deck Fields",
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

    const [activeTab, setActiveTab] = useState(0);
    const [tabs, setTabs] = useState(['Card 1', 'Card 2']);
    const [tabContent, setTabContent] = useState({
        'Card 1': { front: [], back: [] },
        'Card 2': { front: [], back: [] }
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
            [newTabName]: { front: [], back: [] },
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

    const parser = new DOMParser();

    const searchAndAdd = async (word) => {
        let res = DICT.search(word);
        let result = await DICT.makeHtml(res, true);

        if (words.some(w => w.simplified === result[0].simplified)) {
            return;
        }

        let pinyin = []
        let zhuyin = []
        let definitions = []

        for (let res of result) {
            if (res.simplified == result[0].simplified) {
                pinyin.push(parser.parseFromString(res.pinyin, 'text/html').body.textContent);
                zhuyin.push(parser.parseFromString(res.zhuyin, 'text/html').body.textContent);
                definitions.push(res.definitions)
            }
        }

        setWords([...words, {
            simplified: result[0].simplified,
            traditional: result[0].traditional,
            pinyin: pinyin.join(", "),
            zhuyin: zhuyin.join(", "),
            definitions: definitions.join(" │ ")
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

            for (let line of lines) {
                let res = DICT.search(line);
                let result = await DICT.makeHtml(res, true);
                let pinyin = []
                let zhuyin = []
                let definitions = []

                for (let res of result) {
                    if (res.simplified == result[0].simplified) {
                        pinyin.push(parser.parseFromString(res.pinyin, 'text/html').body.textContent);
                        zhuyin.push(parser.parseFromString(res.zhuyin, 'text/html').body.textContent);
                        definitions.push(res.definitions)
                    }
                }

                if (words.some(w => w.simplified === result[0].simplified)) {
                    continue;
                }

                _words.push({
                    simplified: result[0].simplified,
                    traditional: result[0].traditional,
                    pinyin: pinyin.join(", "),
                    zhuyin: zhuyin.join(", "),
                    definitions: definitions.join(" │ ")
                });
            }

            setWords([...words, ..._words]);

            console.log(_words);

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

            let pinyin = []
            let zhuyin = []
            let definitions = []

            for (let res of result) {
                if (res.simplified == result[0].simplified) {
                    pinyin.push(parser.parseFromString(res.pinyin, 'text/html').body.textContent);
                    zhuyin.push(parser.parseFromString(res.zhuyin, 'text/html').body.textContent);
                    definitions.push(res.definitions)
                }
            }

            if (words.some(w => w.simplified === result[0].simplified)) {
                continue;
            }

            _words.push({
                simplified: result[0].simplified,
                traditional: result[0].traditional,
                pinyin: pinyin.join(", "),
                zhuyin: zhuyin.join(", "),
                definitions: definitions.join(" │ ")
            });
        }

        setWords([...words, ..._words]);
    }

    async function generateDeck(e) {

        console.log(fields)
        console.log(tabContent)

        let flds = [];

        fields.forEach(f => {
            flds.push({ name: f })
        });

        console.log(flds)

        let tmpls = [];

        for (let card in tabContent) {
            console.log(card, tabContent[card])

            let frontFields = []
            let backFields = []

            for (let front of tabContent[card]["front"]) {
                console.log(front);
                let f = `{{${front.split("front")[1]}}}`
                frontFields.push(f);
            }

            for (let back of tabContent[card]["back"]) {
                console.log(back)
                let b = `{{${back.split("back")[1]}}}`
                backFields.push(b);
            }

            tmpls.push({
                name: card,
                qfmt: frontFields.join("\n"),
                afmt: backFields.join("\n"),
            });
        }

        const m = new Model({
            name: "Basic - (Anki-xiehanzi)",
            id: "1543634829843",
            flds: flds,
            req: [
                [0, "all", [0]],
                [1, "all", [1]]
            ],
            tmpls: tmpls,
        });

        const d = new Deck(1276438724672, deckName);

        words.forEach(word => {
            let simplified = word.simplified;
            let traditional = word.traditional;
            let pinyin = word.pinyin;
            let zhuyin = word.zhuyin;
            let definitions = word.definitions;

            let note = []

            flds.some(function (obj) {
                if (JSON.stringify(obj) === JSON.stringify({ name: 'Simplified' })) {
                    note.push(simplified)
                }
                if (JSON.stringify(obj) === JSON.stringify({ name: 'Traditional' })) {
                    note.push(traditional)
                }
                if (JSON.stringify(obj) === JSON.stringify({ name: 'Pinyin' })) {
                    note.push(pinyin)
                }
                if (JSON.stringify(obj) === JSON.stringify({ name: 'Zhuyin' })) {
                    note.push(zhuyin)
                }
                if (JSON.stringify(obj) === JSON.stringify({ name: 'Definitions' })) {
                    note.push(definitions)
                }
            });

            d.addNote(m.note(note));
        });

        const p = new Package();
        await setupSql();
        p.setSqlJs(db);
        p.addDeck(d);
        p.writeToFile(`${deckName}.apkg`);
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

                            <h2 className={styles.mt}>Select Fields</h2>
                            <div className={styles.mb}>

                                {fieldsArray.map((field, index) => (
                                    <div key={index}>
                                        <input type="checkbox" id={field.id} onChange={(e) => handleFieldChange(e)}
                                            checked={fields.includes(field.id)}
                                        ></input>
                                        <label htmlFor={field.id}>{field.label}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {page === 2 && (
                        <div>
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
                                                {fieldsArray.map((field, index) => {
                                                    if (fields.includes(field.id)) {
                                                        let id = `back${field.id}`;
                                                        return (
                                                            <div key={index}>
                                                                <input type="checkbox" id={id}
                                                                    onChange={() => handleCheckboxChange(id, 'back')}
                                                                    checked={tabContent[tabs[activeTab]].back.includes(id)}
                                                                ></input>
                                                                <label htmlFor={id}>{field.label}</label>
                                                            </div>
                                                        );
                                                    }
                                                })}
                                            </div>

                                            <h3 className={styles.mt}>Preview</h3>
                                            <div>



                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {page === 3 && (
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
                                        <Button className={`${styles.mr_2} mr-2`} label="Generate Deck" onClick={generateDeck} />
                                    )} />
                            </div>

                            <DataTable
                                paginator rows={10}
                                selectionMode={rowClick ? null : 'radiobutton'}
                                selection={selectWord} onSelectionChange={(e) => setSelectWord(e.value)}
                                value={words} tableStyle={{ minWidth: '60rem' }}
                            >
                                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                                <Column field={FIELDS.SIMPLIFIED} header="Simplified"></Column>
                                <Column field={FIELDS.TRADITIONAL} header="Traditional"></Column>
                                <Column field={FIELDS.PINYIN} header="Pinyin" headerStyle={{ width: '8rem' }}></Column>
                                <Column field={FIELDS.ZHUYIN} header="Zhuyin" headerStyle={{ width: '8rem' }}></Column>
                                <Column field={FIELDS.DEFINITIONS} header="Definitions" headerStyle={{ width: '50rem' }}></Column>
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

                        {page < 3 ?
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
