/* eslint-disable no-console */
import _ from 'lodash';
import {getDefaultsForSchema, getAllArgSpecs} from '../schema/schema';
import type {Args} from 'appium/types';
import type {ReadConfigFileResult} from './config-file';

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
    const flattened = _.reduce(
      [...argSpecs.values()],
      (acc: Record<string, FlattenedArg>, argSpec: {dest: string}) => {
        if (_.has(args, argSpec.dest)) {
          acc[argSpec.dest] = {value: _.get(args, argSpec.dest), argSpec};
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

  const defaultValueIsArray = (dest: string): boolean => _.isArray(defaultsFromSchema[dest]);

  const argsValueIsArray = (dest: string): boolean => _.isArray(args[dest].value);

  const arraysDiffer = (dest: string): boolean =>
    _.gt(_.size(_.difference(args[dest].value as any[], defaultsFromSchema[dest] as any[])), 0);

  const valuesDiffer = (dest: string): boolean => args[dest].value !== defaultsFromSchema[dest];

  const defaultIsDefined = (dest: string): boolean => !_.isUndefined(defaultsFromSchema[dest]);

  // note that `_.overEvery` is like an "AND", and `_.overSome` is like an "OR"
  const argValueNotArrayOrArraysDiffer = _.overSome([_.negate(argsValueIsArray), arraysDiffer]);

  const defaultValueNotArrayAndValuesDiffer = _.overEvery([
    _.negate(defaultValueIsArray),
    valuesDiffer,
  ]);

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
  const isNotDefault = _.overEvery([
    defaultIsDefined,
    _.overSome([
      typesDiffer,
      _.overEvery([defaultValueIsArray, argValueNotArrayOrArraysDiffer]),
      defaultValueNotArrayAndValuesDiffer,
    ]),
  ]);

  const defaultsFromSchema = getDefaultsForSchema(true) as Record<string, unknown>;

  return _.reduce(
    _.pickBy(args, (_v, key) => isNotDefault(key)),
    // explodes the flattened object back into nested one
    (acc: Args, {value, argSpec}: FlattenedArg) => _.set(acc, argSpec.dest, value),
    {} as Args
  );
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
  if (_.isEmpty(compactedNonDefaultPreConfigArgs)) {
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
const compactConfig = _.partial(
  _.omitBy,
  _,
  (value: unknown, key: string) =>
    key === 'subcommand' || _.isUndefined(value) || (_.isObject(value) && _.isEmpty(value))
);
