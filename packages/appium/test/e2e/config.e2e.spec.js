import {createSandbox} from 'sinon';
import {getGitRev, getBuildInfo, updateBuildInfo, APPIUM_VER} from '../../lib/config';
import axios from 'axios';
import {fs} from '@appium/support';

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
    async function verifyBuildInfoUpdate(useLocalGit) {
      const buildInfo = getBuildInfo();
      mockFs.expects('exists').atLeast(1).returns(useLocalGit);
      buildInfo['git-sha'] = undefined;
      buildInfo.built = undefined;
      await updateBuildInfo(true);
      buildInfo.should.be.an('object');
      should.exist(buildInfo['git-sha']);
      should.exist(buildInfo.built);
      should.exist(buildInfo.version);
    }

    let mockFs;
    let getStub;
    beforeEach(function () {
      mockFs = sandbox.mock(fs);
      getStub = sandbox.stub(axios, 'get');
    });
    afterEach(function () {
      getStub.restore();
      mockFs.restore();
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
            sha: 'a7404fddd50ee1c6ff1aac3d2f259abab0d3291a',
            type: 'tag',
            url: 'https://api.github.com/repos/appium/appium/git/tags/a7404fddd50ee1c6ff1aac3d2f259abab0d3291a'
          }
        }
      });
      getStub.onCall(1).returns({
        data: {
          node_id: 'TA_kwDOAHLoStoAKGE3NDA0ZmRkZDUwZWUxYzZmZjFhYWMzZDJmMjU5YWJhYjBkMzI5MWE',
          sha: 'a7404fddd50ee1c6ff1aac3d2f259abab0d3291a',
          url: 'https://api.github.com/repos/appium/appium/git/tags/a7404fddd50ee1c6ff1aac3d2f259abab0d3291a',
          tagger: {
            name: 'Jonathan Lipps',
            email: 'jlipps@gmail.com',
            date: '2022-06-04T02:08:17Z'
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
      await verifyBuildInfoUpdate(false);
    });
  });
});
