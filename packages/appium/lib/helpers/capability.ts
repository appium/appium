import { errors, isW3cCaps, processCapabilities, STANDARD_CAPS } from '@appium/base-driver';
import { util } from '@appium/support';
import type {
  BaseDriverCapConstraints,
  Capabilities,
  Constraints,
  NSCapabilities,
  W3CCapabilities,
} from '@appium/types';
import { log as logger } from '../logger';
import { mapKeys } from '../utils';

const W3C_APPIUM_PREFIX = 'appium';
const STANDARD_CAPS_LOWERCASE = new Set([...STANDARD_CAPS].map((cap) => cap.toLowerCase()));

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
    'Session capabilities format must comply to the W3C standard. Make sure your client is up to date. '
      + 'See https://www.w3.org/TR/webdriver/#new-session for more details.',
  );
}

/**
 * Parses W3C capabilities for the inner driver and applies defaults.
 *
 * @returns Parsed caps or an invalid result with an error.
 */
export function parseCapsForInnerDriver<C extends Constraints = BaseDriverCapConstraints>(
  w3cCapabilities: W3CCapabilities<C>,
  constraints: C = {} as C,
  defaultCapabilities: NSCapabilities<C> = {},
): ParsedDriverCaps<C> | InvalidCaps<C> {
  if (!isW3cCaps(w3cCapabilities)) {
    return { error: makeNonW3cCapsError() };
  }

  let desiredCaps: Capabilities<C> = {} as Capabilities<C>;
  // eslint-disable-next-line prefer-const -- assigned in success path after try
  let processedW3CCapabilities: W3CCapabilities<C> | undefined;

  w3cCapabilities = structuredClone(w3cCapabilities);
  defaultCapabilities = structuredClone(defaultCapabilities);

  if (!util.isEmpty(defaultCapabilities)) {
    for (const [defaultCapKey, defaultCapValue] of Object.entries(defaultCapabilities)) {
      let isCapAlreadySet = false;
      for (const firstMatchEntry of w3cCapabilities.firstMatch ?? []) {
        if (
          util.isPlainObject(firstMatchEntry)
          && hasOwnCapability(firstMatchEntry as Record<string, unknown>, defaultCapKey)
        ) {
          isCapAlreadySet = true;
          break;
        }
      }
      isCapAlreadySet = isCapAlreadySet
        || (util.isPlainObject(w3cCapabilities.alwaysMatch)
          && hasOwnCapability(w3cCapabilities.alwaysMatch as Record<string, unknown>, defaultCapKey));
      if (isCapAlreadySet) {
        continue;
      }

      if (util.isEmpty(w3cCapabilities.firstMatch)) {
        w3cCapabilities.firstMatch = [
          { [defaultCapKey]: defaultCapValue },
        ] as W3CCapabilities<C>['firstMatch'];
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
    alwaysMatch: { ...insertAppiumPrefixes(desiredCaps) },
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
  caps: Capabilities<C>,
): NSCapabilities<C> {
  return mapKeys(
    caps as Record<string, unknown>,
    (_, key) =>
      STANDARD_CAPS_LOWERCASE.has(String(key).toLowerCase()) || String(key).includes(':')
        ? String(key)
        : `${W3C_APPIUM_PREFIX}:${key}`,
  ) as NSCapabilities<C>;
}

/**
 * Removes `appium:` prefix from capability keys.
 */
export function removeAppiumPrefixes<C extends Constraints = BaseDriverCapConstraints>(
  caps: NSCapabilities<C>,
): Capabilities<C> {
  return mapKeys(caps as Record<string, unknown>, (_, key) => removeAppiumPrefix(String(key))) as Capabilities<C>;
}

/**
 * Pulls Appium settings from capabilities (mutates caps). Supports
 * `settings[key]: value` and `settings: { key: value }`.
 *
 * @returns Parsed settings object; empty if none found.
 */
export function pullSettings(
  caps: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!util.isPlainObject(caps) || util.isEmpty(caps)) {
    return {};
  }

  const result: Record<string, unknown> = {};
  const singleSettings: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(caps)) {
    let match: RegExpExecArray | null;
    if (/^(s|appium:s)ettings$/.test(key) && util.isPlainObject(value)) {
      Object.assign(result, value);
      delete caps[key];
    } else if ((match = /^(s|appium:s)ettings\[(\S+)\]$/.exec(key))) {
      singleSettings[match[2]] = value;
      delete caps[key];
    }
  }
  if (!util.isEmpty(singleSettings)) {
    Object.assign(result, singleSettings);
  }
  return result;
}

function removeAppiumPrefix(key: string): string {
  const prefix = `${W3C_APPIUM_PREFIX}:`;
  return key.startsWith(prefix) ? key.substring(prefix.length) : key;
}

/** True when `caps` has an own property matching `capKey` (with or without `appium:` prefix). */
function hasOwnCapability(caps: Record<string, unknown>, capKey: string): boolean {
  const targetKey = removeAppiumPrefix(capKey);
  return Object.keys(caps).some((key) => removeAppiumPrefix(key) === targetKey);
}
