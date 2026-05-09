import { defineRule } from '../../types.js';
import { flattenJsonLd, getTypes } from '../util.js';

const ENTITY_TYPES = ['Organization', 'Person', 'LocalBusiness', 'Brand', 'Corporation'];
const TRUSTED_HOSTS = [
  'wikipedia.org',
  'wikidata.org',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'github.com',
  'crunchbase.com',
  'facebook.com',
  'youtube.com',
  'instagram.com',
];

function extractSameAs(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];
  const v = (node as { sameAs?: unknown }).sameAs;
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return [];
}

function trustedCount(urls: string[]): number {
  let n = 0;
  for (const u of urls) {
    try {
      const host = new URL(u).hostname.toLowerCase();
      if (TRUSTED_HOSTS.some((h) => host === h || host.endsWith('.' + h))) n++;
    } catch {
      /* ignore malformed */
    }
  }
  return n;
}

export const sameAsEntityRule = defineRule({
  id: 'sd.sameas-entity',
  stableId: 'sd.sameas-entity',
  category: 'structured-data',
  group: 'opportunity',
  weight: 3,
  impact: 'high',
  effort: 'medium',
  docsUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md#sdsameas-entity',
  title: 'Entity nodes link the knowledge graph via sameAs',
  title_ko: 'sameAs로 지식 그래프 연결 여부',
  description:
    'Organization/Person nodes should declare a sameAs[] array linking to Wikipedia/Wikidata/LinkedIn so AI engines can resolve the entity in their knowledge graph (E-E-A-T signal).',
  run(ctx) {
    if (ctx.jsonLd.length === 0) {
      return { status: 'skip', score: 0, rationale: 'No JSON-LD to analyse.', rationale_ko: '분석할 JSON-LD가 없습니다.' };
    }
    const nodes = flattenJsonLd(ctx.jsonLd);
    const entities = nodes.filter((n) => getTypes(n).some((t) => ENTITY_TYPES.includes(t)));
    if (entities.length === 0) {
      return {
        status: 'skip',
        score: 0,
        rationale: 'No Organization/Person/LocalBusiness/Brand entity to link.',
        rationale_ko: '연결할 Organization/Person/LocalBusiness/Brand 엔티티가 없습니다.',
      };
    }
    let bestScore = 0;
    let bestEvidence: { type: string; sameAs: string[]; trusted: number } | null = null;
    for (const e of entities) {
      const sameAs = extractSameAs(e);
      const trusted = trustedCount(sameAs);
      const types = getTypes(e);
      let score = 0;
      if (sameAs.length === 0) score = 0;
      else if (trusted === 0) score = 0.4;
      else if (trusted === 1) score = 0.7;
      else score = 1;
      if (score > bestScore) {
        bestScore = score;
        bestEvidence = { type: types[0] ?? 'Entity', sameAs, trusted };
      }
    }
    if (bestScore >= 1) {
      return {
        status: 'pass',
        score: 1,
        rationale: `Entity links ${bestEvidence!.trusted} trusted knowledge-graph hosts via sameAs.`,
        rationale_ko: `엔티티가 sameAs로 신뢰할 수 있는 지식 그래프 사이트 ${bestEvidence!.trusted}개에 연결되어 있습니다.`,
        evidence: bestEvidence,
      };
    }
    if (bestScore >= 0.7) {
      return {
        status: 'pass',
        score: bestScore,
        rationale: `Entity has 1 trusted sameAs link. Add Wikipedia/Wikidata for stronger E-E-A-T.`,
        rationale_ko: '신뢰할 수 있는 sameAs 링크가 1개 있습니다. E-E-A-T 강화를 위해 Wikipedia/Wikidata를 추가하세요.',
        evidence: bestEvidence,
        estimatedImpact: 1,
      };
    }
    if (bestScore > 0) {
      return {
        status: 'warn',
        score: bestScore,
        rationale: 'Entity declares sameAs but no trusted knowledge-graph hosts (Wikipedia/Wikidata/LinkedIn).',
        rationale_ko: 'sameAs가 선언되어 있지만 신뢰할 수 있는 지식 그래프 호스트(Wikipedia/Wikidata/LinkedIn)가 없습니다.',
        evidence: bestEvidence,
        fixHint: 'Add Wikipedia/Wikidata/LinkedIn URLs to your Organization sameAs[].',
        estimatedImpact: 2,
      };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: `${entities.length} entity node(s) found but none declare sameAs links.`,
      rationale_ko: `엔티티 노드가 ${entities.length}개 있지만 sameAs 링크가 없습니다.`,
      fixHint: 'Add sameAs:["https://en.wikipedia.org/wiki/...", "https://www.linkedin.com/company/..."] to your Organization JSON-LD.',
      estimatedImpact: 3,
    };
  },
});
