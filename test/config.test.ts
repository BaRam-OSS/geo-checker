import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyConfig, findConfig, loadConfig } from '../src/config.js';
import { defineRule, type Rule } from '../src/index.js';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'geo-checker-cfg-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const sample = (id: string, weight = 1): Rule =>
  defineRule({
    id,
    stableId: id,
    category: 'crawler',
    weight,
    title: id,
    description: '',
    run: () => ({ status: 'pass', score: 1, rationale: '' }),
  });

describe('findConfig', () => {
  it('returns null when no config', async () => {
    expect(await findConfig(dir)).toBeNull();
  });
  it('discovers geo-checker.config.json', async () => {
    const p = join(dir, 'geo-checker.config.json');
    await writeFile(p, '{}', 'utf8');
    expect(await findConfig(dir)).toBe(p);
  });
});

describe('loadConfig', () => {
  it('loads JSON config', async () => {
    const p = join(dir, 'geo-checker.config.json');
    await writeFile(p, JSON.stringify({ rules: { 'x.y': { enabled: false } } }), 'utf8');
    const { config, path } = await loadConfig(null, dir);
    expect(path).toBe(p);
    expect(config.rules?.['x.y']?.enabled).toBe(false);
  });
  it('returns empty config when none exists', async () => {
    const { config, path } = await loadConfig(null, dir);
    expect(path).toBeNull();
    expect(config).toEqual({});
  });
  it('throws on explicit missing path', async () => {
    await expect(loadConfig('does-not-exist.json', dir)).rejects.toThrow(/not found/);
  });
});

describe('applyConfig', () => {
  const rules = [sample('a'), sample('b'), sample('c')];

  it('returns defaults when config missing', () => {
    const r = applyConfig(rules, undefined);
    expect(r.rules).toHaveLength(3);
    expect(r.categoryWeights.crawler).toBe(25);
  });

  it('disables rules by stableId', () => {
    const r = applyConfig(rules, { rules: { b: { enabled: false } } });
    expect(r.rules.map((x) => x.id)).toEqual(['a', 'c']);
  });

  it('overrides rule weight', () => {
    const r = applyConfig(rules, { rules: { a: { weight: 10 } } });
    expect(r.rules.find((x) => x.id === 'a')?.weight).toBe(10);
  });

  it('merges extraRules', () => {
    const extra = sample('extra');
    const r = applyConfig(rules, { extraRules: [extra] });
    expect(r.rules).toHaveLength(4);
  });

  it('overrides category weights', () => {
    const r = applyConfig(rules, { categories: { crawler: { weight: 50 } } });
    expect(r.categoryWeights.crawler).toBe(50);
    expect(r.categoryWeights['structured-data']).toBe(30);
  });

  it('ignores zero/negative weights', () => {
    const r = applyConfig(rules, { rules: { a: { weight: 0 } }, categories: { crawler: { weight: -1 } } });
    expect(r.rules.find((x) => x.id === 'a')?.weight).toBe(1);
    expect(r.categoryWeights.crawler).toBe(25);
  });
});
