#!/usr/bin/env node
import { cac } from 'cac';
import kleur from 'kleur';
import { audit } from './index.js';
import { toJson } from './reporters/json.js';
import { toCli } from './reporters/cli.js';
import type { Category, Status, AuditReport } from './types.js';

const pkgVersion = '0.1.0';

const VALID_CATEGORIES: Category[] = ['crawler', 'structured-data', 'citation', 'content'];

type FailOn = 'fail' | 'warn';

interface CliFlags {
  json?: boolean;
  render?: boolean;
  category?: string;
  only?: string;
  failOn?: FailOn;
  timeout?: string | number;
}

function parseCategories(raw?: string): Category[] | undefined {
  if (!raw) return undefined;
  const items = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = items.filter((c): c is Category => (VALID_CATEGORIES as string[]).includes(c));
  const invalid = items.filter((c) => !(VALID_CATEGORIES as string[]).includes(c));
  if (invalid.length > 0) {
    throw new Error(`Unknown category: ${invalid.join(', ')}. Valid: ${VALID_CATEGORIES.join(', ')}.`);
  }
  return valid;
}

function parseOnly(raw?: string): string[] | undefined {
  if (!raw) return undefined;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function worstStatus(report: AuditReport): Status {
  let worst: Status = 'pass';
  const order: Record<Status, number> = { pass: 0, skip: 0, warn: 1, fail: 2 };
  for (const cat of Object.values(report.categories)) {
    for (const r of cat.results) {
      if (order[r.status] > order[worst]) worst = r.status;
    }
  }
  return worst;
}

const cli = cac('geo-checker');

cli
  .command('<url>', 'Audit a URL for GEO (Generative Engine Optimization) readiness')
  .option('--json', 'Output a JSON report to stdout')
  .option('--render', 'Use a headless browser (requires optional playwright dependency)')
  .option('--category <names>', 'Run only the given categories (comma-separated)')
  .option('--only <ids>', 'Run only the given rule IDs (comma-separated)')
  .option('--fail-on <level>', 'Exit non-zero when a result is at or above this level (warn|fail)', {
    default: 'fail',
  })
  .option('--timeout <ms>', 'Per-request timeout in milliseconds', { default: 20000 })
  .action(async (url: string, flags: CliFlags) => {
    const categories = parseCategories(flags.category);
    const only = parseOnly(flags.only);
    const timeoutMs = typeof flags.timeout === 'string' ? parseInt(flags.timeout, 10) : flags.timeout;

    const report = await audit(url, {
      ...(flags.render ? { render: true } : {}),
      ...(categories ? { categories } : {}),
      ...(only ? { only } : {}),
      ...(typeof timeoutMs === 'number' && !Number.isNaN(timeoutMs) ? { timeoutMs } : {}),
    });

    if (flags.json) {
      process.stdout.write(toJson(report) + '\n');
    } else {
      process.stdout.write(toCli(report) + '\n');
    }

    const worst = worstStatus(report);
    const failOn: FailOn = flags.failOn === 'warn' ? 'warn' : 'fail';
    if (failOn === 'fail' && worst === 'fail') process.exit(1);
    if (failOn === 'warn' && (worst === 'warn' || worst === 'fail')) process.exit(1);
  });

cli.help();
cli.version(pkgVersion);

async function main() {
  cli.parse(process.argv, { run: false });
  await cli.runMatchedCommand();
}

main().catch((err) => {
  console.error(kleur.red('geo-checker crashed:'), err instanceof Error ? err.message : err);
  process.exit(2);
});
