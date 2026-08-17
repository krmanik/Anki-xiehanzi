import { describe, expect, it } from 'vitest';

import {
	ENGINE_FILE,
	RADICAL_FIELDS,
	RADICAL_MODEL_ID,
	audioFile,
	buildRadicalNote,
	examplesHtml,
	glyphMedia,
	glyphRowHtml,
	productivityLabel,
	orderByKangxi,
	radicalCss,
	radicalDeckName,
	radicalNoteGuid,
	radicalOptions,
	radicalReq,
	radicalTags,
	radicalTemplates,
	readingPair,
	asWordHtml,
	productivityBandLabel,
	modelId,
	modelName,
	tonedPinyin
} from './radicalDeck';
import type { Radical } from './radicals';

const yue: Radical = {
	number: 74,
	char: '月',
	variants: ['⺝'],
	simplified: [],
	strokes: 4,
	meaning: 'moon',
	pinyin: 'yuè',
	colloquial: { term: '月字旁', pinyin: 'yuè zì páng', english: 'moon radical' },
	hanviet: 'nguyệt',
	kana: 'つき',
	romaji: 'tsuki',
	hangul: '달월',
	romaja: 'dalweol',
	frequency: 69,
	zhuyin: 'ㄩㄝˋ',
	unicode: 'U+6708',
	kangxiForm: '⽉',
	word: { pinyin: 'yuè', meaning: 'moon; month', rank: 604, band: 'Top 1500' },
	examples: [
		{ char: '朋', pinyin: 'péng', zhuyin: 'ㄆㄥˊ', meaning: 'friend', rank: 11117, band: 'Rare' }
	],
	evolution: [{ script: '甲骨文', label: 'Oracle bone', file: 'zy-jiaguwen-42_EEA1.svg' }],
	compare: [{ region: '中国大陆', label: 'Mainland China', file: 'kai-cn-6708.svg' }]
};

describe('tonedPinyin', () => {
	it('wraps each syllable in its tone class', () => {
		expect(tonedPinyin('yuè')).toBe('<span class="t4">yuè</span>');
		expect(tonedPinyin('yuè zì páng')).toContain('<span class="t4">zì</span>');
	});

	it('keeps the spacing between syllables', () => {
		expect(tonedPinyin('yuè zì')).toBe('<span class="t4">yuè</span> <span class="t4">zì</span>');
	});

	it('survives an empty reading', () => {
		expect(tonedPinyin('')).toBe('');
	});
});

describe('examplesHtml', () => {
	it('carries the meaning next to every example, not just the hanzi', () => {
		const html = examplesHtml(yue.examples);
		expect(html).toContain('朋');
		expect(html).toContain('friend');
		expect(html).toContain('t2">péng');
	});

	it('is empty when there are no examples', () => {
		expect(examplesHtml([])).toBe('');
	});

	it('carries the zhuyin and the frequency band when they exist', () => {
		const html = examplesHtml(yue.examples);
		expect(html).toContain('ㄆㄥˊ');
		expect(html).toContain('Rare');
		// An unranked character gets no chip rather than an empty one.
		expect(examplesHtml([{ char: '大', pinyin: 'dà', zhuyin: '', meaning: 'big', rank: null, band: '' }]))
			.not.toContain('chip');
	});

	it('escapes a gloss containing markup characters', () => {
		const html = examplesHtml([
			{ char: '大', pinyin: 'dà', zhuyin: '', meaning: 'big <you>', rank: null, band: '' }
		]);
		expect(html).toContain('big &lt;you&gt;');
	});
});

describe('glyphRowHtml', () => {
	it('points at the prefixed media name and keeps both captions', () => {
		const html = glyphRowHtml(yue.evolution, 'evolution');
		expect(html).toContain('src="_xhzr-zy-jiaguwen-42_EEA1.svg"');
		expect(html).toContain('甲骨文');
		expect(html).toContain('Oracle bone');
		expect(html).toContain('glyph-row--evolution');
	});

	it('uses the region label for the comparison row', () => {
		expect(glyphRowHtml(yue.compare, 'regional')).toContain('中国大陆');
	});

	it('is empty with no glyphs', () => {
		expect(glyphRowHtml([], 'evolution')).toBe('');
	});
});

