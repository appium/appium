import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';

import type {InitialOpts} from '@appium/types';

import {BaseDriver} from '../../../lib/index.js';

describe('ExtensionCore', function () {
  describe('executeBidiCommand', function () {
    let driver: BaseDriver<any, any, any, any, any>;

    beforeEach(function () {
      driver = new BaseDriver({} as InitialOpts);
      driver.updateBidiCommands({
        test: {
          greet: {
            command: 'bidiGreet',
            params: {
              required: ['name'],
              optional: ['greeting'],
            },
          },
        },
      } as any);
      (driver as any).bidiGreet = async function (name: string, greeting: string) {
        return {name, greeting};
      };
    });

    it('should build args from required and optional params, in order, and call the handler', async function () {
      const result = await driver.executeBidiCommand('test.greet', {name: 'Alice', greeting: 'Hi'});
      assert.deepStrictEqual(result, {name: 'Alice', greeting: 'Hi'});
    });

    it('should pass undefined for an omitted optional param', async function () {
      const result = await driver.executeBidiCommand('test.greet', {name: 'Bob'});
      assert.deepStrictEqual(result, {name: 'Bob', greeting: undefined});
    });

    it('should filter out unrecognized params before invoking the handler', async function () {
      const result = await driver.executeBidiCommand('test.greet', {
        name: 'Carol',
        unknownParam: 'should be dropped',
      });
      assert.deepStrictEqual(result, {name: 'Carol', greeting: undefined});
    });

    it('should throw a detailed error when a required param is missing', async function () {
      await assert.rejects(driver.executeBidiCommand('test.greet', {greeting: 'Hi'}), (err: Error) => {
        assert.equal(
          err.message,
          [
            'The following required parameter is missing: ["name"]',
            'Known required parameters are: ["name"]',
            'Known optional parameters are: ["greeting"]',
            'You have provided: ["greeting"]',
          ].join('\n'),
        );
        return true;
      });
    });

    it('should note that nothing was provided when no params are sent at all', async function () {
      await assert.rejects(driver.executeBidiCommand('test.greet', {}), (err: Error) => {
        assert.match(err.message, /You have provided none$/);
        return true;
      });
    });

    it('should call the handler with the plugin signature when next/driver are provided', async function () {
      let receivedArgs: any[] = [];
      const next = async () => ({ok: true});
      (driver as any).bidiGreet = async function (nextArg: unknown, driverArg: unknown, name: string) {
        receivedArgs = [nextArg, driverArg, name];
        return await (nextArg as typeof next)();
      };
      const result = await driver.executeBidiCommand('test.greet', {name: 'Dora'}, next, driver);
      assert.deepStrictEqual(result, {ok: true});
      assert.strictEqual(receivedArgs[0], next);
      assert.strictEqual(receivedArgs[1], driver);
      assert.strictEqual(receivedArgs[2], 'Dora');
    });

    it('should throw UnknownCommandError for a bidi command that does not exist', async function () {
      await assert.rejects(driver.executeBidiCommand('nope.nope', {}), (err: Error) => {
        assert.strictEqual(err.constructor.name, 'UnknownCommandError');
        return true;
      });
    });
  });
});
