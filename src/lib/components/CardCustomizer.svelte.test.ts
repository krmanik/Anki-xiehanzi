import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CardCustomizer from './CardCustomizer.svelte';
import { DEFAULT_TEMPLATE, CARD_STYLE_LS_KEY } from '$lib/deckTemplate';

vi.mock('hanzi-writer', () => ({
	default: { create: () => ({ loopCharacterAnimation() {}, hideCharacter() {} }) }
}));

const ICON = '[class*="bg-[#5b6a9e]"]';

function baseProps(over: Record<string, unknown> = {}) {
	return {
		template: JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)),
		elementStyles: {},
		frontItems: ['Simplified'],
		backItems: ['Simplified', 'Definitions'],
		cardName: 'Card 1',
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

		// Switch to a normal field → no position controls.
		await user.click(screen.getByText('Simplified 大'));
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

		await user.click(screen.getByText('Simplified 大'));
		await user.click(screen.getByText('Visible')); // toggles to Hidden
		expect(container.innerHTML).toContain('opacity-30');
		expect(screen.getByText('Hidden')).toBeInTheDocument();
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
