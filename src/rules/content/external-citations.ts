import { defineRule } from '../../types.js';

export const externalCitationsRule = defineRule({
  id: 'cnt.external-citations',
  stableId: 'cnt.external-citations',
  category: 'content',
  group: 'opportunity',
  weight: 2,
  impact: 'medium',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#cntexternal-citations',
  title: 'Content cites external sources',
  description:
    'Outbound links to authoritative external sources are an E-E-A-T trust signal. AI engines treat well-cited pages as more credible.',
  run(ctx) {
    let host: string;
    try {
      host = new URL(ctx.finalUrl).hostname.toLowerCase();
    } catch {
      return { status: 'skip', score: 0, rationale: 'Invalid finalUrl.' };
    }
    const seen = new Set<string>();
    ctx.$('main a[href], article a[href], body a[href]').each((_i, el) => {
      const href = ctx.$(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      const rel = (ctx.$(el).attr('rel') ?? '').toLowerCase();
      if (rel.includes('nofollow') || rel.includes('sponsored')) return;
      let linkHost: string;
      try {
        linkHost = new URL(href, ctx.finalUrl).hostname.toLowerCase();
      } catch {
        return;
      }
      if (!linkHost) return;
      if (linkHost === host) return;
      if (linkHost.endsWith('.' + host) || host.endsWith('.' + linkHost)) return;
      seen.add(linkHost);
    });
    const count = seen.size;
    if (count >= 3) {
      return {
        status: 'pass',
        score: 1,
        rationale: `${count} distinct external host(s) cited (excluding nofollow).`,
        evidence: { hosts: [...seen].slice(0, 8) },
      };
    }
    if (count >= 1) {
      return {
        status: 'pass',
        score: 0.7,
        rationale: `${count} external host(s) cited. Aim for ≥3 for stronger E-E-A-T.`,
        evidence: { hosts: [...seen] },
        estimatedImpact: 1,
      };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: 'No external follow citations found in main content.',
      fixHint: 'Cite at least one authoritative external source (research paper, official docs, news outlet).',
      estimatedImpact: 2,
    };
  },
});
