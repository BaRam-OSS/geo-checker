#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve as resolvePath } from 'node:path';
import { cac } from 'cac';
import kleur from 'kleur';
import { audit } from './index.js';
import { toJson } from './reporters/json.js';
import { toCli } from './reporters/cli.js';
import { toHtml } from './reporters/html.js';
import { toCsv } from './reporters/csv.js';
import { toMarkdown } from './reporters/markdown.js';
import { toSarif } from './reporters/sarif.js';
import { diffReports, formatDiffLine } from './reporters/diff.js';
import { findConfig } from './config.js';
import { runBatch, summaryToJson, urlToSlug, type BatchProgressEvent } from './batch.js';
import type { Category, Status, AuditReport } from './types.js';

const pkgVersion = '0.3.0';

const VALID_CATEGORIES: Category[] = ['crawler', 'structured-data', 'citation', 'content'];

type FailOn = 'fail' | 'warn';

interface CliFlags {
  json?: boolean;
  html?: string;
  out?: string;
  csv?: string;
  md?: string;
  sarif?: string;
  baseline?: string;
  config?: string;
  render?: boolean;
  category?: string;
  only?: string;
  failOn?: FailOn;
  timeout?: string | number;
}

interface BatchFlags {
  out?: string;
  concurrency?: string | number;
  config?: string;
  render?: boolean;
  category?: string;
  only?: string;
  timeout?: string | number;
}

async function writeReportFile(path: string, content: string): Promise<void> {
  const abs = resolvePath(path);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content, 'utf8');
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

async function resolveConfigPath(explicit: string | undefined): Promise<string | null> {
  if (explicit) return resolvePath(explicit);
  return findConfig(process.cwd());
}

async function readBaseline(path: string): Promise<AuditReport> {
  const raw = await readFile(resolvePath(path), 'utf8');
  return JSON.parse(raw) as AuditReport;
}

function parseIntOr<T>(raw: string | number | undefined, fallback: T): number | T {
  if (raw === undefined) return fallback;
  const n = typeof raw === 'string' ? parseInt(raw, 10) : raw;
  return Number.isNaN(n) ? fallback : n;
}

const cli = cac('geo-checker');

cli
  .command('<url>', 'Audit a URL for GEO (Generative Engine Optimization) readiness')
  .option('--json', 'Output a JSON report to stdout')
  .option('--html <path>', 'Write a standalone HTML report to <path> (use - for stdout)')
  .option('--csv <path>', 'Write a flat CSV report (one row per rule result)')
  .option('--md <path>', 'Write a Markdown PR-comment summary')
  .option('--sarif <path>', 'Write a SARIF 2.1.0 report (for GitHub Code Scanning)')
  .option('--out <dir>', 'Write report.json + report.html to <dir>')
  .option('--baseline <path>', 'Compare against a prior JSON report and print deltas')
  .option('--config <path>', 'Load a geo-checker config file (overrides rule weights, disables rules, etc.)')
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
    const timeoutMs = parseIntOr(flags.timeout, undefined);
    const configPath = await resolveConfigPath(flags.config);

    const report = await audit(url, {
      ...(flags.render ? { render: true } : {}),
      ...(categories ? { categories } : {}),
      ...(only ? { only } : {}),
      ...(typeof timeoutMs === 'number' ? { timeoutMs } : {}),
      ...(configPath ? { configPath } : {}),
    });

    const wroteFile =
      Boolean(flags.out) ||
      (flags.html && flags.html !== '-') ||
      Boolean(flags.csv) ||
      Boolean(flags.md) ||
      Boolean(flags.sarif);

    if (flags.out) {
      const dir = flags.out;
      await writeReportFile(resolvePath(dir, 'report.json'), toJson(report));
      await writeReportFile(resolvePath(dir, 'report.html'), toHtml(report));
      process.stderr.write(kleur.gray(`wrote ${resolvePath(dir, 'report.json')}\n`));
      process.stderr.write(kleur.gray(`wrote ${resolvePath(dir, 'report.html')}\n`));
    }

    if (flags.html) {
      if (flags.html === '-') {
        process.stdout.write(toHtml(report));
      } else {
        await writeReportFile(flags.html, toHtml(report));
        process.stderr.write(kleur.gray(`wrote ${resolvePath(flags.html)}\n`));
      }
    }

    if (flags.csv) {
      await writeReportFile(flags.csv, toCsv(report));
      process.stderr.write(kleur.gray(`wrote ${resolvePath(flags.csv)}\n`));
    }

    if (flags.md) {
      await writeReportFile(flags.md, toMarkdown(report));
      process.stderr.write(kleur.gray(`wrote ${resolvePath(flags.md)}\n`));
    }

    if (flags.sarif) {
      await writeReportFile(flags.sarif, toSarif(report));
      process.stderr.write(kleur.gray(`wrote ${resolvePath(flags.sarif)}\n`));
    }

    if (flags.baseline) {
      try {
        const prior = await readBaseline(flags.baseline);
        const diff = diffReports(prior, report);
        process.stderr.write(kleur.bold('baseline ') + formatDiffLine(diff) + '\n');
      } catch (err) {
        process.stderr.write(
          kleur.yellow(`! baseline comparison failed: ${err instanceof Error ? err.message : err}\n`),
        );
      }
    }

    if (flags.json) {
      process.stdout.write(toJson(report) + '\n');
    } else if (!wroteFile && flags.html !== '-') {
      process.stdout.write(toCli(report) + '\n');
    }

    const worst = worstStatus(report);
    const failOn: FailOn = flags.failOn === 'warn' ? 'warn' : 'fail';
    if (failOn === 'fail' && worst === 'fail') process.exit(1);
    if (failOn === 'warn' && (worst === 'warn' || worst === 'fail')) process.exit(1);
  });

