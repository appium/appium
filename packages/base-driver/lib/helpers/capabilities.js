// @ts-check

import _ from 'lodash';

function isW3cCaps(caps) {
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

/**
 *
 * @template {Constraints} C
 * @param {any} oldCaps
 * @param {C} desiredCapConstraints
 * @param {AppiumLogger} log
 * @returns {Capabilities<C>}
 */
function fixCaps(oldCaps, desiredCapConstraints, log) {
  let caps = _.clone(oldCaps);

  // boolean capabilities can be passed in as strings 'false' and 'true'
  // which we want to translate into boolean values
  let booleanCaps = _.keys(_.pickBy(desiredCapConstraints, (k) => k.isBoolean === true));
  for (let cap of booleanCaps) {
    let value = oldCaps[cap];
    if (_.isString(value)) {
      value = value.toLowerCase();
      if (value === 'true' || value === 'false') {
        log.warn(
          `Capability '${cap}' changed from string to boolean. This may cause unexpected behavior`
        );
        caps[cap] = value === 'true';
      }
    }
  }

  // int capabilities are often sent in as strings by frameworks
  let intCaps = /** @type {import('type-fest').StringKeyOf<typeof caps>[]} */ (
    _.keys(_.pickBy(desiredCapConstraints, (k) => k.isNumber === true))
  );
  for (let cap of intCaps) {
    let value = oldCaps[cap];
    if (_.isString(value)) {
      value = value.trim();
      let newValue = parseInt(value, 10);
      if (value !== `${newValue}`) {
        newValue = parseFloat(value);
      }
      log.warn(
        `Capability '${cap}' changed from string ('${value}') to integer (${newValue}). This may cause unexpected behavior`
      );
      caps[cap] = newValue;
    }
  }

  return caps;
}

export {isW3cCaps, fixCaps};

/**
 * @typedef {import('@appium/types').Constraints} Constraints
 * @typedef {import('@appium/types').AppiumLogger} AppiumLogger
 * @typedef {import('@appium/types').StringRecord} StringRecord
 * @typedef {import('@appium/types').BaseDriverCapConstraints} BaseDriverCapConstraints
 */

/**
 * @template {Constraints} C
 * @typedef {import('@appium/types').Capabilities<C>} Capabilities
 */
