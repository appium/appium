import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach} from 'node:test';

import {BaseDriver} from '@appium/base-driver';
import {console as supportConsole} from '@appium/support';
import type {DriverClass} from '@appium/types';
import type {ParsedArgs} from 'appium/types/index.js';
import type {SinonSandbox, SinonSpy} from 'sinon';
import {createSandbox} from 'sinon';

import {AppiumDriver} from '../../../lib/appium.js';
import {buildServerOpts, inspect, showBuildInfo} from '../../../lib/bootstrap/main-helpers.js';
import {getBuildInfo} from '../../../lib/helpers/build.js';
import {log as logger} from '../../../lib/logger.js';
import {finalizeSchema, getDefaultsForSchema} from '../../../lib/schema/schema.js';

describe('bootstrap/main-helpers', function () {
  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('showBuildInfo()', function () {
    let log: SinonSpy;

    beforeEach(function () {
      log = sandbox.spy(console, 'log');
    });

    it('should log build info to console', async function () {
      const config = getBuildInfo();
      await showBuildInfo();
      assert.strictEqual(log.calledOnce, true);
      assert.ok(log.firstCall.args.includes(JSON.stringify(config)));
    });
  });

  describe('inspect()', function () {
    it('should log the result of inspecting a value', function () {
      const infoLog = sandbox.spy(logger, 'info');
      inspect({foo: 'bar'});
      assert.match(supportConsole.stripColors(infoLog.firstCall.firstArg), /\{\s*\n*foo:\s'bar'\s*\n*\}/);
    });
  });

  describe('buildServerOpts()', function () {
    for (const useDrivers of [
      [],
      ['resolved'],
      ['/package/resolved-driver'],
      ['file:///package/resolved-driver/index.js'],
    ]) {
      it(`should pass active driver names to hooks for ${JSON.stringify(useDrivers)}`, async function () {
        await finalizeSchema();
        const parsedArgs = {...getDefaultsForSchema(false), useDrivers} as ParsedArgs;
        const appium = new AppiumDriver(parsedArgs as unknown as ConstructorParameters<typeof AppiumDriver>[0]);
        const classes = new Map([[BaseDriver as unknown as DriverClass, 'resolved']]);
        const {serverOpts} = buildServerOpts(appium, parsedArgs, classes, new Map());
        assert.deepEqual(serverOpts.cliArgs?.useDrivers, ['resolved']);
        assert.deepEqual(parsedArgs.useDrivers, useDrivers);
        assert.notEqual(serverOpts.cliArgs, parsedArgs);
      });
    }
  });
});
