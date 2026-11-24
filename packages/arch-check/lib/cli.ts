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
  try {
    const {values, positionals} = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        'update-baseline': {type: 'boolean'},
        verbose: {type: 'boolean'},
        help: {type: 'boolean', short: 'h'},
      },
    });
    if (values.help) {
      process.stdout.write(USAGE);
      return 0;
    }
    const packageDir = path.resolve(positionals[0] ?? '.');
    if (values['update-baseline']) {
      const analysis = await updateBaseline(packageDir);
      process.stdout.write(
        `Baseline updated: ${analysis.boundaries.length} boundary imports, ` +
          `${analysis.runtimeCycles.length} runtime cycles, ${analysis.typeOnlyCycles.length} type-only cycles.\n`,
      );
      return 0;
    }
    const result = await checkPackage(packageDir);
    process.stdout.write(`${formatReport(result, {verbose: values.verbose})}\n`);
    return result.ok ? 0 : 1;
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n${USAGE}`);
    return 2;
  }
}
