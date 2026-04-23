import { request } from 'undici';

export const DEFAULT_UA = 'geo-checker/0.1.0 (+https://github.com/BaRam-OSS/geo-checker)';

export interface StaticFetchOptions {
  userAgent?: string;
  timeoutMs?: number;
  maxRedirects?: number;
  accept?: string;
}

export interface StaticFetchResult {
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  redirectCount: number;
}

function normalizeHeaders(input: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v == null) continue;
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
  }
  return out;
}

export async function fetchStatic(url: string, opts: StaticFetchOptions = {}): Promise<StaticFetchResult> {
  const maxRedirects = opts.maxRedirects ?? 5;
  const timeout = opts.timeoutMs ?? 20_000;
  const userAgent = opts.userAgent ?? DEFAULT_UA;
  const accept = opts.accept ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

  let current = url;
  let redirects = 0;

  for (;;) {
    const res = await request(current, {
      method: 'GET',
      headers: {
        'user-agent': userAgent,
        accept,
        'accept-language': 'en,*',
      },
      bodyTimeout: timeout,
      headersTimeout: timeout,
    });

    const status = res.statusCode;
    const headers = normalizeHeaders(res.headers as Record<string, string | string[] | undefined>);

    if (status >= 300 && status < 400 && headers.location && redirects < maxRedirects) {
      redirects += 1;
      current = new URL(headers.location, current).toString();
      await res.body.dump();
      continue;
    }

    const body = await res.body.text();
    return { finalUrl: current, status, headers, body, redirectCount: redirects };
  }
}

export async function fetchText(url: string, opts: StaticFetchOptions = {}): Promise<string | null> {
  try {
    const res = await fetchStatic(url, opts);
    if (res.status >= 200 && res.status < 300) return res.body;
    return null;
  } catch {
    return null;
  }
}
