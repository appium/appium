/**
 * A minimal, practical shape for a `package.json` file's contents.
 *
 * @module
 */

import type {JsonValue} from './json.js';

/**
 * Covers the fields actually used across the monorepo; anything else falls back to the index
 * signature.
 */
export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  keywords?: string[];
  homepage?: string;
  license?: string;
  author?: string | {name: string; email?: string; url?: string};
  main?: string;
  types?: string;
  typings?: string;
  bin?: string | Record<string, string>;
  files?: string[];
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  bundledDependencies?: string[];
  engines?: Record<string, string>;
  os?: string[];
  cpu?: string[];
  private?: boolean;
  workspaces?: string[];
  repository?: string | {type?: string; url?: string; directory?: string};
  bugs?: string | {url?: string; email?: string};
  [key: string]: JsonValue | undefined;
}
