import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {InitialOpts} from '@appium/types';

import {BaseDriver} from '../../../../lib/index.js';

describe('logging custom events', function () {
  it('should allow logging of events', async function () {
    const d = new BaseDriver({} as InitialOpts);
    assert.deepStrictEqual((d as any)._eventHistory, {commands: []});
    await d.logCustomEvent('myorg', 'myevent');
    assert.deepStrictEqual(Object.keys((d as any)._eventHistory), ['commands', 'myorg:myevent']);
  });
  it('should get all events including custom ones', async function () {
    const d = new BaseDriver({} as InitialOpts);
    assert.deepStrictEqual((d as any)._eventHistory, {commands: []});
    d.logEvent('appiumEvent');
    await d.logCustomEvent('myorg', 'myevent');
    const events = await d.getLogEvents();
    assert.deepStrictEqual(Object.keys(events), ['commands', 'appiumEvent', 'myorg:myevent']);
  });
});

describe('#getLogEvents', function () {
  it('should allow to get all events', async function () {
    const d = new BaseDriver({} as InitialOpts);
    assert.deepStrictEqual((d as any)._eventHistory, {commands: []});
    (d as any)._eventHistory.testCommand = ['1', '2', '3'];
    assert.deepStrictEqual(await d.getLogEvents(), {
      commands: [],
      testCommand: ['1', '2', '3'],
    });
  });

  it('should filter with testCommand', async function () {
    const d = new BaseDriver({} as InitialOpts);
    assert.deepStrictEqual((d as any)._eventHistory, {commands: []});
    (d as any)._eventHistory.testCommand = ['1', '2', '3'];
    assert.deepStrictEqual(await d.getLogEvents('testCommand'), {
      testCommand: ['1', '2', '3'],
    });
  });

  it('should not filter with wrong but can be a part of the event name', async function () {
    const d = new BaseDriver({} as InitialOpts);
    assert.deepStrictEqual((d as any)._eventHistory, {commands: []});
    (d as any)._eventHistory.testCommand = ['1', '2', '3'];
    assert.deepStrictEqual(await d.getLogEvents('testCommandDummy'), {});
  });

  it('should filter with multiple event keys', async function () {
    const d = new BaseDriver({} as InitialOpts);
    assert.deepStrictEqual((d as any)._eventHistory, {commands: []});
    (d as any)._eventHistory.testCommand = ['1', '2', '3'];
    (d as any)._eventHistory.testCommand2 = ['4', '5'];
    assert.deepStrictEqual(await d.getLogEvents(['testCommand', 'testCommand2']), {
      testCommand: ['1', '2', '3'],
      testCommand2: ['4', '5'],
    });
  });

  it('should filter with custom events', async function () {
    const d = new BaseDriver({} as InitialOpts);
    assert.deepStrictEqual((d as any)._eventHistory, {commands: []});
    (d as any)._eventHistory['custom:appiumEvent'] = ['1', '2', '3'];
    assert.deepStrictEqual(await d.getLogEvents(['custom:appiumEvent']), {
      'custom:appiumEvent': ['1', '2', '3'],
    });
  });

  it('should not filter with no existed event name', async function () {
    const d = new BaseDriver({} as InitialOpts);
    assert.deepStrictEqual((d as any)._eventHistory, {commands: []});
    (d as any)._eventHistory.testCommand = ['1', '2', '3'];
    assert.deepStrictEqual(await d.getLogEvents(['noEventName']), {});
  });
});
