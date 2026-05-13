import { defineRule } from '../../types.js';

export const aeoSkillMdRule = defineRule({
  id: 'aeo.skill-md',
  stableId: 'aeo.skill-md',
  category: 'aeo',
  group: 'opportunity',
  weight: 3,
  impact: 'high',
  effort: 'low',
  title: 'skill.md is present',
  title_ko: 'skill.md 파일 존재 여부',
  description: 'A /skill.md file describes site capabilities so AI agents know what this site can do for them.',
  run(ctx) {
    if (ctx.skillMd !== null) {
      return {
        status: 'pass',
        score: 1,
        rationale: 'skill.md found at site root.',
        rationale_ko: 'skill.md가 사이트 루트에 존재합니다.',
      };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: 'No /skill.md found. Add one to describe your site capabilities to AI agents.',
      rationale_ko: '/skill.md가 없습니다. AI 에이전트가 사이트 기능을 파악할 수 있도록 추가하세요.',
      fixHint: 'Create /skill.md listing what services, products, and capabilities this site offers.',
    };
  },
});
