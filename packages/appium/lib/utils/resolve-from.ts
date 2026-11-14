import {readFile, realpath} from 'node:fs/promises';
import Module, {createRequire} from 'node:module';
import path from 'node:path';

/**
 * Resolves `moduleId` using Node's module resolution from `fromDirectory`.
 *
 * @param fromDirectory - Directory to resolve from (typically a project or `APPIUM_HOME` root)
 * @param moduleId - Module id or path to resolve (e.g. `semver/package.json`)
 * @returns Resolved module id. Package paths are typically absolute filesystem paths; built-in
 *   modules may resolve to non-absolute ids (e.g. `node:fs`, `fs`).
 * @throws `Error` if Node cannot resolve `moduleId` from `fromDirectory`
 */
export async function resolveFrom(fromDirectory: string, moduleId: string): Promise<string> {
  const resolvedFromDirectory = await resolveDirectory(fromDirectory);

  const fromFile = path.join(resolvedFromDirectory, 'noop.js');
  const nodeModule = Module as typeof Module & {
    _resolveFilename: (id: string, parent: {id: string; filename: string; paths: string[]}) => string;
    _nodeModulePaths: (from: string) => string[];
  };
  return nodeModule._resolveFilename(moduleId, {
    id: fromFile,
    filename: fromFile,
    paths: nodeModule._nodeModulePaths(resolvedFromDirectory),
  });
}

/**
 * Locates a dependency's package manifest using Node's module search paths without resolving an
 * exported package entry point.
 *
 * @param fromDirectory - Directory whose dependency tree should be searched
 * @param packageName - Declared dependency package name
 * @returns Real path to the owning package's root `package.json`
 */
export async function resolvePackageJsonFrom(fromDirectory: string, packageName: string): Promise<string> {
  const resolvedFromDirectory = await resolveDirectory(fromDirectory);
  const resolver = createRequire(path.join(resolvedFromDirectory, 'noop.js'));
  for (const nodeModulesPath of resolver.resolve.paths(packageName) ?? []) {
    const candidate = path.join(nodeModulesPath, packageName, 'package.json');
    try {
      return await realpath(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
  throw Object.assign(new Error(`Cannot find package manifest for '${packageName}' from '${resolvedFromDirectory}'`), {
    code: 'MODULE_NOT_FOUND',
  });
}

/**
 * Resolves a package subpath from a known package installation while honoring package exports.
 * Packages without exports may be external links, so they fall back to a root-relative path.
 *
 * @param installPath - Absolute installed package root
 * @param packageName - Package name from its manifest
 * @param subpath - Package-relative path to resolve
 * @returns Resolved subpath
 */
export async function resolvePackageSubpathFrom(
  installPath: string,
  packageName: string,
  subpath: string,
): Promise<string> {
  const resolvedInstallPath = await resolveDirectory(installPath);
  const packageJsonPath = path.join(resolvedInstallPath, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
    exports?: unknown;
  };
  const moduleId = path.posix.join(packageName, subpath.replaceAll('\\', '/'));
  if (Object.hasOwn(packageJson, 'exports')) {
    return createRequire(packageJsonPath).resolve(moduleId);
  }
  return await realpath(path.resolve(resolvedInstallPath, subpath));
}

async function resolveDirectory(directory: string): Promise<string> {
  try {
    return await realpath(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return path.resolve(directory);
    }
    throw error;
  }
}
