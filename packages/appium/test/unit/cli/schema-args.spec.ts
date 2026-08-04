import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach} from 'node:test';

import {createSandbox} from 'sinon';

import {finalizeSchema, resetSchema, SchemaFinalizationError} from '../../../lib/schema/schema';
import {rewiremock} from '../../helpers';

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
        const args = toParserArgs();
        assert.ok(args instanceof Map);
        assert.ok(args.size > 0);
      });

      it('should generate metavars in SCREAMING_SNAKE_CASE', function () {
        const argDefs = toParserArgs();
        const argDefsWithMetavar = [...argDefs].filter(
          (arg: [string, unknown]) => (arg[1] as {metavar?: string}).metavar,
        );
        assert.ok(argDefsWithMetavar.length > 0);
        type ArgEntry = [string, {metavar?: string}];
        assert.strictEqual(
          (argDefsWithMetavar as ArgEntry[]).every((arg: ArgEntry) => /[A-Z_]+/.test(arg[1].metavar ?? '')),
          true,
        );
      });
    });

    describe('when schema has not yet been compiled', function () {
      it('should throw', function () {
        resetSchema();
        assert.throws(() => toParserArgs(), SchemaFinalizationError);
      });
    });
  });
});
