import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import path from 'node:path';
import {before, describe, it} from 'node:test';
import sharp from 'sharp';
import {fs, node} from '../../lib';
import {cropBase64Image} from '../../lib/image-util';

use(chaiAsPromised);

const FIXTURES_ROOT = path.resolve(
  node.getModuleRootSync('@appium/support', __filename)!,
  'test',
  'e2e',
  'fixture',
  'images',
);

async function getImage(name: string): Promise<string> {
  const imagePath = path.resolve(FIXTURES_ROOT, name);
  return await fs.readFile(imagePath, 'utf8');
}

describe('image-util', function () {
  describe('cropBase64Image', function () {
    let originalImageB64: string | null = null;

    before(async function () {
      originalImageB64 = await getImage('full-image.b64');
    });

    it('should verify that an image is cropped correctly', async function () {
      const croppedImageB64 = await cropBase64Image(originalImageB64!, {
        left: 35,
        top: 107,
        width: 323,
        height: 485,
      });

      const croppedImage = sharp(Buffer.from(croppedImageB64, 'base64'));
      const {width, height} = await croppedImage.metadata();
      expect(width).to.equal(323);
      expect(height).to.equal(485);
    });
  });
});
