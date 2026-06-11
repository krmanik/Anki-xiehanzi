import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CardCustomizer from './CardCustomizer.svelte';
import { DEFAULT_TEMPLATE, CARD_STYLE_LS_KEY } from '$lib/deckTemplate';

vi.mock('hanzi-writer', () => ({
	default: { create: () => ({ loopCharacterAnimation() {}, hideCharacter() {} }) }
}));

const ICON = 'span[style*="btn-radius"]';

function baseProps(over: Record<string, unknown> = {}) {
	return {
		template: JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)),
		tabs: ['Card 1'],
		activeTab: 0,
		tabContent: {
			'Card 1': {
				front: ['frontSimplified'],
				back: ['backSimplified', 'backDefinitions', 'backControlButtons', 'backSeparator'],
				additional: [],
				elementStyles: {}
			}
		},
		order: ['Simplified', 'Pinyin', 'Definitions', 'ControlButtons', 'Separator'],
		fieldLabels: { Simplified: 'Simplified', Pinyin: 'Pinyin', Definitions: 'Dictionary Definitions' },
		onclose: vi.fn(),
		...over
	};
}

beforeEach(() => localStorage.clear());

describe('CardCustomizer — element selection + position controls', () => {
	it('shows Up/Down position controls only for hr and control buttons', async () => {
		const user = userEvent.setup();
		render(CardCustomizer, { props: baseProps() });

		// Separator → position controls appear.
		await user.click(screen.getByText('Separator line'));
		expect(screen.getByText('Up')).toBeInTheDocument();
		expect(screen.getByText('Down')).toBeInTheDocument();

		// Switch to a normal field → no position controls. (Label also appears in the
		// group-builder list; the element-list chip is the first match.)
		await user.click(screen.getAllByText('Simplified 大')[0]);
		expect(screen.queryByText('Up')).toBeNull();
		expect(screen.queryByText('Down')).toBeNull();
	});

	it('moving control buttons down swaps their flex order with the separator', async () => {
		const user = userEvent.setup();
		const { container } = render(CardCustomizer, { props: baseProps() });

		await user.click(screen.getByText('Control buttons'));
		await user.click(screen.getByText('Down'));

		// default control order 0 swaps with hr (10) → some control group now order 10.
		const orders = [...container.querySelectorAll(ICON)].map(
			(el) => (el.closest('[role="button"]') as HTMLElement)?.style.order
		);
		expect(orders).toContain('10');
	});
});

describe('CardCustomizer — global tone toggle', () => {
	it('turning on Black & white removes tone colors from the previews', async () => {
		const user = userEvent.setup();
		const { container } = render(CardCustomizer, { props: baseProps() });
		expect(container.querySelector('.tone1')).not.toBeNull();

		await user.click(screen.getByText('Black & white'));
		expect(container.querySelector('.tone1')).toBeNull();
	});
});

describe('CardCustomizer — visibility toggle', () => {
	it('hiding the selected element dims it in the preview', async () => {
		const user = userEvent.setup();
		const { container } = render(CardCustomizer, { props: baseProps() });

		await user.click(screen.getAllByText('Simplified 大')[0]);
		await user.click(screen.getByText('Visible')); // toggles to Hidden
		expect(container.innerHTML).toContain('opacity-30');
		expect(screen.getByText('Hidden')).toBeInTheDocument();
	});
});

describe('CardCustomizer — fields shown inline', () => {
	it('shows front/back field toggles and flips them without closing', async () => {
		const user = userEvent.setup();
		render(CardCustomizer, { props: baseProps() });

		// Pinyin is not on the front yet.
		const pinyinFront = screen.getByLabelText('Pinyin front') as HTMLInputElement;
		expect(pinyinFront.checked).toBe(false);
		await user.click(pinyinFront);
		expect((screen.getByLabelText('Pinyin front') as HTMLInputElement).checked).toBe(true);
	});

	it('collapses and expands the fields block', async () => {
		const user = userEvent.setup();
		render(CardCustomizer, { props: baseProps() });
		expect(screen.getByLabelText('Pinyin front')).toBeInTheDocument();
		await user.click(screen.getByText('Fields — front / back'));
		expect(screen.queryByLabelText('Pinyin front')).toBeNull();
		await user.click(screen.getByText('Fields — front / back'));
		expect(screen.getByLabelText('Pinyin front')).toBeInTheDocument();
	});
});

describe('CardCustomizer — alignment available for every element', () => {
	it('shows the in-card alignment control for a normal field', async () => {
		const user = userEvent.setup();
		render(CardCustomizer, { props: baseProps() });
		await user.click(screen.getByText('Pinyin', { selector: 'button' }));
		expect(screen.getByText('Alignment (in card)')).toBeInTheDocument();
	});
});

describe('CardCustomizer — card-type switcher', () => {
	it('shows a tab per card type when there is more than one and switches between them', async () => {
		const user = userEvent.setup();
		const props = baseProps({
			tabs: ['Card 1', 'Card 2'],
			tabContent: {
				'Card 1': { front: ['frontSimplified'], back: ['backSimplified'], additional: [], elementStyles: {} },
				'Card 2': { front: ['frontPinyin'], back: ['backDefinitions'], additional: [], elementStyles: {} }
			}
		});
		render(CardCustomizer, { props });

		// Header reflects the active card; both card-type tabs are present.
		expect(screen.getByRole('heading', { name: /Advanced Card Designer — Card 1/ })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Card 2' }));
		expect(screen.getByRole('heading', { name: /Advanced Card Designer — Card 2/ })).toBeInTheDocument();
	});

	it('hides the switcher when there is a single card type', () => {
		render(CardCustomizer, { props: baseProps() });
		expect(screen.queryByText('Card type')).toBeNull();
	});
});

describe('CardCustomizer — example sentence sub-parts', () => {
	it('exposes each sentence sub-part as its own customizable element', async () => {
		const user = userEvent.setup();
		render(CardCustomizer, { props: baseProps() });
		// Sub-part chips are present and selectable, showing text properties.
		await user.click(screen.getByText('· Ex. pinyin'));
		expect(screen.getByText('Line height')).toBeInTheDocument();
		expect(screen.getByText('Alignment (in card)')).toBeInTheDocument();
	});
});

describe('CardCustomizer — card text alignment removed', () => {
	it('the card element no longer exposes a text-alignment control', async () => {
		const user = userEvent.setup();
		render(CardCustomizer, { props: baseProps() });
		await user.click(screen.getByText('Card background'));
		expect(screen.queryByText('Text alignment')).toBeNull();
		expect(screen.getByText('Text color (whole card)')).toBeInTheDocument();
	});
});

describe('CardCustomizer — save / cancel', () => {
	it('Save persists to localStorage and closes', async () => {
		const user = userEvent.setup();
		const onclose = vi.fn();
		render(CardCustomizer, { props: baseProps({ onclose }) });

		await user.click(screen.getByText('Save customisation'));
		expect(onclose).toHaveBeenCalledOnce();
		expect(localStorage.getItem(CARD_STYLE_LS_KEY)).toBeTruthy();
	});

	it('Cancel closes without persisting', async () => {
		const user = userEvent.setup();
		const onclose = vi.fn();
		render(CardCustomizer, { props: baseProps({ onclose }) });

		await user.click(screen.getByText('Cancel'));
		expect(onclose).toHaveBeenCalledOnce();
		expect(localStorage.getItem(CARD_STYLE_LS_KEY)).toBeNull();
	});
});
