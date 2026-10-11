import { lookup as dnsLookup } from 'node:dns';
import { isIP } from 'node:net';
import { Agent, type Dispatcher } from 'undici';

/**
 * `publicOnly` — refuse to talk to anything that is not on the public internet.
 *
 * When geo-checker runs as a service that audits URLs submitted by strangers, the URL is attacker-controlled
 * and so is every redirect, the `Sitemap:` line in robots.txt, and the DNS answer. Checking the first URL
 * before calling `audit()` is not enough: the target can answer 200 to the pre-check and `302 → http://127.0.0.1/`
 * to the audit itself, or resolve to a public address once and a private one the next time (DNS rebinding).
 *
 * So the check has to happen where the connection is made:
 *  - `assertPublicUrl` runs on every hop — it catches non-http schemes and IP-literal hosts (which never reach DNS).
 *  - `publicOnlyDispatcher` gives undici a DNS lookup that rejects private answers, so the address that was
 *    checked is the address that gets connected to.
 */

export class BlockedAddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedAddressError';
  }
}

function ipv4Blocked(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const a = parts[0] as number;
  const b = parts[1] as number;
  const c = parts[2] as number;
  if (a === 0 || a === 10 || a === 127) return true; // "this network", private, loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 169 && b === 254) return true; // link-local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF protocol assignments, TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast, reserved, broadcast
  return false;
}

/** Expand an IPv6 literal to 8 groups. Returns null if it is not one. */
function expandIpv6(ip: string): number[] | null {
  let s = ip.toLowerCase();
  const zone = s.indexOf('%');
  if (zone !== -1) s = s.slice(0, zone);
  // trailing dotted IPv4 (::ffff:1.2.3.4)
  const lastColon = s.lastIndexOf(':');
  const tail = s.slice(lastColon + 1);
  if (tail.includes('.')) {
    const p = tail.split('.').map((x) => Number(x));
    if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    s = `${s.slice(0, lastColon + 1)}${(((p[0] as number) << 8) | (p[1] as number)).toString(16)}:${(((p[2] as number) << 8) | (p[3] as number)).toString(16)}`;
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - rest.length : 0;
  if (fill < 0) return null;
  const groups = [...head, ...Array<string>(fill).fill('0'), ...rest].map((g) => parseInt(g, 16));
  if (groups.length !== 8 || groups.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
  return groups;
}

function ipv6Blocked(ip: string): boolean {
  const g = expandIpv6(ip);
  if (!g) return true;
  const g0 = g[0] as number;
  const embedded = `${(g[6] as number) >> 8}.${(g[6] as number) & 0xff}.${(g[7] as number) >> 8}.${(g[7] as number) & 0xff}`;
  const leadingZero = (n: number) => g.slice(0, n).every((x) => x === 0);
  if (leadingZero(7) && (g[7] === 0 || g[7] === 1)) return true; // :: and ::1
  if (leadingZero(5) && g[5] === 0xffff) return ipv4Blocked(embedded); // IPv4-mapped
  if (leadingZero(6)) return ipv4Blocked(embedded); // IPv4-compatible (deprecated, still routable to v4 on some stacks)
  if (g0 === 0x64 && g[1] === 0xff9b) return ipv4Blocked(embedded); // NAT64
  if (g0 === 0x2002) return ipv4Blocked(`${(g[1] as number) >> 8}.${(g[1] as number) & 0xff}.${(g[2] as number) >> 8}.${(g[2] as number) & 0xff}`); // 6to4
  if ((g0 & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
  if ((g0 & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((g0 & 0xff00) === 0xff00) return true; // multicast
  if (g0 === 0x2001 && g[1] === 0xdb8) return true; // documentation
  return false;
}

/** True when `ip` is loopback, private, link-local, or otherwise not a public unicast address. Unparseable input is blocked. */
export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return ipv4Blocked(ip);
  if (family === 6) return ipv6Blocked(ip);
  return true;
}

/**
 * Throws unless `url` is http(s) and its host is not a blocked IP literal.
 * The WHATWG URL parser normalizes `http://2130706433/` and `http://0x7f.1/` to dotted form, so those are caught here too.
 * Hostnames pass — they are checked when they resolve (see `publicOnlyDispatcher`).
 */
export function assertPublicUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BlockedAddressError(`Refusing to fetch an invalid URL: ${url}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BlockedAddressError(`Refusing to fetch a non-http(s) URL: ${parsed.protocol}`);
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new BlockedAddressError(`Refusing to fetch a local address: ${host}`);
  }
  if (isIP(host) !== 0 && isBlockedAddress(host)) {
    throw new BlockedAddressError(`Refusing to fetch a non-public address: ${host}`);
  }
}

type LookupAddress = { address: string; family: number };
type LookupCallback = (err: NodeJS.ErrnoException | null, address?: string | LookupAddress[], family?: number) => void;

/** `dns.lookup` that fails if any answer is a non-public address. */
export function publicOnlyLookup(hostname: string, options: unknown, callback: LookupCallback): void {
  const opts = (typeof options === 'object' && options !== null ? options : {}) as { all?: boolean };
  dnsLookup(hostname, { ...opts, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = addresses as LookupAddress[];
    const bad = list.find((a) => isBlockedAddress(a.address));
    if (bad || list.length === 0) {
      return callback(new BlockedAddressError(`Refusing to connect to a non-public address: ${hostname} → ${bad?.address ?? 'no address'}`));
    }
    if (opts.all) return callback(null, list);
    const first = list[0] as LookupAddress;
    return callback(null, first.address, first.family);
  });
}

let sharedDispatcher: Dispatcher | undefined;

/** An undici dispatcher whose connections can only reach public addresses. Shared so connections are pooled. */
export function publicOnlyDispatcher(): Dispatcher {
  sharedDispatcher ??= new Agent({ connect: { lookup: publicOnlyLookup as never } });
  return sharedDispatcher;
}
