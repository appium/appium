/* eslint-disable no-console */
import {util} from '@appium/support';
import {getDefaultsForSchema, getAllArgSpecs} from '../schema/schema';
import type {Args} from 'appium/types';
import type {ReadConfigFileResult} from './config-file';
import {
  difference,
  negate,
  omitBy,
  overEvery,
  overSome,
  pickBy,
  setPath,
} from '../object-utils';

interface FlattenedArg {
  value: unknown;
  argSpec: {dest: string};
}

/**
 * Returns key/value pairs of server arguments that differ from schema defaults (flattened comparison).
 *
 * @param parsedArgs - Fully merged server args (CLI + config + defaults)
 */
export function getNonDefaultServerArgs(parsedArgs: Args): Args {
  /**
   * Flattens parsed args into a single level object for comparison with
   * flattened defaults across server args and extension args.
   */
  const flatten = (args: Args): Record<string, FlattenedArg> => {
    const argSpecs = getAllArgSpecs();
    const flattened = [...argSpecs.values()].reduce<Record<string, FlattenedArg>>(
      (acc, argSpec: {dest: string}) => {
        if (argSpec.dest in args) {
          acc[argSpec.dest] = {value: (args as Record<string, unknown>)[argSpec.dest], argSpec};
        }
        return acc;
      },
      {}
    );

    return flattened;
  };

  const args = flatten(parsedArgs);

  // hopefully these function names are descriptive enough
  const typesDiffer = (dest: string): boolean =>
    typeof args[dest].value !== typeof defaultsFromSchema[dest];

  const defaultValueIsArray = (dest: string): boolean => Array.isArray(defaultsFromSchema[dest]);

  const argsValueIsArray = (dest: string): boolean => Array.isArray(args[dest].value);

  const arraysDiffer = (dest: string): boolean =>
    difference(args[dest].value as unknown[], defaultsFromSchema[dest] as unknown[]).length > 0;

  const valuesDiffer = (dest: string): boolean => args[dest].value !== defaultsFromSchema[dest];

  const defaultIsDefined = (dest: string): boolean => defaultsFromSchema[dest] !== undefined;

  // note that `overEvery` is like an "AND", and `overSome` is like an "OR"
  const argValueNotArrayOrArraysDiffer = overSome(negate(argsValueIsArray), arraysDiffer);

  const defaultValueNotArrayAndValuesDiffer = overEvery(
    negate(defaultValueIsArray),
    valuesDiffer
  );

  /**
   * This used to be a hideous conditional, but it's broken up into a hideous function instead.
   * hopefully this makes things a little more understandable.
   * - checks if the default value is defined
   * - if so, and the default is not an array:
   *   - ensures the types are the same
   *   - ensures the values are equal
   * - if so, and the default is an array:
   *   - ensures the args value is an array
   *   - ensures the args values do not differ from the default values
   */
  const isNotDefault = overEvery(
    defaultIsDefined,
    overSome(
      typesDiffer,
      overEvery(defaultValueIsArray, argValueNotArrayOrArraysDiffer),
      defaultValueNotArrayAndValuesDiffer
    )
  );

  const defaultsFromSchema = getDefaultsForSchema(true) as Record<string, unknown>;

  const nonDefault = pickBy(args, (_v, key) => isNotDefault(String(key)));
  const result = {} as Args;
  for (const entry of Object.values(nonDefault)) {
    if (!entry) {
      continue;
    }
    const {value, argSpec} = entry;
    setPath(result as Record<string, unknown>, argSpec.dest, value);
  }
  return result;
}

/**
 * Prints a breakdown of configuration: defaults, config file, CLI/programmatic overrides, and final merged args.
 *
 * The actual shape of `nonDefaultPreConfigParsedArgs` and `defaults` does not matter for the purposes of this
 * function, but it's intended to be called with values of type {@link ParsedArgs} and
 * `DefaultValues<true>`, respectively.
 *
 * @param nonDefaultPreConfigParsedArgs - CLI-only (or programmatic) args that differ from defaults
 * @param configResult - Result of {@link readConfigFile}
 * @param defaults - Schema default values
 * @param parsedArgs - Final merged configuration
 */
export function showConfig(
  nonDefaultPreConfigParsedArgs: Partial<Args>,
  configResult: ReadConfigFileResult,
  defaults: Partial<Args>,
  parsedArgs: Args
): void {
  console.log('Appium Configuration\n');
  console.log('from defaults:\n');
  console.dir(compactConfig(defaults));
  if (configResult.config) {
    console.log(`\nfrom config file at ${configResult.filepath}:\n`);
    console.dir(compactConfig(configResult.config));
  } else {
    console.log(`\n(no configuration file loaded)`);
  }
  const compactedNonDefaultPreConfigArgs = compactConfig(nonDefaultPreConfigParsedArgs);
  if (util.isEmpty(compactedNonDefaultPreConfigArgs)) {
    console.log(`\n(no CLI parameters provided)`);
  } else {
    console.log('\nvia CLI or function call:\n');
    console.dir(compactedNonDefaultPreConfigArgs);
  }
  console.log('\nfinal configuration:\n');
  console.dir(compactConfig(parsedArgs));
}

/**
 * Compacts an object for {@link showConfig}:
 * 1. Removes `subcommand` key/value
 * 2. Removes `undefined` values
 * 3. Removes empty objects (but not `false` values)
 * Does not operate recursively.
 */
function compactConfig<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return omitBy(
    obj,
    (value, key) =>
      key === 'subcommand' ||
      value === undefined ||
      (value !== null && typeof value === 'object' && util.isEmpty(value))
  );
}
