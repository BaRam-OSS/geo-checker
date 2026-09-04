import { singleH1Rule } from './single-h1.js';
import { headingHierarchyRule } from './heading-hierarchy.js';
import { imageAltRule } from './image-alt.js';
import { tldrOrFaqRule } from './tldr-or-faq.js';
import { wordCountRule } from './word-count.js';
import { qaStructureRule } from './qa-structure.js';
import { externalCitationsRule } from './external-citations.js';
import { datedStatisticsRule } from './dated-statistics.js';
import { quotationsRule } from './quotations.js';

export const contentRules = [
  singleH1Rule,
  headingHierarchyRule,
  imageAltRule,
  tldrOrFaqRule,
  wordCountRule,
  qaStructureRule,
  externalCitationsRule,
  // 0.5.0 신설. content 카테고리가 전부 구조 검사(H1 개수·제목 순서·alt)뿐이었는데,
  // GEO 서베이(arXiv 2607.14035)는 순수 포맷 변경을 "weak effects" 로 분류하고
  // 인용 가능한 근거(시점 있는 수치·귀속된 인용문)를 가장 강한 레버로 보고한다.
  datedStatisticsRule,
  quotationsRule,
];
