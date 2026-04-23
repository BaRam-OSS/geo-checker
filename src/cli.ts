#!/usr/bin/env node
import { cac } from 'cac';
import kleur from 'kleur';

const pkgVersion = '0.1.0';

const cli = cac('geo-audit');

cli
  .command('<url>', 'Audit a URL for GEO (Generative Engine Optimization) readiness')
  .option('--json', 'Output a JSON report to stdout')
  .option('--render', 'Use a headless browser (requires optional playwright dependency)')
  .option('--category <names>', 'Run only the given categories (comma-separated)')
  .option('--only <ids>', 'Run only the given rule IDs (comma-separated)')
  .option('--fail-on <level>', 'Exit non-zero when a result is at or above this level (warn|fail)', {
    default: 'fail',
  })
  .action(async (_url: string) => {
    console.error(
      kleur.yellow(
        'geo-audit scaffold build: audit logic is not wired up yet. Run after Phase 1 lands.',
      ),
    );
    process.exit(2);
  });

cli.help();
cli.version(pkgVersion);

async function main() {
  cli.parse(process.argv, { run: false });
  await cli.runMatchedCommand();
}

main().catch((err) => {
  console.error(kleur.red('geo-audit crashed:'), err instanceof Error ? err.message : err);
  process.exit(2);
});
