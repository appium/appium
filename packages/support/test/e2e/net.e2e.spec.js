import path from 'path';
import { downloadFile } from '../../lib/net';
import { tempDir, fs } from '../../lib/index';


describe('#net', function () {
  let tmpRoot;

  beforeEach(async function () {
    tmpRoot = await tempDir.openDir();
  });

  afterEach(async function () {
    await fs.rimraf(tmpRoot);
  });

  describe('downloadFile()', function () {
    it('should download file into the target folder', async function () {
      const dstPath = path.join(tmpRoot, 'download.tmp');
      await downloadFile('https://appium.io/ico/apple-touch-icon-114x114-precomposed.png',
        dstPath);
      await fs.exists(dstPath).should.eventually.be.true;
    });
  });

});
