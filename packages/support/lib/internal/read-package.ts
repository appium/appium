import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import normalizePackageData from 'normalize-package-data';
import type { PackageJson as TypeFestPackageJson } from 'type-fest';

export type PackageJson = TypeFestPackageJson;

export type NormalizedPackageJson = PackageJson & {
  name: string;
  version: string;
  readme: string;
  _id: string;
};

export type ReadPackageOptions = {
  /** Directory containing `package.json`. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Normalize package data. Defaults to `true`. */
  normalize?: boolean;
};

export type NormalizeOptions = ReadPackageOptions & { normalize?: true };

export type PackageDirectoryOptions = {
  /** Directory to search upward from. Defaults to `process.cwd()`. */
  cwd?: string;
};

/** Finds the directory containing the nearest `package.json` by walking upward from `cwd`. */
export function packageDirectorySync({ cwd }: PackageDirectoryOptions = {}): string | undefined {
  let dir = path.resolve(cwd ?? process.cwd());
  const fsRoot = path.parse(dir).root;

  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    if (dir === fsRoot) {
      return undefined;
    }
    dir = path.dirname(dir);
  }
}

/** Reads and parses `package.json` from `cwd`. */
export function readPackageSync(options?: NormalizeOptions): NormalizedPackageJson;
export function readPackageSync(options: ReadPackageOptions): PackageJson;
export function readPackageSync(options: ReadPackageOptions = {}): PackageJson | NormalizedPackageJson {
  const { cwd, normalize = true } = options;
  const contents = fs.readFileSync(getPackagePath(cwd), 'utf8');
  return parsePackageJson(contents, normalize);
}

/** Reads and parses `package.json` from `cwd`. */
export async function readPackage(options?: NormalizeOptions): Promise<NormalizedPackageJson>;
export async function readPackage(options: ReadPackageOptions): Promise<PackageJson>;
export async function readPackage(options: ReadPackageOptions = {}): Promise<PackageJson | NormalizedPackageJson> {
  const { cwd, normalize = true } = options;
  const contents = await fsPromises.readFile(getPackagePath(cwd), 'utf8');
  return parsePackageJson(contents, normalize);
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
