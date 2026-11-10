import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { fireEvent, render, screen } from '@testing-library/svelte';
import Button from './Button.svelte';
import Chip from './Chip.svelte';
import DataTable from './DataTable.svelte';
import PageHeader from './PageHeader.svelte';

const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('Button', () => {
	it('is a link with href and a button without', () => {
		render(Button, { props: { href: '/hsk', children: text('Lists') } });
		expect(screen.getByRole('link', { name: 'Lists' })).toHaveAttribute('href', '/hsk');
		render(Button, { props: { children: text('Go') } });
		expect(screen.getByRole('button', { name: 'Go' })).toHaveAttribute('type', 'button');
	});
});

describe('Chip', () => {
	it('exposes its state as aria-pressed and shows the count', () => {
		render(Chip, { props: { selected: true, count: 1241, children: text('Verb') } });
		const chip = screen.getByRole('button', { name: /verb/i });
		expect(chip).toHaveAttribute('aria-pressed', 'true');
		expect(chip).toHaveTextContent('1,241');
	});
});

describe('PageHeader', () => {
	it('links every crumb but the current page', () => {
		render(PageHeader, {
			props: {
				title: 'HSK 3',
				crumbs: [{ label: 'HSK lists', href: '/hsk' }, { label: 'Level 3', href: '/hsk/new/3' }]
			}
		});
		expect(screen.getByRole('heading', { level: 1, name: 'HSK 3' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'HSK lists' })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Level 3' })).toBeNull();
		expect(screen.getByText('Level 3')).toHaveAttribute('aria-current', 'page');
	});
});

interface W {
	s: string;
	y: string;
	o: string[];
}
const words: W[] = [
	{ s: '中', y: 'zhōng', o: ['Noun'] },
	{ s: '会', y: 'huì', o: ['Verb'] },
	{ s: '用', y: 'yòng', o: ['Verb'] }
];

function mountTable() {
	return render(DataTable<W>, {
		props: {
			rows: words,
			key: (w: W) => w.s,
			text: (w: W) => `${w.s} ${w.y}`,
			facets: (w: W) => w.o,
			label: 'Words',
			placeholder: 'Filter words',
			row: createRawSnippet((w: () => W) => ({ render: () => `<span>${w().s} ${w().y}</span>` })),
			bulk: createRawSnippet((sel: () => string[]) => ({
				render: () => `<span data-testid="bulk">${sel().join(',')}</span>`
			}))
		}
	});
}

describe('DataTable', () => {
	it('filters by toneless pinyin', async () => {
		mountTable();
		await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'yong' } });
		expect(screen.getByText('用 yòng')).toBeInTheDocument();
		expect(screen.queryByText('中 zhōng')).toBeNull();
		expect(screen.getByText('1 of 3')).toBeInTheDocument();
	});

	it('narrows by a facet chip', async () => {
		mountTable();
		await fireEvent.click(screen.getByRole('button', { name: /^verb/i }));
		expect(screen.queryByText('中 zhōng')).toBeNull();
		expect(screen.getByText('2 of 3')).toBeInTheDocument();
	});

	it('shows the bulk bar for a selection and select-all takes what is shown', async () => {
		mountTable();
		expect(screen.queryByRole('region', { name: 'Selection' })).toBeNull();
		await fireEvent.click(screen.getByRole('checkbox', { name: 'Select 会' }));
		expect(screen.getByRole('region', { name: 'Selection' })).toHaveTextContent(/1\s*1 selected/);
		await fireEvent.click(screen.getByRole('button', { name: /^verb/i }));
		await fireEvent.click(screen.getByRole('checkbox', { name: 'Select all shown' }));
		expect(screen.getByRole('region', { name: 'Selection' })).toHaveTextContent(/2\s*2 selected/);
		expect(screen.getByRole('checkbox', { name: 'Select 用' })).toBeChecked();
		// Clearing the facet shows 中 again, still unselected.
		await fireEvent.click(screen.getByRole('button', { name: /^all/i }));
		expect(screen.getByRole('checkbox', { name: 'Select 中' })).not.toBeChecked();
	});
});

describe('DataTable facet overflow', () => {
	it('folds rare facets behind "more"', async () => {
		render(DataTable<W>, {
			props: {
				rows: words,
				key: (w: W) => w.s,
				text: (w: W) => w.s,
				facets: (w: W) => w.o,
				maxFacets: 1,
				label: 'Words',
				row: createRawSnippet((w: () => W) => ({ render: () => `<span>${w().s}</span>` }))
			}
		});
		expect(screen.getByRole('button', { name: /^verb/i })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /^noun/i })).toBeNull();
		await fireEvent.click(screen.getByRole('button', { name: '1 more…' }));
		expect(screen.getByRole('button', { name: /^noun/i })).toBeInTheDocument();
	});
});