describe('readingPair', () => {
	it('marks the native script and the romanization apart', () => {
		expect(readingPair('つき', 'tsuki')).toBe(
			'<span class="r-native">つき</span> <span class="r-roman">tsuki</span>'
		);
	});

	it('falls back to whichever half exists', () => {
		expect(readingPair('', 'tsuki')).toBe('<span class="r-roman">tsuki</span>');
		expect(readingPair('', '')).toBe('');
	});
});

describe('buildRadicalNote', () => {
	const note = buildRadicalNote(yue, { strokeData: '{"strokes":[]}' });

	it('fills every declared field', () => {
		expect(Object.keys(note).sort()).toEqual([...RADICAL_FIELDS].sort());
	});

	it('keeps the raw glyph for the writer to read', () => {
		expect(note.Radical).toBe('月');
		expect(note.StrokeData).toBe('{"strokes":[]}');
	});

	it('references the audio clip by the radical number', () => {
		expect(note.Audio).toBe('[sound:xhz-radical-74.mp3]');
	});

	it('drops the audio field when the deck is built silent', () => {
		expect(buildRadicalNote(yue, { audio: false }).Audio).toBe('');
	});

	it('names whichever clip the builder actually stored', () => {
		expect(buildRadicalNote(yue, { audio: 'xhz-radical-74.m4a' }).Audio).toBe(
			'[sound:xhz-radical-74.m4a]'
		);
	});

	it('leaves optional fields empty rather than absent', () => {
		const bare = buildRadicalNote({ ...yue, colloquial: null, hanviet: '', frequency: 0 });
		expect(bare.Colloquial).toBe('');
		expect(bare.HanViet).toBe('');
		expect(bare.Frequency).toBe('');
		expect(bare.Productivity).toBe('');
	});
});

describe('asWordHtml', () => {
	it('reads the radical as vocabulary, with its frequency band', () => {
		const html = asWordHtml(yue.word);
		expect(html).toContain('moon; month');
		expect(html).toContain('Top 1500');
		expect(html).toContain('t4">yuè');
	});

	it('is empty for a radical that is not a word', () => {
		expect(asWordHtml(null)).toBe('');
	});
});

describe('productivityLabel', () => {
	// Count and band are two chips, so neither has to wrap onto its own line.
	it('says how many characters use the radical', () => {
		expect(productivityLabel(606)).toBe('606 characters');
		expect(productivityLabel(1)).toBe('1 character');
		expect(productivityLabel(0)).toBe('');
	});

	it('bands that count separately', () => {
		expect(productivityBandLabel(606)).toBe('Very common');
		expect(productivityBandLabel(120)).toBe('Common');
		expect(productivityBandLabel(42)).toBe('Moderate');
		expect(productivityBandLabel(2)).toBe('Rare');
		expect(productivityBandLabel(0)).toBe('');
	});
});

describe('radicalTags', () => {
	it('pads the stroke count so Anki sorts the tags numerically', () => {
		expect(radicalTags(yue)).toContain('Strokes::04');
	});

	it('bands productivity', () => {
		expect(radicalTags({ ...yue, frequency: 606 })).toContain('Productivity::Very_common');
		expect(radicalTags({ ...yue, frequency: 2 })).toContain('Productivity::Rare');
	});
});

describe('radicalNoteGuid', () => {
	it('is stable across rebuilds', () => {
		expect(radicalNoteGuid(yue)).toBe(radicalNoteGuid({ number: 74, char: '月' }));
	});

	it('differs per radical', () => {
		expect(radicalNoteGuid(yue)).not.toBe(radicalNoteGuid({ number: 85, char: '水' }));
	});
});

