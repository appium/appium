import {initOpenCv} from '../../lib';

describe('OpenCV', function () {
  it('should initialize opencv library', async function () {
    this.timeout('5s');
    await initOpenCv();
    const buildInfo = require('opencv-bindings').getBuildInformation();
    buildInfo.should.include('OpenCV');
  });
});
