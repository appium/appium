import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {fs, tempDir} from '@appium/support';

import {readPackage} from '../../../lib/utils/read-package.js';

describe('utils/read-package', function () {
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

  describe('readPackage()', function () {
    it('should reject when package.json is missing', async function () {
      await assert.rejects(readPackage({cwd: fixtureRoot}), Error);
    });

    it('should read and normalize package.json', async function () {
      await writePackageJson(fixtureRoot, {
        name: 'fixture-pkg',
        version: '4.5.6',
        repository: 'https://github.com/appium/appium',
      });

      const pkg = await readPackage({cwd: fixtureRoot});

      assert.strictEqual(pkg.name, 'fixture-pkg');
      assert.strictEqual(pkg.version, '4.5.6');
      assert.deepStrictEqual(pkg.repository, {
        type: 'git',
        url: 'git+https://github.com/appium/appium.git',
      });
    });
  });
});
