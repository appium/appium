import fsPromises from 'node:fs/promises';
import path from 'node:path';

import normalizePackageData from 'normalize-package-data';
import type {PackageJson as TypeFestPackageJson} from 'type-fest';

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

export type NormalizeOptions = ReadPackageOptions & {normalize?: true};

/** Reads and parses `package.json` from `cwd`. */
export async function readPackage(options?: NormalizeOptions): Promise<NormalizedPackageJson>;
export async function readPackage(options: ReadPackageOptions): Promise<PackageJson>;
export async function readPackage(options: ReadPackageOptions = {}): Promise<PackageJson | NormalizedPackageJson> {
  const {cwd, normalize = true} = options;
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
