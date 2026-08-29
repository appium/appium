import assert from 'node:assert/strict';
import os from 'node:os';
import {afterEach, beforeEach, describe, it, type TestContext} from 'node:test';

import {createSandbox} from 'sinon';
import * as teenProcess from 'teen_process';

import {system, util} from '../../lib/index.js';
import {system as systemObj} from '../../lib/system.js';

let importCounter = 0;

/**
 * `teen_process` is genuine ESM, so its live bindings cannot be stubbed with sinon
 * post-import. Mock `exec` via `t.mock.module` and re-import `lib/system.js` fresh
 * (cache-busted) so it re-links against the mock instead of a previously-cached module.
 * Spread the real module: a mock replaces the *entire* module for every importer
 * sharing this process, not just the one under test here.
 */
async function importSystemWithMockedExec(t: TestContext, execImpl: (...args: any[]) => any) {
  t.mock.module('teen_process', {
    namedExports: {...teenProcess, exec: execImpl},
  });
  return import(`../../lib/system.js?t=${importCounter++}`);
}

describe('system', function () {
  let sandbox: ReturnType<typeof createSandbox>;
  let osMock: ReturnType<typeof createSandbox>['mock'] extends (obj: infer _O) => infer R ? R : never;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.verify();
    sandbox.restore();
  });

  describe('isX functions', function () {
    beforeEach(function () {
      osMock = sandbox.mock(os);
    });
    afterEach(function () {
      osMock.verify();
    });

    it('should correctly return Windows System if it is a Windows', function () {
      osMock.expects('type').returns('Windows_NT');
      assert.strictEqual(system.isWindows(), true);
    });

    it('should correctly return Mac if it is a Mac', function () {
      osMock.expects('type').returns('Darwin');
      assert.strictEqual(system.isMac(), true);
    });

    it('should correctly return Linux if it is a Linux', function () {
      osMock.expects('type').twice().returns('Linux');
      assert.strictEqual(system.isLinux(), true);
    });
  });

  describe('mac OSX version', function () {
    it('should return correct version for 10.10.5', async function (t) {
      const freshSystem = await importSystemWithMockedExec(t as TestContext, () => ({stdout: '10.10.5'}));
      assert.strictEqual(await freshSystem.macOsxVersion(), '10.10');
    });

    it('should return correct version for 10.12', async function (t) {
      const freshSystem = await importSystemWithMockedExec(t as TestContext, () => ({stdout: '10.12.0'}));
      assert.strictEqual(await freshSystem.macOsxVersion(), '10.12');
    });

    it('should return correct version for 10.12 with newline', async function (t) {
      const freshSystem = await importSystemWithMockedExec(t as TestContext, () => ({stdout: '10.12   \n'}));
      assert.strictEqual(await freshSystem.macOsxVersion(), '10.12');
    });

    it("should throw an error if OSX version can't be determined", async function (t) {
      const invalidOsx = 'error getting operation system version blabla';
      const freshSystem = await importSystemWithMockedExec(t as TestContext, () => ({stdout: invalidOsx}));
      await assert.rejects(freshSystem.macOsxVersion(), new RegExp(util.escapeRegExp(invalidOsx)));
    });
  });

  describe('architecture', function () {
    // `system.ts`'s `arch()` calls sibling helpers (`isLinux`, `isWindows`, `isOSWin64`)
    // via `this`, resolved through the plain `system` object export (not the frozen ES
    // module namespace) specifically so tests can stub those helpers. See the comment
    // on `system` in lib/system.ts.
    it('should return correct architecture if it is a 64 bit Mac/Linux', async function (t) {
      const osMock = sandbox.mock(os);
      osMock.expects('type').thrice().returns('Darwin');
      const freshSystem = await importSystemWithMockedExec(t as TestContext, () => ({stdout: 'x86_64'}));
      const arch = await freshSystem.system.arch();
      assert.strictEqual(arch, '64');
      osMock.verify();
    });

    it('should return correct architecture if it is a 32 bit Mac/Linux', async function (t) {
      const osMock = sandbox.mock(os);
      osMock.expects('type').twice().returns('Linux');
      const freshSystem = await importSystemWithMockedExec(t as TestContext, () => ({stdout: 'i686'}));
      const arch = await freshSystem.system.arch();
      assert.strictEqual(arch, '32');
      osMock.verify();
    });

    it('should return correct architecture if it is a 64 bit Windows', async function () {
      const osMock = sandbox.mock(os);
      osMock.expects('type').thrice().returns('Windows_NT');
      const isOSWin64Stub = sandbox.stub(systemObj, 'isOSWin64').returns(true);
      const arch = await systemObj.arch();
      assert.strictEqual(arch, '64');
      osMock.verify();
      assert.strictEqual(isOSWin64Stub.calledOnce, true);
    });

    it('should return correct architecture if it is a 32 bit Windows', async function () {
      const osMock = sandbox.mock(os);
      osMock.expects('type').thrice().returns('Windows_NT');
      const isOSWin64Stub = sandbox.stub(systemObj, 'isOSWin64').returns(false);
      const arch = await systemObj.arch();
      assert.strictEqual(arch, '32');
      osMock.verify();
      assert.strictEqual(isOSWin64Stub.calledOnce, true);
    });
  });

  it('should know architecture', async function () {
    await system.arch();
  });
});
