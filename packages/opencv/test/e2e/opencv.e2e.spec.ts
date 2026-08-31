import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, before} from 'node:test';
import {fileURLToPath} from 'node:url';

import {fs, node} from '@appium/support';

import {getImageOccurrence, getImagesMatches, getImagesSimilarity} from '../../lib/index.js';

const FIXTURES_ROOT = path.resolve(
  node.getModuleRootSync('@appium/opencv', fileURLToPath(import.meta.url))!,
  'test',
  'e2e',
  'images',
);

describe('OpenCV helpers', {timeout: 120000}, () => {
  let imgFixture: Buffer;
  let fullImage: Buffer;
  let partialImage: Buffer;
  let originalImage: Buffer;
  let changedImage: Buffer;
  let rotatedImage: Buffer;
  let numberImage: Buffer;

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
        assert.ok(count > 0);
        assert.strictEqual(totalCount, count);
      }
    });

    it('should visualize matches between two images', async function () {
      const {visualization} = await getImagesMatches(fullImage!, fullImage!, {
        visualize: true,
      });
      assert.ok(visualization!.length > 0);
    });

    it('should visualize matches between two images and apply goodMatchesFactor', async function () {
      const {visualization, points1, rect1, points2, rect2} = await getImagesMatches(rotatedImage!, originalImage!, {
        visualize: true,
        matchFunc: 'BruteForceHamming',
        goodMatchesFactor: 40,
      });
      assert.ok(visualization!.length > 0);
      assert.ok(points1.length > 4);
      assert.ok(rect1.x > 0);
      assert.ok(rect1.y > 0);
      assert.ok(rect1.width > 0);
      assert.ok(rect1.height > 0);
      assert.ok(points2.length > 4);
      assert.ok(rect2.x > 0);
      assert.ok(rect2.y > 0);
      assert.ok(rect2.width > 0);
      assert.ok(rect2.height > 0);
    });
  });

  describe('getImagesSimilarity', function () {
    it('should calculate the similarity score between two images', async function () {
      const {score} = await getImagesSimilarity(imgFixture!, imgFixture!);
      assert.ok(score > 0);
    });

    it('should visualize the similarity between two images', async function () {
      const {visualization} = await getImagesSimilarity(originalImage!, changedImage!, {
        visualize: true,
      });
      assert.ok(visualization!.length > 0);
    });
  });

  describe('getImageOccurrence', function () {
    it('should calculate the partial image position in the full image', async function () {
      const {rect, score} = await getImageOccurrence(fullImage!, partialImage!);
      assert.ok(rect.x > 0);
      assert.ok(rect.y > 0);
      assert.ok(rect.width > 0);
      assert.ok(rect.height > 0);
      assert.ok(score > 0);
    });

    it('should reject matches that fall below a threshold', async function () {
      await assert.rejects(
        getImageOccurrence(fullImage!, partialImage!, {
          threshold: 1.0,
        }),
        /threshold/,
      );
    });

    it('should visualize the partial image position in the full image', async function () {
      const {visualization} = await getImageOccurrence(fullImage!, partialImage!, {
        visualize: true,
      });
      assert.ok(visualization!.length > 0);
    });

    describe('multiple', function () {
      it('should return matches in the full image', async function () {
        const {multiple} = await getImageOccurrence(originalImage!, numberImage!, {
          threshold: 0.8,
          multiple: true,
        });
        assert.strictEqual(multiple!.length, 3);

        for (const result of multiple!) {
          assert.ok(result.rect.x > 0);
          assert.ok(result.rect.y > 0);
          assert.ok(result.rect.width > 0);
          assert.ok(result.rect.height > 0);
          assert.ok(result.score > 0);
        }
      });

      it('should reject matches that fall below a threshold', async function () {
        const {multiple} = await getImageOccurrence(originalImage!, numberImage!, {
          threshold: 1.0,
          multiple: true,
        });
        assert.strictEqual(multiple!.length, 1);
      });

      it('should visualize the partial image position in the full image', async function () {
        const {multiple} = await getImageOccurrence(originalImage!, numberImage!, {
          visualize: true,
          multiple: true,
        });

        for (const result of multiple!) {
          assert.ok(result.visualization!.length > 0);
        }
      });
    });
  });
});
