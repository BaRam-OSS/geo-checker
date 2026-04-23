import { describe, it, expect } from 'vitest';
import { parseRobots, matchGroup, isPathAllowed } from '../../src/fetcher/robots.js';

describe('parseRobots', () => {
  it('parses user-agent groups and sitemap', () => {
    const raw = `# comment
User-agent: *
Disallow: /admin
Allow: /admin/public

User-agent: GPTBot
Disallow: /

Sitemap: https://example.com/sitemap.xml
`;
    const r = parseRobots(raw);
    expect(r.groups).toHaveLength(2);
    expect(r.groups[0]?.userAgent).toBe('*');
    expect(r.groups[0]?.disallow).toEqual(['/admin']);
    expect(r.groups[0]?.allow).toEqual(['/admin/public']);
    expect(r.groups[1]?.userAgent).toBe('GPTBot');
    expect(r.sitemaps).toEqual(['https://example.com/sitemap.xml']);
  });

  it('matches exact group over wildcard', () => {
    const raw = `User-agent: *\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /secret`;
    const r = parseRobots(raw);
    expect(matchGroup(r, 'ClaudeBot')?.userAgent).toBe('ClaudeBot');
    expect(matchGroup(r, 'Unknown')?.userAgent).toBe('*');
  });

  it('isPathAllowed: allow beats shorter disallow', () => {
    const raw = `User-agent: *\nDisallow: /admin\nAllow: /admin/public`;
    const r = parseRobots(raw);
    const g = matchGroup(r, '*');
    expect(isPathAllowed(g, '/admin/public/page')).toBe(true);
    expect(isPathAllowed(g, '/admin/secret')).toBe(false);
    expect(isPathAllowed(g, '/anything')).toBe(true);
  });

  it('empty disallow means everything allowed', () => {
    const raw = `User-agent: GPTBot\nAllow: /`;
    const r = parseRobots(raw);
    const g = matchGroup(r, 'GPTBot');
    expect(isPathAllowed(g, '/')).toBe(true);
  });
});
