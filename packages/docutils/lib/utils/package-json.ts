import { fs } from '@appium/support';
import nodeFs from 'node:fs';
import path from 'node:path';
import normalizePackageData from 'normalize-package-data';
import type { PackageJson as TypeFestPackageJson } from 'type-fest';

export type PackageJson = TypeFestPackageJson;

export type NormalizedPackageJson = PackageJson & {
  name: string;
  version: string;
  readme: string;
  _id: string;
  bugs?: { url: string };
  repository?: { type: string; url: string; directory?: string };
};

export type ReadPackageOptions = {
  /** Directory containing `package.json`. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Normalize package data. Defaults to `true`. */
  normalize?: boolean;
};

export type NormalizeOptions = ReadPackageOptions & { normalize?: true };

/** Finds the directory containing the nearest `package.json` by walking upward from `dir`. */
export async function findPackageRoot(dir: string): Promise<string> {
  assertNonEmptyDir(dir, 'findPackageRoot');
  let current = path.resolve(dir);
  const fsRoot = path.parse(current).root;

  while (true) {
    if (await fs.exists(path.join(current, 'package.json'))) {
      return current;
    }
    if (current === fsRoot) {
      throwPackageRootNotFound(dir);
    }
    current = path.dirname(current);
  }
}

/** Finds the project root directory from `dir`. */
export function findPackageRootSync(dir: string): string {
  assertNonEmptyDir(dir, 'findPackageRootSync');
  let current = path.resolve(dir);
  const fsRoot = path.parse(current).root;

  while (true) {
    if (nodeFs.existsSync(path.join(current, 'package.json'))) {
      return current;
    }
    if (current === fsRoot) {
      throwPackageRootNotFound(dir);
    }
    current = path.dirname(current);
  }
}

/** Reads and parses `package.json` from `cwd`. */
export async function readPackage(options?: NormalizeOptions): Promise<NormalizedPackageJson>;
export async function readPackage(options: ReadPackageOptions): Promise<PackageJson>;
export async function readPackage(options: ReadPackageOptions = {}): Promise<PackageJson | NormalizedPackageJson> {
  const { cwd, normalize = true } = options;
  const contents = await fs.readFile(getPackagePath(cwd), 'utf8');
  return parsePackageJson(contents, normalize);
}

function assertNonEmptyDir(dir: string, fnName: string): void {
  if (!dir) {
    throw new TypeError(`\`${fnName}()\` must be provided a non-empty path`);
  }
}

function throwPackageRootNotFound(dir: string): never {
  throw new Error(`Could not find \`package.json\` from ${dir}`);
}

function getPackagePath(cwd?: string): string {
  return path.resolve(cwd ?? process.cwd(), 'package.json');
}

function parsePackageJson(contents: string, normalize: true): NormalizedPackageJson;
function parsePackageJson(contents: string, normalize: false): PackageJson;
function parsePackageJson(contents: string, normalize?: boolean): PackageJson | NormalizedPackageJson;
function parsePackageJson(contents: string, normalize = true): PackageJson | NormalizedPackageJson {
  const json = JSON.parse(contents) as PackageJson;
  if (normalize === false) {
    return json;
  }
  normalizePackageData(json);
  return json as NormalizedPackageJson;
}
