import {initOpenCv} from '../../lib';

describe('OpenCV', function () {
  before(async function () {
    const chai = await import('chai');
    chai.should();
  });

  it('should initialize opencv library', async function () {
    this.timeout('10s');
    await initOpenCv();
    const buildInfo = require('opencv-bindings').getBuildInformation();
    buildInfo.should.include('OpenCV');
  });
});
