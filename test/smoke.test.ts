import { describe, it, expect } from 'vitest';
import { defineRule, CATEGORY_WEIGHTS } from '../src/index.js';

describe('scaffold smoke', () => {
  it('exports CATEGORY_WEIGHTS summing to 100', () => {
    const total = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it('defineRule returns the rule unchanged', () => {
    const rule = defineRule({
      id: 'smoke.stub',
      category: 'crawler',
      weight: 1,
      title: 'stub',
      description: 'stub',
      run: () => ({ status: 'pass', score: 1, rationale: 'ok' }),
    });
    expect(rule.id).toBe('smoke.stub');
  });
});