cli
  .command('batch <file>', 'Audit every URL in <file> (one URL per line) and write individual reports')
  .option('--out <dir>', 'Output directory for per-URL reports and summary.json', { default: './geo-checker-batch' })
  .option('--concurrency <n>', 'Number of URLs to audit in parallel', { default: 4 })
  .option('--config <path>', 'Config file (see top-level --config)')
  .option('--render', 'Use a headless browser for each URL')
  .option('--category <names>', 'Run only the given categories (comma-separated)')
  .option('--only <ids>', 'Run only the given rule IDs (comma-separated)')
  .option('--timeout <ms>', 'Per-request timeout in milliseconds', { default: 20000 })
  .action(async (file: string, flags: BatchFlags) => {
    const raw = await readFile(resolvePath(file), 'utf8');
    const urls = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    if (urls.length === 0) {
      process.stderr.write(kleur.red('No URLs found in input file.\n'));
      process.exit(1);
    }
    const outDir = resolvePath(flags.out ?? './geo-checker-batch');
    await mkdir(outDir, { recursive: true });

    const concurrency = parseIntOr(flags.concurrency, 4);
    const categories = parseCategories(flags.category);
    const only = parseOnly(flags.only);
    const timeoutMs = parseIntOr(flags.timeout, undefined);
    const configPath = await resolveConfigPath(flags.config);

    const onProgress = (e: BatchProgressEvent): void => {
      if (e.kind === 'start') {
        process.stderr.write(kleur.gray(`[${e.index + 1}/${e.total}] ${e.url}\n`));
      } else if (e.kind === 'success') {
        process.stderr.write(kleur.green(`  ✓ ${e.overall}/100\n`));
      } else {
        process.stderr.write(kleur.red(`  ✗ ${e.error}\n`));
      }
    };

    const summary = await runBatch(urls, {
      concurrency: typeof concurrency === 'number' ? concurrency : 4,
      ...(flags.render ? { render: true } : {}),
      ...(categories ? { categories } : {}),
      ...(only ? { only } : {}),
      ...(typeof timeoutMs === 'number' ? { timeoutMs } : {}),
      ...(configPath ? { configPath } : {}),
      onProgress,
    });

    for (const r of summary.results) {
      if (!r.ok) continue;
      const slug = urlToSlug(r.url);
      await writeFile(resolvePath(outDir, `${slug}.json`), toJson(r.report), 'utf8');
      await writeFile(resolvePath(outDir, `${slug}.html`), toHtml(r.report), 'utf8');
    }
    await writeFile(resolvePath(outDir, 'summary.json'), summaryToJson(summary), 'utf8');
    process.stderr.write(
      kleur.bold(
        `\nBatch done: ${summary.successes}/${summary.total} succeeded · avg ${summary.averageOverall} · written to ${outDir}\n`,
      ),
    );
    if (summary.failures > 0) process.exit(1);
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
