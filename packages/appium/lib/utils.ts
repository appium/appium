import type {
  BaseDriverCapConstraints,
  Capabilities,
  Constraints,
  NSCapabilities,
  W3CCapabilities,
} from '@appium/types';
import type {
  Args,
  CliCommand,
  CliCommandDriver,
  CliCommandPlugin,
  CliCommandServer,
  CliCommandSetup,
  CliExtensionCommand,
  CliExtensionSubcommand,
  CliCommandSetupSubcommand,
} from 'appium/types';
import _ from 'lodash';
import logger from './logger';
import {
  processCapabilities,
  STANDARD_CAPS,
  errors,
  isW3cCaps,
} from '@appium/base-driver';
import {inspect as dump, type InspectOptions} from 'node:util';
import {node, fs} from '@appium/support';
import path from 'node:path';
import {SERVER_SUBCOMMAND, DRIVER_TYPE, PLUGIN_TYPE, SETUP_SUBCOMMAND} from './constants';
import os from 'node:os';

const W3C_APPIUM_PREFIX = 'appium';
const STANDARD_CAPS_LOWERCASE = new Set([...STANDARD_CAPS].map((cap) => cap.toLowerCase()));
export const V4_BROADCAST_IP = '0.0.0.0';
export const V6_BROADCAST_IP = '::';
export const npmPackage = fs.readPackageJsonFrom(__dirname);

/** If stdout is a TTY; used for tighter control over log output. */
const isStdoutTTY = process.stdout.isTTY;

/** Result of successfully parsing W3C capabilities for the inner driver. */
export interface ParsedDriverCaps<C extends Constraints = BaseDriverCapConstraints> {
  desiredCaps: Capabilities<C>;
  processedW3CCapabilities: W3CCapabilities<C>;
}

/** Result when capability parsing fails or caps are invalid. */
export interface InvalidCaps<C extends Constraints = BaseDriverCapConstraints> {
  error: Error;
  desiredCaps?: Capabilities<C>;
  processedW3CCapabilities?: W3CCapabilities<C>;
}

/**
 * Creates an error when a session receives non-W3C capabilities.
 */
export function makeNonW3cCapsError(): Error {
  return new errors.SessionNotCreatedError(
    'Session capabilities format must comply to the W3C standard. Make sure your client is up to date. ' +
      'See https://www.w3.org/TR/webdriver/#new-session for more details.'
  );
}

/**
 * Logs a value to the console using the info logger (with util.inspect formatting).
 */
export const inspect = _.flow(
  _.partialRight(dump as (object: unknown, options: InspectOptions) => string, {
    colors: true,
    depth: null,
    compact: !isStdoutTTY,
  }),
  (...args: unknown[]) => {
    logger.info(...args);
  }
);

/**
 * Parses W3C capabilities for the inner driver and applies defaults.
 *
 * @returns Parsed caps or an invalid result with an error.
 */
