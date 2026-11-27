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
import {DriverConfig} from '../../../lib/extension/driver-config.js';
import {Manifest} from '../../../lib/extension/manifest/index.js';
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
    const driverConfig = DriverConfig.create(Manifest.getInstance('build-server-opts'));
    for (const {useDrivers, hasProgrammaticDrivers} of [
      {useDrivers: [], hasProgrammaticDrivers: false},
      {useDrivers: ['installed'], hasProgrammaticDrivers: false},
      {useDrivers: [], hasProgrammaticDrivers: true},
      {useDrivers: ['/package/resolved-driver'], hasProgrammaticDrivers: true},
      {useDrivers: ['file:///package/resolved-driver/index.js'], hasProgrammaticDrivers: true},
    ]) {
      it(`should ${hasProgrammaticDrivers ? 'normalize' : 'preserve'} hook arguments for ${JSON.stringify(useDrivers)}`, async function () {
        await finalizeSchema();
        const parsedArgs = {...getDefaultsForSchema(false), useDrivers} as ParsedArgs;
        const appium = new AppiumDriver(parsedArgs as unknown as ConstructorParameters<typeof AppiumDriver>[0]);
        appium.driverConfig = driverConfig.createServerConfig();
        sandbox
          .stub(appium.driverConfig, 'activeProgrammaticDriverNames')
          .get(() => (hasProgrammaticDrivers ? ['active'] : undefined));
        const classes = new Map([[BaseDriver as unknown as DriverClass, 'active']]);
        const {serverOpts} = buildServerOpts(appium, parsedArgs, classes, new Map());
        assert.deepEqual(serverOpts.cliArgs?.useDrivers, hasProgrammaticDrivers ? ['active'] : useDrivers);
        assert.deepEqual(parsedArgs.useDrivers, useDrivers);
      });
    }
  });
});
