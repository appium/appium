import {stubEnv} from '../../lib';

describe('env-utils', function () {
  let expect;

  before(async function () {
    const chai = await import('chai');
    chai.should();
    expect = chai.expect;
  });

  describe('stubEnv', function () {
    stubEnv();

    it('setting env variable', function () {
      process.env.ABC = 'abc';
    });

    it('env varible should not be set', function () {
      expect(process.env.ABC).not.to.exist;
    });
  });
});
