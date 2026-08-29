import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach, before, after, mock} from 'node:test';

import axios from 'axios';
import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';
import * as teenProcess from 'teen_process';

import type {
  APPIUM_VER as AppiumVerType,
  getBuildInfo as GetBuildInfoFn,
  getGitRev as GetGitRevFn,
  updateBuildInfo as UpdateBuildInfoFn,
} from '../../lib/helpers/build.js';

describe('Config', function () {
  let sandbox: SinonSandbox;
  let execStub: SinonStub;
  let APPIUM_VER: typeof AppiumVerType;
  let getBuildInfo: typeof GetBuildInfoFn;
  let getGitRev: typeof GetGitRevFn;
  let updateBuildInfo: typeof UpdateBuildInfoFn;

  // `teen_process`'s real ESM namespace is frozen, so sinon can't stub `exec` on it directly;
  // mock the whole module once with a stub that calls through to the real `exec` by default,
  // reconfigured (via `sandbox`) per test to simulate a missing local git.
  before(async function () {
    execStub = createSandbox()
      .stub()
      .callsFake((...args: Parameters<typeof teenProcess.exec>) => teenProcess.exec(...args));
    mock.module('teen_process', {namedExports: {...teenProcess, exec: execStub}});
    ({APPIUM_VER, getBuildInfo, getGitRev, updateBuildInfo} = await import('../../lib/helpers/build.js'));
  });

  after(function () {
    mock.reset();
  });

  beforeEach(function () {
    sandbox = createSandbox();
    execStub.resetBehavior();
    execStub.resetHistory();
    execStub.callsFake((...args: Parameters<typeof teenProcess.exec>) => teenProcess.exec(...args));
  });

  afterEach(function () {
    sandbox.verify();
    sandbox.restore();
  });

  describe('getGitRev', function () {
    it('should get a reasonable git revision', async function () {
      const rev = await getGitRev();
      assert.strictEqual(typeof rev, 'string');
      assert.notStrictEqual(rev, null);
      assert.strictEqual(rev!.length, 40);
      assert.strictEqual(rev!.match(/[0-9a-f]+/i)![0], rev);
    });
  });

  describe('getBuildInfo', function () {
    const SHA = 'a7404fddd50ee1c6ff1aac3d2f259abab0d3291a';
    const DATE = '2022-06-04T02:08:17Z';

    async function verifyBuildInfoUpdate(useLocalGit: boolean, opts: {sha?: string; built?: string} = {}) {
      const buildInfo = getBuildInfo();
      const {sha, built} = opts;

      if (!useLocalGit) {
        execStub.resetBehavior();
        execStub.throws();
      }
      (buildInfo as unknown as Record<string, undefined>)['git-sha'] = undefined;
      (buildInfo as unknown as Record<string, undefined>).built = undefined;
      await updateBuildInfo(true);
      assert.strictEqual(typeof buildInfo, 'object');
      if (sha) {
        assert.strictEqual(buildInfo['git-sha'], sha);
      } else {
        assert.ok(buildInfo['git-sha']);
      }
      if (built) {
        assert.strictEqual(buildInfo.built, built);
      } else {
        assert.ok(buildInfo.built);
      }
      assert.ok(buildInfo.version);

      if (!useLocalGit) {
        assert.ok(execStub.callCount >= 1);
      }
    }

    let getStub: ReturnType<SinonSandbox['stub']>;
    beforeEach(function () {
      getStub = sandbox.stub(axios, 'get');
    });
    afterEach(function () {
      getStub.restore();
    });

    it('should get a configuration object if the local git metadata is present', async function () {
      await verifyBuildInfoUpdate(true);
    });

    it('should get a configuration object if the local git metadata is not present', async function () {
      getStub.onCall(0).returns({
        data: {
          ref: `refs/tags/appium@${APPIUM_VER}`,
          node_id: 'MDM6UmVmNzUzMDU3MDpyZWZzL3RhZ3MvYXBwaXVtQDIuMC4wLWJldGEuNDA=',
          url: `https://api.github.com/repos/appium/appium/git/refs/tags/appium@${APPIUM_VER}`,
          object: {
            sha: SHA,
            type: 'tag',
            url: `https://api.github.com/repos/appium/appium/git/tags/${SHA}`,
          },
        },
      });
      getStub.onCall(1).returns({
        data: {
          node_id: 'TA_kwDOAHLoStoAKGE3NDA0ZmRkZDUwZWUxYzZmZjFhYWMzZDJmMjU5YWJhYjBkMzI5MWE',
          sha: SHA,
          url: `https://api.github.com/repos/appium/appium/git/tags/${SHA}`,
          tagger: {
            name: 'Jonathan Lipps',
            email: 'jlipps@gmail.com',
            date: DATE,
          },
          object: {
            sha: '4cf2cc92d066ed32adda27e0439547290a4b71ce',
            type: 'commit',
            url: 'https://api.github.com/repos/appium/appium/git/commits/4cf2cc92d066ed32adda27e0439547290a4b71ce',
          },
          tag: `appium@${APPIUM_VER}`,
          message: `appium@${APPIUM_VER}\n`,
          verification: {
            verified: false,
            reason: 'unsigned',
            signature: null,
            payload: null,
          },
        },
      });
      await verifyBuildInfoUpdate(false, {sha: SHA, built: DATE});
    });
  });
});
