import sinon from 'sinon';
import {
  getGitRev,
  getBuildInfo,
  updateBuildInfo,
  APPIUM_VER,
} from '../../lib/config';
import axios from 'axios';
import { fs } from '@appium/support';


describe('Config', function () {
  describe('getGitRev', function () {
    it('should get a reasonable git revision', async function () {
      let rev = await getGitRev();
      rev.should.be.a('string');
      rev.length.should.be.equal(40);
      rev.match(/[0-9a-f]+/i)[0].should.eql(rev);
    });
  });
  describe('getBuildInfo', function () {
    async function verifyBuildInfoUpdate (useLocalGit) {
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
      mockFs = sinon.mock(fs);
      getStub = sinon.stub(axios, 'get');
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
        data: [
          {
            name: `v${APPIUM_VER}`,
            zipball_url:
              'https://api.github.com/repos/appium/appium/zipball/v1.9.0-beta.1',
            tarball_url:
              'https://api.github.com/repos/appium/appium/tarball/v1.9.0-beta.1',
            commit: {
              sha: '3c2752f9f9c56000705a4ae15b3ba68a5d2e644c',
              url: 'https://api.github.com/repos/appium/appium/commits/3c2752f9f9c56000705a4ae15b3ba68a5d2e644c',
            },
            node_id: 'MDM6UmVmNzUzMDU3MDp2MS45LjAtYmV0YS4x',
          },
          {
            name: 'v1.8.2-beta',
            zipball_url:
              'https://api.github.com/repos/appium/appium/zipball/v1.8.2-beta',
            tarball_url:
              'https://api.github.com/repos/appium/appium/tarball/v1.8.2-beta',
            commit: {
              sha: '5b98b9197e75aa85e7507d21d3126c1a63d1ce8f',
              url: 'https://api.github.com/repos/appium/appium/commits/5b98b9197e75aa85e7507d21d3126c1a63d1ce8f',
            },
            node_id: 'MDM6UmVmNzUzMDU3MDp2MS44LjItYmV0YQ==',
          },
        ],
      });
      getStub.onCall(1).returns({
        data: {
          sha: '3c2752f9f9c56000705a4ae15b3ba68a5d2e644c',
          node_id:
            'MDY6Q29tbWl0NzUzMDU3MDozYzI3NTJmOWY5YzU2MDAwNzA1YTRhZTE1YjNiYTY4YTVkMmU2NDRj',
          commit: {
            author: {
              name: 'Isaac Murchie',
              email: 'isaac@saucelabs.com',
              date: '2018-08-17T19:48:00Z',
            },
            committer: {
              name: 'Isaac Murchie',
              email: 'isaac@saucelabs.com',
              date: '2018-08-17T19:48:00Z',
            },
            message: 'v1.9.0-beta.1',
            tree: {
              sha: '2c0974727470eba419ea0b9951c52f72f8036b18',
              url: 'https://api.github.com/repos/appium/appium/git/trees/2c0974727470eba419ea0b9951c52f72f8036b18',
            },
            url: 'https://api.github.com/repos/appium/appium/git/commits/3c2752f9f9c56000705a4ae15b3ba68a5d2e644c',
            comment_count: 0,
            verification: {
              verified: false,
              reason: 'unsigned',
              signature: null,
              payload: null,
            },
          },
          url: 'https://api.github.com/repos/appium/appium/commits/3c2752f9f9c56000705a4ae15b3ba68a5d2e644c',
          html_url:
            'https://github.com/appium/appium/commit/3c2752f9f9c56000705a4ae15b3ba68a5d2e644c',
          comments_url:
            'https://api.github.com/repos/appium/appium/commits/3c2752f9f9c56000705a4ae15b3ba68a5d2e644c/comments',
        },
      });
      await verifyBuildInfoUpdate(false);
    });
  });
});
