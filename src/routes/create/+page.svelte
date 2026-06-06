<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Alert,
		Button,
		Checkbox,
		Fileupload,
		Input,
		Progressbar,
		Select,
		Textarea
	} from 'flowbite-svelte';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import WordCard from '$lib/components/WordCard.svelte';
	import CardPreview from '$lib/components/CardPreview.svelte';

	import CONSTANTS from '$lib/dict/contants';
	import {
		cutParagraph,
		generateDeck,
		initJieba,
		loadDict,
		loadHskWordsDict,
		lookupWord,
		playWordAudio,
		setupSql,
		type TabContent,
		type Word
	} from '$lib/deck';

	const FIELDS = CONSTANTS.FIELDS;

	const DISPLAY_FIELDS = [
		FIELDS.SIMPLIFIED,
		FIELDS.TRADITIONAL,
		FIELDS.PINYIN,
		FIELDS.ZHUYIN,
		FIELDS.DEFINITIONS
	];

	// Defaults for a new card type: Simplified on front, all display fields on back.
	function newCard() {
		return {
			front: [`front${FIELDS.SIMPLIFIED}`],
			back: DISPLAY_FIELDS.map((f) => `back${f}`),
			additional: [] as string[]
		};
	}

	const WRITING = 'writingComponent';

	let words = $state<Word[]>([]);
	let deckName = $state('xiehanzi');
	// Ordered list of card items: note fields + the writing component, all
	// reorderable. `fields` (the apkg note fields) is derived from it.
	let order = $state<string[]>([
		FIELDS.SIMPLIFIED,
		FIELDS.TRADITIONAL,
		FIELDS.PINYIN,
		FIELDS.ZHUYIN,
		FIELDS.DEFINITIONS,
		FIELDS.AUDIO,
		WRITING
	]);
	let fields = $derived(order.filter((o) => o !== WRITING));
	let includeAudio = $state(false);
	let template = $state({ mono: false, colorHanzi: true, colorPinyin: true, font: 'default' });
	let page = $state(1);
	let wordValue = $state('');
	let selectType = $state('Word');
	let texAreaValue = $state('');
	let db = $state<any>(null);
	let progressbarValue = $state(0);
	let hskWordsDict = $state<Set<string>>(new Set());
	let fileStatus = $state('');

	let activeTab = $state(0);
	let tabs = $state<string[]>(['Card 1']);
	let tabContent = $state<TabContent>({
		'Card 1': newCard()
	});

	// table selection / pagination
	let selected = $state<Set<Word>>(new Set());
	let currentPage = $state(1);
	let rowsPerPage = $state(10);

	const prevNextButtonText = ['', 'Create Card Types', 'Input Chinese Characters'];

	const selectionTypes = [
		{ value: 'Word', name: 'Word' },
		{ value: 'Paragraph', name: 'Paragraph' },
		{ value: 'File', name: 'File' }
	];

	const fieldLabels: Record<string, string> = Object.fromEntries(
		[
			{ id: WRITING, label: 'Writing Component' },
			{ id: FIELDS.SIMPLIFIED, label: 'Simplified' },
			{ id: FIELDS.TRADITIONAL, label: 'Traditional' },
			{ id: FIELDS.PINYIN, label: 'Pinyin' },
			{ id: FIELDS.ZHUYIN, label: 'Zhuyin' },
			{ id: FIELDS.DEFINITIONS, label: 'English Definitions' },
			{ id: FIELDS.AUDIO, label: 'Audio' }
		].map((f) => [f.id, f.label])
	);

	// ---- field ordering (drag + up/down) ----
	let dragIndex = $state<number | null>(null);

	function moveField(index: number, dir: -1 | 1) {
		const j = index + dir;
		if (j < 0 || j >= order.length) return;
		const next = [...order];
		[next[index], next[j]] = [next[j], next[index]];
		order = next;
	}

	function onFieldDrop(target: number) {
		if (dragIndex === null || dragIndex === target) return;
		const next = [...order];
		const [moved] = next.splice(dragIndex, 1);
		next.splice(target, 0, moved);
		order = next;
		dragIndex = null;
	}

	// active card preview: ordered field ids selected on each side
	const frontOnSide = $derived(
		fields.filter((f) => tabContent[tabs[activeTab]]?.front.includes(`front${f}`))
	);
	const backOnSide = $derived(
		fields.filter((f) => tabContent[tabs[activeTab]]?.back.includes(`back${f}`))
	);
	const writingOn = $derived(
		tabContent[tabs[activeTab]]?.additional.includes('writingComponent') ?? false
	);

	const rowsPerPageOptions = [5, 10, 25, 50, 100, 500].map((n) => ({ value: n, name: String(n) }));

	// Sync Audio field with includeAudio checkbox (Audio sits before the writing component)
	$effect(() => {
		if (includeAudio && !order.includes(FIELDS.AUDIO)) {
			const wi = order.indexOf(WRITING);
			const next = [...order];
			next.splice(wi === -1 ? next.length : wi, 0, FIELDS.AUDIO);
			order = next;
		} else if (!includeAudio && order.includes(FIELDS.AUDIO)) {
			order = order.filter((o) => o !== FIELDS.AUDIO);
		}
	});

	onMount(async () => {
		loadDict();
		initJieba();
		db = await setupSql();
		console.log('SQL DB loaded...');
		hskWordsDict = await loadHskWordsDict();
	});

	// ---- card-type tabs ----
	function findNextTabNumber() {
		let n = 1;
		while (tabs.includes(`Card ${n}`)) n++;
		return n;
	}

	function handleAddTab() {
		const name = `Card ${findNextTabNumber()}`;
		tabs = [...tabs, name];
		tabContent = { ...tabContent, [name]: newCard() };
		activeTab = tabs.length - 1;
	}

	function handleCloseTab(index: number) {
		const removed = tabs[index];
		tabs = tabs.filter((_, i) => i !== index);
		const next = { ...tabContent };
		delete next[removed];
		tabContent = next;
		activeTab = 0;
	}

	function handleCheckboxChange(fieldId: string, side: 'front' | 'back' | 'additional') {
		const current = tabs[activeTab];
		const content = { ...tabContent[current] };
		const isChecked = content[side].includes(fieldId);
		content[side] = isChecked
			? content[side].filter((id) => id !== fieldId)
			: [...content[side], fieldId];
		tabContent = { ...tabContent, [current]: content };
	}

	// ---- word lookup ----
	async function searchAndAdd(word: string) {
		if (!word.trim()) return;
		if (words.some((w) => w.Simplified === word.trim())) return;
		const result = await lookupWord(word);
		words = [...words, result];
		wordValue = '';
	}

	async function generateWords(file: File) {
		fileStatus = 'Processing...';
		const text = await file.text();
		const lines = text.split('\n');
		const added: Word[] = [];
		for (const line of lines) {
			if (!line.trim()) continue;
			if (words.some((w) => w.Simplified === line.trim())) continue;
			if (added.some((w) => w.Simplified === line.trim())) continue;
			added.push(await lookupWord(line));
		}
		words = [...words, ...added];
		fileStatus = 'Completed';
	}

	async function generateFromParagraph() {
		const cutWords = cutParagraph(texAreaValue);
		const added: Word[] = [];
		for (const word of cutWords) {
			if (words.some((w) => w.Simplified === word.trim())) continue;
			if (added.some((w) => w.Simplified === word.trim())) continue;
			added.push(await lookupWord(word));
		}
		words = [...words, ...added];
	}

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) generateWords(file);
	}

	// ---- table actions ----
	function toggleRow(word: Word) {
		const next = new Set(selected);
		if (next.has(word)) next.delete(word);
		else next.add(word);
		selected = next;
	}

	function deleteSelectedWord() {
		if (selected.size === 0) return;
		words = words.filter((w) => !selected.has(w));
		selected = new Set();
	}

	function deleteWord(word: Word) {
		words = words.filter((w) => w !== word);
		if (selected.has(word)) {
			const next = new Set(selected);
			next.delete(word);
			selected = next;
		}
	}

	function cancelSelection() {
		selected = new Set();
	}

	function exportCSV() {
		const cols = fields.filter((f) => f !== FIELDS.AUDIO);
		const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
		const header = cols.map(escape).join(',');
		const rows = words.map((w) => cols.map((c) => escape((w as any)[c])).join(','));
		const csv = [header, ...rows].join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${deckName}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function doGenerateDeck() {
		await generateDeck({
			words,
			deckName,
			includeAudio,
			fields,
			tabContent,
			hskWordsDict,
			db,
			template,
			onProgress: (v) => (progressbarValue = v)
		});
	}

	// derived view
	let totalPages = $derived(Math.max(1, Math.ceil(words.length / rowsPerPage)));
	let pagedWords = $derived(
		words.slice((currentPage - 1) * rowsPerPage, (currentPage - 1) * rowsPerPage + rowsPerPage)
	);
</script>

<svelte:head>
	<title>Create Deck — Anki xiehanzi</title>
</svelte:head>

<section class="mx-auto max-w-5xl px-4 py-6">
	<h1 class="mb-4 text-3xl font-bold">Create Deck</h1>

	{#if page === 1}
		<div>
			<h2 class="mt-6 text-xl font-semibold">Enter Deck Title</h2>
			<Input class="w-3/5" placeholder="Text input" bind:value={deckName} />

			<h2 class="mt-6 text-xl font-semibold">Audio Settings</h2>
			<div>
				<Checkbox bind:checked={includeAudio}>Include Audio (Text-to-Speech)</Checkbox>
				<div class="mt-2 text-sm text-gray-500">
					{#if includeAudio}
						⚠️ Audio generation may take longer and requires internet connection
					{:else}
						Audio files will not be generated for faster deck creation
					{/if}
				</div>
				{#if includeAudio}
					<div class="mt-2">
						<Alert color="blue">
							Please open Anki-xiehanzi in Microsoft Edge browser to generate audio using
							Text-to-Speech.
						</Alert>
					</div>
				{/if}
			</div>

			<h2 class="mt-6 text-xl font-semibold">Card Template</h2>
			<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
				<div class="inline-flex overflow-hidden rounded-lg border border-neutral-300">
					<button
						class="px-3 py-1.5 text-sm {!template.mono
							? 'bg-neutral-900 text-white'
							: 'text-neutral-600'}"
						onclick={() => (template.mono = false)}>Tone colors</button
					>
					<button
						class="px-3 py-1.5 text-sm {template.mono
							? 'bg-neutral-900 text-white'
							: 'text-neutral-600'}"
						onclick={() => (template.mono = true)}>Black & white</button
					>
				</div>

				<label class="flex items-center gap-2 text-sm {template.mono ? 'opacity-40' : ''}">
					<input
						type="checkbox"
						class="h-4 w-4 accent-neutral-900"
						bind:checked={template.colorHanzi}
						disabled={template.mono}
					/> Color hanzi
				</label>
				<label class="flex items-center gap-2 text-sm {template.mono ? 'opacity-40' : ''}">
					<input
						type="checkbox"
						class="h-4 w-4 accent-neutral-900"
						bind:checked={template.colorPinyin}
						disabled={template.mono}
					/> Color pinyin
				</label>

				<label class="flex items-center gap-2 text-sm">
					Hanzi font
					<select
						bind:value={template.font}
						class="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
					>
						<option value="default">Default (sans)</option>
						<option value="kaiti">Kaiti 楷体</option>
						<option value="songti">Songti 宋体</option>
					</select>
				</label>
			</div>

			<h2 class="mt-6 text-xl font-semibold">Create Card Types</h2>
			<p class="mb-2 text-sm text-neutral-500">
				Each card type is one Anki template. Drag to set field order, then choose which fields show
				on the front and back. The preview updates live.
			</p>
			<div>
				<ul class="flex flex-wrap gap-2 border-b border-neutral-200">
					{#each tabs as tab, index (tab)}
						<li
							class="flex cursor-pointer items-center gap-1 rounded-t px-3 py-2 text-sm {activeTab ===
							index
								? 'border-b-2 border-neutral-900 font-semibold'
								: 'text-neutral-500'}"
						>
							<span onclick={() => (activeTab = index)} role="button" tabindex="0">{tab}</span>
							{#if tabs.length > 1}
								<button onclick={() => handleCloseTab(index)} aria-label="close tab">
									<CircleX size={15} />
								</button>
							{/if}
						</li>
					{/each}
					<li class="cursor-pointer px-3 py-2 text-lg text-neutral-500" onclick={handleAddTab}>+</li>
				</ul>

				{#if tabContent[tabs[activeTab]]}
					<div class="grid gap-6 py-4 lg:grid-cols-[1fr_320px]">
						<!-- field editor -->
						<div>
							<div
								class="grid grid-cols-[1fr_3rem_3rem] items-center gap-2 px-3 pb-1 font-mono text-[10px] uppercase tracking-wider text-neutral-400"
							>
								<span>Field</span><span class="text-center">Front</span
								><span class="text-center">Back</span>
							</div>
							<ul class="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
								{#each order as item, index (item)}
									<li
										draggable="true"
										ondragstart={() => (dragIndex = index)}
										ondragover={(e) => e.preventDefault()}
										ondrop={() => onFieldDrop(index)}
										class="grid grid-cols-[1fr_3rem_3rem] items-center gap-2 px-3 py-2 {item ===
										WRITING
											? 'bg-neutral-50'
											: 'bg-white'} {dragIndex === index ? 'opacity-50' : ''}"
									>
										<span class="flex items-center gap-2">
											<GripVertical size={15} class="cursor-grab text-neutral-300" />
											<span class="text-sm">{fieldLabels[item] ?? item}</span>
											<span class="ml-auto flex flex-col">
												<button
													class="text-neutral-400 hover:text-neutral-900 disabled:opacity-20"
													disabled={index === 0}
													onclick={() => moveField(index, -1)}
													aria-label="move up"><ChevronUp size={13} /></button
												>
												<button
													class="text-neutral-400 hover:text-neutral-900 disabled:opacity-20"
													disabled={index === order.length - 1}
													onclick={() => moveField(index, 1)}
													aria-label="move down"><ChevronDown size={13} /></button
												>
											</span>
										</span>
										{#if item === WRITING}
											<span class="col-span-2 text-center">
												<input
													type="checkbox"
													class="h-4 w-4 accent-neutral-900"
													checked={tabContent[tabs[activeTab]].additional.includes(WRITING)}
													onchange={() => handleCheckboxChange(WRITING, 'additional')}
												/>
											</span>
										{:else}
											<span class="text-center">
												<input
													type="checkbox"
													class="h-4 w-4 accent-neutral-900"
													checked={tabContent[tabs[activeTab]].front.includes(`front${item}`)}
													onchange={() => handleCheckboxChange(`front${item}`, 'front')}
												/>
											</span>
											<span class="text-center">
												<input
													type="checkbox"
													class="h-4 w-4 accent-neutral-900"
													checked={tabContent[tabs[activeTab]].back.includes(`back${item}`)}
													onchange={() => handleCheckboxChange(`back${item}`, 'back')}
												/>
											</span>
										{/if}
									</li>
								{/each}
							</ul>
							<p class="mt-1 px-1 text-xs text-neutral-400">
								Writing Component spans front & back (it shows the stroke practice card).
							</p>
						</div>

						<!-- live preview -->
						<div class="space-y-3">
							<CardPreview
								label="Front"
								fieldsOnSide={frontOnSide}
								hasWriting={writingOn}
								colorize={!template.mono && template.colorHanzi}
								font={template.font}
							/>
							<CardPreview
								label="Back"
								fieldsOnSide={writingOn ? frontOnSide : backOnSide}
								hasWriting={writingOn}
								colorize={!template.mono && template.colorHanzi}
								font={template.font}
							/>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if page === 2}
		<div>
			<h2 class="text-xl font-semibold">Enter Chinese Characters</h2>

			<div class="my-4 inline-flex overflow-hidden rounded-lg border border-neutral-300">
				{#each selectionTypes as st}
					<button
						class="px-4 py-1.5 text-sm {selectType === st.value
							? 'bg-neutral-900 text-white'
							: 'text-neutral-600 hover:bg-neutral-100'}"
						onclick={() => (selectType = st.value)}>{st.name}</button
					>
				{/each}
			</div>

			{#if selectType === 'Word'}
				<div class="my-4 flex items-center gap-3">
					<Input
						class="w-3/5"
						placeholder="Type a word, e.g. 中国"
						bind:value={wordValue}
						onkeydown={(e) => e.key === 'Enter' && searchAndAdd(wordValue)}
					/>
					<Button onclick={() => searchAndAdd(wordValue)}>Add</Button>
				</div>
			{/if}

			{#if selectType === 'File'}
				<div class="my-4">
					<Fileupload accept="text/*" onchange={handleFileChange} />
					<p class="mt-1 text-sm text-neutral-500">
						{fileStatus || 'Upload a text file with one word per line.'}
					</p>
				</div>
			{/if}

			{#if selectType === 'Paragraph'}
				<div class="my-4">
					<Textarea
						class="w-full"
						rows={6}
						placeholder="Paste Chinese text — it will be segmented into words."
						bind:value={texAreaValue}
					/>
					<div class="mt-2">
						<Button onclick={generateFromParagraph} disabled={!texAreaValue.trim()}>
							Generate words
						</Button>
					</div>
				</div>
			{/if}

			<Progressbar progress={progressbarValue} class="my-4" />
			<p class="mb-2 text-sm text-gray-500">
				{#if progressbarValue > 0}
					{progressbarValue.toFixed(1)}% - {includeAudio ? 'Processing audio...' : 'Processing...'}
				{:else}
					{includeAudio ? 'Ready to generate (includes audio)' : 'Ready to generate (no audio)'}
				{/if}
			</p>

			<div class="my-4 flex flex-wrap items-center justify-between gap-2">
				<div class="flex gap-2">
					<Button color="red" onclick={deleteSelectedWord}>Delete</Button>
					<Button color="alternative" onclick={cancelSelection}>Cancel</Button>
				</div>
				<div class="flex gap-2">
					<Button color="alternative" onclick={exportCSV}>Export CSV</Button>
					<Button onclick={doGenerateDeck}>Generate Deck</Button>
				</div>
			</div>

			{#if words.length === 0}
				<p class="rounded-lg border border-dashed border-neutral-300 py-10 text-center text-sm text-neutral-400">
					No words yet. Add words above to build your deck.
				</p>
			{:else}
				<div class="grid gap-3">
					{#each pagedWords as word (word)}
						<WordCard
							{word}
							selected={selected.has(word)}
							colorize={!template.mono && template.colorHanzi}
							onToggle={() => toggleRow(word)}
							onDelete={() => deleteWord(word)}
							onPlay={() => playWordAudio(word.Simplified, hskWordsDict)}
						/>
					{/each}
				</div>
			{/if}

			<div class="my-4 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="text-sm text-gray-500">Rows per page</span>
					<div class="w-24">
						<Select
							items={rowsPerPageOptions}
							bind:value={rowsPerPage}
							onchange={() => (currentPage = 1)}
						/>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<Button
						size="xs"
						color="alternative"
						disabled={currentPage <= 1}
						onclick={() => (currentPage = currentPage - 1)}>Prev</Button
					>
					<span class="text-sm">Page {currentPage} / {totalPages}</span>
					<Button
						size="xs"
						color="alternative"
						disabled={currentPage >= totalPages}
						onclick={() => (currentPage = currentPage + 1)}>Next</Button
					>
				</div>
			</div>
		</div>
	{/if}

	<nav class="mt-8 flex justify-between">
		{#if page > 1}
			<button class="text-left" onclick={() => (page = page - 1)}>
				<div class="text-sm text-gray-500">Previous</div>
				<div class="font-semibold">{prevNextButtonText[page - 1]}</div>
			</button>
		{:else}
			<div></div>
		{/if}

		{#if page < 2}
			<button class="text-right" onclick={() => (page = page + 1)}>
				<div class="text-sm text-gray-500">Next</div>
				<div class="font-semibold">{prevNextButtonText[page + 1]}</div>
			</button>
		{:else}
			<div></div>
		{/if}
	</nav>
</section>
