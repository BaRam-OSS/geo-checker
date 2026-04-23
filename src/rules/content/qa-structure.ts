import { defineRule } from '../../types.js';
import { flattenJsonLd, getTypes } from '../util.js';

const QUESTION_LEADERS = [
  // English interrogatives
  'how',
  'what',
  'why',
  'when',
  'where',
  'who',
  'which',
  'is',
  'are',
  'can',
  'should',
  'do',
  'does',
  // Korean interrogatives (어떻게, 왜, 무엇, 언제, 어디, 누가, 어느, 왜냐하면)
  '어떻게',
  '왜',
  '무엇',
  '뭐',
  '뭔',
  '언제',
  '어디',
  '누가',
  '어느',
  '얼마',
];

function isQuestionHeading(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.endsWith('?') || t.endsWith('？')) return true;
  const first = t.split(/[\s,.:]+/, 1)[0]?.toLowerCase() ?? '';
  return QUESTION_LEADERS.includes(first);
}

export const qaStructureRule = defineRule({
  id: 'cnt.qa-structure',
  stableId: 'cnt.qa-structure',
  category: 'content',
  group: 'opportunity',
  weight: 3,
  impact: 'high',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#cntqa-structure',
  title: 'Content uses Q&A structure for answer extraction',
  description:
    'Question-style H2/H3 headings (or FAQPage JSON-LD) help AI engines extract direct answers. Pages with ≥2 question headings are far more likely to be cited.',
  run(ctx) {
    for (const node of flattenJsonLd(ctx.jsonLd)) {
      if (getTypes(node).includes('FAQPage')) {
        return { status: 'pass', score: 1, rationale: 'FAQPage JSON-LD provides explicit Q&A.' };
      }
    }
    const questionHeadings: string[] = [];
    ctx.$('h2, h3').each((_i, el) => {
      const text = ctx.$(el).text();
      if (isQuestionHeading(text)) questionHeadings.push(text.trim().slice(0, 80));
    });
    if (questionHeadings.length >= 2) {
      return {
        status: 'pass',
        score: 1,
        rationale: `${questionHeadings.length} question-style headings detected.`,
        evidence: { headings: questionHeadings.slice(0, 5) },
      };
    }
    if (questionHeadings.length === 1) {
      return {
        status: 'warn',
        score: 0.6,
        rationale: '1 question-style heading. Add a second to strengthen answer extraction.',
        evidence: { headings: questionHeadings },
        estimatedImpact: 1,
      };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: 'No question-style H2/H3 headings or FAQPage JSON-LD found.',
      fixHint: 'Reframe at least 2 H2 headings as questions ("How do I…?", "What is…?") or add FAQPage JSON-LD.',
      estimatedImpact: 3,
    };
  },
});
