import assert from 'node:assert/strict';
import path from 'node:path';
import {after, before, type TestContext} from 'node:test';

import {fs, tempDir} from '@appium/support';
import type {DriverType} from '@appium/types';
import type {ExtRecord} from 'appium/types/index.js';
import * as semver from 'semver';

import {
  DRIVER_TYPE,
  EXT_SUBCOMMAND_DOCTOR as DOCTOR,
  EXT_SUBCOMMAND_INSTALL as INSTALL,
  EXT_SUBCOMMAND_LIST as LIST,
  EXT_SUBCOMMAND_RUN as RUN,
  EXT_SUBCOMMAND_UNINSTALL as UNINSTALL,
} from '../../lib/constants.js';
import {APPIUM_VER} from '../../lib/helpers/build.js';
import {resolveFixture} from '../helpers.js';
import {runAppiumJson} from './e2e-helpers.js';

export const TEST_DRIVER_DIR = path.dirname(resolveFixture('test-driver/package.json'));

// While this branch's Appium runs as a prerelease (e.g. a beta major train), `npm install
// @appium/fake-driver` with no tag would resolve `latest` - a release line that doesn't
// declare compatibility with the running prerelease major. Route npm-registry installs to the
// `beta` dist-tag instead so they resolve to a version that actually supports it.
export const IS_PRERELEASE_SERVER = Boolean(semver.prerelease(APPIUM_VER));
export const FAKE_DRIVER_NPM_SPEC = IS_PRERELEASE_SERVER ? '@appium/fake-driver@beta' : '@appium/fake-driver';

/**
 * True for the specific rejection `ExtensionCliCommand#_checkInstallCompatibility` throws when an
 * extension's declared peer requirement on `appium` doesn't cover the running server version -
 * as opposed to some other, unrelated install failure.
 */
export function isServerVersionIncompatibleError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('cannot be installed because the server version it requires');
}

/**
 * Installs `FAKE_DRIVER_NPM_SPEC` from npm, or skips the calling test if the currently-published
 * version under that spec doesn't yet declare compatibility with the running (possibly
 * prerelease) Appium - e.g. right after a fresh major bootstrap, before a follow-up release
 * catches its peerDependencies range up. Self-resolves once that follow-up release ships.
 */
export async function installFakeDriverOrSkip(
  ctx: TestContext,
  install: (args: string[]) => Promise<ExtRecord<DriverType>>,
): Promise<ExtRecord<DriverType> | undefined> {
  try {
    return await install([FAKE_DRIVER_NPM_SPEC, '--source', 'npm']);
  } catch (err) {
    if (isServerVersionIncompatibleError(err)) {
      ctx.skip(`${FAKE_DRIVER_NPM_SPEC} is not yet compatible with Appium ${APPIUM_VER}: ${(err as Error).message}`);
      return undefined;
    }
    throw err;
  }
}

export const TEST_DRIVER_INVALID_PEERS_DIR = path.dirname(resolveFixture('test-driver-invalid-peer-dep/package.json'));

export interface ExtensionListResult {
  [key: string]: {
    installed?: boolean;
    pkgName?: string;
    repositoryUrl?: string;
    [k: string]: unknown;
  };
}

/**
 * Asserts that every key/value pair in `expected` is present (via deep equality) on `actual`,
 * mirroring chai's `expect(actual).to.deep.include(expected)` semantics for objects.
 */
export function assertDeepInclude(actual: unknown, expected: unknown): void {
  for (const [key, value] of Object.entries(expected as Record<string, unknown>)) {
    assert.deepStrictEqual((actual as Record<string, unknown>)[key], value);
  }
}

/**
 * Asserts that every key/value pair in `expected` is present (via strict equality) on `actual`,
 * mirroring chai's `expect(actual).to.include(expected)` semantics for objects.
 */
export function assertInclude(actual: unknown, expected: unknown): void {
  for (const [key, value] of Object.entries(expected as Record<string, unknown>)) {
    assert.strictEqual((actual as Record<string, unknown>)[key], value);
  }
}

export interface DriverCli {
  appiumHome: string;
  runList: (args?: string[]) => Promise<ExtensionListResult>;
  runRun: (args: string[]) => Promise<{output: string; error?: string}>;
  runInstall: (args: string[]) => Promise<ExtRecord<DriverType>>;
  runUninstall: (args: string[]) => Promise<ExtRecord<DriverType>>;
  runDoctor: (args: string[]) => Promise<number>;
  resetAppiumHome: () => Promise<void>;
}

/** Registers hooks which create a fresh APPIUM_HOME and the CLI runners for the enclosing suite */
export function useDriverCli(): DriverCli {
  const cli = {} as DriverCli;
  cli.resetAppiumHome = async () => {
    await fs.rimraf(cli.appiumHome);
    await fs.mkdirp(cli.appiumHome);
  };

  before(async function () {
    cli.appiumHome = await tempDir.openDir();
    const run = runAppiumJson(cli.appiumHome);
    cli.runInstall = (args) => run([DRIVER_TYPE, INSTALL, ...args]) as Promise<ExtRecord<DriverType>>;
    cli.runUninstall = (args) => run([DRIVER_TYPE, UNINSTALL, ...args]) as Promise<ExtRecord<DriverType>>;
    cli.runList = async (args = []) => run([DRIVER_TYPE, LIST, ...args]) as Promise<ExtensionListResult>;
    cli.runRun = (args) => run([DRIVER_TYPE, RUN, ...args]) as Promise<{output: string; error?: string}>;
    cli.runDoctor = async (args) => run([DRIVER_TYPE, DOCTOR, ...args]) as Promise<number>;
  });

  after(async function () {
    await fs.rimraf(cli.appiumHome);
  });

  return cli;
}
