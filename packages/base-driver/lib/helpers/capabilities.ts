import {util} from '@appium/support';
import type {AppiumLogger, Capabilities, Constraints, W3CCapabilities} from '@appium/types';

/**
 * Determine whether the given argument is valid
 * W3C capabilities instance.
 */
export function isW3cCaps(caps: unknown): caps is W3CCapabilities<Constraints> {
  if (!util.isPlainObject(caps)) {
    return false;
  }

  const c = caps as Record<string, unknown>;
  const isFirstMatchValid = () =>
    Array.isArray(c.firstMatch) &&
    !util.isEmpty(c.firstMatch) &&
    c.firstMatch.every((item) => util.isPlainObject(item));
  const isAlwaysMatchValid = () => util.isPlainObject(c.alwaysMatch);
  if (Object.hasOwn(c, 'firstMatch') && Object.hasOwn(c, 'alwaysMatch')) {
    return isFirstMatchValid() && isAlwaysMatchValid();
  }
  if (Object.hasOwn(c, 'firstMatch')) {
    return isFirstMatchValid();
  }
  if (Object.hasOwn(c, 'alwaysMatch')) {
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
  log: AppiumLogger,
): Capabilities<C> {
  const caps = {...oldCaps} as Record<string, unknown>;

  const logCastWarning = (prefix: string) => log.warn(`${prefix}. This may cause unexpected behavior`);

  // boolean capabilities can be passed in as strings 'false' and 'true'
  // which we want to translate into boolean values
  const booleanCaps = Object.keys(desiredCapConstraints).filter(
    (key) => desiredCapConstraints[key as keyof C]?.isBoolean === true,
  );
  for (const cap of booleanCaps) {
    const value = oldCaps[cap];
    if (typeof value !== 'string') {
      continue;
    }

    if (!['true', 'false'].includes(value.toLowerCase())) {
      logCastWarning(`String capability '${cap}' ('${value}') cannot be converted to a boolean`);
      continue;
    }

    logCastWarning(`Capability '${cap}' changed from string '${value}' to boolean`);
    caps[cap] = value.toLowerCase() === 'true';
  }

  // int capabilities are often sent in as strings by frameworks
  const intCaps = Object.keys(desiredCapConstraints).filter(
    (key) => desiredCapConstraints[key as keyof C]?.isNumber === true,
  );
  for (const cap of intCaps) {
    const value = oldCaps[cap];
    if (typeof value !== 'string') {
      continue;
    }

    const intValue = parseInt(value as string, 10);
    const floatValue = parseFloat(value as string);
    const newValue = floatValue !== intValue ? floatValue : intValue;

    if (Number.isNaN(newValue)) {
      logCastWarning(`String capability '${cap}' ('${value}') cannot be converted to a number`);
      continue;
    }

    logCastWarning(`Capability '${cap}' changed from string '${value}' to number ${newValue}`);
    caps[cap] = newValue;
  }

  return caps as Capabilities<C>;
}
