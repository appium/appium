import path from 'node:path';
import {fs, tempDir} from '@appium/support';
import {findDeployVersion} from '../../lib/builder/deploy';
import {NAME_PACKAGE_JSON} from '../../lib/constants';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const {expect} = chai;

/**
 * Helper function to create a project directory with package.json
 */
async function createPackageJson(
  testDir: string,
  packageJson: Record<string, any>,
): Promise<string> {
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
    expect(await findDeployVersion(packageJsonPath)).to.equal('2.3');
  });

  it('should use prefixed MAJOR version if usePrefixedMajorVersion is used', async function () {
    expect(await findDeployVersion(packageJsonPath, true)).to.equal('v2');
  });

  it('should support custom working directory', async function () {
    expect(await findDeployVersion(undefined, false, testDir)).to.equal('2.3');
  });
});
