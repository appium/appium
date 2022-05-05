import {initOpenCv} from '../../lib';

describe('OpenCV', function () {
  it('should initialize opencv library', async function () {
    await initOpenCv();
    const buildInfo = require('opencv-bindings').getBuildInformation();
    buildInfo.should.include('OpenCV');
  });
});
