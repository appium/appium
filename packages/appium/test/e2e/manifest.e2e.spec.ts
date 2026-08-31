import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, before, after, beforeEach} from 'node:test';

import {fs, tempDir} from '@appium/support';
import type {AnyManifestDataVersion} from 'appium/types';
import * as YAML from 'yaml';

import {
  CACHE_DIR_RELATIVE_PATH,
  CURRENT_SCHEMA_REV,
  DRIVER_TYPE,
  EXT_SUBCOMMAND_LIST as LIST,
} from '../../lib/constants';
import {FAKE_DRIVER_DIR, resolveFixture} from '../helpers';
import {installLocalExtension, runAppiumJson} from './e2e-helpers';

describe('manifest handling', function () {
  let appiumHome: string;
  let manifestPath: string;
  let runList: (args?: string[]) => Promise<Record<string, unknown>>;

  async function resetAppiumHome() {
    await fs.rimraf(appiumHome);
    await fs.mkdirp(appiumHome);
  }

  before(async function () {
    appiumHome = await tempDir.openDir();
    manifestPath = path.join(appiumHome, CACHE_DIR_RELATIVE_PATH, 'extensions.yaml');
    const run = runAppiumJson(appiumHome);
    runList = async (args = []) => run([DRIVER_TYPE, LIST, ...args]) as Promise<Record<string, unknown>>;
  });

  async function readManifest(): Promise<AnyManifestDataVersion> {
    return YAML.parse(await fs.readFile(manifestPath, 'utf8')) as AnyManifestDataVersion;
  }

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  describe('migration', function () {
    beforeEach(async function () {
      await resetAppiumHome();
      await fs.mkdirp(path.dirname(manifestPath));
    });

    describe('schema rev update', function () {
      beforeEach(async function () {
        await fs.copyFile(resolveFixture('manifest/v2-empty.yaml'), manifestPath);
      });

      it('should update the manifest file to the latest schema revision', async function () {
        await runList();
        const manifest = await readManifest();
        assert.strictEqual(manifest.schemaRev, CURRENT_SCHEMA_REV);
      });
    });

    describe('v3', function () {
      let manifest: AnyManifestDataVersion;

      before(async function () {
        await installLocalExtension(appiumHome, DRIVER_TYPE, FAKE_DRIVER_DIR);
        const list = await runList();
        assert.ok(list.fake);

        let tmpManifest = await readManifest();
        tmpManifest.schemaRev = 2;
        const drivers = tmpManifest.drivers as Record<string, {installPath?: string}>;
        if (drivers?.fake) {
          delete drivers.fake.installPath;
        }
        await fs.writeFile(manifestPath, YAML.stringify(tmpManifest));
        tmpManifest = await readManifest();
        assert.strictEqual(tmpManifest.schemaRev, 2);
        assert.ok(!(tmpManifest.drivers as Record<string, {installPath?: string}>)?.fake?.installPath);
        await runList();
        manifest = await readManifest();
      });

      it('should add an "installPath" field to each extension', function () {
        const drivers = manifest.drivers as Record<string, {installPath?: string}>;
        assert.strictEqual(typeof drivers?.fake?.installPath, 'string');
      });

      it('should update the manifest file to the latest schema revision', function () {
        assert.strictEqual(manifest.schemaRev, CURRENT_SCHEMA_REV);
      });
    });
  });
});
