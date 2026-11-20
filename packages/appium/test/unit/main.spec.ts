import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {it} from 'node:test';

import {BaseDriver} from '@appium/base-driver';
import {fs, tempDir} from '@appium/support';
import type {AppiumServer, DriverClass, ServerArgs, UpdateServerCallback} from '@appium/types';

import {init, main} from '../../lib/main.js';

it('should isolate embedded main selections and pass normalized names to real server hooks', async function (t) {
  const appiumHome = await tempDir.openDir();
  const servers: AppiumServer[] = [];
  const signalListeners = new Map(['SIGINT', 'SIGTERM'].map((signal) => [signal, new Set(process.listeners(signal))]));
  t.after(async function () {
    for (const server of servers) {
      await server.close();
    }
    for (const [signal, original] of signalListeners) {
      for (const listener of process.listeners(signal)) {
        if (!original.has(listener)) {
          process.removeListener(signal, listener);
        }
      }
    }
    await fs.rimraf(appiumHome);
  });

  const TestDriver = BaseDriver as unknown as DriverClass;
  const hookArgs: Partial<ServerArgs>[] = [];
  class FirstDriver extends TestDriver {
    static automationName = 'First';
    static platformNames = ['TestOS'];
    static override updateServer: UpdateServerCallback = async (_app, _server, args) => {
      hookArgs.push(args);
    };
    async execute(): Promise<boolean> {
      return this.isFeatureEnabled('foo');
    }
  }
  class SecondDriver extends FirstDriver {
    static override automationName = 'Second';
  }

  for (const driver of [FirstDriver, SecondDriver]) {
    const server = await main({
      appiumHome,
      address: '127.0.0.1',
      port: 0,
      useDrivers: [{default: driver}],
      relaxedSecurityEnabled: true,
      denyInsecure: [`${driver.automationName}:foo`],
      loglevel: 'error',
      throwInsteadOfExit: true,
    });
    servers.push(server);
  }
  assert.deepEqual(
    hookArgs.map((args) => args.useDrivers),
    [['first'], ['second']],
  );

  const initialized = await init({appiumHome, address: '127.0.0.1', loglevel: 'error', throwInsteadOfExit: true});
  const parsedNames: string[] = initialized.parsedArgs.useDrivers;
  assert.deepEqual(parsedNames, []);
  await assert.rejects(initialized.driverConfig.findMatchingDriver({automationName: 'First', platformName: 'TestOS'}));

  for (const [index, server] of servers.entries()) {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const status = await fetch(`${url}/status`);
    assert.equal(status.status, 200);
    const created = await fetch(`${url}/session`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        capabilities: {
          alwaysMatch: {
            platformName: 'TestOS',
            'appium:automationName': index ? 'Second' : 'First',
            'appium:newCommandTimeout': 0,
          },
        },
      }),
    });
    assert.equal(created.status, 200);
    const {
      value: {sessionId},
    } = (await created.json()) as {value: {sessionId: string}};
    try {
      const executed = await fetch(`${url}/session/${sessionId}/execute/sync`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({script: 'feature', args: []}),
      });
      assert.equal(executed.status, 200);
      assert.equal(((await executed.json()) as {value: boolean}).value, false);
      const unsupported = await fetch(`${url}/session`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          capabilities: {alwaysMatch: {platformName: 'TestOS', 'appium:automationName': index ? 'First' : 'Second'}},
        }),
      });
      assert.equal(unsupported.status, 500);
    } finally {
      await fetch(`${url}/session/${sessionId}`, {method: 'DELETE'});
    }
  }
});
