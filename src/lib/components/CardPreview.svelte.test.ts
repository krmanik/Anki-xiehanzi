import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import CardPreview from './CardPreview.svelte';

// Avoid loading the real stroke-animation engine in jsdom.
vi.mock('hanzi-writer', () => ({
	default: { create: () => ({ loopCharacterAnimation() {}, hideCharacter() {} }) }
}));

const WRITING = 'writingComponent';
const ICON = '[class*="bg-[#5b6a9e]"]';

function controlIcons(container: HTMLElement): number {
	return container.querySelectorAll(ICON).length;
}

describe('CardPreview — chrome (control buttons + separator)', () => {
	it('front side without writer shows no controls and no separator', () => {
		const { container } = render(CardPreview, {
			props: { label: 'Front', side: 'front', items: ['Simplified'] }
		});
		expect(controlIcons(container)).toBe(0);
		expect(container.querySelector('hr')).toBeNull();
	});

	it('back side shows the basic merged control group (3 icons) and a separator', () => {
		const { container } = render(CardPreview, {
			props: { label: 'Back', side: 'back', items: ['Simplified', 'Definitions'] }
		});
		expect(controlIcons(container)).toBe(3);
		expect(container.querySelector('hr')).not.toBeNull();
	});

	it('merges into ONE control group with the full writer toolbar (6 icons) when writing is present', () => {
		const { container } = render(CardPreview, {
			props: { label: 'Front', side: 'front', items: ['Simplified', WRITING] }
		});
		// Single merged group of 6 — never the old two-row 3+5 layout.
		expect(controlIcons(container)).toBe(6);
	});
});

describe('CardPreview — field selection', () => {
	it('renders only the selected fields', () => {
		const { container } = render(CardPreview, {
			props: { label: 'Front', side: 'front', items: ['Simplified'] }
		});
		expect(container.textContent).toContain('中国');
		expect(container.textContent).not.toContain('Zhōng guó'); // pinyin not selected
	});
});

describe('CardPreview — visibility', () => {
	it('hides an element when visible:false and not interactive', () => {
		const { container } = render(CardPreview, {
			props: {
				label: 'Front',
				side: 'front',
				items: ['Simplified'],
				elementStyles: { simplified: { visible: false } }
			}
		});
		expect(container.textContent).not.toContain('中国');
	});

	it('shows a hidden element dimmed when interactive (so it can still be styled)', () => {
		const { container } = render(CardPreview, {
			props: {
				label: 'Front',
				side: 'front',
				items: ['Simplified'],
				interactive: true,
				elementStyles: { simplified: { visible: false } }
			}
		});
		expect(container.textContent).toContain('中国');
		expect(container.innerHTML).toContain('opacity-30');
	});
});

describe('CardPreview — colorize', () => {
	it('wraps hanzi in tone spans when colorize is on', () => {
		const { container } = render(CardPreview, {
			props: { label: 'Front', side: 'front', items: ['Simplified'], colorize: true }
		});
		expect(container.querySelector('.tone1')).not.toBeNull();
	});

	it('drops tone classes when colorize is off', () => {
		const { container } = render(CardPreview, {
			props: { label: 'Front', side: 'front', items: ['Simplified'], colorize: false }
		});
		expect(container.querySelector('.tone1')).toBeNull();
	});
});

describe('CardPreview — alignment (position within card window)', () => {
	it('maps left/right alignment to align-self flex-start/flex-end', () => {
		const right = render(CardPreview, {
			props: {
				label: 'Front',
				side: 'front',
				items: ['Pinyin'],
				elementStyles: { pinyin: { textAlign: 'right' } }
			}
		});
		const el = right.container.querySelector('[style*="align-self"]') as HTMLElement;
		expect(el.style.alignSelf).toBe('flex-end');
		expect(el.style.textAlign).toBe('right');
	});
});

describe('CardPreview — flex order (move up/down mirror)', () => {
	it('applies default order to chrome (controls 0, hr 10)', () => {
		const { container } = render(CardPreview, {
			props: { label: 'Back', side: 'back', items: ['Simplified'] }
		});
		const hrBlock = container.querySelector('hr')!.parentElement as HTMLElement;
		expect(hrBlock.style.order).toBe('10');
		const controlBlock = container.querySelector(ICON)!.closest('[role="button"]') as HTMLElement;
		expect(controlBlock.style.order).toBe('0');
	});

	it('applies an overridden control-button order', () => {
		const { container } = render(CardPreview, {
			props: {
				label: 'Back',
				side: 'back',
				items: ['Simplified'],
				elementStyles: { controlButtons: { order: 95 } }
			}
		});
		const controlBlock = container.querySelector(ICON)!.closest('[role="button"]') as HTMLElement;
		expect(controlBlock.style.order).toBe('95');
	});
});
