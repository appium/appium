import ImageElementPlugin from '../../index';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const should = chai.should();


describe('ImageElementPlugin', function () {
  it('should exist', function () {
    should.exist(ImageElementPlugin);
  });
});
