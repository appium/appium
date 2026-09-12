import assert from 'node:assert/strict';
import path from 'node:path';
import {after, afterEach, before, beforeEach, describe, it, mock} from 'node:test';

import {fs, tempDir} from '@appium/support';
import {sleep} from 'asyncbox';
import * as YAML from 'yaml';

import {DRIVER_TYPE} from '../../../lib/constants.js';
import {loadExtensions} from '../../../lib/extension/index.js';
import {Manifest} from '../../../lib/extension/manifest/manifest.js';
import {resolveManifestLockfilePath, resolveManifestPath, withManifestLock} from '../../../lib/utils/index.js';

const FAKE_DRIVER_MANIFEST = {
  pkgName: '@appium/fake-driver',
  version: '1.0.0',
  automationName: 'Fake',
  platformNames: ['Fake'],
  mainClass: 'FakeDriver',
  installType: 'npm',
  installSpec: '@appium/fake-driver',
  installPath: '',
  // Satisfies any Appium version, so `validate()` (now run on every manifest reload) doesn't
  // fall into `getGenericConfigWarnings()`'s peer-dependency check, which needs a real `list()`
  // on the command class -- unlike `execute()`, not something `FakeExtensionCommand` stands in for.
  appiumVersion: '*',
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

  it('revalidates the reloaded manifest, dropping conflicting entries and refreshing derived duplicate-name tracking', async function () {
    const {driverConfig} = await loadExtensions(appiumHome);

    // Simulate another process installing a *second* driver -- claiming the same `automationName`
    // as the first -- while this process was waiting for the lock. A plain re-read (with no
    // revalidation) would let both stand; only revalidating against fresh `knownAutomationNames`
    // catches the conflict.
    const manifestPath = await resolveManifestPath(appiumHome);
    const onDisk = YAML.parse(await fs.readFile(manifestPath, 'utf8'));
    onDisk.drivers.fake = FAKE_DRIVER_MANIFEST;
    onDisk.drivers['fake-2'] = {...FAKE_DRIVER_MANIFEST, pkgName: '@appium/fake-driver-2'};
    await fs.writeFile(manifestPath, YAML.stringify(onDisk), 'utf8');

    await runExtensionCommand(
      {subcommand: DRIVER_TYPE, driverCommand: 'list', suppressOutput: true} as any,
      driverConfig,
    );

    // Only one of the two same-`automationName` drivers should survive revalidation.
    assert.deepStrictEqual(Object.keys(driverConfig.installedExtensions), ['fake']);

    const errorMessages: string[] = [];
    driverConfig.printValidationSummary({warn() {}, error: (msg?: string) => void errorMessages.push(msg ?? '')});
    assert.ok(errorMessages.some((msg) => msg.includes('Multiple drivers claim support for the same automationName')));
  });

  it('still lists installed extensions when the manifest directory is read-only', async function () {
    // Populate a valid, current-schema manifest first (needs to write), then lock the directory
    // down the way a preinstalled, read-only `APPIUM_HOME` would be -- e.g. `driver list
    // --installed` against a container image built with the manifest already baked in.
    const {driverConfig} = await loadExtensions(appiumHome);
    const manifestDir = path.dirname(await resolveManifestPath(appiumHome));
    await fs.chmod(manifestDir, 0o555);
    try {
      const result = await runExtensionCommand(
        {subcommand: DRIVER_TYPE, driverCommand: 'list', suppressOutput: true} as any,
        driverConfig,
      );
      assert.ok(result);
      // No lock file could have been created in a read-only directory.
      assert.strictEqual(await fs.exists(await resolveManifestLockfilePath(appiumHome)), false);
    } finally {
      await fs.chmod(manifestDir, 0o755);
    }
  });
});

describe('loadExtensions', function () {
  let appiumHome: string;

  beforeEach(async function () {
    appiumHome = await tempDir.openDir();
    Manifest.getInstance.cache = new Map();
  });

  afterEach(async function () {
    await fs.rimraf(appiumHome);
  });

  it('waits for another process holding the manifest lock instead of reading/writing around it', async function () {
    let lockAcquired = false;
    let releaseHold: () => void;
    const holdUntilReleased = new Promise<void>((resolve) => {
      releaseHold = resolve;
    });
    const heldLockPromise = withManifestLock(appiumHome, async () => {
      lockAcquired = true;
      await holdUntilReleased;
    });
    while (!lockAcquired) {
      await sleep(5);
    }

    let loadResolved = false;
    const loadPromise = loadExtensions(appiumHome).then((result) => {
      loadResolved = true;
      return result;
    });

    // `loadExtensions()` has nothing to do before it needs the lock, so if it isn't actually
    // waiting on the same lock file, it would resolve almost immediately here.
    await sleep(200);
    assert.strictEqual(loadResolved, false);

    releaseHold!();
    await heldLockPromise;
    await loadPromise;
    assert.strictEqual(loadResolved, true);
  });

  it('succeeds against a read-only manifest directory when no write is needed', async function () {
    // Populate a valid, current-schema manifest normally first (needs to write).
    await loadExtensions(appiumHome);
    Manifest.getInstance.cache = new Map();

    const manifestDir = path.dirname(await resolveManifestPath(appiumHome));
    await fs.chmod(manifestDir, 0o555);
    try {
      const {driverConfig} = await loadExtensions(appiumHome);
      assert.deepStrictEqual(driverConfig.installedExtensions, {});
      // No lock file could have been created in a read-only directory.
      assert.strictEqual(await fs.exists(await resolveManifestLockfilePath(appiumHome)), false);
    } finally {
      await fs.chmod(manifestDir, 0o755);
    }
  });
});
