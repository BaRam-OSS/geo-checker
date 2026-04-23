import { defineRule } from '../../types.js';
import { isPathAllowed, matchGroup } from '../../fetcher/robots.js';

const AI_BOTS = [
  // Tier 1: OpenAI
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Tier 1: Google / Gemini
  'Google-Extended',
  'Google-CloudVertexBot',
  // Tier 1: Anthropic
  'ClaudeBot',
  'anthropic-ai',
  'Claude-Web',
  // Tier 1: Perplexity
  'PerplexityBot',
  // Tier 1: Apple
  'Applebot-Extended',
  // Tier 1: Meta
  'Meta-ExternalAgent',
  // Tier 1: ByteDance
  'Bytespider',
  // Tier 1: DuckDuckGo
  'DuckAssistBot',
  // Tier 1: You.com
  'YouBot',
  // Tier 1: Cohere
  'cohere-ai',
  // Tier 2: Common Crawl (feeds many LLM training sets)
  'CCBot',
  // Tier 2: Amazon
  'Amazonbot',
];

export const robotsAiAllowRule = defineRule({
  id: 'crawler.robots-ai-allow',
  stableId: 'crawler.robots-ai-allow',
  category: 'crawler',
  group: 'diagnostic',
  weight: 5,
  impact: 'critical',
  effort: 'low',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#crawlerrobots-ai-allow',
  title: 'AI crawlers are allowed',
  description:
    'Major AI search and training crawlers (17 bots incl. GPTBot, OAI-SearchBot, Google-Extended, ClaudeBot, PerplexityBot, Applebot-Extended, Meta-ExternalAgent, Bytespider, DuckAssistBot, YouBot) must be allowed to index the homepage.',
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
        score: Math.max(0, 1 - blocked.length / AI_BOTS.length),
        rationale: `Blocked: ${blocked.join(', ')}. Remove the Disallow or add an explicit Allow for these user-agents.`,
        evidence: { blocked, mentioned, totalBots: AI_BOTS.length },
        fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
      };
    }
    if (mentioned.length === 0) {
      return {
        status: 'warn',
        score: 0.6,
        rationale: `All ${AI_BOTS.length} AI crawlers reach the page via default rules, but none are explicitly listed. Consider explicit Allow entries.`,
      };
    }
    return {
      status: 'pass',
      score: 1,
      rationale: `All ${AI_BOTS.length} AI crawlers can reach the page; ${mentioned.length} explicitly listed.`,
      evidence: { mentioned, totalBots: AI_BOTS.length },
    };
  },
});

export const AI_BOTS_TRACKED = AI_BOTS;
