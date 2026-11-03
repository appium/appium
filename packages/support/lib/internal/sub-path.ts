import path from 'node:path';

/**
 * Checks whether the given path is a subpath of the given root folder.
 *
 * @param originalPath - The absolute file or folder path to test
 * @param root - The absolute root folder path
 * @param forcePosix - If true, interpret paths in POSIX format (e.g. on Windows)
 * @returns `true` if `originalPath` is under `root` or is equal to it
 * @throws {Error} If either path is not absolute
 */
export function isSubPath(originalPath: string, root: string, forcePosix: boolean | null = null): boolean {
  const pathObj = forcePosix ? path.posix : path;
  for (const p of [originalPath, root]) {
    if (!pathObj.isAbsolute(p)) {
      throw new Error(`'${p}' is expected to be an absolute path`);
    }
  }
  // An empty relative path means both arguments point to the same location.
  // Comparing the strings instead would accept any sibling whose name starts
  // with the root folder name, like '/root-backup' for the '/root' root.
  const relativePath = pathObj.relative(root, originalPath);
  return relativePath !== '..' && !relativePath.startsWith(`..${pathObj.sep}`) && !pathObj.isAbsolute(relativePath);
}
