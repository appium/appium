import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach} from 'node:test';

import {console as supportConsole} from '@appium/support';
import type {SinonSandbox, SinonSpy} from 'sinon';
import {createSandbox} from 'sinon';

import {inspect, showBuildInfo} from '../../../lib/bootstrap/main-helpers.js';
import {getBuildInfo} from '../../../lib/helpers/build.js';
import {log as logger} from '../../../lib/logger.js';

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
});
