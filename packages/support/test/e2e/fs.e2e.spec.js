import {fs} from '../../lib/fs';
import {isWindows} from '../../lib/system';

describe('isExecutable()', function () {
  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
  });

  describe('when the path does not exist', function () {
    it('should return `false`', async function () {
      await fs.isExecutable('/path/to/nowhere').should.eventually.be.false;
    });
  });

  describe('when the path exists', function () {
    beforeEach(function () {
      if (isWindows()) {
        return this.skip();
      }
    });

    describe('when the path is not executable', function () {
      it('should return `false`', async function () {
        await fs.isExecutable(__filename).should.eventually.be.false;
      });
    });

    describe('when the path is executable', function () {
      it('should return `true`', async function () {
        await fs.isExecutable('/bin/bash').should.eventually.be.true;
      });
    });
  });

  describe('when the parameter is not a path', function () {
    it('should return `false`', async function () {
      await fs.isExecutable().should.eventually.be.false;
    });
  });
});
