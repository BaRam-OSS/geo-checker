import type { Rule } from '../types.js';
import { crawlerRules } from './crawler/index.js';
import { structuredDataRules } from './structured-data/index.js';
import { citationRules } from './citation/index.js';
import { contentRules } from './content/index.js';
import { aeoRules } from './aeo/index.js';

export const defaultRules: Rule[] = [
  ...crawlerRules,
  ...structuredDataRules,
  ...citationRules,
  ...contentRules,
  ...aeoRules,
];

export { crawlerRules, structuredDataRules, citationRules, contentRules, aeoRules };
