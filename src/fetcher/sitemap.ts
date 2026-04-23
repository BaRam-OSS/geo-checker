import type { SitemapSummary } from '../types.js';

const LOC_RE = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
const LASTMOD_RE = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i;

export function parseSitemap(xml: string): SitemapSummary {
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(LOC_RE.source, LOC_RE.flags);
  while ((match = re.exec(xml)) !== null) {
    const url = match[1];
    if (url) urls.push(url);
  }
  const lastmodMatch = LASTMOD_RE.exec(xml);
  const summary: SitemapSummary = { urls };
  if (lastmodMatch?.[1]) summary.lastmod = lastmodMatch[1];
  return summary;
}
