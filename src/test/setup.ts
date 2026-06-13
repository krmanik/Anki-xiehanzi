import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';

// The export-success confetti needs a canvas 2d context jsdom can't provide;
// stub the module so mounting ExportSuccess in tests is a no-op burst.
vi.mock('@hiseb/confetti', () => ({ default: () => {} }));

// jsdom doesn't implement matchMedia; flowbite-svelte touches it at import.
if (!window.matchMedia) {
	window.matchMedia = (query: string) =>
		({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false
		}) as unknown as MediaQueryList;
}

// jsdom implements neither the Web Animations API nor a canvas 2d context, both
// of which the export-success confetti touches on mount. Stub element.animate so
// the burst doesn't throw "element.animate is not a function".
if (!Element.prototype.animate) {
	Element.prototype.animate = () =>
		({
			cancel: () => {},
			finish: () => {},
			play: () => {},
			pause: () => {},
			reverse: () => {},
			onfinish: null,
			oncancel: null,
			finished: Promise.resolve()
		}) as unknown as Animation;
}

// Unmount components between tests so each starts from a clean DOM.
afterEach(() => cleanup());
