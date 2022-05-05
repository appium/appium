import {getImagesMatches, getImagesSimilarity, getImageOccurrence} from '../../lib';
import path from 'path';
import {fs} from '@appium/support';

const FIXTURES_ROOT = path.resolve(__dirname, 'images');

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
      const {visualization} = await getImagesMatches(fullImage, fullImage, {
        visualize: true,
      });
      visualization.should.not.be.empty;
    });

    it('should visualize matches between two images and apply goodMatchesFactor', async function () {
      const {visualization, points1, rect1, points2, rect2} = await getImagesMatches(
        rotatedImage,
        originalImage,
        {
          visualize: true,
          matchFunc: 'BruteForceHamming',
          goodMatchesFactor: 40,
        }
      );
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
      const {visualization} = await getImagesSimilarity(originalImage, changedImage, {
        visualize: true,
      });
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
      await getImageOccurrence(fullImage, partialImage, {
        threshold: 1.0,
      }).should.eventually.be.rejectedWith(/threshold/);
    });

    it('should visualize the partial image position in the full image', async function () {
      const {visualization} = await getImageOccurrence(fullImage, partialImage, {visualize: true});
      visualization.should.not.be.empty;
    });

    describe('multiple', function () {
      it('should return matches in the full image', async function () {
        const {multiple} = await getImageOccurrence(originalImage, numberImage, {
          threshold: 0.8,
          multiple: true,
        });
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
        const {multiple} = await getImageOccurrence(originalImage, numberImage, {
          threshold: 1.0,
          multiple: true,
        });
        multiple.length.should.be.eq(1);
      });

      it('should visualize the partial image position in the full image', async function () {
        const {multiple} = await getImageOccurrence(originalImage, numberImage, {
          visualize: true,
          multiple: true,
        });

        for (const result of multiple) {
          result.visualization.should.not.be.empty;
        }
      });
    });
  });
});
