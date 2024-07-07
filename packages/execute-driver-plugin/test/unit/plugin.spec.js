import {ExecuteDriverPlugin} from '../../lib/plugin';

describe('execute driver plugin', function () {
  let should;

  before(async function () {
    const chai = await import('chai');
    should = chai.should();
  });

  it('should exist', function () {
    should.exist(ExecuteDriverPlugin);
  });
});
