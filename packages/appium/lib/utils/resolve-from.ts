import {realpath} from 'node:fs/promises';
import Module from 'node:module';
import path from 'node:path';

/**
 * Resolves an absolute path to `moduleId` using Node's module resolution from `fromDirectory`.
 *
 * @param fromDirectory - Directory to resolve from (typically a project or `APPIUM_HOME` root)
 * @param moduleId - Module id or path to resolve (e.g. `semver/package.json`)
 * @returns Absolute path to the resolved module
 * @throws `TypeError` if either argument is not a string
 * @throws `Error` if Node cannot resolve `moduleId` from `fromDirectory`
 */
export async function resolveFrom(fromDirectory: string, moduleId: string): Promise<string> {
  if (typeof fromDirectory !== 'string') {
    throw new TypeError(`Expected \`fromDir\` to be of type \`string\`, got \`${typeof fromDirectory}\``);
  }
  if (typeof moduleId !== 'string') {
    throw new TypeError(`Expected \`moduleId\` to be of type \`string\`, got \`${typeof moduleId}\``);
  }

  let resolvedFromDirectory: string;
  try {
    resolvedFromDirectory = await realpath(fromDirectory);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      resolvedFromDirectory = path.resolve(fromDirectory);
    } else {
      throw error;
    }
  }

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
