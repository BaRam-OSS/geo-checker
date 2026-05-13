import { defineRule } from '../../types.js';

export const aeoAgentPermissionsRule = defineRule({
  id: 'aeo.agent-permissions',
  stableId: 'aeo.agent-permissions',
  category: 'aeo',
  group: 'opportunity',
  weight: 3,
  impact: 'medium',
  effort: 'low',
  title: 'agent-permissions.json is present',
  title_ko: 'agent-permissions.json 파일 존재 여부',
  description: 'Declares explicit read/summarize/cite/train permissions for AI agents.',
  run(ctx) {
    if (ctx.agentPermissions !== null) {
      return {
        status: 'pass',
        score: 1,
        rationale: 'agent-permissions.json found at site root.',
        rationale_ko: 'agent-permissions.json이 사이트 루트에 존재합니다.',
        evidence: ctx.agentPermissions,
      };
    }
    return {
      status: 'warn',
      score: 0,
      rationale: 'No /agent-permissions.json found. Add one to declare AI agent access policy.',
      rationale_ko: '/agent-permissions.json이 없습니다. AI 에이전트 접근 정책을 명시하려면 추가하세요.',
      fixHint: 'Create /agent-permissions.json with read, summarize, cite, and train permission flags.',
    };
  },
});
