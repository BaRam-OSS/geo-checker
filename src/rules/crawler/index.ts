import { httpsRule } from './https.js';
import { robotsReachableRule } from './robots-reachable.js';
import { robotsAiAllowRule } from './robots-ai-allow.js';
import { llmsTxtPresentRule } from './llms-txt-present.js';
import { llmsTxtWellformedRule } from './llms-txt-wellformed.js';
import { llmsFullTxtRule } from './llms-full-txt.js';
import { sitemapPresentRule } from './sitemap-present.js';
import { metaRobotsRule } from './meta-robots.js';
import { xRobotsTagRule } from './x-robots-tag.js';
import { httpStatusRule } from './http-status.js';

export const crawlerRules = [
  // 0.4.0 신설. 이 셋이 없어서 noindex 페이지나 403 봇차단 페이지가
  // 그대로 높은 점수를 받을 수 있었다 — 다른 모든 검사의 전제 조건이다.
  httpStatusRule,
  metaRobotsRule,
  xRobotsTagRule,
  httpsRule,
  robotsReachableRule,
  robotsAiAllowRule,
  llmsTxtPresentRule,
  llmsTxtWellformedRule,
  llmsFullTxtRule,
  sitemapPresentRule,
];
