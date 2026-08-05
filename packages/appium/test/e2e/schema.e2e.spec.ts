import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, before, after} from 'node:test';

import {fs, tempDir} from '@appium/support';

import {DRIVER_TYPE} from '../../lib/constants';
import {resolveFixture} from '../helpers';
import {installLocalExtension, runAppium} from './e2e-helpers';

describe('CLI behavior controlled by schema', function () {
  let appiumHome: string;

  before(async function () {
    appiumHome = await tempDir.openDir();
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  describe('keyword', function () {
    let help: string;

    before(async function () {
      await installLocalExtension(appiumHome, DRIVER_TYPE, path.dirname(resolveFixture('test-driver/package.json')));
      help = await runAppium(appiumHome, ['server', '--help']);
    });

    describe('appiumCliIgnored', function () {
      it('should still support arguments without this keyword', function () {
        assert.match(help, /oliver-boliver/);
      });

      it('should cause the argument to be suppressed', function () {
        assert.doesNotMatch(help, /mcmonkey-mcbean/);
      });
    });

    describe('appiumDeprecated', function () {
      it.skip('should mark the argument as deprecated', function () {
        assert.match(help, /\[DEPRECATED\] funkytelechy/);
      });
    });
  });
});
