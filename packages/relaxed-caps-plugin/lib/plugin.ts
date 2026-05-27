import {BasePlugin} from 'appium/plugin';
import {isStandardCap} from 'appium/driver';
import type {CapsRecord, W3CCapsLike} from './types';

const VENDOR_PREFIX = 'appium';
const HAS_VENDOR_PREFIX_RE = /^.+:/;

export class RelaxedCapsPlugin extends BasePlugin {
  async createSession(
    next: () => Promise<unknown>,
    driver: {createSession: (...args: unknown[]) => Promise<unknown>},
    caps1: W3CCapsLike | null,
    caps2?: W3CCapsLike | null,
    caps3?: W3CCapsLike | null,
    ...restArgs: unknown[]
  ): Promise<unknown> {
    const patchedCaps = [caps1, caps2, caps3]
      .map((c) => isPlainObject(c) ? this.fixCapsIfW3C(c) : c);
    return await driver.createSession(...patchedCaps, ...restArgs);
  }

  private fixCapsIfW3C<T>(caps: T): T {
    if (!this.isW3cCaps(caps)) {
      return caps;
    }

    const w3c = structuredClone(caps) as W3CCapsLike;
    if (Array.isArray(w3c.firstMatch)) {
      w3c.firstMatch = w3c.firstMatch.map((c) =>
        this.addVendorPrefix(c as CapsRecord)
      );
    }
    if (isPlainObject(w3c.alwaysMatch)) {
      w3c.alwaysMatch = this.addVendorPrefix(w3c.alwaysMatch as CapsRecord);
    }
    return w3c as T;
  }

  private isW3cCaps(caps: unknown): caps is W3CCapsLike {
    if (!isPlainObject(caps)) {
      return false;
    }

    const isFirstMatchValid = () => {
      const firstMatch = (caps as W3CCapsLike).firstMatch;
      return Array.isArray(firstMatch) && firstMatch.length > 0 && firstMatch.every(isPlainObject);
    };
    const isAlwaysMatchValid = () =>
      isPlainObject((caps as W3CCapsLike).alwaysMatch);
    if (Object.hasOwn(caps, 'firstMatch') && Object.hasOwn(caps, 'alwaysMatch')) {
      return isFirstMatchValid() && isAlwaysMatchValid();
    }
    if (Object.hasOwn(caps, 'firstMatch')) {
      return isFirstMatchValid();
    }
    if (Object.hasOwn(caps, 'alwaysMatch')) {
      return isAlwaysMatchValid();
    }
    return false;
  }

  private addVendorPrefix(caps: CapsRecord): CapsRecord {
    const newCaps: CapsRecord = {};

    if (!isPlainObject(caps)) {
      return caps;
    }

    const adjustedKeys: string[] = [];
    for (const key of Object.keys(caps)) {
      if (isStandardCap(key) || HAS_VENDOR_PREFIX_RE.test(key)) {
        newCaps[key] = caps[key];
      } else {
        newCaps[`${VENDOR_PREFIX}:${key}`] = caps[key];
        adjustedKeys.push(key);
      }
    }
    if (adjustedKeys.length) {
      this.log.info(
        `Adjusted keys to conform to capability prefix requirements: ` +
          JSON.stringify(adjustedKeys)
      );
    }
    return newCaps;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}
