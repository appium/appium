import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach, before} from 'node:test';

import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';

import type {formatErrors as FormatErrorsFn} from '../../../lib/schema/format-errors';
import * as schema from '../../../lib/schema/schema';
import {rewiremock} from '../../helpers';

describe('schema/format-errors', function () {
  let sandbox: SinonSandbox;
  let formatErrors: typeof FormatErrorsFn;
  let betterAjvMock: SinonStub;

  before(async function () {
    await schema.finalizeSchema();
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
    /** Minimal placeholder; tests only assert wiring to better-ajv-errors, not real AJV shapes. */
    const oneError = [{keyword: 'test', instancePath: '', schemaPath: '#', params: {}}] as Parameters<
      typeof formatErrors
    >[0];

    describe('when provided `errors` as an empty array', function () {
      it('should throw', function () {
        assert.throws(() => formatErrors([]), {name: 'TypeError', message: /Array of errors must be non-empty/});
      });
    });

    describe('when provided `errors` as `undefined`', function () {
      it('should throw', function () {
        assert.throws(() => formatErrors(), {name: 'TypeError', message: /Array of errors must be non-empty/});
      });
    });

    describe('when provided `errors` as a non-empty array', function () {
      it('should return a string', function () {
        assert.strictEqual(typeof formatErrors(oneError), 'string');
      });
    });

    describe('when `opts.pretty` is false', function () {
      it('should call `betterAjvErrors()` with non-CLI output format', function () {
        formatErrors(oneError, {}, {pretty: false});
        assert.strictEqual(
          betterAjvMock.calledWith(schema.getSchema(), {}, oneError, {
            format: 'js',
            json: undefined,
          }),
          true,
        );
      });
    });

    describe('when `opts.json` is a string', function () {
      it('should call `betterAjvErrors()` with option `json: opts.json`', function () {
        formatErrors(oneError, {}, {json: '{"foo": "bar"}'});
        assert.strictEqual(
          betterAjvMock.calledWith(schema.getSchema(), {}, oneError, {
            format: 'cli',
            json: '{"foo": "bar"}',
          }),
          true,
        );
      });
    });
  });
});