describe('radicalTemplates', () => {
	const [recognize, write] = radicalTemplates();

	it('shows the glyph on the recognition front and no answer', () => {
		expect(recognize.qfmt).toContain('{{Radical}}');
		expect(recognize.qfmt).not.toContain('{{Meaning}}');
		expect(recognize.qfmt).not.toContain('{{Pinyin}}');
		expect(recognize.qfmt).not.toContain('{{Audio}}');
	});

	it('asks for the glyph on the writing front without showing it', () => {
		expect(write.qfmt).toContain('{{Meaning}}');
		expect(write.qfmt).toContain('data-mode="quiz"');
		// {{text:Radical}} feeds the writer; the glyph itself must not be rendered.
		expect(write.qfmt).not.toContain('<div class="glyph-main">{{Radical}}</div>');
	});

	it('replays the strokes on both backs', () => {
		expect(recognize.afmt).toContain('data-mode="animate"');
		expect(write.afmt).toContain('data-mode="animate"');
	});

	it('orders the answer: the grid, the bar, word, origin, examples', () => {
		const back = recognize.afmt;
		const at = (needle: string) => back.indexOf(needle);
		expect(at('class="duo"')).toBeGreaterThan(-1);
		expect(at('class="duo"')).toBeLessThan(at('Stroke order'));
		expect(at('Stroke order')).toBeLessThan(at('class="bar"'));
		expect(at('class="bar"')).toBeLessThan(at('>As a word<'));
		expect(at('>As a word<')).toBeLessThan(at('>Evolution '));
		expect(at('>Evolution ')).toBeLessThan(at('>Regional forms '));
		expect(at('>Regional forms ')).toBeLessThan(at('>Examples<'));
		expect(at('>Examples<')).toBeLessThan(at('class="foot"'));
	});

	// A beginner cannot read the block titles the sources use; the Chinese name
	// stays, as a footnote to the English one — and a title is a label, not a
	// sentence ("How the glyph evolved" was one).
	it('titles the glyph blocks in short English, with the Chinese name after', () => {
		expect(recognize.afmt).toContain('Evolution <span class="h2-cn">字源演变</span>');
		expect(recognize.afmt).toContain('Regional forms <span class="h2-cn">字形对比</span>');
		for (const sentence of [
			'How the glyph evolved',
			'Printed forms by region',
			'Characters built with it',
			'As a word on its own',
			'Readings across East Asia'
		]) {
			expect(recognize.afmt).not.toContain(sentence);
		}
	});

	// Anki's reviewer eval's the text of every <script> on the card, whatever its
	// type, and one throw stops the rest of them — a JSON payload has to be a div.
	it('carries the stroke data in a hidden div, not in a script tag', () => {
		for (const tmpl of [recognize.afmt, write.afmt, write.qfmt]) {
			expect(tmpl).not.toContain('type="application/json"');
			expect(tmpl).toContain('<div id="xhz-stroke-data" class="stroke-data">{{text:StrokeData}}</div>');
		}
	});

	it('prints the Chinese reading once — the table covers the other traditions', () => {
		const back = recognize.afmt;
		expect(back).not.toContain('<th>中文</th>');
		expect(back).toContain('<th>Hán-Việt</th>');
		expect(back.match(/\{\{Pinyin\}\}/g)).toHaveLength(1);
	});

	// The identity column prints the glyph; the question side's big one has no
	// business on an answer.
	it('does not repeat the glyph block on the answer', () => {
		expect(recognize.afmt).not.toContain('glyph-main');
	});

	// The grid used to sit alone on its line with three-quarters of it empty, under
	// a header that repeated the readings below it.
	it('pairs the stroke grid with the identity column to its right, in one row', () => {
		const back = recognize.afmt;
		const duo = back.slice(back.indexOf('<div class="duo">'), back.indexOf('<div class="bar">'));
		expect(duo).toContain('Stroke order');
		expect(duo).toContain('class="ident"');
		expect(duo).toContain('{{Meaning}}');
		expect(duo).toContain('Kangxi {{Number}}');
		expect(duo).toContain('>Readings<');
		expect(duo.indexOf('Stroke order')).toBeLessThan(duo.indexOf('class="ident"'));
	});

	it('gives every answer the control bar', () => {
		for (const tmpl of [recognize.afmt, write.afmt]) {
			expect(tmpl).toContain("document.getElementById('xhz-audio')");
			expect(tmpl).toContain("window.xhzWriterAction('practice')");
		}
	});

	// The dictionary drawer, like the word decks': a button at the right of the
	// control bar, links only — no script, and nothing on a question side, where
	// looking the glyph up would answer the card.
	it('opens a dictionary drawer from the bar on the answer only', () => {
		expect(recognize.afmt).toContain('class="more"');
		expect(recognize.afmt).toContain('more-link');
		expect(recognize.afmt).toMatch(/plecoapi:\/\/x-callback-url\/df\?hw=\{\{text:Radical\}\}/);
		for (const site of ['zdic.net', 'hanzicraft.com', 'wiktionary.org', 'forvo.com']) {
			expect(recognize.afmt).toContain(site);
		}
		for (const tmpl of [recognize.qfmt, write.qfmt]) {
			expect(tmpl).not.toContain('class="more"');
			expect(tmpl).not.toContain('more-link');
		}
		// Opening it is a class on the card, like the panel — no script involved.
		expect(recognize.afmt).toContain("classList.toggle('xhz-more')");
		expect(radicalCss()).toContain('.xhz-more .more');
	});

	// Recognition would be pointless if the bar read the answer out loud.
	it('keeps audio off the question sides', () => {
		expect(recognize.qfmt).not.toContain('xhz-audio');
		expect(write.qfmt).not.toContain('xhz-audio');
		expect(write.qfmt).toContain("window.xhzWriterAction('hint')");
	});

	it('drops the audio button from a silent deck', () => {
		const [silent] = radicalTemplates(radicalOptions('free', { audio: false }));
		expect(silent.afmt).not.toContain('xhz-audio');
		expect(silent.afmt).toContain("window.xhzWriterAction('replay')");
	});

	// Anki keeps the note type a collection already has when a deck is re-imported,
	// so a button that calls a function some script defines breaks for good the day
	// that script's name changes: `ReferenceError: xhzWriter is not defined`, on a
	// card no re-import will fix. Every handler is self-contained instead, and the
	// writer calls are guarded so a card without the engine does nothing at all.
	it('puts the buttons’ code in their onclick, calling nothing a script defines', () => {
		for (const tmpl of [recognize.afmt, write.afmt, write.qfmt]) {
			expect(tmpl).not.toMatch(/onclick="xhz[A-Za-z]*\(/);
			for (const [, handler] of tmpl.matchAll(/onclick="([^"]*)"/g)) {
				// Every bare call in the handler: nothing but `if`, DOM methods, and
				// `xhzWriterAction` — which only ever runs behind its own check.
				const calls = [...handler.matchAll(/(?:^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(
					(m) => m[1]
				);
				for (const call of calls) expect(call).toBe('if');
				if (handler.includes('xhzWriterAction')) {
					expect(handler).toContain('if(window.xhzWriterAction)');
				}
			}
		}
	});

	// A `script src` whose file is missing gets Anki's 404 *page* back, which
	// parses as HTML: `Unexpected token '<'`, and the awaited chain stops there —
	// every later script on the card dead. Injected from JS it breaks nothing else.
	it('never loads the stroke engine through a script tag in the template', () => {
		for (const tmpl of [recognize.afmt, write.afmt, write.qfmt]) {
			expect(tmpl).not.toContain('<script src=');
			expect(tmpl).toContain(`tag.src = '${ENGINE_FILE}'`);
		}
	});

	// Media is keyed by name across the whole collection: sharing the word decks'
	// `_hanzi-writer.min.js` meant loading whatever another import left there.
	it('loads the engine from a media name of its own', () => {
		expect(ENGINE_FILE).toBe('_xhz-hanzi-writer.js');
		for (const tmpl of [recognize.afmt, write.afmt, write.qfmt]) {
			expect(tmpl).not.toContain('_hanzi-writer.min.js');
		}
	});

	// Two scripts at most per side — the writer's and the sidebar's — and neither
	// is needed for a button to work: fewer links in the chain Anki awaits.
	it('carries at most the writer and sidebar scripts on a side', () => {
		for (const tmpl of [recognize.afmt, write.afmt, write.qfmt, recognize.qfmt]) {
			expect([...tmpl.matchAll(/<script/g)].length).toBeLessThanOrEqual(2);
		}
		const free = radicalTemplates('free');
		expect([...free[0].afmt.matchAll(/<script/g)]).toHaveLength(1);
		expect(free[0].qfmt).not.toContain('<script');
	});

	// The sidebar: premium only, per side, and every switch has something to switch.
	it('gives premium a sidebar and free none', () => {
		const [pRec, pWrite] = radicalTemplates('premium');
		const [fRec, fWrite] = radicalTemplates('free');
		for (const tmpl of [pRec.qfmt, pRec.afmt, pWrite.qfmt, pWrite.afmt]) {
			// The switch sits in the control bar, not floating over the webview.
			expect(tmpl).toContain('bar-btn bar-btn--tool cog');
			expect(tmpl).toContain('class="bar"');
			expect(tmpl).toContain('class="panel"');
		}
		// The dictionary drawer is not a premium feature, so free keeps its own
		// tool button — it is the switches panel free never gets.
		for (const tmpl of [fRec.qfmt, fRec.afmt, fWrite.qfmt, fWrite.afmt]) {
			expect(tmpl).not.toContain('--tool cog');
			expect(tmpl).not.toContain('class="panel"');
		}
	});

	// Hiding "Buttons" must not take the switch that unhides them with it, so only
	// the action group carries the part marker.
	it('keeps the chrome buttons out of the switchable button group', () => {
		const group = recognize.afmt.slice(
			recognize.afmt.indexOf('<div class="bar-actions"'),
			recognize.afmt.indexOf('<div class="bar-tools">')
		);
		expect(group).toContain('data-xhz="buttons"');
		expect(group).not.toContain('bar-btn--tool');
		expect(group).not.toContain('more-btn');
	});

	it('lists only the parts a side actually shows, and every one of them', () => {
		for (const side of [recognize.qfmt, recognize.afmt, write.qfmt, write.afmt]) {
			const rows = [...side.matchAll(/data-row="([a-z]+)"/g)].map((m) => m[1]);
			const parts = [...new Set([...side.matchAll(/data-xhz="([a-z]+)"/g)].map((m) => m[1]))];
			expect(rows.length).toBeGreaterThan(0);
			// No duplicate switches, and no switch for something this side has not got.
			expect(new Set(rows).size).toBe(rows.length);
			expect(rows.sort()).toEqual(parts.sort());
		}
	});

	it('covers the answer parts: the grid, the readings, the blocks, the meta line', () => {
		const parts = [...new Set([...recognize.afmt.matchAll(/data-xhz="([a-z]+)"/g)].map((m) => m[1]))];
		for (const key of [
			'strokes', 'grid', 'glyph', 'pinyin', 'zhuyin', 'meaning', 'meta',
			'name', 'readings', 'word', 'evolution', 'regional', 'examples', 'buttons'
		]) {
			expect(parts).toContain(key);
		}
	});

	// Anki keeps the note type a collection already has, so a switch that called
	// into a script would break the day that script changed its name.
	it('switches carry their own code and remember the side they are on', () => {
		for (const [, handler] of recognize.afmt.matchAll(/onchange="([^"]*)"/g)) {
			expect(handler).toContain("classList.toggle('xhz-h-'+k");
			expect(handler).toContain("contains('back')?'back':'front'");
			expect(handler).toContain('localStorage.setItem');
			expect(handler).toContain('catch(e){}');
		}
		// Opening the panel is a class on the card, nothing more.
		expect(recognize.afmt).toContain("classList.toggle('xhz-panel')");
	});

	it('has a hide rule in the CSS for every part it offers', () => {
		const css = radicalCss('premium');
		const parts = [...new Set([...recognize.afmt.matchAll(/data-xhz="([a-z]+)"/g)].map((m) => m[1]))];
		for (const key of parts) {
			// "grid" takes the guide lines off rather than hiding the box.
			if (key === 'grid') expect(css).toContain('.card-body.xhz-h-grid .writer');
			else expect(css).toContain(`.card-body.xhz-h-${key} [data-xhz='${key}']`);
		}
	});

	// Some clients re-run a card's scripts by eval'ing their text, and the HTML
	// tokenizer has its own rules inside script data — a tag written in a comment
	// (`an <audio> element`) is one edge case away from taking the card down. A
	// comparison (`i < n`) is fine; a tag-shaped `<` is not.
	it('keeps every script body free of markup', () => {
		for (const tmpl of [recognize.afmt, write.afmt, write.qfmt, recognize.qfmt]) {
			for (const [, body] of tmpl.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
				expect(body).not.toMatch(/<[a-zA-Z!/]/);
			}
		}
	});

	it('guards every optional block so an empty field leaves no chrome behind', () => {
		for (const tmpl of [recognize.afmt, write.afmt]) {
			expect(tmpl).toContain('{{#Evolution}}');
			expect(tmpl).toContain('{{#Regional}}');
			expect(tmpl).toContain('{{#Examples}}');
			expect(tmpl).toContain('{{#Colloquial}}');
			expect(tmpl).toContain('{{#StrokeData}}');
		}
	});
});

describe('radicalReq', () => {
	it('requires the glyph for card 1 and stroke data for card 2', () => {
		const [first, second] = radicalReq();
		expect(first[0]).toBe(0);
		expect(first[2]).toEqual([RADICAL_FIELDS.indexOf('Radical')]);
		expect(second[2]).toContain(RADICAL_FIELDS.indexOf('StrokeData'));
	});

	// The ordinals index the template list, so dropping a card has to renumber.
	it('declares exactly the cards the options ask for, in order', () => {
		const req = radicalReq(radicalOptions('free', { cards: ['write'] }));
		expect(req).toHaveLength(1);
		expect(req[0][0]).toBe(0);
		expect(req[0][2]).toContain(RADICAL_FIELDS.indexOf('StrokeData'));
	});
});

describe('radicalOptions', () => {
	it('gives both editions both cards — the free deck is generated in the browser', () => {
		expect(radicalOptions('free').cards).toEqual(['recognize', 'write']);
		expect(radicalOptions('premium').cards).toEqual(['recognize', 'write']);
	});

	it('keeps the bought detail out of a free deck however it is configured', () => {
		const free = radicalOptions('free', { glyphs: true, asWord: true });
		expect(free.glyphs).toBe(false);
		expect(free.asWord).toBe(false);
	});

	it('never leaves a note type with no template at all', () => {
		expect(radicalOptions('free', { cards: [] }).cards).toEqual(['recognize']);
	});

	it('keeps the cards in card order whatever order they are given in', () => {
		expect(radicalOptions('free', { cards: ['write', 'recognize'] }).cards).toEqual([
			'recognize',
			'write'
		]);
	});
});

describe('deck options', () => {
	it('drops a section from the answer when it is switched off', () => {
		const [card] = radicalTemplates(
			radicalOptions('free', { cards: ['recognize'], readings: false, examples: false })
		);
		expect(card.afmt).not.toContain('Readings across East Asia');
		expect(card.afmt).not.toContain('Characters built with it');
		expect(card.afmt).toContain('writer-wrap');
	});

	it('builds one card when only one is asked for', () => {
		const cards = radicalTemplates(radicalOptions('free', { cards: ['write'] }));
		expect(cards.map((c) => c.name)).toEqual(['Write']);
		expect(cards[0].qfmt).toContain('data-mode="quiz"');
	});

	it('leaves no writer on the back with stroke order off', () => {
		const [card] = radicalTemplates(
			radicalOptions('free', { cards: ['recognize'], strokeOrder: false })
		);
		expect(card.afmt).not.toContain('data-mode="animate"');
	});

	it('cancels the tone palette rather than dropping the tone classes', () => {
		// The note HTML is built once; only the CSS knows whether tones are coloured.
		expect(radicalCss(radicalOptions('free', { toneColors: false }))).toContain(
			'.t1, .t2, .t3, .t4, .t5 { color: inherit; }'
		);
		expect(radicalCss('premium')).not.toContain('color: inherit;');
	});
});

describe('editions', () => {
	it('ships both cards in both editions', () => {
		expect(radicalTemplates('free').map((t) => t.name)).toEqual(['Recognize', 'Write']);
		expect(radicalTemplates('premium').map((t) => t.name)).toEqual(['Recognize', 'Write']);
	});

	it('asks the same question in both editions, and answers it in more detail in premium', () => {
		// The question asks the same thing; only the sidebar, a premium feature,
		// tells the two fronts apart.
		const freeFront = radicalTemplates('free')[0].qfmt;
		const premiumFront = radicalTemplates('premium')[0].qfmt;
		for (const part of ['{{Radical}}', 'Kangxi radical {{Number}}', '{{StrokeLabel}}']) {
			expect(freeFront).toContain(part);
			expect(premiumFront).toContain(part);
		}
		expect(freeFront).not.toContain('bar-btn--tool');
		expect(premiumFront).toContain('bar-btn--tool cog');
		const freeBack = radicalTemplates('free')[0].afmt;
		const premiumBack = radicalTemplates('premium')[0].afmt;
		expect(premiumBack).not.toBe(freeBack);
		// Premium-only detail: the zhuyin, the word sense, the codepoint.
		for (const extra of ['{{Zhuyin}}', '{{AsWord}}', '{{Unicode}}']) {
			expect(premiumBack).toContain(extra);
			expect(freeBack).not.toContain(extra);
		}
	});

	// Sharing a model id would make importing one deck rewrite another's card
	// templates, deleting or duplicating its cards.
	it('is a separate note type per edition and per card type', () => {
		const ids = [
			modelId('free', 'recognize'),
			modelId('free', 'write'),
			modelId('premium', 'recognize'),
			modelId('premium', 'write')
		];
		expect(new Set(ids).size).toBe(4);
		expect(new Set(ids.map((_, i) => i)).size).toBe(4);
		expect(modelId('premium')).toBe(RADICAL_MODEL_ID);
		expect(modelName('free', 'write')).not.toBe(modelName('premium', 'write'));
		expect(modelName('premium', 'write')).not.toBe(modelName('premium', 'recognize'));
	});

	it('gives the same radical a different guid per edition and card type', () => {
		const guids = [
			radicalNoteGuid(yue, 'free', 'recognize'),
			radicalNoteGuid(yue, 'free', 'write'),
			radicalNoteGuid(yue, 'premium', 'recognize'),
			radicalNoteGuid(yue, 'premium', 'write')
		];
		expect(new Set(guids).size).toBe(4);
		expect(radicalNoteGuid(yue)).toBe(radicalNoteGuid(yue, 'premium', 'recognize'));
	});

	// Recognition and writing are separate work; one deck each.
	it('names a deck per card type under the edition parent', () => {
		expect(radicalDeckName('premium')).toBe('Anki xiehanzi::Kangxi Radicals');
		expect(radicalDeckName('free')).toBe('Anki xiehanzi::Kangxi Radicals (Free)');
		expect(radicalDeckName('free', 'write')).toBe('Anki xiehanzi::Kangxi Radicals (Free)::Write');
		expect(radicalDeckName('premium', 'recognize')).toBe(
			'Anki xiehanzi::Kangxi Radicals::Recognize'
		);
	});
});

describe('orderByKangxi', () => {
	/** Just enough of a sql.js handle to record what the rewrite would run. */
	function fakeDb(rows: [number, string][]) {
		const ran: { sql: string; params: unknown[] }[] = [];
		return {
			ran,
			exec: () => [{ values: rows }],
			prepare: (sql: string) => ({
				run: (params: unknown[]) => ran.push({ sql, params }),
				free: () => {}
			}),
			run: () => {}
		};
	}

	it('numbers notes and cards by the Kangxi number in the note', () => {
		const fields = (n: number) =>
			RADICAL_FIELDS.map((f) => (f === 'Number' ? String(n) : '')).join('\x1f');
		const db = fakeDb([
			[11, fields(7)],
			[12, fields(2)]
		]);
		orderByKangxi(db);
		// The number goes to both the note's sort field and its cards' due, so the
		// browser lists and the new queue introduces the deck in table order.
		expect(db.ran.map((r) => r.params)).toEqual([
			[7, 11],
			[7, 11],
			[2, 12],
			[2, 12]
		]);
		expect(db.ran[0].sql).toContain('notes');
		expect(db.ran[1].sql).toContain('cards');
	});

	it('does nothing to an empty collection', () => {
		const db = fakeDb([]);
		db.exec = () => [];
		expect(() => orderByKangxi(db)).not.toThrow();
	});
});

describe('media names', () => {
	it('namespaces glyphs and numbers audio', () => {
		expect(glyphMedia('kai-cn-6708.svg')).toBe('_xhzr-kai-cn-6708.svg');
		expect(audioFile({ number: 1 })).toBe('xhz-radical-1.mp3');
		expect(audioFile({ number: 1 }, 'm4a')).toBe('xhz-radical-1.m4a');
	});

	it('does not reuse the HSK note type id', () => {
		expect(RADICAL_MODEL_ID).not.toBe('1969669503');
		expect(RADICAL_MODEL_ID).not.toBe('1969669504');
	});
});
