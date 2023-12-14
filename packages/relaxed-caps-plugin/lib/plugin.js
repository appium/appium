import _ from 'lodash';
import { BasePlugin } from 'appium/plugin';

const STANDARD_CAPS = [
  'browserName',
  'browserVersion',
  'platformName',
  'acceptInsecureCerts',
  'pageLoadStrategy',
  'proxy',
  'setWindowRect',
  'timeouts',
  'unhandledPromptBehavior',
];

const VENDOR_PREFIX = 'appium';
const HAS_VENDOR_PREFIX_RE = /^.+:/;

export class RelaxedCapsPlugin extends BasePlugin {

  /**
   * @param {any} caps
   * @returns {boolean}
   */
  isW3cCaps(caps) {
    if (!_.isPlainObject(caps)) {
      return false;
    }

    const isFirstMatchValid = () =>
      _.isArray(caps.firstMatch) &&
      !_.isEmpty(caps.firstMatch) &&
      _.every(caps.firstMatch, _.isPlainObject);
    const isAlwaysMatchValid = () => _.isPlainObject(caps.alwaysMatch);
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

  addVendorPrefix(caps) {
    const newCaps = {};

    // if this doesn't look like a caps object just return it
    if (!_.isPlainObject(caps)) {
      return caps;
    }

    /** @type {string[]} */
    const adjustedKeys = [];
    for (const key of Object.keys(caps)) {
      if (STANDARD_CAPS.includes(key) || HAS_VENDOR_PREFIX_RE.test(key)) {
        // if the cap is a standard one, or if it already has a vendor prefix, leave it unchanged
        newCaps[key] = caps[key];
      } else {
        // otherwise add the appium vendor prefix
        newCaps[`${VENDOR_PREFIX}:${key}`] = caps[key];
        adjustedKeys.push(key);
      }
    }
    if (adjustedKeys.length) {
      this.logger.info(
        `Adjusted keys to conform to capability prefix requirements: ` +
          JSON.stringify(adjustedKeys)
      );
    }
    return newCaps;
  }

  fixCapsIfW3C(caps) {
    const result = caps;
    if (result && this.isW3cCaps(result)) {
      if (_.isArray(result.firstMatch)) {
        result.firstMatch = caps.firstMatch.map(this.addVendorPrefix.bind(this));
      }
      if (_.isPlainObject(caps.alwaysMatch)) {
        result.alwaysMatch = this.addVendorPrefix(caps.alwaysMatch);
      }
    };
    return result;
  }

  /**
   * @param {Function} next
   * @param {import('appium/driver').BaseDriver} driver
   * @param {import('@appium/types').W3CDriverCaps} caps1
   * @param {import('@appium/types').W3CDriverCaps} [caps2]
   * @param {import('@appium/types').W3CDriverCaps} [caps3]
   * @param {any[]} restArgs
   * @returns
   */
  async createSession(next, driver, caps1, caps2, caps3, ...restArgs) {
    const patchedCaps = [caps1, caps2, caps3].map(this.fixCapsIfW3C.bind(this));
    // @ts-ignore We know what we are doing
    return await driver.createSession(...[...patchedCaps, ...restArgs]);
  }
}
