import { unzip } from 'unzipit';
import pinyinAndZhuyin from './pinyinzhuyin';

let dict;

// https://github.com/cschiller/zhongwen
class ZhongwenDictionary {
    wordDict: any;
    wordIndex: any;
    grammarKeywords: any;
    vocabKeywords: any;
    cache: {};

    constructor(wordDict, wordIndex, grammarKeywords, vocabKeywords) {
        this.wordDict = wordDict;
        this.wordIndex = wordIndex;
        this.grammarKeywords = grammarKeywords;
        this.vocabKeywords = vocabKeywords;
        this.cache = {};
    }

    static find(needle, haystack) {

        let beg = 0;
        let end = haystack.length - 1;

        while (beg < end) {
            let mi = Math.floor((beg + end) / 2);
            let i = haystack.lastIndexOf('\n', mi) + 1;

            let mis = haystack.substr(i, needle.length);
            if (needle < mis) {
                end = i - 1;
            } else if (needle > mis) {
                beg = haystack.indexOf('\n', mi + 1) + 1;
            } else {
                return haystack.substring(i, haystack.indexOf('\n', mi + 1));
            }
        }

        return null;
    }

    hasGrammarKeyword(keyword) {
        return this.grammarKeywords[keyword];
    }

    hasVocabKeyword(keyword) {
        return this.vocabKeywords[keyword];
    }

    wordSearch(word, max) {

        let entry = { data: [], more: 0, matchLen: 0 };

        let dict = this.wordDict;
        let index = this.wordIndex;

        let maxTrim = max || 7;

        let count = 0;
        let maxLen = 0;

        WHILE:
        while (word.length > 0) {

            let ix = this.cache[word];
            if (!ix) {
                ix = ZhongwenDictionary.find(word + ',', index);
                if (!ix) {
                    this.cache[word] = [];
                    continue;
                }
                ix = ix.split(',');
                this.cache[word] = ix;
            }

            for (let j = 1; j < ix.length; ++j) {
                let offset = ix[j];

                let dentry = dict.substring(offset, dict.indexOf('\n', offset));

                if (count >= maxTrim) {
                    entry.more = 1;
                    break WHILE;
                }

                ++count;
                if (maxLen === 0) {
                    maxLen = word.length;
                }

                entry.data.push([dentry, word]);
            }

            word = word.substr(0, word.length - 1);
        }

        if (entry.data.length === 0) {
            return null;
        }

        entry.matchLen = maxLen;
        return entry;
    }
}

async function getCedict(url) {
    let arraybuffer: any = await fetch(url).then(r => r.arrayBuffer());
    const { entries } = await unzip(new Uint8Array(arraybuffer));
    const arrayBuffer = await entries['cedict_ts.u8'].arrayBuffer();
    const string = new TextDecoder().decode(arrayBuffer);
    return string;
}

async function loadDictData() {
    let wordDict = getCedict(`./data/cedict_ts.zip`);

    // let wordDict = await fetch(`./data/cedict_ts.u8`).then(r => r.text());
    let wordIndex = await fetch(`./data/cedict.idx`).then(r => r.text());
    let grammarKeywords = await fetch(`./data/grammarKeywordsMin.json`).then(r => r.json());
    let vocabKeywords = await fetch(`./data/vocabularyKeywordsMin.json`).then(r => r.json());

    return Promise.all([wordDict, wordIndex, grammarKeywords, vocabKeywords]);
}

async function loadDictionary() {
    const [wordDict, wordIndex, grammarKeywords, vocabKeywords] = await loadDictData();
    return new ZhongwenDictionary(wordDict, wordIndex, grammarKeywords, vocabKeywords);
}

async function loadDict() {
    try {
        if (dict) {
            return;
        }
        dict = await loadDictionary().then(r => dict = r);
        console.log("Dictionary Loaded...");
    } catch (e) {
        console.log(e);
    }
}

// regular expression for zero-width non-joiner U+200C &zwnj;
let zwnj = /\u200c/g;

function search(text) {

    if (!dict) {
        return;
    }

    let entry = dict.wordSearch(text);

    if (entry) {
        for (let i = 0; i < entry.data.length; i++) {
            let word = entry.data[i][1];
            if (dict.hasGrammarKeyword(word) && (entry.matchLen === word.length)) {
                // the final index should be the last one with the maximum length
                entry.grammar = { keyword: word, index: i };
            }
            if (dict.hasVocabKeyword(word) && (entry.matchLen === word.length)) {
                // the final index should be the last one with the maximum length
                entry.vocab = { keyword: word, index: i };
            }
        }
    }

    return entry;
}

async function makeHtml(result, showToneColors): Promise<{
    simplified: string,
    traditional: string,
    pinyin: string,
    zhuyin: string,
    definitions: string,
}[]> {

    let entry;
    let html = [{
        simplified: '',
        traditional: '',
        pinyin: '',
        zhuyin: '',
        definitions: '',
    }];

    if (result === null) return html;

    for (let i = 0; i < result.data.length; ++i) {
        entry = result.data[i][0].match(/^([^\s]+?)\s+([^\s]+?)\s+\[(.*?)\]?\s*\/(.+)\//);

        html[i] = {
            simplified: '',
            traditional: '',
            pinyin: '',
            zhuyin: '',
            definitions: '',
        };

        if (!entry) continue;

        // Hanzi

        html[i].simplified = entry[2];
        html[i].traditional = entry[1];

        // Pinyin

        let pinyinClass = 'w-pinyin';
        let p = await pinyinAndZhuyin(entry[3], showToneColors, pinyinClass);
        html[i].pinyin = p[0];

        // Zhuyin

        html[i].zhuyin = p[2];

        // Definition

        let translation = entry[4].replace(/\//g, ' ◆ ');
        html[i].definitions = translation;
    }

    return html;
}

export default { loadDict, search, makeHtml };
