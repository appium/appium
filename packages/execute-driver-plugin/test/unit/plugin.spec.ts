import assert from 'node:assert/strict';
import cp from 'node:child_process';
import {EventEmitter} from 'node:events';
import {describe, it} from 'node:test';

import type {ExternalDriver} from '@appium/types';

import {ExecuteDriverPlugin} from '../../lib/plugin.js';

function fakeDriver(serverHost = '127.0.0.1') {
  return {
    isFeatureEnabled: () => true,
    serverHost,
    serverPort: 4723,
    serverPath: '/',
    sessionId: 'fake-session-id',
    caps: {},
    opts: {},
  } as unknown as ExternalDriver;
}

/**
 * A child process which ends the given way instead of ever returning a result
 */
function dyingProcess(code: number | null, signal: string | null) {
  const scriptProc = new EventEmitter() as any;
  scriptProc.connected = false;
  scriptProc.exitCode = code;
  scriptProc.kill = () => {};
  // a real child process cannot exit in the same tick as the message we send to it
  scriptProc.send = () => setImmediate(() => scriptProc.emit('exit', code, signal));
  return scriptProc;
}

async function runScript(scriptProc: any, timeoutMs: number, serverHost?: string) {
  const originalFork = cp.fork;
  (cp as any).fork = () => scriptProc;
  try {
    const plugin = new ExecuteDriverPlugin('execute-driver');
    return await plugin.executeDriverScript(
      async () => {},
      fakeDriver(serverHost),
      'return 1',
      'webdriverio',
      timeoutMs,
    );
  } finally {
    (cp as any).fork = originalFork;
  }
}

describe('execute driver plugin', function () {
  it('should exist', function () {
    assert.ok(ExecuteDriverPlugin);
  });

  it('should reject if the child process ends with an error code', async function () {
    await assert.rejects(runScript(dyingProcess(1, null), 60000), /ended without returning a result/);
  });

  it('should reject if the child process is killed by a signal', async function () {
    await assert.rejects(runScript(dyingProcess(null, 'SIGKILL'), 60000), /ended without returning a result/);
  });

  it('should resolve with an undefined result if the child exits cleanly without a message', async function () {
    assert.equal(await runScript(dyingProcess(0, null), 60000), undefined);
  });

  it('should pass a usable hostname to webdriverio if the server listens on an IPv6 address', async function () {
    const scriptProc = new EventEmitter() as any;
    scriptProc.connected = false;
    scriptProc.exitCode = null;
    scriptProc.kill = () => {};
    let sentOptions: any;
    scriptProc.send = ({driverOpts}: any) => {
      sentOptions = driverOpts.options;
      setImmediate(() => scriptProc.emit('message', {success: true}));
    };

    await runScript(scriptProc, 60000, '::1');

    assert.equal(sentOptions.hostname, '[::1]');
  });
});
