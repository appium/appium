import {
  base64ToImage,
  imageToBase64,
  cropImage,
  getJimpImage,
  MIME_PNG,
} from '../../lib/image-util';
import path from 'path';
import _ from 'lodash';
import {fs} from '../../lib';

const FIXTURES_ROOT = path.resolve(__dirname, 'fixture', 'images');

async function getImage(name) {
  const imagePath = path.resolve(FIXTURES_ROOT, name);
  return await fs.readFile(imagePath, 'utf8');
}

describe('image-util', function () {
  describe('cropBase64Image', function () {
    let originalImage = null;

    before(async function () {
      const originalImage64 = await getImage('full-image.b64');
      originalImage = await base64ToImage(originalImage64);

      // verify original image size, to be sure that original image is correct
      originalImage.width.should.be.equal(640, 'unexpected width');
      originalImage.height.should.be.equal(1136, 'unexpected height');
    });

    it('should verify that an image is cropped correctly', async function () {
      const croppedImage = await cropImage(originalImage, {
        left: 35,
        top: 107,
        width: 323,
        height: 485,
      });

      // verify cropped image size, it should be less than original image according to crop region
      croppedImage.width.should.be.equal(323, 'unexpected width');
      croppedImage.height.should.be.equal(485, 'unexpected height');

      // verify that image cropped, compare base64 representation
      const croppedImageShouldBe = await getImage('cropped-image.b64');
      const croppedImage64 = await imageToBase64(croppedImage);
      croppedImage64.should.be.equal(croppedImageShouldBe);
    });
  });

  describe('Jimp helpers', function () {
    it('should get a jimp object using image buffer', async function () {
      const base64Image = await getImage('cropped-image.b64');
      const imageBuffer = Buffer.from(base64Image, 'base64');
      const jimpImg = await getJimpImage(imageBuffer);
      jimpImg.hash().should.eql('80000000000');
      jimpImg.bitmap.height.should.eql(485);
      jimpImg.bitmap.width.should.eql(323);
    });
    it('should get a jimp object using b64 string', async function () {
      const base64Image = await getImage('cropped-image.b64');
      const jimpImg = await getJimpImage(base64Image);
      jimpImg.hash().should.eql('80000000000');
      jimpImg.bitmap.height.should.eql(485);
      jimpImg.bitmap.width.should.eql(323);
    });
    it('should error with incorrect data type', async function () {
      await getJimpImage(1234).should.eventually.be.rejectedWith(/string or buffer/);
    });
    it('should error with incorrect image data', async function () {
      await getJimpImage('foo').should.eventually.be.rejectedWith(/Could not find MIME for Buffer/);
    });
    it('should get an image buffer via the overridden getBuffer method', async function () {
      const base64Image = await getImage('cropped-image.b64');
      const jimpImg = await getJimpImage(base64Image);
      const buf = await jimpImg.getBuffer(MIME_PNG);
      _.isBuffer(buf).should.be.true;
    });
  });
});
