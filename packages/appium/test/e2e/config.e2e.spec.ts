import {createSandbox, type SinonSandbox} from 'sinon';
import {getGitRev, getBuildInfo, updateBuildInfo, APPIUM_VER} from '../../lib/config';
import axios from 'axios';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as teenProcess from 'teen_process';

const {expect} = chai;
chai.use(chaiAsPromised);

describe('Config', function () {
  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.verify();
    sandbox.restore();
  });

  describe('getGitRev', function () {
    it('should get a reasonable git revision', async function () {
      const rev = await getGitRev();
      expect(rev).to.be.a('string');
      expect(rev).to.not.be.null;
      expect(rev!.length).to.equal(40);
      expect(rev!.match(/[0-9a-f]+/i)![0]).to.eql(rev);
    });
  });

  describe('getBuildInfo', function () {
    const SHA = 'a7404fddd50ee1c6ff1aac3d2f259abab0d3291a';
    const DATE = '2022-06-04T02:08:17Z';

    async function verifyBuildInfoUpdate(
      useLocalGit: boolean,
      opts: {sha?: string; built?: string} = {}
    ) {
      const buildInfo = getBuildInfo();
      const {sha, built} = opts;

      const innerExecStub = sandbox.stub().throws();
      if (!useLocalGit) {
        sandbox.stub(teenProcess, 'exec').get(() => innerExecStub);
      }
      (buildInfo as unknown as Record<string, undefined>)['git-sha'] = undefined;
      (buildInfo as unknown as Record<string, undefined>).built = undefined;
      await updateBuildInfo(true);
      expect(buildInfo).to.be.an('object');
      if (sha) {
        expect(buildInfo['git-sha']).to.equal(sha);
      } else {
        expect(buildInfo['git-sha']).to.exist;
      }
      if (built) {
        expect(buildInfo.built).to.equal(built);
      } else {
        expect(buildInfo.built).to.exist;
      }
      expect(buildInfo.version).to.exist;

      if (!useLocalGit) {
        expect(innerExecStub.callCount).to.be.at.least(1);
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
