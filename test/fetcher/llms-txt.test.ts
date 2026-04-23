import { describe, it, expect } from 'vitest';
import { parseLlmsTxt, isLlmsTxtWellFormed } from '../../src/fetcher/llms-txt.js';

describe('parseLlmsTxt', () => {
  it('parses a canonical llms.txt', () => {
    const raw = `# Example Project

> A short summary of what this project does.

Additional context.

## Docs

- [Quickstart](https://example.com/quickstart): get started in 5 minutes
- [API Reference](https://example.com/api)

## Optional

- [Changelog](https://example.com/changelog)
`;
    const p = parseLlmsTxt(raw);
    expect(p.title).toBe('Example Project');
    expect(p.summary).toContain('short summary');
    expect(p.sections).toHaveLength(2);
    expect(p.sections[0]?.links).toHaveLength(2);
    expect(p.sections[0]?.links[0]).toEqual({
      title: 'Quickstart',
      url: 'https://example.com/quickstart',
      description: 'get started in 5 minutes',
    });
  });

  it('flags missing title', () => {
    const p = parseLlmsTxt('## Only a section\n- [x](https://a)\n');
    expect(isLlmsTxtWellFormed(p).ok).toBe(false);
  });

  it('flags missing sections', () => {
    const p = parseLlmsTxt('# Only a title\n');
    expect(isLlmsTxtWellFormed(p).ok).toBe(false);
  });

  it('passes a valid llms.txt', () => {
    const p = parseLlmsTxt('# T\n\n> s\n\n## A\n- [x](https://a)\n');
    expect(isLlmsTxtWellFormed(p).ok).toBe(true);
  });
});
