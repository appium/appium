import {createSandbox} from 'sinon';
import {getGitRev, getBuildInfo, updateBuildInfo, APPIUM_VER} from '../../lib/config';
import axios from 'axios';
import * as teenProcess from 'teen_process';


describe('Config', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getGitRev', function () {
    it('should get a reasonable git revision', async function () {
      let rev = await getGitRev();
      rev.should.be.a('string');
      rev.length.should.be.equal(40);
      rev.match(/[0-9a-f]+/i)[0].should.eql(rev);
    });
  });
  describe('getBuildInfo', function () {
    const SHA = 'a7404fddd50ee1c6ff1aac3d2f259abab0d3291a';
    const DATE = '2022-06-04T02:08:17Z';

    async function verifyBuildInfoUpdate(useLocalGit, {sha, built} = {}) {
      const buildInfo = getBuildInfo();
      if (!useLocalGit) {
        mockTp.expects('exec').atLeast(1).throws();
      }
      buildInfo['git-sha'] = undefined;
      buildInfo.built = undefined;
      await updateBuildInfo(true);
      buildInfo.should.be.an('object');
      if (sha) {
        buildInfo['git-sha'].should.equal(sha);
      } else {
        should.exist(buildInfo['git-sha']);
      }
      if (built) {
        buildInfo.built.should.equal(built);
      } else {
        should.exist(buildInfo.built);
      }
      should.exist(buildInfo.version);
    }

    let getStub;
    let mockTp;
    beforeEach(function () {
      getStub = sandbox.stub(axios, 'get');
      mockTp = sandbox.mock(teenProcess);
    });
    afterEach(function () {
      getStub.restore();
      mockTp.restore();
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
            url: `https://api.github.com/repos/appium/appium/git/tags/${SHA}`
          }
        }
      });
      getStub.onCall(1).returns({
        data: {
          node_id: 'TA_kwDOAHLoStoAKGE3NDA0ZmRkZDUwZWUxYzZmZjFhYWMzZDJmMjU5YWJhYjBkMzI5MWE',
          sha: SHA,
          url: `https://api.github.com/repos/appium/appium/git/tags/${SHA}`,
          tagger: {
            name: 'Jonathan Lipps',
            email: 'jlipps@gmail.com',
            date: DATE
          },
          object: {
            sha: '4cf2cc92d066ed32adda27e0439547290a4b71ce',
            type: 'commit',
            url: 'https://api.github.com/repos/appium/appium/git/commits/4cf2cc92d066ed32adda27e0439547290a4b71ce'
          },
          tag: `appium@${APPIUM_VER}`,
          message: `appium@${APPIUM_VER}\n`,
          verification: {
            verified: false,
            reason: 'unsigned',
            signature: null,
            payload: null
          }
        }
      });
      await verifyBuildInfoUpdate(false, {sha: SHA, built: DATE});
    });
  });
});
