import type * as PlaywrightNs from 'playwright';
import { DEFAULT_UA } from './static.js';

export interface RenderedResult {
  finalUrl: string;
  html: string;
  status: number;
  headers: Record<string, string>;
}

export interface RenderedOptions {
  userAgent?: string;
  timeoutMs?: number;
}

export async function fetchRendered(url: string, opts: RenderedOptions = {}): Promise<RenderedResult> {
  let playwright: typeof PlaywrightNs;
  try {
    playwright = (await import('playwright')) as typeof PlaywrightNs;
  } catch {
    throw new Error(
      'Playwright is required for --render. Install with: npm i -D playwright && npx playwright install chromium',
    );
  }

  const userAgent = opts.userAgent ?? DEFAULT_UA;
  const timeout = opts.timeoutMs ?? 30_000;

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ userAgent });
    const page = await ctx.newPage();
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout });
    const html = await page.content();
    const finalUrl = page.url();
    const status = response?.status() ?? 200;
    const headers = response ? await response.allHeaders() : {};
    return { finalUrl, html, status, headers };
  } finally {
    await browser.close();
  }
}
