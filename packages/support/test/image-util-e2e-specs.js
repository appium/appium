import {
  base64ToImage, imageToBase64, cropImage,
  getImagesMatches, getImagesSimilarity, getImageOccurrence,
  getJimpImage, MIME_PNG,
} from '../lib/image-util';
import path from 'path';
import _ from 'lodash';
import chai from 'chai';
import { fs } from '..';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
chai.should();

const FIXTURES_ROOT = path.resolve(__dirname, '..', '..', 'test', 'images');

async function getImage (name) {
  const imagePath = path.resolve(FIXTURES_ROOT, name);
  return await fs.readFile(imagePath, 'utf8');
}

describe('image-util', function () {
  before(function () {
    // TODO: remove when opencv4nodejs is fixed
    return this.skip();
  });

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
      const croppedImage = await cropImage(originalImage, {left: 35, top: 107, width: 323, height: 485});

      // verify cropped image size, it should be less than original image according to crop region
      croppedImage.width.should.be.equal(323, 'unexpected width');
      croppedImage.height.should.be.equal(485, 'unexpected height');

      // verify that image cropped, compare base64 representation
      const croppedImageShouldBe = await getImage('cropped-image.b64');
      const croppedImage64 = await imageToBase64(croppedImage);
      croppedImage64.should.be.equal(croppedImageShouldBe);
    });
  });

  describe('OpenCV helpers', function () {
    // OpenCV needs several seconds for initialization
    this.timeout(120000);

    let imgFixture = null;
    let fullImage = null;
    let partialImage = null;
    let originalImage = null;
    let changedImage = null;
    let rotatedImage = null;
    let numberImage = null;

    before(async function () {
      const imagePath = path.resolve(FIXTURES_ROOT, 'full-image.b64');
      imgFixture = Buffer.from(await fs.readFile(imagePath, 'binary'), 'base64');
      fullImage = await fs.readFile(path.resolve(FIXTURES_ROOT, 'findwaldo.jpg'));
      partialImage = await fs.readFile(path.resolve(FIXTURES_ROOT, 'waldo.jpg'));
      originalImage = await fs.readFile(path.resolve(FIXTURES_ROOT, 'cc1.png'));
      changedImage = await fs.readFile(path.resolve(FIXTURES_ROOT, 'cc2.png'));
      numberImage = await fs.readFile(path.resolve(FIXTURES_ROOT, 'number5.png'));
      rotatedImage = await fs.readFile(path.resolve(FIXTURES_ROOT, 'cc_rotated.png'));
    });

    describe('getImagesMatches', function () {
      it('should calculate the number of matches between two images', async function () {
        for (const detectorName of ['AKAZE', 'ORB']) {
          const {count, totalCount} = await getImagesMatches(fullImage, fullImage, {detectorName});
          count.should.be.above(0);
          totalCount.should.eql(count);
        }
      });

      it('should visualize matches between two images', async function () {
        const {visualization} = await getImagesMatches(fullImage, fullImage, {visualize: true});
        visualization.should.not.be.empty;
      });

      it('should visualize matches between two images and apply goodMatchesFactor', async function () {
        const {visualization, points1, rect1, points2, rect2} = await getImagesMatches(rotatedImage, originalImage, {
          visualize: true,
          matchFunc: 'BruteForceHamming',
          goodMatchesFactor: 40
        });
        visualization.should.not.be.empty;
        points1.length.should.be.above(4);
        rect1.x.should.be.above(0);
        rect1.y.should.be.above(0);
        rect1.width.should.be.above(0);
        rect1.height.should.be.above(0);
        points2.length.should.be.above(4);
        rect2.x.should.be.above(0);
        rect2.y.should.be.above(0);
        rect2.width.should.be.above(0);
        rect2.height.should.be.above(0);
      });
    });

    describe('getImagesSimilarity', function () {
      it('should calculate the similarity score between two images', async function () {
        const {score} = await getImagesSimilarity(imgFixture, imgFixture);
        score.should.be.above(0);
      });

      it('should visualize the similarity between two images', async function () {
        const {visualization} = await getImagesSimilarity(originalImage, changedImage, {visualize: true});
        visualization.should.not.be.empty;
      });
    });

    describe('getImageOccurrence', function () {
      it('should calculate the partial image position in the full image', async function () {
        const {rect, score} = await getImageOccurrence(fullImage, partialImage);
        rect.x.should.be.above(0);
        rect.y.should.be.above(0);
        rect.width.should.be.above(0);
        rect.height.should.be.above(0);
        score.should.be.above(0);
      });

      it('should reject matches that fall below a threshold', async function () {
        await getImageOccurrence(fullImage, partialImage, {threshold: 1.0})
          .should.eventually.be.rejectedWith(/threshold/);
      });

      it('should visualize the partial image position in the full image', async function () {
        const {visualization} = await getImageOccurrence(fullImage, partialImage, {visualize: true});
        visualization.should.not.be.empty;
      });

      describe('multiple', function () {
        it('should return matches in the full image', async function () {
          const { multiple } = await getImageOccurrence(originalImage, numberImage, {threshold: 0.8, multiple: true});
          multiple.length.should.be.eq(3);

          for (const result of multiple) {
            result.rect.x.should.be.above(0);
            result.rect.y.should.be.above(0);
            result.rect.width.should.be.above(0);
            result.rect.height.should.be.above(0);
            result.score.should.be.above(0);
          }
        });

        it('should reject matches that fall below a threshold', async function () {
          await getImageOccurrence(originalImage, numberImage, {threshold: 1.0, multiple: true})
            .should.eventually.be.rejectedWith(/threshold/);
        });

        it('should visualize the partial image position in the full image', async function () {
          const { multiple } = await getImageOccurrence(originalImage, numberImage, {visualize: true, multiple: true});

          for (const result of multiple) {
            result.visualization.should.not.be.empty;
          }
        });
      });
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
