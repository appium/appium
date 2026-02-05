import path from 'node:path';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {downloadFile} from '../../lib/net';
import {tempDir, fs} from '../../lib/index';

describe('#net', function () {
  let tmpRoot: string;

  before(async function () {
    use(chaiAsPromised);
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
      await expect(fs.exists(dstPath)).to.eventually.be.true;
    });
  });
});
