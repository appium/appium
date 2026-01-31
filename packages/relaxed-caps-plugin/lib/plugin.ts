import _ from 'lodash';
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
    const patchedCaps = [caps1, caps2, caps3].map((c) =>
      c == null ? c : this.fixCapsIfW3C(c)
    );
    return await driver.createSession(...patchedCaps, ...restArgs);
  }

  private fixCapsIfW3C<T extends W3CCapsLike | Record<string, unknown>>(caps: T): T {
    const result = caps;
    if (result && this.isW3cCaps(result)) {
      const w3c = result as W3CCapsLike;
      if (_.isArray(w3c.firstMatch)) {
        w3c.firstMatch = w3c.firstMatch.map((c) =>
          this.addVendorPrefix(c as CapsRecord)
        );
      }
      if (_.isPlainObject(w3c.alwaysMatch)) {
        w3c.alwaysMatch = this.addVendorPrefix(w3c.alwaysMatch as CapsRecord);
      }
    }
    return result;
  }

  private isW3cCaps(caps: unknown): caps is W3CCapsLike {
    if (!_.isPlainObject(caps)) {
      return false;
    }

    const isFirstMatchValid = () =>
      _.isArray((caps as W3CCapsLike).firstMatch) &&
      !_.isEmpty((caps as W3CCapsLike).firstMatch) &&
      _.every((caps as W3CCapsLike).firstMatch, _.isPlainObject);
    const isAlwaysMatchValid = () =>
      _.isPlainObject((caps as W3CCapsLike).alwaysMatch);
    if (_.has(caps, 'firstMatch') && _.has(caps, 'alwaysMatch')) {
      return isFirstMatchValid() && isAlwaysMatchValid();
    }
    if (_.has(caps, 'firstMatch')) {
      return isFirstMatchValid();
    }
    if (_.has(caps, 'alwaysMatch')) {
      return isAlwaysMatchValid();
    }
    return false;
  }

  private addVendorPrefix(caps: CapsRecord): CapsRecord {
    const newCaps: CapsRecord = {};

    if (!_.isPlainObject(caps)) {
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
