import { load as cheerioLoad, type CheerioAPI } from 'cheerio';
import type { AuditContext } from './types.js';
import { fetchStatic, fetchText } from './fetcher/static.js';
import { fetchRendered } from './fetcher/rendered.js';
import { parseRobots } from './fetcher/robots.js';
import { parseLlmsTxt } from './fetcher/llms-txt.js';
import { parseSitemap } from './fetcher/sitemap.js';

export interface BuildContextOptions {
  userAgent?: string;
  timeoutMs?: number;
  render?: boolean;
}

function extractJsonLd($: CheerioAPI): unknown[] {
  const blocks: unknown[] = [];
  $('script[type="application/ld+json"]').each((_i, el) => {
    const txt = $(el).contents().text().trim();
    if (!txt) return;
    try {
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch {
      blocks.push({ __parseError: true, raw: txt.slice(0, 200) });
    }
  });
  return blocks;
}

function detectSpa($: CheerioAPI): boolean {
  const bodyText = $('body').clone().find('script, style, noscript').remove().end().text().replace(/\s+/g, ' ').trim();
  if (bodyText.length >= 500) return false;
  const roots = $('#__next, #root, #app, [data-reactroot], [ng-app], [data-server-rendered]');
  return roots.length > 0;
}

export async function buildContext(url: string, opts: BuildContextOptions = {}): Promise<AuditContext> {
  const warnings: string[] = [];
  let finalUrl: string;
  let html: string;
  let headers: Record<string, string>;
  let status: number;
  let renderMode: 'static' | 'rendered';

  if (opts.render) {
    const page = await fetchRendered(url, opts);
    finalUrl = page.finalUrl;
    html = page.html;
    headers = page.headers;
    status = page.status;
    renderMode = 'rendered';
  } else {
    const page = await fetchStatic(url, opts);
    finalUrl = page.finalUrl;
    html = page.body;
    headers = page.headers;
    status = page.status;
    renderMode = 'static';
  }

  const $ = cheerioLoad(html);
  const origin = new URL(finalUrl).origin;

  if (renderMode === 'static' && detectSpa($)) {
    warnings.push(
      'Site appears to be JS-rendered (sparse body + SPA root element). Re-run with --render for accurate results.',
    );
  }

  const [robotsRaw, llmsRaw, llmsFullRaw] = await Promise.all([
    fetchText(`${origin}/robots.txt`, opts),
    fetchText(`${origin}/llms.txt`, opts),
    fetchText(`${origin}/llms-full.txt`, opts),
  ]);

  let sitemapUrl: string | null = null;
  const robots = robotsRaw ? parseRobots(robotsRaw) : null;
  if (robots && robots.sitemaps.length > 0) sitemapUrl = robots.sitemaps[0] ?? null;
  if (!sitemapUrl) sitemapUrl = `${origin}/sitemap.xml`;

  const sitemapRaw = await fetchText(sitemapUrl, opts);
  const sitemap = sitemapRaw ? parseSitemap(sitemapRaw) : null;

  return {
    url,
    finalUrl,
    html,
    $,
    headers,
    status,
    robots,
    llmsTxt: llmsRaw ? parseLlmsTxt(llmsRaw) : null,
    llmsFullTxt: llmsFullRaw && llmsFullRaw.trim().length > 0 ? llmsFullRaw : null,
    sitemap,
    jsonLd: extractJsonLd($),
    renderMode,
    fetchedAt: new Date().toISOString(),
    warnings,
  };
}

export const buildStaticContext = buildContext;
