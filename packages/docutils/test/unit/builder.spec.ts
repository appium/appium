import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, before, after} from 'node:test';

import {fs, tempDir} from '@appium/support';

import {findDeployVersion} from '../../lib/builder/deploy.js';
import {NAME_PACKAGE_JSON} from '../../lib/constants.js';

/**
 * Helper function to create a project directory with package.json
 */
async function createPackageJson(testDir: string, packageJson: Record<string, any>): Promise<string> {
  await fs.mkdirp(testDir);
  const packageJsonPath = path.join(testDir, NAME_PACKAGE_JSON);
  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
  return packageJsonPath;
}

describe('findDeployVersion', function () {
  let testDir: string;
  let packageJsonPath: string;

  before(async function () {
    testDir = await tempDir.openDir();
    packageJsonPath = await createPackageJson(testDir, {
      version: '2.3.8',
    });
  });

  after(async function () {
    if (testDir) {
      await fs.rimraf(testDir);
    }
  });

  it('should use MAJOR.MINOR version by default', async function () {
    assert.strictEqual(await findDeployVersion(packageJsonPath), '2.3');
  });

  it('should use prefixed MAJOR version if usePrefixedMajorVersion is used', async function () {
    assert.strictEqual(await findDeployVersion(packageJsonPath, true), 'v2');
  });

  it('should support custom working directory', async function () {
    assert.strictEqual(await findDeployVersion(undefined, false, testDir), '2.3');
  });
});
