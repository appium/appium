import type {Class as _Class} from 'type-fest';

/**
 * Utility type for a object with string-only props
 */
export type StringRecord<T = any> = Record<string, T>;

/**
 * Wraps {@linkcode _Class `type-fest`'s `Class`} to include static members.
 */
export type Class<
  Proto,
  StaticMembers extends object = object,
  Args extends unknown[] = any[]
> = _Class<Proto, Args> & StaticMembers;

/**
 * The string referring to a "driver"-type extension
 */
export type DriverType = 'driver';

/**
 * The string referring to a "plugin"-type extension
 *
 */
export type PluginType = 'plugin';

/**
 * The strings referring to all extension types.
 */
export type ExtensionType = DriverType | PluginType;
