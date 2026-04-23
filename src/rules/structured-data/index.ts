import { jsonLdPresentRule } from './jsonld-present.js';
import { jsonLdValidJsonRule } from './jsonld-valid-json.js';
import { schemaTypeRecognizedRule } from './schema-type-recognized.js';
import { requiredFieldsRule } from './required-fields.js';
import { microdataFallbackRule } from './microdata-fallback.js';
import { noDuplicateTypesRule } from './no-duplicate-types.js';
import { sameAsEntityRule } from './sameas-entity.js';
import { breadcrumbValidRule } from './breadcrumb-valid.js';

export const structuredDataRules = [
  jsonLdPresentRule,
  jsonLdValidJsonRule,
  schemaTypeRecognizedRule,
  requiredFieldsRule,
  microdataFallbackRule,
  noDuplicateTypesRule,
  sameAsEntityRule,
  breadcrumbValidRule,
];
