import assert from 'node:assert/strict';
import {after, afterEach, before, beforeEach, describe, it, mock} from 'node:test';

import {fs, tempDir} from '@appium/support';
import * as YAML from 'yaml';

import {DRIVER_TYPE} from '../../../lib/constants.js';
import {loadExtensions} from '../../../lib/extension/index.js';
import {Manifest} from '../../../lib/extension/manifest/manifest.js';
import {resolveManifestLockfilePath, resolveManifestPath} from '../../../lib/utils/index.js';

const FAKE_DRIVER_MANIFEST = {
  pkgName: '@appium/fake-driver',
  version: '1.0.0',
  automationName: 'Fake',
  platformNames: ['Fake'],
  mainClass: 'FakeDriver',
  installType: 'npm',
  installSpec: '@appium/fake-driver',
  installPath: '',
};

let executeCalls: any[];

/** Stands in for `DriverCliCommand`/`PluginCliCommand` so `execute()` never touches npm/network. */
class FakeExtensionCommand {
  config: any;
  json: boolean;

  constructor({config, json}: {config: any; json: boolean}) {
    this.config = config;
    this.json = json;
  }

  printPendingValidationSummary(): void {}

  async execute(args: any): Promise<Record<string, unknown>> {
    executeCalls.push(args);
    if (args.throwError) {
      throw new Error(args.throwError);
    }
    return {installedExtensionsSnapshot: {...this.config.installedExtensions}};
  }
}

describe('runExtensionCommand', function () {
  // `driver-command.js`/`plugin-command.js` must be mocked before `extension.js` is first
  // imported (see the `before()` hook below), so its type can't come from a normal value import.
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let runExtensionCommand: (typeof import('../../../lib/cli/extension.js'))['runExtensionCommand'];
  let appiumHome: string;

  // `driver-command.js`/`plugin-command.js` are mocked once here (before the first import of
  // `extension.js`, which statically imports both) so every test below shares the same fake
  // command class; per-test behavior is driven entirely through the `args` passed at call time.
  before(async function () {
    mock.module('../../../lib/cli/driver-command.js', {defaultExport: FakeExtensionCommand});
    mock.module('../../../lib/cli/plugin-command.js', {defaultExport: FakeExtensionCommand});
    ({runExtensionCommand} = await import('../../../lib/cli/extension.js'));
  });

  after(function () {
    mock.reset();
  });

  beforeEach(async function () {
    executeCalls = [];
    appiumHome = await tempDir.openDir();
    Manifest.getInstance.cache = new Map();
  });

  afterEach(async function () {
    await fs.rimraf(appiumHome);
  });

  it('acquires and releases the manifest lock around the command', async function () {
    const {driverConfig} = await loadExtensions(appiumHome);
    const lockFile = await resolveManifestLockfilePath(appiumHome);

    assert.strictEqual(await fs.exists(lockFile), false);
    await runExtensionCommand(
      {subcommand: DRIVER_TYPE, driverCommand: 'list', suppressOutput: true} as any,
      driverConfig,
    );
    assert.strictEqual(executeCalls.length, 1);
    assert.strictEqual(await fs.exists(lockFile), false);
  });

  it('still releases the lock when the command throws', async function () {
    const {driverConfig} = await loadExtensions(appiumHome);
    const lockFile = await resolveManifestLockfilePath(appiumHome);

    await assert.rejects(
      runExtensionCommand(
        {subcommand: DRIVER_TYPE, driverCommand: 'list', suppressOutput: true, throwError: 'boom'} as any,
        driverConfig,
      ),
      /boom/,
    );
    assert.strictEqual(await fs.exists(lockFile), false);
  });

  it('re-reads the manifest under the lock, picking up changes written after the initial load', async function () {
    const {driverConfig} = await loadExtensions(appiumHome);
    assert.deepStrictEqual(driverConfig.installedExtensions, {});

    // Simulate another CLI process installing a driver after this process's own startup read
    // but before this command actually runs.
    const manifestPath = await resolveManifestPath(appiumHome);
    const onDisk = YAML.parse(await fs.readFile(manifestPath, 'utf8'));
    onDisk.drivers.fake = FAKE_DRIVER_MANIFEST;
    await fs.writeFile(manifestPath, YAML.stringify(onDisk), 'utf8');

    // The in-memory config still reflects the state from the initial `loadExtensions()` read.
    assert.deepStrictEqual(driverConfig.installedExtensions, {});

    const result = await runExtensionCommand(
      {subcommand: DRIVER_TYPE, driverCommand: 'list', suppressOutput: true} as any,
      driverConfig,
    );

    assert.ok('fake' in (result as any).installedExtensionsSnapshot);
    // `installedExtensions` is a live getter, so the same `config` object the caller already
    // held onto also reflects the reload -- it isn't stuck on the pre-lock snapshot.
    assert.ok('fake' in driverConfig.installedExtensions);
  });
});
