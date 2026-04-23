import { defineRule } from '../../types.js';
import { isPathAllowed, matchGroup } from '../../fetcher/robots.js';

const AI_BOTS = [
  'GPTBot',
  'Google-Extended',
  'ClaudeBot',
  'PerplexityBot',
  'CCBot',
  'Amazonbot',
  'anthropic-ai',
];

export const robotsAiAllowRule = defineRule({
  id: 'crawler.robots-ai-allow',
  category: 'crawler',
  weight: 5,
  title: 'AI crawlers are allowed',
  description: 'Major AI search crawlers (GPTBot, Google-Extended, ClaudeBot, PerplexityBot, CCBot, Amazonbot) must be allowed to index the homepage.',
  run(ctx) {
    if (!ctx.robots) {
      return {
        status: 'warn',
        score: 0.5,
        rationale: 'robots.txt missing; AI crawlers default to allow, but explicit allow is recommended.',
      };
    }

    const path = new URL(ctx.finalUrl).pathname || '/';
    const blocked: string[] = [];
    const mentioned: string[] = [];

    for (const bot of AI_BOTS) {
      const group = matchGroup(ctx.robots, bot);
      if (group && group.userAgent.toLowerCase() === bot.toLowerCase()) {
        mentioned.push(bot);
      }
      if (!isPathAllowed(group, path)) blocked.push(bot);
    }

    if (blocked.length > 0) {
      return {
        status: 'fail',
        score: 0,
        rationale: `Blocked: ${blocked.join(', ')}. Remove the Disallow or add an explicit Allow for these user-agents.`,
        evidence: { blocked, mentioned },
        fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
      };
    }
    if (mentioned.length === 0) {
      return {
        status: 'warn',
        score: 0.6,
        rationale: 'No AI crawler is explicitly mentioned. Consider adding explicit Allow rules to remove ambiguity.',
      };
    }
    return {
      status: 'pass',
      score: 1,
      rationale: `All AI crawlers can reach the page; ${mentioned.length} explicitly listed.`,
      evidence: { mentioned },
    };
  },
});
