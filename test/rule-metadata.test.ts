import { describe, it, expect } from 'vitest';
import { defaultRules } from '../src/rules/index.js';

describe('default rule registry metadata', () => {
  it.each(defaultRules)('rule $id declares Lighthouse-grade metadata', (rule) => {
    expect(rule.stableId, `${rule.id} missing stableId`).toBeTypeOf('string');
    expect(rule.stableId!.length).toBeGreaterThan(0);
    expect(rule.group, `${rule.id} missing group`).toMatch(/^(opportunity|diagnostic|info)$/);
    expect(rule.impact, `${rule.id} missing impact`).toMatch(/^(critical|high|medium|low)$/);
    expect(rule.effort, `${rule.id} missing effort`).toMatch(/^(low|medium|high)$/);
    expect(rule.docsUrl, `${rule.id} missing docsUrl`).toMatch(/^https?:\/\//);
  });

  it('stableIds are unique across the registry', () => {
    const ids = defaultRules.map((r) => r.stableId!);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
