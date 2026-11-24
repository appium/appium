import {readFile} from 'node:fs/promises';
import {builtinModules} from 'node:module';
import path from 'node:path';

import type {IModule} from 'dependency-cruiser';

import type {ArchCheckConfig} from '../types.js';
import {byString} from '../util.js';
import {isExportedSubpath, readInstalledExports} from './exports.js';

const BUILTINS = new Set(builtinModules);

export interface DeclaredDependencies {
  name?: string;
  /** `dependencies`, `peerDependencies` and `optionalDependencies`. */
  runtime: ReadonlySet<string>;
  dev: ReadonlySet<string>;
}

export interface PackageImportContext {
  packageDir: string;
  /** Source root with a trailing slash, e.g. `lib/`. */
  prefix: string;
  entryPointScopes: readonly string[];
  undeclaredDependencies: NonNullable<ArchCheckConfig['undeclaredDependencies']>;
  declared: DeclaredDependencies;
  /** The graph without type-only imports; an import missing from it is erased at runtime. */
  runtimeModules: readonly IModule[];
}

export interface PackageImportFinding {
  key: string;
  message: string;
}

/** Reads the declared dependencies and the name of the package in `packageDir`. */
export async function readDeclaredDependencies(packageDir: string): Promise<DeclaredDependencies> {
  const pkg = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8')) as {
    name?: string;
  } & Record<string, Record<string, string> | undefined>;
  const names = (fields: string[]) => new Set(fields.flatMap((field) => Object.keys(pkg[field] ?? {})));
  return {
    name: pkg.name,
    runtime: names(['dependencies', 'peerDependencies', 'optionalDependencies']),
    dev: names(['devDependencies']),
  };
}

/**
 * Checks the packages the source imports: deep imports of packages in `entryPointScopes` (unless
 * the installed package exports the subpath), and packages missing from `package.json`.
 */
export async function findPackageImports(
  modules: readonly IModule[],
  context: PackageImportContext,
): Promise<PackageImportFinding[]> {
  const {prefix, entryPointScopes, undeclaredDependencies, declared, runtimeModules} = context;
  const runtimeImports = new Set(runtimeModules.flatMap((m) => m.dependencies.map((d) => `${m.source}\0${d.module}`)));
  const exportsOf = createExportsLookup(context.packageDir);
  const findings = new Map<string, string>();
  for (const mod of modules.filter((m) => m.source.startsWith(prefix))) {
    for (const dep of mod.dependencies) {
      const spec = parseScopedSpecifier(dep.module, entryPointScopes);
      if (spec?.subpath && !isExportedSubpath(await exportsOf(spec.pkg), spec.subpath)) {
        findings.set(
          `${mod.source} -> ${dep.module}`,
          `${mod.source} deep-imports '${dep.module}'. Import from '${spec.pkg}' entry points only.`,
        );
      }
      const external =
        undeclaredDependencies === 'error'
          ? isLocalFile(dep)
            ? null
            : externalPackageName(dep.module)
          : (spec?.pkg ?? null);
      // Unresolved imports carry no type-only marker, so type-only is "absent from the runtime graph".
      const isTypeOnly = !runtimeImports.has(`${mod.source}\0${dep.module}`);
      if (
        external &&
        external !== declared.name &&
        !declared.runtime.has(external) &&
        !(declared.dev.has(external) && isTypeOnly)
      ) {
        findings.set(
          `${mod.source} -> ${external}`,
          `${mod.source} imports '${external}', which is not declared in package.json (devDependencies are enough for type-only imports).`,
        );
      }
    }
  }
  return [...findings].map(([key, message]) => ({key, message})).sort((a, b) => byString(a.key, b.key));
}

/**
 * Parses an import specifier of a package within one of the given npm scopes.
 * @returns the package name, and the subpath (e.g. `./oxlint`) if the specifier reaches past the
 * package's root entry point, or `null`
 */
export function parseScopedSpecifier(
  specifier: string,
  scopes: readonly string[],
): {pkg: string; subpath?: string} | null {
  for (const scope of scopes) {
    const escaped = scope.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`^(${escaped}/[^/]+)(/.*)?$`).exec(specifier);
    if (match) {
      return {pkg: match[1], ...(match[2] ? {subpath: `.${match[2]}`} : {})};
    }
  }
  return null;
}

/**
 * The npm package an import specifier refers to (`@scope/name` or `name`), or `null` for relative
 * and absolute paths, `#` imports, `node:`/URL-style specifiers and Node.js built-in modules.
 */
export function externalPackageName(specifier: string): string | null {
  if (/^[./#]/.test(specifier) || specifier.includes(':')) {
    return null;
  }
  const parts = specifier.split('/');
  const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  return !name || (!specifier.startsWith('@') && BUILTINS.has(name)) ? null : name;
}

/**
 * Whether an import resolved to a file of this package that is not in `node_modules`: a relative
 * import, or a tsconfig `paths` alias (wherever in the package it points). Packages resolve into
 * `node_modules`, or, for linked workspace packages, outside the package directory.
 */
function isLocalFile(dep: {resolved: string; couldNotResolve?: boolean}): boolean {
  return (
    !dep.couldNotResolve &&
    !dep.resolved.startsWith('..') &&
    !path.isAbsolute(dep.resolved) &&
    !dep.resolved.split('/').includes('node_modules')
  );
}

/** Looks up the `exports` of installed packages, reading each package at most once. */
function createExportsLookup(fromDir: string): (pkg: string) => Promise<unknown> {
  const cache = new Map<string, Promise<unknown>>();
  return (pkg) => {
    if (!cache.has(pkg)) {
      cache.set(pkg, readInstalledExports(fromDir, pkg));
    }
    return cache.get(pkg) as Promise<unknown>;
  };
}
