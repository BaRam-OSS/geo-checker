import { load as cheerioLoad } from 'cheerio';
import type { AuditContext } from './types.js';
import { fetchStatic, fetchText } from './fetcher/static.js';
import { parseRobots } from './fetcher/robots.js';
import { parseLlmsTxt } from './fetcher/llms-txt.js';
import { parseSitemap } from './fetcher/sitemap.js';

export interface BuildContextOptions {
  userAgent?: string;
  timeoutMs?: number;
}

function extractJsonLd($: ReturnType<typeof cheerioLoad>): unknown[] {
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

export async function buildStaticContext(url: string, opts: BuildContextOptions = {}): Promise<AuditContext> {
  const page = await fetchStatic(url, opts);
  const $ = cheerioLoad(page.body);
  const origin = new URL(page.finalUrl).origin;

  const [robotsRaw, llmsRaw] = await Promise.all([
    fetchText(`${origin}/robots.txt`, opts),
    fetchText(`${origin}/llms.txt`, opts),
  ]);

  let sitemapUrl: string | null = null;
  const robots = robotsRaw ? parseRobots(robotsRaw) : null;
  if (robots && robots.sitemaps.length > 0) sitemapUrl = robots.sitemaps[0] ?? null;
  if (!sitemapUrl) sitemapUrl = `${origin}/sitemap.xml`;

  const sitemapRaw = await fetchText(sitemapUrl, opts);
  const sitemap = sitemapRaw ? parseSitemap(sitemapRaw) : null;

  return {
    url,
    finalUrl: page.finalUrl,
    html: page.body,
    $,
    headers: page.headers,
    status: page.status,
    robots,
    llmsTxt: llmsRaw ? parseLlmsTxt(llmsRaw) : null,
    sitemap,
    jsonLd: extractJsonLd($),
    renderMode: 'static',
    fetchedAt: new Date().toISOString(),
  };
}
