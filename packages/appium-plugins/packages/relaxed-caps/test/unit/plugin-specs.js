import { RelaxedCapsPlugin } from '../../index';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const should = chai.should();

describe('relaxed caps plugin', function () {
  it('should export the name', function () {
    should.exist(RelaxedCapsPlugin);
  });
});
