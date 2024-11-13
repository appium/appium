import {cropBase64Image} from '../../lib/image-util';
import path from 'path';
import sharp from 'sharp';
import {fs} from '../../lib';

const FIXTURES_ROOT = path.resolve(__dirname, 'fixture', 'images');

async function getImage(name) {
  const imagePath = path.resolve(FIXTURES_ROOT, name);
  return await fs.readFile(imagePath, 'utf8');
}

describe('image-util', function () {
  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
  });

  describe('cropBase64Image', function () {
    let originalImageB64 = null;

    before(async function () {
      originalImageB64 = await getImage('full-image.b64');
    });

    it('should verify that an image is cropped correctly', async function () {
      const croppedImageB64 = await cropBase64Image(originalImageB64, {
        left: 35,
        top: 107,
        width: 323,
        height: 485,
      });

      const croppedImage = sharp(Buffer.from(croppedImageB64, 'base64'));
      const {width, height} = await croppedImage.metadata();
      // verify cropped image size, it should be less than original image according to crop region
      width.should.be.equal(323, 'unexpected width');
      height.should.be.equal(485, 'unexpected height');
    });
  });
});
