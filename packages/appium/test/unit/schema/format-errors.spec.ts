import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';
import * as schema from '../../../lib/schema/schema';
import {rewiremock} from '../../helpers';
import type {formatErrors as FormatErrorsFn} from '../../../lib/schema/format-errors';

const {expect} = chai;
chai.use(chaiAsPromised);

describe('schema/format-errors', function () {
  let sandbox: SinonSandbox;
  let formatErrors: typeof FormatErrorsFn;
  let betterAjvMock: SinonStub;

  before(function () {
    schema.finalizeSchema();
  });

  beforeEach(function () {
    sandbox = createSandbox();
    betterAjvMock = sandbox.stub().returns('');
    ({formatErrors} = rewiremock.proxy(() => require('../../../lib/schema/format-errors'), {
      '@sidvind/better-ajv-errors': betterAjvMock,
    }));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('formatErrors()', function () {
    describe('when provided `errors` as an empty array', function () {
      it('should throw', function () {
        expect(() => formatErrors([])).to.throw(TypeError, 'Array of errors must be non-empty');
      });
    });

    describe('when provided `errors` as `undefined`', function () {
      it('should throw', function () {
        expect(() => formatErrors()).to.throw(TypeError, 'Array of errors must be non-empty');
      });
    });

    describe('when provided `errors` as a non-empty array', function () {
      it('should return a string', function () {
        expect(formatErrors([{}])).to.be.a('string');
      });
    });

    describe('when `opts.pretty` is false', function () {
      it('should call `betterAjvErrors()` with non-CLI output format', function () {
        formatErrors([{}], {}, {pretty: false});
        expect(
          betterAjvMock.calledWith(schema.getSchema(), {}, [{}], {format: 'js', json: undefined})
        ).to.be.true;
      });
    });

    describe('when `opts.json` is a string', function () {
      it('should call `betterAjvErrors()` with option `json: opts.json`', function () {
        formatErrors([{}], {}, {json: '{"foo": "bar"}'});
        expect(
          betterAjvMock.calledWith(schema.getSchema(), {}, [{}], {
            format: 'cli',
            json: '{"foo": "bar"}',
          })
        ).to.be.true;
      });
    });
  });
});
