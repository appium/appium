import {initOpenCv} from '../../lib';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

describe('OpenCV', function () {
  it('should initialize opencv library', async function () {
    this.timeout('10s');
    await initOpenCv();
    const buildInfo = require('opencv-bindings').getBuildInformation();
    expect(buildInfo).to.include('OpenCV');
  });
});
