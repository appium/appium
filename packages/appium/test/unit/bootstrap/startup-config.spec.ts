import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach} from 'node:test';

import type {SinonSandbox, SinonSpy} from 'sinon';
import {createSandbox} from 'sinon';

import {getNonDefaultServerArgs, showConfig} from '../../../lib/bootstrap/startup-config.js';
import {getParser} from '../../../lib/cli/parser.js';
import {PLUGIN_TYPE} from '../../../lib/constants.js';
import {finalizeSchema, getDefaultsForSchema, registerSchema, resetSchema} from '../../../lib/schema/schema.js';
import {setPath} from '../../../lib/utils/index.js';

describe('bootstrap/startup-config', function () {
  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('showConfig()', function () {
    let log: SinonSpy;
    let dir: SinonSpy;

    beforeEach(function () {
      log = sandbox.spy(console, 'log');
      dir = sandbox.spy(console, 'dir');
    });

    describe('when a config file is present', function () {
      it('should dump the current Appium config', function () {
        showConfig(
          {address: 'bar'},
          {
            config: {
              // @ts-expect-error
              server: {'callback-address': 'quux'},
            },
          },
          {port: 1234},
          {allowCors: false},
        );
        assert.strictEqual(log.calledWith('Appium Configuration\n'), true);
      });

      it('should skip empty objects', function () {
        showConfig(
          // @ts-expect-error
          {foo: 'bar', cows: {}, pigs: [], sheep: 0, ducks: false},
          {config: {server: {address: 'quux'}}},
          {spam: 'food'},
          {},
        );
        assert.strictEqual(dir.calledWith({foo: 'bar', sheep: 0, ducks: false}), true);
      });
    });

    describe('when a config file is not present', function () {
      it('should dump the current Appium config (sans config file contents)', function () {
        showConfig(
          // @ts-expect-error
          {foo: 'bar', cows: {}, pigs: [], sheep: 0, ducks: false},
          {},
          {spam: 'food'},
          {},
        );
        assert.strictEqual(log.calledWith('\n(no configuration file loaded)'), true);
      });
    });

    describe('when no CLI arguments (other than --show-config) provided', function () {
      it('should not dump CLI args', function () {
        showConfig({}, {}, {}, {});
        assert.strictEqual(log.calledWith('\n(no CLI parameters provided)'), true);
      });
    });
  });

  describe('getNonDefaultServerArgs()', function () {
    let args: Record<string, unknown>;

    describe('without extension schemas', function () {
      beforeEach(async function () {
        resetSchema();
        await getParser(true);
        args = getDefaultsForSchema();
      });

      it('should show none if we have all the defaults', function () {
        const nonDefaultArgs = getNonDefaultServerArgs(args);
        assert.strictEqual(Object.keys(nonDefaultArgs).length, 0);
      });

      it('should catch a non-default argument', function () {
        args.allowCors = true;
        const nonDefaultArgs = getNonDefaultServerArgs(args);
        assert.deepStrictEqual(nonDefaultArgs, {allowCors: true});
      });

      describe('when arg is an array', function () {
        it('should return the arg as an array', function () {
          args.usePlugins = ['all'];
          assert.deepStrictEqual(getNonDefaultServerArgs(args), {usePlugins: ['all']});
        });
      });
    });

    describe('with extension schemas', function () {
      beforeEach(async function () {
        resetSchema();
        await registerSchema(PLUGIN_TYPE, 'crypto-fiend', {
          type: 'object',
          properties: {elite: {type: 'boolean', default: true}},
        });
        await finalizeSchema();
        await getParser(true);
        args = getDefaultsForSchema();
      });

      it('should take extension schemas into account', function () {
        const nonDefaultArgs = getNonDefaultServerArgs(args);
        assert.strictEqual(Object.keys(nonDefaultArgs).length, 0);
      });

      it('should catch a non-default argument', function () {
        setPath(args, 'plugin.crypto-fiend.elite', false);
        const nonDefaultArgs = getNonDefaultServerArgs(args);
        const expected: Record<string, unknown> = {};
        setPath(expected, 'plugin.crypto-fiend.elite', false);
        assert.deepStrictEqual(nonDefaultArgs, expected);
      });
    });
  });
});
