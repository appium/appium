import path from 'node:path';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as chai from 'chai';
import sharp from 'sharp';
import {cropBase64Image} from '../../lib/image-util';
import {fs} from '../../lib';

const FIXTURES_ROOT = path.resolve(__dirname, 'fixture', 'images');

async function getImage(name: string): Promise<string> {
  const imagePath = path.resolve(FIXTURES_ROOT, name);
  return await fs.readFile(imagePath, 'utf8');
}

describe('image-util', function () {
  before(async function () {
    use(chaiAsPromised);
    chai.should();
  });

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
