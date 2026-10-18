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
  title_ko: 'AI 크롤러 접근 허용 여부',
  description:
    'Major AI search and training crawlers (17 bots incl. GPTBot, OAI-SearchBot, Google-Extended, ClaudeBot, PerplexityBot, Applebot-Extended, Meta-ExternalAgent, Bytespider, DuckAssistBot, YouBot) must be allowed to index the homepage.',
  // 0.5.2: 이름이 없는 봇은 기본 허용이다(RFC 9309). 명시 여부는 크롤러 동작을 바꾸지 않으므로
  // 감점하지 않는다 — 실제로 막은 경우만 fail.
  run(ctx) {
    if (!ctx.robots) {
      return {
        status: 'pass',
        score: 1,
        rationale: 'No robots.txt, so every AI crawler is allowed by default.',
        rationale_ko: 'robots.txt가 없어 모든 AI 크롤러가 기본으로 접근할 수 있습니다.',
        evidence: { blocked: [], mentioned: [], totalBots: AI_BOTS.length },
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
        rationale_ko: `차단됨: ${blocked.join(', ')}. 해당 User-agent의 Disallow를 제거하거나 명시적 Allow를 추가하세요.`,
        evidence: { blocked, mentioned, totalBots: AI_BOTS.length },
        fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
      };
    }
    if (mentioned.length === 0) {
      return {
        status: 'pass',
        score: 1,
        rationale: `All ${AI_BOTS.length} AI crawlers can reach the page through the default rules.`,
        rationale_ko: `${AI_BOTS.length}개 AI 크롤러 모두 기본 규칙으로 접근할 수 있습니다.`,
        evidence: { blocked: [], mentioned, totalBots: AI_BOTS.length },
      };
    }
    return {
      status: 'pass',
      score: 1,
      rationale: `All ${AI_BOTS.length} AI crawlers can reach the page; ${mentioned.length} explicitly listed.`,
      rationale_ko: `${AI_BOTS.length}개 AI 크롤러 모두 접근 가능하며, ${mentioned.length}개가 명시적으로 허용되어 있습니다.`,
      evidence: { blocked: [], mentioned, totalBots: AI_BOTS.length },
    };
  },
});

export const AI_BOTS_TRACKED = AI_BOTS;
