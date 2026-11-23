import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import path from 'node:path';
import {it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {BaseDriver} from '@appium/base-driver';
import {fs, tempDir} from '@appium/support';
import type {AppiumServer, DriverClass, InitialOpts, ServerArgs, UpdateServerCallback} from '@appium/types';

import {log} from '../../lib/logger.js';
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
  const info = t.mock.method(log, 'info');
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
  const startupMessages = info.mock.calls.map(({arguments: [message]}) => String(message));
  assert.ok(startupMessages.includes("  - first (embedded, automationName 'First')"));
  assert.ok(startupMessages.includes("  - second (embedded, automationName 'Second')"));
  assert.ok(!startupMessages.some((message) => message.startsWith('  - fake@')));

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

it('should validate and default config for resolved package selections without sharing schemas', async function (t) {
  const root = await tempDir.openDir();
  t.after(() => fs.rimraf(root));
  const appiumHome = path.join(root, 'appium-home');
  await fs.mkdir(appiumHome);
  const fileDriver = await writeResolvedDriver(root, 'file-driver', {
    'test-value': {type: 'integer', minimum: 0, default: 2, appiumCliDest: 'numberValue'},
    'default-only': {type: 'boolean', default: true},
  });
  const programmaticDriver = await writeResolvedDriver(root, 'programmatic-driver', {
    'test-value': {type: 'string', default: 'default'},
  });
  const configFile = path.join(root, 'appium.json');
  const programmaticFile = path.join(root, 'programmatic.json');
  await fs.writeFile(
    configFile,
    JSON.stringify({server: {'use-drivers': [fileDriver], driver: {'path-driver': {'test-value': 3}}}}),
  );
  await fs.writeFile(programmaticFile, JSON.stringify({server: {driver: {'path-driver': {'test-value': 'value'}}}}));
  const startupArgs = {appiumHome, loglevel: 'error', throwInsteadOfExit: true} as const;
  const [file, programmatic] = await Promise.all([
    init({...startupArgs, configFile}),
    init({...startupArgs, configFile: programmaticFile, useDrivers: [programmaticDriver]}),
  ]);
  assert.deepEqual(file.parsedArgs.driver?.['path-driver'], {numberValue: 3, defaultOnly: true});
  assert.deepEqual(file.appiumDriver.getCliArgsForDriver('path-driver'), {numberValue: 3});
  assert.deepEqual(programmatic.parsedArgs.driver?.['path-driver'], {testValue: 'value'});

  await assert.rejects(
    init({...startupArgs, configFile, useDrivers: [programmaticDriver]}),
    /Errors in config file.*[\s\S]*must be string/,
  );
});

async function writeResolvedDriver(
  root: string,
  directory: string,
  properties: Record<string, object>,
): Promise<string> {
  const driverRoot = path.join(root, directory);
  await fs.mkdir(driverRoot);
  await fs.writeFile(
    path.join(driverRoot, 'package.json'),
    JSON.stringify({
      name: directory,
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
  await fs.writeFile(path.join(driverRoot, 'schema.json'), JSON.stringify({type: 'object', properties}));
  return driverRoot;
}
