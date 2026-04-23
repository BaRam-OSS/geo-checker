import { titleRule } from './title.js';
import { metaDescriptionRule } from './meta-description.js';
import { canonicalRule } from './canonical.js';
import { ogTagsRule } from './og-tags.js';
import { twitterCardRule } from './twitter-card.js';
import { langAttrRule } from './lang-attr.js';
import { authorVisibleRule } from './author-visible.js';
import { datesRule } from './dates.js';

export const citationRules = [
  titleRule,
  metaDescriptionRule,
  canonicalRule,
  ogTagsRule,
  twitterCardRule,
  langAttrRule,
  authorVisibleRule,
  datesRule,
];
