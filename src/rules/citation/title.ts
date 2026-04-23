import { defineRule } from '../../types.js';

export const titleRule = defineRule({
  id: 'cit.title',
  category: 'citation',
  weight: 2,
  title: '<title> is set with a reasonable length',
  description: 'The document title is the single most-cited piece of text and should be 10–70 characters.',
  run(ctx) {
    const title = ctx.$('head > title').first().text().trim();
    if (!title) {
      return {
        status: 'fail',
        score: 0,
        rationale: 'Page has no <title>.',
        fixUrl: 'https://github.com/BaRam-OSS/geo-checker/blob/main/docs/rules.md',
      };
    }
    if (title.length < 10) {
      return {
        status: 'warn',
        score: 0.4,
        rationale: `Title is only ${title.length} chars; consider a more descriptive one.`,
      };
    }
    if (title.length > 70) {
      return {
        status: 'warn',
        score: 0.6,
        rationale: `Title is ${title.length} chars; search UIs commonly truncate after ~70.`,
      };
    }
    return { status: 'pass', score: 1, rationale: `Title length ${title.length} is within range.` };
  },
});
