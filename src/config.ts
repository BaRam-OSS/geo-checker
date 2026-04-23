import { readFile, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { Category, GeoConfig, Rule } from './types.js';
import { CATEGORY_WEIGHTS } from './types.js';

const CANDIDATE_NAMES = ['geo-checker.config.json', 'geo-checker.config.mjs', 'geo-checker.config.js'];

export interface LoadedConfig {
  config: GeoConfig;
  path: string | null;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

export async function findConfig(cwd: string): Promise<string | null> {
  for (const name of CANDIDATE_NAMES) {
    const p = resolve(cwd, name);
    if (await fileExists(p)) return p;
  }
  return null;
}

export async function loadConfig(explicitPath: string | null, cwd: string = process.cwd()): Promise<LoadedConfig> {
  const path = explicitPath ? resolve(cwd, explicitPath) : await findConfig(cwd);
  if (!path) return { config: {}, path: null };
  if (!(await fileExists(path))) {
    throw new Error(`Config file not found: ${path}`);
  }
  if (path.endsWith('.json')) {
    const raw = await readFile(path, 'utf8');
    return { config: JSON.parse(raw) as GeoConfig, path };
  }
  const url = pathToFileURL(path).href;
  const mod = (await import(url)) as { default?: GeoConfig } & GeoConfig;
  const config = (mod.default ?? mod) as GeoConfig;
  return { config, path };
}

export interface ApplyResult {
  rules: Rule[];
  categoryWeights: Record<Category, number>;
}

export function applyConfig(defaultRules: Rule[], config: GeoConfig | undefined): ApplyResult {
  const categoryWeights: Record<Category, number> = { ...CATEGORY_WEIGHTS };
  if (!config) return { rules: defaultRules, categoryWeights };

  const merged = [...defaultRules, ...(config.extraRules ?? [])];
  const ruleOverrides = config.rules ?? {};

  const rules = merged
    .map((r) => {
      const key = r.stableId ?? r.id;
      const o = ruleOverrides[key] ?? ruleOverrides[r.id];
      if (!o) return r;
      if (o.enabled === false) return null;
      if (typeof o.weight === 'number' && o.weight > 0) {
        return { ...r, weight: o.weight };
      }
      return r;
    })
    .filter((r): r is Rule => r !== null);

  if (config.categories) {
    for (const [cat, override] of Object.entries(config.categories)) {
      if (override?.weight && override.weight > 0) {
        categoryWeights[cat as Category] = override.weight;
      }
    }
  }

  return { rules, categoryWeights };
}
