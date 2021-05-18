// transpile:mocha

import { stubEnv } from '..';
import chai from 'chai';


chai.should();
const expect = chai.expect;

describe('env-utils', function () {
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
