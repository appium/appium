import {createSandbox} from 'sinon';
import {
  finalizeSchema,
  resetSchema,
  SchemaFinalizationError,
} from '../../../lib/schema/schema';
import {rewiremock} from '../../helpers';
import {expect} from 'chai';

describe('cli/schema-args', function () {
  let toParserArgs: () => Map<string, unknown>;
  let sandbox: ReturnType<typeof createSandbox>;

  beforeEach(function () {
    sandbox = createSandbox();
    ({toParserArgs} = rewiremock.proxy(() => require('../../../lib/schema/cli-args')));
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
        const argDefsWithMetavar = [...argDefs].filter(
          (arg: [string, unknown]) => (arg[1] as {metavar?: string}).metavar
        );
        expect(argDefsWithMetavar).not.to.be.empty;
        type ArgEntry = [string, {metavar?: string}];
        expect(
          (argDefsWithMetavar as ArgEntry[]).every((arg: ArgEntry) =>
            /[A-Z_]+/.test(arg[1].metavar ?? '')
          )
        ).to
          .be.true;
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
