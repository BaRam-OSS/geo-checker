import type { Rule } from '../types.js';
import { crawlerRules } from './crawler/index.js';

export const defaultRules: Rule[] = [...crawlerRules];

export { crawlerRules };
