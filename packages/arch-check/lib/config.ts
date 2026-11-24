import {readFile, realpath} from 'node:fs/promises';
import path from 'node:path';

import type {ArchCheckConfig, ResolvedConfig} from './types.js';

export const ARCHITECTURE_DIR = 'architecture';

const CONFIG_KEYS = new Set(['sourceRoot', 'tsconfig', 'entryPointScopes', 'typeOnlyCycles']);

/**
 * Resolves the settings of the package in `packageDir`, applying defaults over the optional
 * `architecture/config.json`.
 */
export async function loadConfig(packageDir: string): Promise<ResolvedConfig> {
  // dependency-cruiser reports real paths, so symlinked directories (e.g. macOS /tmp) must be resolved
  const root = await realpath(path.resolve(packageDir));
  const modelDir = path.join(root, ARCHITECTURE_DIR);
  const configFile = path.join(modelDir, 'config.json');
  const user = parseConfig(await readOptionalJson<ArchCheckConfig>(configFile), configFile);
  return {
    packageDir: root,
    sourceRoot: user.sourceRoot ?? 'lib',
    tsconfig: user.tsconfig ?? 'tsconfig.json',
    entryPointScopes: user.entryPointScopes ?? [],
    typeOnlyCycles: user.typeOnlyCycles ?? 'error',
    modelDir,
    baselineFile: path.join(modelDir, 'baseline.json'),
  };
}

/** Validates the contents of `architecture/config.json`; unknown options are rejected to catch typos. */
export function parseConfig(raw: unknown, file: string): ArchCheckConfig {
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
  if (config.typeOnlyCycles !== undefined && config.typeOnlyCycles !== 'error' && config.typeOnlyCycles !== 'ignore') {
    fail("'typeOnlyCycles' must be 'error' or 'ignore'");
  }
  return config as ArchCheckConfig;
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
