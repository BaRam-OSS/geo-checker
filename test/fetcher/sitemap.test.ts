import { describe, it, expect } from 'vitest';
import { parseSitemap } from '../../src/fetcher/sitemap.js';

describe('parseSitemap', () => {
  it('extracts URLs and lastmod', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc><lastmod>2026-01-15</lastmod></url>
  <url><loc>https://example.com/blog</loc></url>
</urlset>`;
    const s = parseSitemap(xml);
    expect(s.urls).toEqual(['https://example.com/', 'https://example.com/blog']);
    expect(s.lastmod).toBe('2026-01-15');
  });

  it('handles sitemap index', () => {
    const xml = `<sitemapindex><sitemap><loc>https://a.com/s1.xml</loc></sitemap><sitemap><loc>https://a.com/s2.xml</loc></sitemap></sitemapindex>`;
    const s = parseSitemap(xml);
    expect(s.urls).toHaveLength(2);
  });

  it('returns empty for empty', () => {
    expect(parseSitemap('').urls).toEqual([]);
  });
});
