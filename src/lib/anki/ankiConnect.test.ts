import { describe, expect, it, vi } from 'vitest';
import { AnkiConnectError, MULTI_CHUNK, chunk, createAnkiConnect, requestBody, unwrap } from './ankiConnect';

/** A fetch that answers each POST body with `reply(body)`. */
function mockFetch(reply: (body: any) => unknown, status = 200) {
	return vi.fn(async (_url: string, init: RequestInit) => {
		const body = JSON.parse(String(init.body));
		return new Response(JSON.stringify(reply(body)), { status });
	}) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}
const ok = (result: unknown) => ({ result, error: null });

describe('requestBody', () => {
	it('sends version 6, params and key only when given', () => {
		expect(JSON.parse(requestBody('version', undefined))).toEqual({ action: 'version', version: 6 });
		expect(JSON.parse(requestBody('findCards', { query: 'deck:x' }, 'k'))).toEqual({
			action: 'findCards',
			version: 6,
			params: { query: 'deck:x' },
			key: 'k'
		});
	});
});

describe('unwrap', () => {
	it('returns the result or throws the error', () => {
		expect(unwrap('a', ok(3))).toBe(3);
		expect(() => unwrap('a', { result: null, error: 'boom' })).toThrow('boom');
		expect(() => unwrap('a', 6)).toThrow(AnkiConnectError);
	});
});

describe('chunk', () => {
	it('splits into fixed-size parts', () => {
		expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
		expect(chunk([], 2)).toEqual([]);
	});
});

describe('call', () => {
	it('posts without a Content-Type header, so no CORS preflight', async () => {
		const f = mockFetch(() => ok(6));
		await createAnkiConnect({ fetch: f }).call('version');
		const [url, init] = f.mock.calls[0];
		expect(url).toBe('http://127.0.0.1:8765');
		expect(init.method).toBe('POST');
		expect(init.headers).toBeUndefined();
		expect(typeof init.body).toBe('string');
	});

	it('marks a network failure as unreachable', async () => {
		const f = vi.fn(async () => {
			throw new TypeError('Failed to fetch');
		}) as unknown as typeof fetch;
		const err = (await createAnkiConnect({ fetch: f }).call('version').catch((e) => e)) as AnkiConnectError;
		expect(err).toBeInstanceOf(AnkiConnectError);
		expect(err.unreachable).toBe(true);
	});

	it('reports an Anki-side error with the action name', async () => {
		const f = mockFetch(() => ({ result: null, error: 'collection is not available' }));
		const err = (await createAnkiConnect({ fetch: f }).call('findCards', { query: '' }).catch((e) => e)) as AnkiConnectError;
		expect(err.message).toBe('collection is not available');
		expect(err.action).toBe('findCards');
		expect(err.unreachable).toBe(false);
	});

	it('explains a 403', async () => {
		const f = mockFetch(() => '', 403);
		await expect(createAnkiConnect({ fetch: f }).call('version')).rejects.toThrow(/not allowed/);
	});
});

describe('multi', () => {
	it('gives every sub-action version 6 (the add-on defaults them to 4)', async () => {
		const f = mockFetch((b) => ok(b.params.actions.map(() => ok(1))));
		await createAnkiConnect({ fetch: f }).multi([{ action: 'a' }, { action: 'b', params: { x: 1 } }]);
		const body = JSON.parse(String(f.mock.calls[0][1].body));
		expect(body.action).toBe('multi');
		expect(body.params.actions).toEqual([
			{ action: 'a', version: 6 },
			{ action: 'b', version: 6, params: { x: 1 } }
		]);
	});

	it('batches, keeps order, and returns failures in place', async () => {
		const f = mockFetch((b) =>
			ok(b.params.actions.map((a: any) => (a.params.i === 5 ? { result: null, error: 'bad' } : ok(a.params.i))))
		);
		const n = MULTI_CHUNK + 20;
		const out = await createAnkiConnect({ fetch: f }).multi(
			Array.from({ length: n }, (_, i) => ({ action: 'x', params: { i } }))
		);
		expect(f).toHaveBeenCalledTimes(2);
		expect(out).toHaveLength(n);
		expect(out[0]).toBe(0);
		expect(out[n - 1]).toBe(n - 1);
		expect(out[5]).toBeInstanceOf(Error);
	});
});

describe('connect', () => {
	const connectWith = (reply: (b: any) => unknown, key?: string) =>
		createAnkiConnect({ fetch: mockFetch(reply), key }).connect();

	it('asks for permission first — the only action an unlisted origin can read', async () => {
		const f = mockFetch(() => ok({ permission: 'granted', requireApikey: false, version: 6 }));
		expect(await createAnkiConnect({ fetch: f }).connect()).toEqual({ status: 'ready', version: 6 });
		expect(JSON.parse(String(f.mock.calls[0][1].body)).action).toBe('requestPermission');
	});

	it('maps each answer to a status', async () => {
		expect((await connectWith(() => ok({ permission: 'denied' }))).status).toBe('denied');
		expect((await connectWith(() => ok({ permission: 'granted', version: 5 }))).status).toBe('outdated');
		expect((await connectWith(() => ok({ permission: 'granted', version: 6, requireApikey: true }))).status).toBe(
			'needs-key'
		);
		expect(
			(await connectWith(() => ok({ permission: 'granted', version: 6, requireApikey: true }), 'k')).status
		).toBe('ready');
		expect((await connectWith(() => ({ result: null, error: 'unsupported action' }))).status).toBe('outdated');
	});

	it('is unreachable when nothing answers', async () => {
		const f = vi.fn(async () => {
			throw new TypeError('Failed to fetch');
		}) as unknown as typeof fetch;
		expect(await createAnkiConnect({ fetch: f }).connect()).toEqual({ status: 'unreachable' });
	});
});
