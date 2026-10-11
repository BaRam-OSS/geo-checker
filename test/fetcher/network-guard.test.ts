import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertPublicUrl, BlockedAddressError, isBlockedAddress, publicOnlyLookup } from '../../src/fetcher/network-guard.js';
import { fetchStatic, fetchText } from '../../src/fetcher/static.js';

describe('isBlockedAddress', () => {
  it('blocks loopback, private, link-local and metadata addresses', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.0.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255']) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it('blocks IPv6 forms of the same, including IPv4 smuggled inside IPv6', () => {
    for (const ip of ['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:169.254.169.254', '64:ff9b::a00:1', '2002:7f00:1::', '::127.0.0.1']) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it('allows public addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '100.63.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8']) {
      expect(isBlockedAddress(ip), ip).toBe(false);
    }
  });

  it('blocks anything it cannot parse', () => {
    expect(isBlockedAddress('not-an-ip')).toBe(true);
    expect(isBlockedAddress('')).toBe(true);
  });
});

describe('assertPublicUrl', () => {
  it('rejects IP literals in every spelling the URL parser accepts', () => {
    for (const url of ['http://127.0.0.1/', 'http://2130706433/', 'http://0x7f.0.0.1/', 'http://017700000001/', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://169.254.169.254/latest/meta-data/', 'http://localhost:3000/', 'http://app.localhost/']) {
      expect(() => assertPublicUrl(url), url).toThrow(BlockedAddressError);
    }
  });

  it('rejects non-http schemes', () => {
    for (const url of ['file:///etc/passwd', 'ftp://example.com/', 'gopher://example.com/', 'not a url']) {
      expect(() => assertPublicUrl(url), url).toThrow(BlockedAddressError);
    }
  });

  it('lets hostnames and public IPs through', () => {
    expect(() => assertPublicUrl('https://example.com/a?b=1')).not.toThrow();
    expect(() => assertPublicUrl('http://8.8.8.8/')).not.toThrow();
  });
});

describe('publicOnlyLookup', () => {
  it('refuses a hostname that resolves to loopback', async () => {
    const err = await new Promise<Error | null>((resolve) => publicOnlyLookup('localhost', {}, (e) => resolve(e)));
    expect(err).toBeInstanceOf(BlockedAddressError);
  });
});

describe('fetchStatic with publicOnly', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/secret') {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('internal-secret');
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('premise: without publicOnly a local address is readable', async () => {
    const res = await fetchStatic(`${base}/secret`);
    expect(res.body).toBe('internal-secret');
  });

  it('refuses a local IP literal', async () => {
    await expect(fetchStatic(`${base}/secret`, { publicOnly: true })).rejects.toBeInstanceOf(BlockedAddressError);
  });

  it('refuses a hostname that resolves to a local address (the DNS path)', async () => {
    const port = (server.address() as AddressInfo).port;
    // "localhost." (trailing dot) is not caught by the URL check, so this goes through DNS and must be stopped at connect time.
    await expect(fetchStatic(`http://localhost.:${port}/secret`, { publicOnly: true })).rejects.toThrow(/non-public/);
  });

  it('fetchText turns a refusal into null instead of leaking the body', async () => {
    expect(await fetchText(`${base}/secret`, { publicOnly: true })).toBeNull();
  });
});
