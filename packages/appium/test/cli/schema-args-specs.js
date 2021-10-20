import {rewiremock} from '../helpers';
import sinon from 'sinon';
import {finalizeSchema, resetSchema} from '../../lib/schema/schema';

const expect = chai.expect;

describe('cli/schema-args', function () {
  /** @type {import('../../lib/schema/cli-args')} */
  let schemaArgs;

  /**
   * @type {import('sinon').SinonSandbox}
   */
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    schemaArgs = rewiremock.proxy(() => require('../../lib/schema/cli-args'));
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

      it('should generate metavars in SCREAMING_SNAKE_CASE', function () {
        const argDefs = schemaArgs.toParserArgs();
        const argDefsWithMetavar = argDefs.filter((arg) => arg[1].metavar);
        expect(argDefsWithMetavar).not.to.be.empty;
        // is there a more idiomatic way to do this?
        expect(
          argDefsWithMetavar.every((arg) => /[A-Z_]+/.test(arg[1].metavar)),
        ).to.be.true;
      });
    });

    describe('when schema has not yet been compiled', function () {
      it('should throw', function () {
        resetSchema();
        expect(() => schemaArgs.toParserArgs()).to.throw(
          'Schema not yet compiled',
        );
      });
    });
  });
});
