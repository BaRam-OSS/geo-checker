import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The hole this closes: a hosted auditor validates the submitted URL, then the target answers the audit's own
 * request with `302 → http://127.0.0.1/…`. The redirect must be refused before a request is made to it.
 */
const request = vi.fn();
vi.mock('undici', async (importOriginal) => ({ ...(await importOriginal<typeof import('undici')>()), request: (...args: unknown[]) => request(...args) }));

import { BlockedAddressError } from '../../src/fetcher/network-guard.js';
import { fetchStatic } from '../../src/fetcher/static.js';

const redirectTo = (location: string) => ({ statusCode: 302, headers: { location }, body: { dump: async () => undefined, text: async () => '' } });
const ok = (body: string) => ({ statusCode: 200, headers: {}, body: { dump: async () => undefined, text: async () => body } });

beforeEach(() => request.mockReset());

describe('fetchStatic redirects', () => {
  it('premise: without publicOnly the redirect to a local address is followed', async () => {
    request.mockResolvedValueOnce(redirectTo('http://127.0.0.1:8080/admin')).mockResolvedValueOnce(ok('internal-secret'));
    const res = await fetchStatic('https://example.com/');
    expect(res.body).toBe('internal-secret');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('with publicOnly the redirect is refused and no request reaches the local address', async () => {
    request.mockResolvedValueOnce(redirectTo('http://127.0.0.1:8080/admin')).mockResolvedValueOnce(ok('internal-secret'));
    await expect(fetchStatic('https://example.com/', { publicOnly: true })).rejects.toBeInstanceOf(BlockedAddressError);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('refuses redirects to metadata addresses, other schemes, and relative hops that stay public are fine', async () => {
    request.mockResolvedValueOnce(redirectTo('http://169.254.169.254/latest/meta-data/'));
    await expect(fetchStatic('https://example.com/', { publicOnly: true })).rejects.toBeInstanceOf(BlockedAddressError);

    request.mockReset();
    request.mockResolvedValueOnce(redirectTo('file:///etc/passwd'));
    await expect(fetchStatic('https://example.com/', { publicOnly: true })).rejects.toBeInstanceOf(BlockedAddressError);

    request.mockReset();
    request.mockResolvedValueOnce(redirectTo('/next')).mockResolvedValueOnce(ok('page'));
    const res = await fetchStatic('https://example.com/', { publicOnly: true });
    expect(res.finalUrl).toBe('https://example.com/next');
    expect(res.body).toBe('page');
  });

  it('passes the guarded dispatcher on every request when publicOnly is set', async () => {
    request.mockResolvedValueOnce(ok('page'));
    await fetchStatic('https://example.com/', { publicOnly: true });
    expect(request.mock.calls[0]?.[1]?.dispatcher).toBeDefined();
    request.mockReset();
    request.mockResolvedValueOnce(ok('page'));
    await fetchStatic('https://example.com/');
    expect(request.mock.calls[0]?.[1]?.dispatcher).toBeUndefined();
  });
});
