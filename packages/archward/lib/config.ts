import {readFile, realpath} from 'node:fs/promises';
import path from 'node:path';

import type {ArchwardConfig, ResolvedConfig} from './types.js';

export const ARCHITECTURE_DIR = 'architecture';

const CONFIG_KEYS = new Set([
  'sourceRoot',
  'tsconfig',
  'entryPointScopes',
  'typeOnlyCycles',
  'undeclaredDependencies',
  'unusedEdges',
  'unresolvedImports',
]);

/**
 * Resolves the settings of the package in `packageDir`, applying defaults over the optional
 * `architecture/config.json`.
 */
export async function loadConfig(packageDir: string): Promise<ResolvedConfig> {
  // dependency-cruiser reports real paths, so symlinked directories (e.g. macOS /tmp) must be resolved
  const root = await realpath(path.resolve(packageDir));
  const modelDir = path.join(root, ARCHITECTURE_DIR);
  const configFile = path.join(modelDir, 'config.json');
  const user = parseConfig(await readOptionalJson<ArchwardConfig>(configFile), configFile);
  return {
    packageDir: root,
    sourceRoot: normalizeSourceRoot(user.sourceRoot ?? 'lib', configFile),
    tsconfig: user.tsconfig ?? 'tsconfig.json',
    entryPointScopes: user.entryPointScopes ?? [],
    typeOnlyCycles: user.typeOnlyCycles ?? 'error',
    undeclaredDependencies: user.undeclaredDependencies ?? 'ignore',
    unusedEdges: user.unusedEdges ?? 'warn',
    unresolvedImports: user.unresolvedImports ?? 'warn',
    modelDir,
    baselineFile: path.join(modelDir, 'baseline.json'),
  };
}

/**
 * Normalizes a source directory to the form used in the import graph: relative to the package,
 * `/`-separated, without a leading `./` or trailing slash.
 */
export function normalizeSourceRoot(sourceRoot: string, origin = 'sourceRoot'): string {
  const normalized = path.posix.normalize(sourceRoot.replace(/\\/g, '/')).replace(/\/+$/, '');
  if (!normalized || normalized === '.' || normalized.startsWith('..') || path.posix.isAbsolute(normalized)) {
    throw new Error(`${origin}: the source root must be a subdirectory of the package, got '${sourceRoot}'`);
  }
  return normalized;
}

/** Validates the contents of `architecture/config.json`; unknown options are rejected to catch typos. */
export function parseConfig(raw: unknown, file: string): ArchwardConfig {
  const fail = (msg: string): never => {
    throw new Error(`${file}: ${msg}`);
  };
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return fail('expected a JSON object');
  }
  const config = raw as Record<string, unknown>;
  for (const key of Object.keys(config)) {
    if (!CONFIG_KEYS.has(key)) {
      fail(`unknown option '${key}' (known: ${[...CONFIG_KEYS].join(', ')})`);
    }
  }
  for (const key of ['sourceRoot', 'tsconfig'] as const) {
    if (config[key] !== undefined && typeof config[key] !== 'string') {
      fail(`'${key}' must be a string`);
    }
  }
  const scopes = config.entryPointScopes;
  if (scopes !== undefined && !(Array.isArray(scopes) && scopes.every((s) => typeof s === 'string'))) {
    fail("'entryPointScopes' must be an array of strings");
  }
  for (const key of ['typeOnlyCycles', 'undeclaredDependencies'] as const) {
    if (config[key] !== undefined && config[key] !== 'error' && config[key] !== 'ignore') {
      fail(`'${key}' must be 'error' or 'ignore'`);
    }
  }
  for (const key of ['unusedEdges', 'unresolvedImports'] as const) {
    if (config[key] !== undefined && config[key] !== 'warn' && config[key] !== 'error') {
      fail(`'${key}' must be 'warn' or 'error'`);
    }
  }
  return config as ArchwardConfig;
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
