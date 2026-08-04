import assert from 'node:assert/strict';
import cp from 'node:child_process';
import {EventEmitter} from 'node:events';
import {describe, it} from 'node:test';

import type {ExternalDriver} from '@appium/types';

import {ExecuteDriverPlugin} from '../../lib/plugin.js';

function fakeDriver() {
  return {
    isFeatureEnabled: () => true,
    serverHost: '127.0.0.1',
    serverPort: 4723,
    serverPath: '/',
    sessionId: 'fake-session-id',
    caps: {},
    opts: {},
  } as unknown as ExternalDriver;
}

describe('execute driver plugin', function () {
  it('should exist', function () {
    assert.ok(ExecuteDriverPlugin);
  });

  it('should reject if the child process ends before it returns a result', async function () {
    const scriptProc = new EventEmitter() as any;
    scriptProc.connected = false;
    scriptProc.exitCode = 1;
    scriptProc.kill = () => {};
    // a real child process cannot exit in the same tick as the message we send to it
    scriptProc.send = () => setImmediate(() => scriptProc.emit('exit', 1, null));

    const originalFork = cp.fork;
    (cp as any).fork = () => scriptProc;
    try {
      const plugin = new ExecuteDriverPlugin('execute-driver');
      await assert.rejects(
        plugin.executeDriverScript(async () => {}, fakeDriver(), 'return 1', 'webdriverio', 60000),
        /ended without returning a result/,
      );
    } finally {
      (cp as any).fork = originalFork;
    }
  });
});
