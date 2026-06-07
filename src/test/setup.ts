import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';

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

// Unmount components between tests so each starts from a clean DOM.
afterEach(() => cleanup());
