import {node} from '@appium/support';
import path from 'node:path';

/**
 * Absolute path to bundled legacy test fixture static files.
 *
 * @deprecated Removed in Appium 4. Test fixture files will live in the appium/test-fixtures
 * repository. Do not depend on this path in driver CI — hard-copy needed files locally.
 */
export const TEST_FIXTURES_DIR = resolveTestFixturesDir();

function resolveTestFixturesDir(): string {
  const packageRoot = node.getModuleRootSync('@appium/base-driver', __filename);
  if (!packageRoot) {
    throw new Error(`Could not find the module root folder for @appium/base-driver`);
  }
  return path.join(packageRoot, 'test-fixtures', 'static');
}
