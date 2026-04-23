import { singleH1Rule } from './single-h1.js';
import { headingHierarchyRule } from './heading-hierarchy.js';
import { imageAltRule } from './image-alt.js';
import { tldrOrFaqRule } from './tldr-or-faq.js';
import { wordCountRule } from './word-count.js';
import { qaStructureRule } from './qa-structure.js';
import { externalCitationsRule } from './external-citations.js';

export const contentRules = [
  singleH1Rule,
  headingHierarchyRule,
  imageAltRule,
  tldrOrFaqRule,
  wordCountRule,
  qaStructureRule,
  externalCitationsRule,
];
