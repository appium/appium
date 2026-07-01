import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {fs, tempDir} from '../../../lib';
import {packageDirectorySync, readPackage, readPackageSync} from '../../../lib/internal/read-package';

use(chaiAsPromised);

describe('internal/read-package', function () {
  let fixtureRoot: string;

  beforeEach(async function () {
    fixtureRoot = await tempDir.openDir();
  });

  afterEach(async function () {
    if (fixtureRoot) {
      await fs.rimraf(fixtureRoot);
    }
  });

  async function writePackageJson(
    dir: string,
    pkg: Record<string, unknown> = {name: 'fixture-pkg', version: '1.2.3'},
  ): Promise<void> {
    await writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg), 'utf8');
  }

  describe('packageDirectorySync()', function () {
    it('should return undefined when no package.json exists in the ancestry', function () {
      expect(packageDirectorySync({cwd: fixtureRoot})).to.be.undefined;
    });

    it('should find package.json in the current directory', async function () {
      await writePackageJson(fixtureRoot);
      expect(packageDirectorySync({cwd: fixtureRoot})).to.equal(fixtureRoot);
    });

    it('should find the nearest package.json in a parent directory', async function () {
      await writePackageJson(fixtureRoot);
      const nestedDir = path.join(fixtureRoot, 'nested', 'deep');
      await mkdir(nestedDir, {recursive: true});

      expect(packageDirectorySync({cwd: nestedDir})).to.equal(fixtureRoot);
    });
  });

  describe('readPackageSync()', function () {
    it('should throw when package.json is missing', function () {
      expect(() => readPackageSync({cwd: fixtureRoot})).to.throw(Error);
    });

    it('should read and normalize package.json', async function () {
      await writePackageJson(fixtureRoot, {
        name: 'fixture-pkg',
        version: '1.2.3',
        repository: 'https://github.com/appium/appium',
      });

      const pkg = readPackageSync({cwd: fixtureRoot});

      expect(pkg.name).to.equal('fixture-pkg');
      expect(pkg.version).to.equal('1.2.3');
      expect(pkg.repository).to.eql({
        type: 'git',
        url: 'git+https://github.com/appium/appium.git',
      });
    });

    it('should preserve raw fields when normalization is disabled', async function () {
      const repository = 'https://github.com/appium/appium';
      await writePackageJson(fixtureRoot, {
        name: 'fixture-pkg',
        version: '1.2.3',
        repository,
      });

      const pkg = readPackageSync({cwd: fixtureRoot, normalize: false});

      expect(pkg.repository).to.equal(repository);
    });
  });

  describe('readPackage()', function () {
    it('should reject when package.json is missing', async function () {
      await expect(readPackage({cwd: fixtureRoot})).to.be.rejectedWith(Error);
    });

    it('should read and normalize package.json', async function () {
      await writePackageJson(fixtureRoot, {
        name: 'fixture-pkg',
        version: '4.5.6',
        repository: 'https://github.com/appium/appium',
      });

      const pkg = await readPackage({cwd: fixtureRoot});

      expect(pkg.name).to.equal('fixture-pkg');
      expect(pkg.version).to.equal('4.5.6');
      expect(pkg.repository).to.eql({
        type: 'git',
        url: 'git+https://github.com/appium/appium.git',
      });
    });
  });
});
