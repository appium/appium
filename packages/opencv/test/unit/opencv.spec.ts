import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {calculateMatchedRect, initOpenCv} from '../../lib/index.js';

describe('calculateMatchedRect', function () {
  it('returns an empty rectangle when there are no points', function () {
    assert.deepStrictEqual(calculateMatchedRect([]), {x: 0, y: 0, width: 0, height: 0});
  });

  it('places a single point at that point', function () {
    assert.deepStrictEqual(calculateMatchedRect([{x: 40, y: 15}]), {x: 40, y: 15, width: 0, height: 0});
  });

  it('bounds every point, including ones that are neither nearest nor farthest from the origin', function () {
    const points = [
      {x: 1, y: 1},
      {x: 0, y: 5},
      {x: 6, y: 0},
    ];
    const rect = {x: 0, y: 0, width: 6, height: 5};
    assert.deepStrictEqual(calculateMatchedRect(points), rect);
    assert.deepStrictEqual(calculateMatchedRect([...points].reverse()), rect);
  });

  it('includes negative coordinates and a shared axis', function () {
    assert.deepStrictEqual(
      calculateMatchedRect([
        {x: -4, y: 2},
        {x: 3, y: -8},
      ]),
      {x: -4, y: -8, width: 7, height: 10},
    );
    assert.deepStrictEqual(
      calculateMatchedRect([
        {x: 5, y: 1},
        {x: 5, y: 9},
      ]),
      {x: 5, y: 1, width: 0, height: 8},
    );
  });
});

describe('OpenCV', function () {
  it('should initialize opencv library', {timeout: 10000}, async () => {
    await initOpenCv();
    // @ts-expect-error opencv-bindings ships no type declarations; remove this once it does
    const {default: cv} = await import('opencv-bindings');
    const buildInfo = cv.getBuildInformation();
    assert.ok(buildInfo.includes('OpenCV'));
  });
});
