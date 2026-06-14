import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import UnitInput from './UnitInput.svelte';

describe('UnitInput', () => {
	it('splits a value into number + unit', () => {
		render(UnitInput, { props: { value: '16px' } });
		expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('16');
		expect((screen.getByLabelText('unit') as HTMLSelectElement).value).toBe('px');
	});

	it('defaults the unit to px when the value has none', () => {
		render(UnitInput, { props: { value: '2' } });
		expect((screen.getByLabelText('unit') as HTMLSelectElement).value).toBe('px');
	});

	it('emits the combined number+unit on number change', async () => {
		const user = userEvent.setup();
		const onchange = vi.fn();
		render(UnitInput, { props: { value: '16px', onchange } });
		await user.clear(screen.getByRole('spinbutton'));
		await user.type(screen.getByRole('spinbutton'), '24');
		expect(onchange).toHaveBeenLastCalledWith('24px');
	});

	it('emits the new unit when the unit changes', async () => {
		const user = userEvent.setup();
		const onchange = vi.fn();
		render(UnitInput, { props: { value: '16px', onchange } });
		await user.selectOptions(screen.getByLabelText('unit'), 'em');
		expect(onchange).toHaveBeenLastCalledWith('16em');
	});

	it('emits undefined when the number is cleared', async () => {
		const user = userEvent.setup();
		const onchange = vi.fn();
		render(UnitInput, { props: { value: '16px', onchange } });
		await user.clear(screen.getByRole('spinbutton'));
		expect(onchange).toHaveBeenLastCalledWith(undefined);
	});
});
