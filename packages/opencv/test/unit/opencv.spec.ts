import {describe, it} from 'node:test';

import {expect} from 'chai';

import {initOpenCv} from '../../lib';

describe('OpenCV', function () {
  it('should initialize opencv library', {timeout: 10000}, async () => {
    await initOpenCv();
    const buildInfo = require('opencv-bindings').getBuildInformation();
    expect(buildInfo).to.include('OpenCV');
  });
});
