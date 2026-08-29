import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach} from 'node:test';

import type {toParserArgs as ToParserArgsFn} from '../../../lib/schema/cli-args.js';
import {finalizeSchema, resetSchema, SchemaFinalizationError} from '../../../lib/schema/schema.js';

describe('cli/schema-args', function () {
  let toParserArgs: typeof ToParserArgsFn;

  beforeEach(async function () {
    ({toParserArgs} = await import('../../../lib/schema/cli-args.js'));
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
        const argDefs = [...toParserArgs()] as [unknown, {metavar?: string}][];
        const argDefsWithMetavar = argDefs.filter((arg) => arg[1].metavar);
        assert.ok(argDefsWithMetavar.length > 0);
        assert.strictEqual(
          argDefsWithMetavar.every((arg) => /[A-Z_]+/.test(arg[1].metavar ?? '')),
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