export function parseCapsForInnerDriver<C extends Constraints = BaseDriverCapConstraints>(
  w3cCapabilities: W3CCapabilities<C>,
  constraints: C = {} as C,
  defaultCapabilities: NSCapabilities<C> = {}
): ParsedDriverCaps<C> | InvalidCaps<C> {
  if (!isW3cCaps(w3cCapabilities)) {
    return {error: makeNonW3cCapsError()};
  }

  let desiredCaps: Capabilities<C> = {} as Capabilities<C>;
  // eslint-disable-next-line prefer-const -- assigned in success path after try
  let processedW3CCapabilities: W3CCapabilities<C> | undefined;

  w3cCapabilities = _.cloneDeep(w3cCapabilities);
  defaultCapabilities = _.cloneDeep(defaultCapabilities);

  if (!_.isEmpty(defaultCapabilities)) {
    for (const [defaultCapKey, defaultCapValue] of _.toPairs(defaultCapabilities)) {
      let isCapAlreadySet = false;
      for (const firstMatchEntry of w3cCapabilities.firstMatch ?? []) {
        if (
          _.isPlainObject(firstMatchEntry) &&
          _.has(removeAppiumPrefixes(firstMatchEntry as NSCapabilities<C>), removeAppiumPrefix(defaultCapKey))
        ) {
          isCapAlreadySet = true;
          break;
        }
      }
      isCapAlreadySet =
        isCapAlreadySet ||
        (_.isPlainObject(w3cCapabilities.alwaysMatch) &&
          _.has(
            removeAppiumPrefixes(w3cCapabilities.alwaysMatch),
            removeAppiumPrefix(defaultCapKey)
          ));
      if (isCapAlreadySet) {
        continue;
      }

      if (_.isEmpty(w3cCapabilities.firstMatch)) {
        w3cCapabilities.firstMatch = [{[defaultCapKey]: defaultCapValue}] as W3CCapabilities<C>['firstMatch'];
      } else {
        (w3cCapabilities.firstMatch[0] as Record<string, unknown>)[defaultCapKey] = defaultCapValue;
      }
    }
  }

  try {
    desiredCaps = processCapabilities(w3cCapabilities, constraints, true) as Capabilities<C>;
  } catch (error) {
    logger.info(`Could not parse W3C capabilities: ${(error as Error).message}`);
    return {
      desiredCaps,
      processedW3CCapabilities,
      error: error as Error,
    };
  }

  processedW3CCapabilities = {
    alwaysMatch: {...insertAppiumPrefixes(desiredCaps)},
    firstMatch: [{}],
  } as W3CCapabilities<C>;

  return {
    desiredCaps,
    processedW3CCapabilities,
  };
}

/**
 * Prefixes capability keys with `appium:` where appropriate.
 */
export function insertAppiumPrefixes<C extends Constraints = BaseDriverCapConstraints>(
  caps: Capabilities<C>
): NSCapabilities<C> {
  return _.mapKeys(caps, (_, key) =>
    STANDARD_CAPS_LOWERCASE.has(key.toLowerCase()) || key.includes(':')
      ? key
      : `${W3C_APPIUM_PREFIX}:${key}`
  ) as NSCapabilities<C>;
}

/**
 * Removes `appium:` prefix from capability keys.
 */
export function removeAppiumPrefixes<C extends Constraints = BaseDriverCapConstraints>(
  caps: NSCapabilities<C>
): Capabilities<C> {
  return _.mapKeys(caps, (_, key) => removeAppiumPrefix(key)) as Capabilities<C>;
}

/**
 * Returns the root directory of the Appium module (memoized).
 *
 * @throws {Error} If the appium module root cannot be determined.
 */
export const getAppiumModuleRoot = _.memoize(function getAppiumModuleRoot(): string {
  const selfRoot = node.getModuleRootSync('appium', __filename);
  if (!selfRoot) {
    throw new Error('Cannot find the appium module root. This is likely a bug in Appium.');
  }
  return selfRoot;
});

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

interface NodeModuleWithInitPaths {
  Module: {_initPaths(): void};
}

/**
 * Pulls Appium settings from capabilities (mutates caps). Supports
 * `settings[key]: value` and `settings: { key: value }`.
 *
 * @returns Parsed settings object; empty if none found.
 */
export function pullSettings(caps: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!_.isPlainObject(caps) || _.isEmpty(caps)) {
    return {};
  }

  const result: Record<string, unknown> = {};
  const singleSettings: Record<string, unknown> = {};
  for (const [key, value] of _.toPairs(caps)) {
    let match: RegExpExecArray | null;
    if (/^(s|appium:s)ettings$/.test(key) && _.isPlainObject(value)) {
      Object.assign(result, value);
      delete caps[key];
    } else if ((match = /^(s|appium:s)ettings\[(\S+)\]$/.exec(key))) {
      singleSettings[match[2]] = value;
      delete caps[key];
    }
  }
  if (!_.isEmpty(singleSettings)) {
    Object.assign(result, singleSettings);
  }
  return result;
}

type AnyArgs = Args<CliCommand, CliExtensionSubcommand | CliCommandSetupSubcommand | void>;

/**
 * Type guard: args are for the server command.
 */
