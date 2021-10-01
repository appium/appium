import {rewiremock} from '../helpers';
import sinon from 'sinon';
import flattenedSchema from '../fixtures/flattened-schema';
import argsForSchema from '../fixtures/args-for-schema';

const expect = chai.expect;

describe('cli/schema-args', function () {
  /** @type {import('../../lib/cli/schema-args')} */
  let schemaArgs;
  let mocks;

  /**
   * @type {import('sinon').SinonSandbox}
   */
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    mocks = {
      '../../lib/schema': {
        flattenSchema: sandbox.stub().returns(flattenedSchema),
        parseArgName: sandbox.stub().returns({argName: 'foo'}),
      }
    };
    schemaArgs = rewiremock.proxy(() => require('../../lib/cli/schema-args'), mocks);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('toParserArgs()', function () {
    describe('when called with no parameters', function () {
      it('should return an array suitable for `argparse`', function () {
        expect(schemaArgs.toParserArgs()).to.deep.equal(argsForSchema);
      });
    });

    describe('when schema has not yet been compiled', function () {
      beforeEach(function () {
        mocks['../../lib/schema'].flattenSchema.throws(new Error('Schema not compiled'));
      });

      it('should throw', function () {
        expect(() => schemaArgs.toParserArgs()).to.throw('Schema not compiled');
      });
    });
  });
});
