import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import type {AddressInfo} from 'node:net';
import path from 'node:path';
import {it} from 'node:test';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {promisify} from 'node:util';

import {BaseDriver} from '@appium/base-driver';
import {fs, tempDir} from '@appium/support';
import type {AppiumServer, DriverClass, InitialOpts, ServerArgs, UpdateServerCallback} from '@appium/types';

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

  const installed = path.join(appiumHome, 'node_modules', '@appium', 'fake-driver');
  const fakeDriverRoot = path.dirname(fileURLToPath(import.meta.resolve('@appium/fake-driver/package.json')));
  await fs.mkdir(path.dirname(installed), {recursive: true});
  await fs.symlink(fakeDriverRoot, installed, 'junction');
  await fs.writeFile(
    path.join(appiumHome, 'package.json'),
    JSON.stringify({dependencies: {'@appium/fake-driver': '*'}}),
  );

  const TestDriver = BaseDriver as unknown as DriverClass;
  const hookArgs: Partial<ServerArgs>[] = [];
  class FirstDriver extends TestDriver {
    static automationName = 'First';
    static platformNames = ['TestOS'];
    static override updateServer: UpdateServerCallback = async (_app, _server, args) => {
      hookArgs.push(args);
    };
    constructor(opts: InitialOpts) {
      super(opts, true);
    }
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
      useDrivers: [driver === FirstDriver ? driver : {driver, version: '1.0.0'}],
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
  assert.ok(initialized.driverConfig.installedExtensions.fake);
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
      const inactive = await fetch(`${url}/session`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          capabilities: {alwaysMatch: {platformName: 'Fake', 'appium:automationName': 'Fake'}},
        }),
      });
      assert.equal(inactive.status, 500);
      assert.equal(((await inactive.json()) as {value: {error: string}}).value.error, 'session not created');
    } finally {
      await fetch(`${url}/session/${sessionId}`, {method: 'DELETE'});
    }
  }
});

it('should reject a programmatic driver module with no driver export', async function (t) {
  const appiumHome = await tempDir.openDir();
  t.after(() => fs.rimraf(appiumHome));
  await assert.rejects(
    main({
      appiumHome,
      loglevel: 'error',
      throwInsteadOfExit: true,
      // @ts-expect-error A driver module must export an Appium driver constructor.
      useDrivers: [{}],
    }),
    /must expose exactly one Appium driver class; found 0/,
  );
});

it('should parse CLI options declared by a resolved driver', async function (t) {
  const root = await tempDir.openDir();
  t.after(() => fs.rimraf(root));
  const appiumHome = path.join(root, 'appium-home');
  const driverRoot = path.join(root, 'path-driver');
  await fs.mkdir(appiumHome);
  await fs.mkdir(driverRoot);
  await fs.writeFile(
    path.join(driverRoot, 'package.json'),
    JSON.stringify({
      name: 'path-driver',
      version: '1.0.0',
      appium: {
        driverName: 'path-driver',
        automationName: 'PathDriver',
        platformNames: ['Fake'],
        mainClass: 'PathDriver',
        schema: './schema.json',
      },
    }),
  );
  await fs.writeFile(
    path.join(driverRoot, 'schema.json'),
    JSON.stringify({type: 'object', properties: {'test-value': {type: 'string'}}}),
  );

  const appium = fileURLToPath(new URL('../../../index.js', import.meta.url));
  for (const location of [driverRoot, pathToFileURL(driverRoot).href]) {
    const {stdout} = await promisify(execFile)(
      process.execPath,
      [appium, '--use-drivers', location, '--driver-path-driver-test-value', 'selected', '--show-config'],
      {env: {...process.env, APPIUM_HOME: appiumHome}},
    );
    assert.match(stdout, /testValue.*selected/);
  }
});
