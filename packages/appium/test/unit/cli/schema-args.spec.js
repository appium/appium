import {createSandbox} from 'sinon';
import {
  finalizeSchema,
  resetSchema,
  SchemaFinalizationError,
} from '../../../lib/schema/schema';
import {rewiremock} from '../../helpers';

const expect = chai.expect;

describe('cli/schema-args', function () {
  /** @type {import('appium/lib/schema/cli-args').toParserArgs} */
  let toParserArgs;

  /**
   * @type {sinon.SinonSandbox}
   */
  let sandbox;

  beforeEach(function () {
    sandbox = createSandbox();
    ({toParserArgs} = rewiremock.proxy(() =>
      require('../../../lib/schema/cli-args')
    ));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('toParserArgs()', function () {
    describe('when called with no parameters', function () {
      beforeEach(finalizeSchema);

      afterEach(resetSchema);

      it('should return a Map', function () {
        expect(toParserArgs())
          .to.be.an.instanceof(Map)
          .and.have.property('size')
          .that.is.above(0);
      });

      it('should generate metavars in SCREAMING_SNAKE_CASE', function () {
        const argDefs = toParserArgs();
        const argDefsWithMetavar = [...argDefs].filter((arg) => arg[1].metavar);
        expect(argDefsWithMetavar).not.to.be.empty;
        // is there a more idiomatic way to do this?
        expect(
          argDefsWithMetavar.every((arg) => /[A-Z_]+/.test(arg[1].metavar))
        ).to.be.true;
      });
    });

    describe('when schema has not yet been compiled', function () {
      it('should throw', function () {
        resetSchema();
        expect(() => toParserArgs()).to.throw(SchemaFinalizationError);
      });
    });
  });
});
