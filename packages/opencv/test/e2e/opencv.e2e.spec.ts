import {getImagesMatches, getImagesSimilarity, getImageOccurrence} from '../../lib';
import path from 'node:path';
import {fs} from '@appium/support';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

const FIXTURES_ROOT = path.resolve(__dirname, 'images');

describe('OpenCV helpers', function () {
  // OpenCV needs several seconds for initialization
  this.timeout(120000);

  let imgFixture: Buffer | null = null;
  let fullImage: Buffer | null = null;
  let partialImage: Buffer | null = null;
  let originalImage: Buffer | null = null;
  let changedImage: Buffer | null = null;
  let rotatedImage: Buffer | null = null;
  let numberImage: Buffer | null = null;

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
      for (const detectorName of ['AKAZE', 'ORB'] as const) {
        const {count, totalCount} = await getImagesMatches(fullImage!, fullImage!, {detectorName});
        expect(count).to.be.above(0);
        expect(totalCount).to.eql(count);
      }
    });

    it('should visualize matches between two images', async function () {
      const {visualization} = await getImagesMatches(fullImage!, fullImage!, {
        visualize: true,
      });
      expect(visualization).to.not.be.empty;
    });

    it('should visualize matches between two images and apply goodMatchesFactor', async function () {
      const {visualization, points1, rect1, points2, rect2} = await getImagesMatches(
        rotatedImage!,
        originalImage!,
        {
          visualize: true,
          matchFunc: 'BruteForceHamming',
          goodMatchesFactor: 40,
        }
      );
      expect(visualization).to.not.be.empty;
      expect(points1.length).to.be.above(4);
      expect(rect1.x).to.be.above(0);
      expect(rect1.y).to.be.above(0);
      expect(rect1.width).to.be.above(0);
      expect(rect1.height).to.be.above(0);
      expect(points2.length).to.be.above(4);
      expect(rect2.x).to.be.above(0);
      expect(rect2.y).to.be.above(0);
      expect(rect2.width).to.be.above(0);
      expect(rect2.height).to.be.above(0);
    });
  });

  describe('getImagesSimilarity', function () {
    it('should calculate the similarity score between two images', async function () {
      const {score} = await getImagesSimilarity(imgFixture!, imgFixture!);
      expect(score).to.be.above(0);
    });

    it('should visualize the similarity between two images', async function () {
      const {visualization} = await getImagesSimilarity(originalImage!, changedImage!, {
        visualize: true,
      });
      expect(visualization).to.not.be.empty;
    });
  });

  describe('getImageOccurrence', function () {
    it('should calculate the partial image position in the full image', async function () {
      const {rect, score} = await getImageOccurrence(fullImage!, partialImage!);
      expect(rect.x).to.be.above(0);
      expect(rect.y).to.be.above(0);
      expect(rect.width).to.be.above(0);
      expect(rect.height).to.be.above(0);
      expect(score).to.be.above(0);
    });

    it('should reject matches that fall below a threshold', async function () {
      await expect(
        getImageOccurrence(fullImage!, partialImage!, {
          threshold: 1.0,
        })
      ).to.eventually.be.rejectedWith(/threshold/);
    });

    it('should visualize the partial image position in the full image', async function () {
      const {visualization} = await getImageOccurrence(fullImage!, partialImage!, {visualize: true});
      expect(visualization).to.not.be.empty;
    });

    describe('multiple', function () {
      it('should return matches in the full image', async function () {
        const {multiple} = await getImageOccurrence(originalImage!, numberImage!, {
          threshold: 0.8,
          multiple: true,
        });
        expect(multiple).to.have.length(3);

        for (const result of multiple!) {
          expect(result.rect.x).to.be.above(0);
          expect(result.rect.y).to.be.above(0);
          expect(result.rect.width).to.be.above(0);
          expect(result.rect.height).to.be.above(0);
          expect(result.score).to.be.above(0);
        }
      });

      it('should reject matches that fall below a threshold', async function () {
        const {multiple} = await getImageOccurrence(originalImage!, numberImage!, {
          threshold: 1.0,
          multiple: true,
        });
        expect(multiple).to.have.length(1);
      });

      it('should visualize the partial image position in the full image', async function () {
        const {multiple} = await getImageOccurrence(originalImage!, numberImage!, {
          visualize: true,
          multiple: true,
        });

        for (const result of multiple!) {
          expect(result.visualization).to.not.be.empty;
        }
      });
    });
  });
});
