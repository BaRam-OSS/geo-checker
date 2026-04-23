import { httpsRule } from './https.js';
import { robotsReachableRule } from './robots-reachable.js';
import { robotsAiAllowRule } from './robots-ai-allow.js';
import { llmsTxtPresentRule } from './llms-txt-present.js';
import { llmsTxtWellformedRule } from './llms-txt-wellformed.js';
import { sitemapPresentRule } from './sitemap-present.js';

export const crawlerRules = [
  httpsRule,
  robotsReachableRule,
  robotsAiAllowRule,
  llmsTxtPresentRule,
  llmsTxtWellformedRule,
  sitemapPresentRule,
];
