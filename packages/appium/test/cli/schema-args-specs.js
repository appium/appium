import {rewiremock} from '../helpers';
import sinon from 'sinon';
import { finalizeSchema, resetSchema } from '../../lib/schema';

const expect = chai.expect;

describe('cli/schema-args', function () {
  /** @type {import('../../lib/cli/schema-args')} */
  let schemaArgs;

  /**
   * @type {import('sinon').SinonSandbox}
   */
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    schemaArgs = rewiremock.proxy(() => require('../../lib/cli/schema-args'));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('toParserArgs()', function () {
    describe('when called with no parameters', function () {
      beforeEach(finalizeSchema);

      afterEach(resetSchema);

      it('should return an array', function () {
        expect(schemaArgs.toParserArgs()).to.be.an('array').that.is.not.empty;
      });
    });

    describe('when schema has not yet been compiled', function () {
      it('should throw', function () {
        expect(() => schemaArgs.toParserArgs()).to.throw('Schema not yet compiled');
      });
    });
  });
});
