import path from 'node:path';
import {parseArgs} from 'node:util';

import {checkPackage, updateBaseline} from './check.js';
import {initPackage} from './init.js';
import {formatReport} from './report.js';
import {findWorkspacePackages} from './workspaces.js';

const USAGE = `Usage:
  arch-check [packageDir...] [--workspaces] [--update-baseline] [--verbose]
  arch-check init [packageDir] [--source-root <dir>] [--entry-point-scope <scope>]...

Checks each package (default: the current directory) against its architecture/*.c4.
  --workspaces       treat each packageDir as a monorepo root and check its workspace packages
                     that have an architecture/ directory
  --update-baseline  tolerate all current violations by rewriting architecture/baseline.json
  --verbose          list every finding instead of the first few per rule

init creates architecture/ for a package from its current code (components = top-level
directories and files of the source root, dependencies = current imports) and a baseline.
`;

const EXIT_OK = 0;
const EXIT_VIOLATIONS = 1;
const EXIT_ERROR = 2;

interface CliArgs {
  help: boolean;
  init: boolean;
  workspaces: boolean;
  updateBaseline: boolean;
  verbose: boolean;
  sourceRoot?: string;
  entryPointScopes: string[];
  dirs: string[];
}

/**
 * Runs the CLI.
 * @param argv - arguments after the program name
 * @returns the process exit code: 0 ok, 1 violations found, 2 usage or runtime error
 */
export async function main(argv: string[]): Promise<number> {
  let args: CliArgs;
  try {
    args = parseCliArgs(argv);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n${USAGE}`);
    return EXIT_ERROR;
  }
  if (args.help) {
    process.stdout.write(USAGE);
    return EXIT_OK;
  }
  try {
    if (args.init) {
      return await runInit(args);
    }
    const dirs = args.workspaces ? (await Promise.all(args.dirs.map(findWorkspacePackages))).flat() : args.dirs;
    if (!dirs.length) {
      throw new Error('No packages with an architecture/ directory found');
    }
    let exitCode = EXIT_OK;
    for (const dir of dirs) {
      if (dirs.length > 1) {
        process.stdout.write(`== ${path.relative(process.cwd(), dir) || '.'}\n`);
      }
      exitCode = Math.max(exitCode, await runOne(dir, args));
    }
    return exitCode;
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return EXIT_ERROR;
  }
}

function parseCliArgs(argv: string[]): CliArgs {
  const {values, positionals} = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      workspaces: {type: 'boolean'},
      'update-baseline': {type: 'boolean'},
      verbose: {type: 'boolean'},
      'source-root': {type: 'string'},
      'entry-point-scope': {type: 'string', multiple: true},
      help: {type: 'boolean', short: 'h'},
    },
  });
  const init = positionals[0] === 'init';
  const dirs = (init ? positionals.slice(1) : positionals).map((d) => path.resolve(d));
  if (init && dirs.length > 1) {
    throw new Error(`init takes at most one package directory, got ${dirs.length}`);
  }
  if (init && (values.workspaces || values['update-baseline'])) {
    throw new Error('init does not take --workspaces or --update-baseline');
  }
  if (!init && (values['source-root'] || values['entry-point-scope'])) {
    throw new Error('--source-root and --entry-point-scope only apply to init');
  }
  return {
    help: Boolean(values.help),
    init,
    workspaces: Boolean(values.workspaces),
    updateBaseline: Boolean(values['update-baseline']),
    verbose: Boolean(values.verbose),
    sourceRoot: values['source-root'],
    entryPointScopes: values['entry-point-scope'] ?? [],
    dirs: dirs.length ? dirs : [path.resolve('.')],
  };
}

async function runOne(dir: string, args: CliArgs): Promise<number> {
  if (args.updateBaseline) {
    return runUpdateBaseline(dir);
  }
  const result = await checkPackage(dir);
  process.stdout.write(`${formatReport(result, {verbose: args.verbose})}\n`);
  return result.ok ? EXIT_OK : EXIT_VIOLATIONS;
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
  return EXIT_OK;
}

async function runInit(args: CliArgs): Promise<number> {
  const [dir] = args.dirs;
  const result = await initPackage(dir, {sourceRoot: args.sourceRoot, entryPointScopes: args.entryPointScopes});
  const rel = path.relative(process.cwd(), dir) || '.';
  process.stdout.write(
    `Created ${result.files.join(', ')} in ${rel}: ${result.components} components, ` +
      `${result.edges} allowed dependencies (taken from the current imports).\n\n` +
      'Next steps:\n' +
      '  1. Delete the dependencies in model.c4 that should not be allowed, add descriptions.\n' +
      `  2. Run \`arch-check ${rel} --update-baseline\` to tolerate the violations that creates.\n` +
      '  3. Run `arch-check` in CI, and add the following to AGENTS.md:\n\n' +
      `${agentsSnippet(rel)}`,
  );
  return EXIT_OK;
}

function agentsSnippet(packageDir: string): string {
  return `## Architecture

\`${packageDir}/architecture/*.c4\` is the source of truth for the component boundaries of
\`${packageDir}\`. CI runs \`npx arch-check ${packageDir}\`.

- Before adding or moving code, find the owning component (\`metadata.paths\`) and respect its
  allowed dependencies. New files must be covered by a component's \`paths\`.
- Fix a failing check by changing the code. Do not add edges to the model or entries to
  \`baseline.json\` to make it pass, unless the new dependency is intended; then update the \`.c4\`
  files in the same change and explain why in the PR description.
- Remove \`baseline.json\` entries when you fix the violation they cover.
- Keep component descriptions and the paths they own in sync with the code.
`;
}
