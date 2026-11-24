import path from 'node:path';
import {parseArgs} from 'node:util';

import {checkPackage, updateBaseline} from './check.js';
import {formatReport} from './report.js';

const USAGE = `Usage: arch-check [packageDir] [--update-baseline] [--verbose]

Checks <packageDir> (default: the current directory) against architecture/*.c4.
  --update-baseline  tolerate all current violations by rewriting architecture/baseline.json
  --verbose          list every finding instead of the first few per rule
`;

/**
 * Runs the CLI.
 * @param argv - arguments after the program name
 * @returns the process exit code: 0 ok, 1 violations found, 2 usage or runtime error
 */
export async function main(argv: string[]): Promise<number> {
  let args: ReturnType<typeof parseCliArgs>;
  try {
    args = parseCliArgs(argv);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n${USAGE}`);
    return 2;
  }
  if (args.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  try {
    if (args.updateBaseline) {
      return await runUpdateBaseline(args.packageDir);
    }
    const result = await checkPackage(args.packageDir);
    process.stdout.write(`${formatReport(result, {verbose: args.verbose})}\n`);
    return result.ok ? 0 : 1;
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return 2;
  }
}

function parseCliArgs(argv: string[]) {
  const {values, positionals} = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'update-baseline': {type: 'boolean'},
      verbose: {type: 'boolean'},
      help: {type: 'boolean', short: 'h'},
    },
  });
  if (positionals.length > 1) {
    throw new Error(`Expected at most one package directory, got ${positionals.length}`);
  }
  return {
    help: Boolean(values.help),
    updateBaseline: Boolean(values['update-baseline']),
    verbose: Boolean(values.verbose),
    packageDir: path.resolve(positionals[0] ?? '.'),
  };
}

async function runUpdateBaseline(packageDir: string): Promise<number> {
  const analysis = await updateBaseline(packageDir);
  process.stdout.write(
    `Baseline updated: ${analysis.boundaries.length} boundary imports, ` +
      `${analysis.runtimeCycles.length} runtime cycles, ${analysis.typeOnlyCycles.length} type-only cycles.\n`,
  );
  const unbaselinable = analysis.unownedFiles.length + analysis.packageImports.length;
  if (unbaselinable) {
    process.stderr.write(
      `warning: ${analysis.unownedFiles.length} unowned files and ${analysis.packageImports.length} package ` +
        'import violations cannot be baselined and still fail the check. Fix them (see `arch-check`).\n',
    );
  }
  return 0;
}