export function isServerCommandArgs(args: AnyArgs): args is Args<CliCommandServer, void> {
  return args.subcommand === SERVER_SUBCOMMAND;
}

/**
 * Type guard: args are for the setup command.
 */
export function isSetupCommandArgs(
  args: AnyArgs
): args is Args<CliCommandSetup, CliCommandSetupSubcommand> {
  return args.subcommand === SETUP_SUBCOMMAND;
}

/**
 * Type guard: args are for an extension command (driver or plugin).
 */
export function isExtensionCommandArgs(
  args: AnyArgs
): args is Args<CliExtensionCommand, CliExtensionSubcommand> {
  return args.subcommand === DRIVER_TYPE || args.subcommand === PLUGIN_TYPE;
}

/**
 * Type guard: args are for a driver extension command.
 */
export function isDriverCommandArgs(
  args: AnyArgs
): args is Args<CliCommandDriver, CliExtensionSubcommand> {
  return args.subcommand === DRIVER_TYPE;
}

/**
 * Type guard: args are for a plugin extension command.
 */
export function isPluginCommandArgs(
  args: AnyArgs
): args is Args<CliCommandPlugin, CliExtensionSubcommand> {
  return args.subcommand === PLUGIN_TYPE;
}

/**
 * Returns network interfaces for the given IP family.
 *
 * @param family - 4 for IPv4, 6 for IPv6, or null for all.
 */
export function fetchInterfaces(
  family: 4 | 6 | null = null
): os.NetworkInterfaceInfo[] {
  let familyValue: (4 | 6 | string)[] | null = null;
  if (family === 4) {
    familyValue = [4, 'IPv4'];
  } else if (family === 6) {
    familyValue = [6, 'IPv6'];
  }
  const ifaces = _.values(os.networkInterfaces()).filter(Boolean) as os.NetworkInterfaceInfo[][];
  return _.flatMap(ifaces).filter(
    (info) => !familyValue || familyValue.includes(info.family as 4 | 6 | string)
  );
}


/**
 * Adler-32 checksum (see https://github.com/SheetJS/js-adler32).
 */
export function adler32(str: string, seed: number | null = null): number {
  let a = 1,
    b = 0,
    M = 0,
    c = 0,
    d = 0;
  const L = str.length;
  if (typeof seed === 'number') {
    a = seed & 0xffff;
    b = seed >>> 16;
  }
  for (let i = 0; i < L;) {
    M = Math.min(L - i, 2918);
    while (M > 0) {
      c = str.charCodeAt(i++);
      if (c < 0x80) {
        a += c;
      } else if (c < 0x800) {
        a += 192 | ((c >> 6) & 31);
        b += a;
        --M;
        a += 128 | (c & 63);
      } else if (c >= 0xd800 && c < 0xe000) {
        c = (c & 1023) + 64;
        d = str.charCodeAt(i++) & 1023;
        a += 240 | ((c >> 8) & 7);
        b += a;
        --M;
        a += 128 | ((c >> 2) & 63);
        b += a;
        --M;
        a += 128 | ((d >> 6) & 15) | ((c & 3) << 4);
        b += a;
        --M;
        a += 128 | (d & 63);
      } else {
        a += 224 | ((c >> 12) & 15);
        b += a;
        --M;
        a += 128 | ((c >> 6) & 63);
        b += a;
        --M;
        a += 128 | (c & 63);
      }
      b += a;
      --M;
    }
    a = 15 * (a >>> 16) + (a & 65535);
    b = 15 * (b >>> 16) + (b & 65535);
  }
  return ((b % 65521) << 16) | (a % 65521);
}

/**
 * Returns true if the address is a broadcast IP (0.0.0.0 or ::).
 */
export function isBroadcastIp(address: string): boolean {
  return [V4_BROADCAST_IP, V6_BROADCAST_IP, `[${V6_BROADCAST_IP}]`].includes(address);
}

// #region private helpers

function removeAppiumPrefix(key: string): string {
  const prefix = `${W3C_APPIUM_PREFIX}:`;
  return _.startsWith(key, prefix) ? key.substring(prefix.length) : key;
}

// #endregion
