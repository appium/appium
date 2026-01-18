import path from 'node:path';
import {downloadFile} from '../../lib/net';
import {tempDir, fs} from '../../lib/index';

describe('#net', function () {
  let tmpRoot;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
  });

  beforeEach(async function () {
    tmpRoot = await tempDir.openDir();
  });

  afterEach(async function () {
    await fs.rimraf(tmpRoot);
  });

  describe('downloadFile()', function () {
    it('should download file into the target folder', async function () {
      const dstPath = path.join(tmpRoot, 'download.tmp');
      await downloadFile(
        'https://appium.io/docs/en/2.0/assets/images/appium-logo-white.png',
        dstPath
      );
      await fs.exists(dstPath).should.eventually.be.true;
    });
  });
});
