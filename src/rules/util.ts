export const KNOWN_SCHEMA_TYPES = [
  'Article',
  'NewsArticle',
  'BlogPosting',
  'FAQPage',
  'HowTo',
  'Organization',
  'Person',
  'BreadcrumbList',
  'Product',
  'WebSite',
  'WebPage',
];

export const REQUIRED_FIELDS: Record<string, string[]> = {
  Article: ['headline', 'author', 'datePublished'],
  NewsArticle: ['headline', 'author', 'datePublished'],
  BlogPosting: ['headline', 'author', 'datePublished'],
  FAQPage: ['mainEntity'],
  HowTo: ['name', 'step'],
  Product: ['name', 'offers'],
  Organization: ['name'],
  Person: ['name'],
  BreadcrumbList: ['itemListElement'],
};

export function getTypes(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];
  const t = (node as { '@type'?: unknown })['@type'];
  if (typeof t === 'string') return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === 'string');
  return [];
}

export function flattenJsonLd(blocks: unknown[]): unknown[] {
  const out: unknown[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    out.push(node);
    const graph = (node as { '@graph'?: unknown })['@graph'];
    if (Array.isArray(graph)) for (const item of graph) visit(item);
  };
  for (const b of blocks) visit(b);
  return out;
}

export function hasParseError(blocks: unknown[]): boolean {
  return blocks.some((b) => b && typeof b === 'object' && (b as { __parseError?: boolean }).__parseError);
}

export function hasField(node: unknown, field: string): boolean {
  if (!node || typeof node !== 'object') return false;
  const v = (node as Record<string, unknown>)[field];
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}
