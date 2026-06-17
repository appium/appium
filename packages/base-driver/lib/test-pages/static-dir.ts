import path from 'node:path';

/**
 * Absolute path to bundled legacy test fixture static files.
 *
 * @deprecated Removed in Appium 4. Test fixture files will live in the appium/test-fixtures
 * repository. Do not depend on this path in driver CI — hard-copy needed files locally.
 */
export const TEST_FIXTURES_DIR = resolveTestFixturesDir();

function resolveTestFixturesDir(): string {
  const fromDir = __dirname;
  const parts = path.resolve(fromDir).split(path.sep);
  const baseDriverIndex = parts.indexOf('base-driver');
  if (baseDriverIndex < 0) {
    throw new Error(`Could not find the module root folder in the path: ${fromDir}`);
  }
  return path.join(parts.slice(0, baseDriverIndex + 1).join(path.sep), 'test-fixtures', 'static');
}
