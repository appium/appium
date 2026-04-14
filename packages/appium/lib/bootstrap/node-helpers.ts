/* eslint-disable no-console */
import _ from 'lodash';
import path from 'node:path';
import os from 'node:os';
import * as semver from 'semver';
import B from 'bluebird';
import {system, fs, npm} from '@appium/support';
import {log as logger} from '../logger';
import {getAppiumModuleRoot, npmPackage} from '../utils';
import {rootDir, updateBuildInfo, getBuildInfo} from '../helpers/build';

const MIN_NODE_VERSION = (npmPackage.engines as Record<string, string>).node;

interface NodeModuleWithInitPaths {
  Module: {_initPaths(): void};
}

interface DebugInfoInput {
  driverConfig: {installedExtensions: unknown};
  pluginConfig: {installedExtensions: unknown};
  appiumHome: string;
}

/**
 * @throws {Error} If Node version is outside of the supported range
 */
export function checkNodeOk(): void {
  const version = getNodeVersion();
  if (!semver.satisfies(version, MIN_NODE_VERSION)) {
    throw new Error(`Node version must be at least ${MIN_NODE_VERSION}; current is ${version.version}`);
  }
}

/**
 * Adjusts NODE_PATH so CJS drivers/plugins can load peer deps. Does not work with ESM.
 */
export function adjustNodePath(): void {
  let appiumModuleSearchRoot: string;
  try {
    appiumModuleSearchRoot = path.dirname(getAppiumModuleRoot());
  } catch (error) {
    logger.warn((error as Error).message);
    return;
  }

  const refreshRequirePaths = (): boolean => {
    try {
      // Private API; see https://gist.github.com/branneman/8048520#7-the-hack
      (require('node:module') as NodeModuleWithInitPaths).Module._initPaths();
      return true;
    } catch {
      return false;
    }
  };

  if (!process.env.NODE_PATH) {
    process.env.NODE_PATH = appiumModuleSearchRoot;
    if (refreshRequirePaths()) {
      process.env.APPIUM_OMIT_PEER_DEPS = '1';
    } else {
      delete process.env.NODE_PATH;
    }
    return;
  }

  const nodePathParts = process.env.NODE_PATH.split(path.delimiter);
  if (nodePathParts.includes(appiumModuleSearchRoot)) {
    process.env.APPIUM_OMIT_PEER_DEPS = '1';
    return;
  }

  nodePathParts.push(appiumModuleSearchRoot);
  process.env.NODE_PATH = nodePathParts.join(path.delimiter);
  if (refreshRequirePaths()) {
    process.env.APPIUM_OMIT_PEER_DEPS = '1';
  } else {
    process.env.NODE_PATH = _.without(nodePathParts, appiumModuleSearchRoot).join(path.delimiter);
  }
}

/**
 * Prints JSON debug info (OS, Node/npm, Appium build, installed drivers/plugins) to stdout.
 * Input combines extension config snapshots with the resolved Appium home path.
 */
export async function showDebugInfo({driverConfig, pluginConfig, appiumHome}: DebugInfoInput): Promise<void> {
  const getNpmVersion = async (): Promise<string> => {
    const {stdout} = await npm.exec('--version', [], {cwd: process.cwd()});
    return _.trim(stdout);
  };
  const findNpmLocation = async (): Promise<string> =>
    await fs.which(system.isWindows() ? 'npm.cmd' : 'npm');

  const [npmVersion, npmLocation] = await B.all([
    ...[getNpmVersion, findNpmLocation].map((f) => getSafeResult(f, 'unknown')),
    updateBuildInfo() as Promise<unknown>,
  ]);

  const debugInfo = {
    os: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      homedir: os.homedir(),
      username: os.userInfo().username,
    },
    node: {
      version: process.version,
      arch: process.arch,
      cwd: process.cwd(),
      argv: process.argv,
      env: process.env,
      npm: {
        location: npmLocation,
        version: npmVersion,
      },
    },
    appium: {
      location: rootDir,
      homedir: appiumHome,
      build: getBuildInfo(),
      drivers: driverConfig.installedExtensions,
      plugins: pluginConfig.installedExtensions,
    },
  };
  console.log(JSON.stringify(debugInfo, null, 2));
}

/**
 * Ensures a directory exists and (optionally) is writeable.
 *
 * If the directory does not exist, this attempts to create it recursively.
 *
 * @throws {Error}
 */
export async function requireDir(
  root: string,
  requireWriteable = true,
  displayName = 'folder path'
): Promise<void> {
  let stat;
  try {
    stat = await fs.stat(root);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      try {
        await fs.mkdir(root, {recursive: true});
        return;
      } catch {}
    }
    throw new Error(`The ${displayName} '${root}' must exist and be a valid directory`);
  }
  if (stat && !stat.isDirectory()) {
    throw new Error(`The ${displayName} '${root}' must be a valid directory`);
  }
  if (requireWriteable) {
    try {
      await fs.access(root, fs.constants.W_OK);
    } catch {
      throw new Error(
        `The ${displayName} '${root}' must be writeable for the current user account '${os.userInfo().username}'`
      );
    }
  }
}

function getNodeVersion(): semver.SemVer {
  return semver.coerce(process.version) as semver.SemVer;
}

/**
 * Calculates the result of the given function and return its value
 * or the default one if there was an exception.
 */
async function getSafeResult<T>(f: () => Promise<T>, defaultValue: T): Promise<T> {
  try {
    return await f();
  } catch {
    return defaultValue;
  }
}
