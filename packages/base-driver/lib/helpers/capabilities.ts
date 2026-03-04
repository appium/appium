import type {Constraints, W3CCapabilities, Capabilities, AppiumLogger} from '@appium/types';
import _ from 'lodash';

/**
 * Determine whether the given argument is valid
 * W3C capabilities instance.
 */
export function isW3cCaps(caps: unknown): caps is W3CCapabilities<Constraints> {
  if (!_.isPlainObject(caps)) {
    return false;
  }

  const c = caps as Record<string, unknown>;
  const isFirstMatchValid = () =>
    _.isArray(c.firstMatch) &&
    !_.isEmpty(c.firstMatch) &&
    _.every(c.firstMatch, _.isPlainObject);
  const isAlwaysMatchValid = () => _.isPlainObject(c.alwaysMatch);
  if (_.has(c, 'firstMatch') && _.has(c, 'alwaysMatch')) {
    return isFirstMatchValid() && isAlwaysMatchValid();
  }
  if (_.has(c, 'firstMatch')) {
    return isFirstMatchValid();
  }
  if (_.has(c, 'alwaysMatch')) {
    return isAlwaysMatchValid();
  }
  return false;
}

/**
 * Normalize capability values according to constraints (e.g. string 'true' → boolean).
 */
export function fixCaps<C extends Constraints>(
  oldCaps: Record<string, unknown>,
  desiredCapConstraints: C,
  log: AppiumLogger
): Capabilities<C> {
  const caps = _.clone(oldCaps) as Record<string, unknown>;

  // boolean capabilities can be passed in as strings 'false' and 'true'
  // which we want to translate into boolean values
  const booleanCaps = _.keys(_.pickBy(desiredCapConstraints, (k) => k.isBoolean === true));
  for (const cap of booleanCaps) {
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
  const intCaps = _.keys(_.pickBy(desiredCapConstraints, (k) => k.isNumber === true));
  for (const cap of intCaps) {
    let value = oldCaps[cap];
    if (_.isString(value)) {
      value = value.trim();
      let newValue = parseInt(value as string, 10);
      if (value !== `${newValue}`) {
        newValue = parseFloat(value as string);
      }
      log.warn(
        `Capability '${cap}' changed from string ('${value}') to integer (${newValue}). ` +
        `This may cause unexpected behavior`
      );
      caps[cap] = newValue;
    }
  }

  return caps as Capabilities<C>;
}
