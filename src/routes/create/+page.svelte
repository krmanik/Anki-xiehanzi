<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Alert,
		Button,
		Checkbox,
		Fileupload,
		Input,
		Label,
		Progressbar,
		Select,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Textarea
	} from 'flowbite-svelte';
	import { CircleX } from '@lucide/svelte';

	import CONSTANTS from '$lib/dict/contants';
	import {
		cutParagraph,
		generateDeck,
		initJieba,
		loadDict,
		loadHskWordsDict,
		lookupWord,
		setupSql,
		type TabContent,
		type Word
	} from '$lib/deck';

	const FIELDS = CONSTANTS.FIELDS;

	let words = $state<Word[]>([]);
	let deckName = $state('xiehanzi');
	let fields = $state<string[]>([
		FIELDS.SIMPLIFIED,
		FIELDS.TRADITIONAL,
		FIELDS.PINYIN,
		FIELDS.ZHUYIN,
		FIELDS.DEFINITIONS,
		FIELDS.AUDIO
	]);
	let includeAudio = $state(false);
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
		'Card 1': { front: [], back: [], additional: [] }
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

	const fieldsArray = [
		{ id: FIELDS.SIMPLIFIED, label: 'Simplified' },
		{ id: FIELDS.TRADITIONAL, label: 'Traditional' },
		{ id: FIELDS.PINYIN, label: 'Pinyin' },
		{ id: FIELDS.ZHUYIN, label: 'Zhuyin' },
		{ id: FIELDS.DEFINITIONS, label: 'English Definitions' },
		{ id: FIELDS.AUDIO, label: 'Audio' }
	];

	const additionalComponents = [{ id: 'writingComponent', label: 'Writing Component' }];

	const rowsPerPageOptions = [5, 10, 25, 50, 100, 500].map((n) => ({ value: n, name: String(n) }));

	// Sync Audio field with includeAudio checkbox
	$effect(() => {
		if (includeAudio && !fields.includes(FIELDS.AUDIO)) {
			fields = [...fields, FIELDS.AUDIO];
		} else if (!includeAudio && fields.includes(FIELDS.AUDIO)) {
			fields = fields.filter((field) => field !== FIELDS.AUDIO);
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
		tabContent = { ...tabContent, [name]: { front: [], back: [], additional: [] } };
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
			onProgress: (v) => (progressbarValue = v)
		});
	}

	// derived view
	let displayColumns = $derived(fields.filter((f) => f !== FIELDS.AUDIO));
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

			<h2 class="mt-6 text-xl font-semibold">Create Card Types</h2>
			<div>
				<ul class="flex flex-wrap gap-2 border-b border-gray-200">
					{#each tabs as tab, index (tab)}
						<li
							class="flex cursor-pointer items-center gap-1 rounded-t px-3 py-2 {activeTab === index
								? 'bg-gray-100 font-semibold'
								: ''}"
						>
							<span onclick={() => (activeTab = index)} role="button" tabindex="0">{tab}</span>
							<button onclick={() => handleCloseTab(index)} aria-label="close tab">
								<CircleX size={16} />
							</button>
						</li>
					{/each}
					<li class="cursor-pointer px-3 py-2 text-lg" onclick={handleAddTab}>+</li>
				</ul>

				<div class="py-4">
					{#if tabContent[tabs[activeTab]]}
						<h3 class="mt-4 font-semibold">Front Side</h3>
						<div>
							{#each fieldsArray as field}
								{#if fields.includes(field.id)}
									<Checkbox
										checked={tabContent[tabs[activeTab]].front.includes(`front${field.id}`)}
										onchange={() => handleCheckboxChange(`front${field.id}`, 'front')}
									>
										{field.label}
									</Checkbox>
								{/if}
							{/each}
						</div>

						<h3 class="mt-4 font-semibold">Back Side</h3>
						<Alert color="blue">
							All fields are available in back side, use side bar during deck review and turn off the
							fields you don't want to see.
						</Alert>

						<h3 class="mt-4 font-semibold">Additional Components</h3>
						<div>
							{#each additionalComponents as component}
								<Checkbox
									checked={tabContent[tabs[activeTab]].additional.includes(component.id)}
									onchange={() => handleCheckboxChange(component.id, 'additional')}
								>
									{component.label}
								</Checkbox>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if page === 2}
		<div>
			<h2 class="text-xl font-semibold">Enter Chinese Characters</h2>

			<div class="my-4 w-60">
				<Label class="mb-1">Input type</Label>
				<Select items={selectionTypes} bind:value={selectType} />
			</div>

			{#if selectType === 'Word'}
				<div class="my-4 flex items-center gap-4">
					<Input class="w-3/5" bind:value={wordValue} />
					<Button onclick={() => searchAndAdd(wordValue)}>Add</Button>
				</div>
			{/if}

			{#if selectType === 'File'}
				<div class="my-4">
					<Fileupload accept="text/*" onchange={handleFileChange} />
					{#if fileStatus}<p class="mt-1 text-sm text-gray-500">{fileStatus}</p>{/if}
				</div>
			{/if}

			{#if selectType === 'Paragraph'}
				<div class="my-4">
					<Textarea rows={5} bind:value={texAreaValue} />
					<div class="mt-2">
						<Button onclick={generateFromParagraph}>Generate</Button>
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

			<Table>
				<TableHead>
					<TableHeadCell class="w-12"></TableHeadCell>
					{#each displayColumns as col}
						<TableHeadCell>{col}</TableHeadCell>
					{/each}
				</TableHead>
				<TableBody>
					{#each pagedWords as word (word)}
						<TableBodyRow>
							<TableBodyCell>
								<Checkbox checked={selected.has(word)} onchange={() => toggleRow(word)} />
							</TableBodyCell>
							{#each displayColumns as col}
								<TableBodyCell class="whitespace-normal align-top"
									>{@html (word as any)[col]}</TableBodyCell
								>
							{/each}
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>

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
