import type { RobotsTxt, RobotsRuleGroup } from '../types.js';

export function parseRobots(raw: string): RobotsTxt {
  const groups: RobotsRuleGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsRuleGroup | null = null;

  const lines = raw.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'user-agent') {
      if (!current || current.allow.length > 0 || current.disallow.length > 0) {
        current = { userAgent: value, allow: [], disallow: [] };
        groups.push(current);
      } else {
        current.userAgent = value;
      }
    } else if (field === 'allow' && current) {
      current.allow.push(value);
    } else if (field === 'disallow' && current) {
      current.disallow.push(value);
    } else if (field === 'sitemap') {
      sitemaps.push(value);
    }
  }

  return { raw, groups, sitemaps };
}

export function matchGroup(robots: RobotsTxt, userAgent: string): RobotsRuleGroup | null {
  const lower = userAgent.toLowerCase();
  const exact = robots.groups.find((g) => g.userAgent.toLowerCase() === lower);
  if (exact) return exact;
  const wildcard = robots.groups.find((g) => g.userAgent === '*');
  return wildcard ?? null;
}

export function isPathAllowed(group: RobotsRuleGroup | null, path: string): boolean {
  if (!group) return true;
  const matches = (pattern: string): number => {
    if (pattern === '') return -1;
    if (path.startsWith(pattern)) return pattern.length;
    return -1;
  };
  let bestAllow = -1;
  let bestDisallow = -1;
  for (const p of group.allow) bestAllow = Math.max(bestAllow, matches(p));
  for (const p of group.disallow) bestDisallow = Math.max(bestDisallow, matches(p));
  if (bestDisallow === -1) return true;
  return bestAllow >= bestDisallow;
}
