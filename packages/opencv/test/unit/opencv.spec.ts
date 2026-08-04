import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {initOpenCv} from '../../lib/index.js';

describe('OpenCV', function () {
  it('should initialize opencv library', {timeout: 10000}, async () => {
    await initOpenCv();
    // @ts-expect-error opencv-bindings ships no type declarations; remove this once it does
    const {default: cv} = await import('opencv-bindings');
    const buildInfo = cv.getBuildInformation();
    assert.ok(buildInfo.includes('OpenCV'));
  });
});
