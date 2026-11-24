import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';

import picomatch from 'picomatch';

import {ARCHITECTURE_DIR} from './config.js';

/**
 * Lists the workspace packages of the monorepo at `rootDir` that have an `architecture/` model.
 * Only `*` wildcards are supported in the `workspaces` patterns of `package.json`.
 */
export async function findWorkspacePackages(rootDir: string): Promise<string[]> {
  const pkg = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8')) as {
    workspaces?: string[] | {packages?: string[]};
  };
  const patterns = Array.isArray(pkg.workspaces) ? pkg.workspaces : (pkg.workspaces?.packages ?? []);
  if (!patterns.length) {
    throw new Error(`${rootDir}/package.json declares no workspaces`);
  }
  const included = patterns.filter((p) => !p.startsWith('!'));
  const isExcluded = picomatch(patterns.filter((p) => p.startsWith('!')).map((p) => p.slice(1)));
  const dirs = (await Promise.all(included.map((pattern) => expand(rootDir, pattern.split('/').filter(Boolean)))))
    .flat()
    .filter((dir) => !isExcluded(path.relative(rootDir, dir).split(path.sep).join('/')));
  const modeled = await Promise.all(dirs.map(async (dir) => ((await hasModel(dir)) ? dir : null)));
  return [...new Set(modeled.filter((d): d is string => d !== null))].sort();
}

async function expand(base: string, segments: string[]): Promise<string[]> {
  if (!segments.length) {
    return [base];
  }
  const [head, ...rest] = segments;
  if (head.includes('**')) {
    throw new Error(`Unsupported workspace pattern segment '${head}': only '*' wildcards are supported`);
  }
  if (!head.includes('*')) {
    return expand(path.join(base, head), rest);
  }
  const isMatch = picomatch(head);
  const entries = await readdir(base, {withFileTypes: true}).catch(() => []);
  const matches = entries.filter((e) => e.isDirectory() && e.name !== 'node_modules' && isMatch(e.name));
  return (await Promise.all(matches.map((e) => expand(path.join(base, e.name), rest)))).flat();
}

async function hasModel(dir: string): Promise<boolean> {
  const files = await readdir(path.join(dir, ARCHITECTURE_DIR)).catch(() => [] as string[]);
  return files.some((f) => f.endsWith('.c4'));
}
