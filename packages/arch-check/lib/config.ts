import {readFile, realpath} from 'node:fs/promises';
import path from 'node:path';

import type {ArchCheckConfig, ResolvedConfig} from './types.js';

export const ARCHITECTURE_DIR = 'architecture';

/**
 * Resolves the settings of the package in `packageDir`, applying defaults over the optional
 * `architecture/config.json`.
 */
export async function loadConfig(packageDir: string): Promise<ResolvedConfig> {
  // dependency-cruiser reports real paths, so symlinked directories (e.g. macOS /tmp) must be resolved
  const root = await realpath(path.resolve(packageDir));
  const modelDir = path.join(root, ARCHITECTURE_DIR);
  const user = await readOptionalJson<ArchCheckConfig>(path.join(modelDir, 'config.json'));
  return {
    packageDir: root,
    sourceRoot: user.sourceRoot ?? 'lib',
    tsconfig: user.tsconfig ?? 'tsconfig.json',
    entryPointScopes: user.entryPointScopes ?? [],
    modelDir,
    baselineFile: path.join(modelDir, 'baseline.json'),
  };
}

/** Reads and parses a JSON file, returning `{}` if it does not exist. */
export async function readOptionalJson<T extends object>(file: string): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return {} as T;
    }
    throw new Error(`Cannot read ${file}: ${(err as Error).message}`, {cause: err});
  }
}
