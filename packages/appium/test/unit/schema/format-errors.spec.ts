import assert from 'node:assert/strict';
import {describe, it, beforeEach, before, after, mock} from 'node:test';

import {createSandbox, type SinonSandbox, type SinonStub} from 'sinon';

import type {formatErrors as FormatErrorsFn} from '../../../lib/schema/format-errors.js';
import * as schema from '../../../lib/schema/schema.js';

describe('schema/format-errors', function () {
  let sandbox: SinonSandbox;
  let formatErrors: typeof FormatErrorsFn;
  let betterAjvMock: SinonStub;

  // `betterAjvMock` and the `mock.module()` registration are set up once: `mock.module()`
  // throws if called twice for the same specifier without a reset in between, so per-test
  // reconfiguration goes through `sandbox.resetHistory()` (keeping the same stub identity)
  // rather than re-registering the mock.
  before(async function () {
    await schema.finalizeSchema();
    sandbox = createSandbox();
    betterAjvMock = sandbox.stub().returns('');
    mock.module('@sidvind/better-ajv-errors', {defaultExport: betterAjvMock});
    // Cache-busted: `format-errors.js` is also imported (unmocked) by other files, e.g.
    // `cli-args.ts`. Importing it here under the plain specifier would leave that shared cache
    // entry permanently bound to this mock for the rest of the process.
    ({formatErrors} = await import(`../../../lib/schema/format-errors.js?t=${0}`));
  });

  after(function () {
    mock.reset();
    sandbox.restore();
  });

  beforeEach(function () {
    sandbox.resetHistory();
    betterAjvMock.returns('');
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
