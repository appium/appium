import {describe, it} from 'node:test';

import {expect} from 'chai';

import {initOpenCv} from '../../lib/index.js';

describe('OpenCV', function () {
  it('should initialize opencv library', {timeout: 10000}, async () => {
    await initOpenCv();
    // @ts-expect-error opencv-bindings ships no type declarations; remove this once it does
    const {default: cv} = await import('opencv-bindings');
    const buildInfo = cv.getBuildInformation();
    expect(buildInfo).to.include('OpenCV');
  });
});
