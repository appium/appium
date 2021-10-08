// @ts-check

import _ from 'lodash';
import {flattenSchema, getFormatter} from '../schema';
import {ArgumentTypeError} from 'argparse';

/**
 * This module concerns functions which convert schema definitions to
 * `argparse`-compatible data structures, for deriving CLI arguments from a
 * schema.
 */

/**
 * Given an CLI arg for an extension, parse it into parts.
 * @example
 * const arg = '--driver-foo-bar-baz';
 * const matches = arg.match(CLI_ARG_PARSER_REGEXP);
 * matches.groups; // {extensionName: 'foo', extensionType: 'driver', argName: 'bar-baz'}
 */
const CLI_ARG_PARSER_REGEXP = /^(?<extensionType>.+?)-(?<extensionName>.+?)-(?<argName>.+)$/;

/**
 * Options with alias lengths less than this will be considered "short" flags.
 */
const SHORT_ARG_CUTOFF = 3;

/**
 * Namespace for {@link ArgValidator}s.
 *
 * These functions perform validation on arguments. Arguments and validators are
 * derived from the schema.  In some cases, we can simply use what `ajv`
 * provides, but otherwise we will need to implement our own validators.
 *
 * Unfortunately, re-use of Ajv to validate the arguments is painful, because of
 * differences in structure and naming (e.g., kebab-case for args and schema vs
 * camelCase for object keys).  Further, during validation, there's an
 * assumption that we're working with a _file_ (e.g., a JSON document) instead
 * of just a JS object, which has implications for how errors are displayed.
 * @type {Record<string,ArgValidator<unknown,unknown>>}
 */
const argValidators = {
  /**
   * Asserts a `number` is greater than or equal to a given minimum.
   * @type {ArgValidator<number,number>}
   */
  minimum: (min) => (value) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= min) {
      return num;
    }
    throw new ArgumentTypeError(
      `Value must be a number greater than or equal to ${min}; received ${
        isNaN(num) ? value : num
      }`,
    );
  },
  /**
   * Asserts a `number` is less than or equal to a given maximum.
   * @type {ArgValidator<number,number>}
   */
  maximum: (max) => (value) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num <= max) {
      return num;
    }
    throw new ArgumentTypeError(
      `Value must be a number greater than or equal to ${max}; received ${
        isNaN(num) ? value : num
      }`,
    );
  },
  /**
   * Asserts a `string` or `number` matches a particular Ajv formatter (as provided by `ajv-formats`).
   *
   * `format` is the unique formatter name, which is a key in the `formats` prop of an `Ajv` instance.
   * @see https://npmjs.im/ajv-formats
   * @type {ArgValidator<string,number|string>}
   */
  formatter: (format) => {
    let formatter = getFormatter(format);
    if (!formatter) {
      throw new ReferenceError(
        `Unknown formatter "${format}" encountered in schema`,
      );
    }

    /**
     * This is the _actual_ validation function
     * @type {(value: any) => boolean}
     */
    let subFormatter;
    // in this case, we have a `FormatDefinition` object which contains a `validate` function.
    if (
      !(formatter instanceof RegExp) &&
      typeof formatter === 'object' &&
      typeof formatter.validate === 'function'
    ) {
      formatter = formatter.validate;
    }
    if (formatter instanceof RegExp) {
      subFormatter = (value) => /** @type {RegExp} */ (formatter).test(value);
    } else if (typeof formatter === 'function') {
      subFormatter = formatter;
    } else {
      // things like "async formatters" may end up here. currently not supported afaik
      throw new ReferenceError(
        `Formatter "${format}" has unknown type/shape; look it up in \`ajv-formats\` and implement a handler`,
      );
    }

    return (value) => {
      if (subFormatter(value)) {
        return value;
      }
      throw new ArgumentTypeError(
        `Value must be a valid ${format}; received ${value}`,
      );
    };
  },
};

/**
 * A function which given some `ComparisonValue` and optionally `info` (for use
 * in error messages) and returns a validation function that returns the
 * validated value (`ArgTYpe`) or throws if the value is invalid.
 *
 * `ComparisonValue` can be anything, but that thing must be used somehow
 * validate the `value`.  In the case of e.g., `maxmimum`, `ComparisonValue` is
 * a number. In the case that we're e.g., working with a formatter,
 * `ComparisonValue` is a string which is used to look up the formatter in
 * `ajv.formats`.
 *
 * A "formatter" in JSON schema parlance is sort of a "sub-validator".  So,
 * e.g., the `type` must be a `string`, but that `string` also must match a
 * `RegExp`.
 * @template ComparisonValue,ArgType
 * @typedef {(cmpValue: ComparisonValue, info?: string) => (value: any) => ArgType} ArgValidator<ComparisonValue,ArgType>
 */

/**
 * Convert an alias (`foo`) to a flag (`--foo`) or a short flag (`-f`).
 * @param {string} alias - the alias to convert to a flag
 * @returns {string} the flag
 */
function aliasToFlag (alias) {
  const isShort = alias.length < SHORT_ARG_CUTOFF;
  return isShort ? `-${alias}` : `--${_.kebabCase(alias)}`;
}

/**
 * Given `alias` and optionally `appiumCliDest`, return the key where the arg parser should store the value.
 *
 * Extension prefixes are passed through, but everything else is camelCased.
 * @param {string} alias - argument alias
 * @param {Partial<{prefix: string, appiumCliDest: string}>} [opts] -`appiumCliDest` schema value if present
 * @returns {string}
 */
function aliasToDest (alias, {appiumCliDest} = {}) {
  const {extensionName, extensionType, argName} = parseArgName(alias);
  const baseArgName = _.camelCase(appiumCliDest ?? argName);
  return extensionName && extensionType
    ? `${extensionType}-${extensionName}-${baseArgName}`
    : baseArgName;
}

/**
 * Given option `name`, a JSON schema `subSchema`, and options, return an argument definition
 * as understood by `argparse`.
 * @param {string} name - Option name
 * @param {import('ajv').SchemaObject} subSchema - JSON schema for the option
 * @param {SubSchemaToArgDefOptions} [opts] - Options
 * @returns {import('./args').ArgumentDefinition} Tuple of flag and options
 */
function subSchemaToArgDef (name, subSchema, opts = {}) {
  const {overrides = {}} = opts;
  const aliases = [
    aliasToFlag(name),
    .../** @type {string[]} */ (subSchema.appiumCliAliases ?? []).map(aliasToFlag),
  ];

  let argOpts = {
    required: false,
    dest: aliasToDest(name, {appiumCliDest: subSchema.appiumCliDest}),
    help: subSchema.description,
  };

  // handle special cases for various types
  if (!_.isArray(subSchema.type)) {
    switch (subSchema.type) {
      case 'boolean': {
        argOpts.action = 'store_true';
        break;
      }

      case 'number':
      // fallthrough
      case 'integer': {
        const {type, minimum, maximum, format} = subSchema;
        const validators = [];
        if (_.isFinite(minimum)) {
          validators.push(argValidators.minimum(minimum));
        }
        if (_.isFinite(maximum)) {
          validators.push(argValidators.maximum(maximum));
        }
        if (format) {
          validators.push(argValidators.formatter(format));
        }
        // json schema has number types `number` and `integer`. argparse has `float` and `int`,
        // respectively.  if we have any specialness (max, min, formats), the type becomes a validator
        // function.  otherwise, `number` becomes `float` and `integer` becomes `int`.
        // `_.flow()` creates a "chain" of funcs, each passing the output to the next.
        if (validators.length) {
          argOpts.type = _.flow(validators);
        } else {
          argOpts.type = type === 'number' ? 'float' : 'int';
        }
        break;
      }

      case 'string': {
        // json schema `string` becomes `str`, but I think that's the default anyway
        argOpts.type = subSchema.format
          ? argValidators.formatter(subSchema.format)
          : 'str';
        break;
      }
    }
  } else {
    // if we have a prop which can be of multiple types AND we do not override it with
    // a custom type via `overrides`, OR an extension does this, we should implement this
    // case.
  }

  // convert JSON schema `enum` to `choices`. `enum` can contain any JSON type, but `argparse`
  // is limited to a single type per arg (I think).  so let's make everything a string.
  // we should probably document this somewhere.
  if (_.isArray(subSchema.enum) && !_.isEmpty(subSchema.enum)) {
    argOpts.choices = subSchema.enum.map(String);
  }

  // overrides override anything we computed here.  usually this involves "custom types",
  // which are really just transform functions.
  argOpts = _.merge(
    argOpts,
    /** should the override keys correspond to the prop name or the prop dest?
     * the prop dest is computed by {@link aliasToDest}.
     */
    overrides[name] ?? (argOpts.dest && overrides[argOpts.dest]) ?? {},
  );

  return [aliases, argOpts];
}

/**
 * Converts the current JSON schema plus some metadata into `argparse` arguments.
 *
 * @param {ToParserArgsOptions} opts - Options
 * @throws If schema has not been added to ajv (via `finalize()`)
 * @returns {import('./args').ArgumentDefinition[]} An array of tuples of aliases and `argparse` arguments; empty if no schema found
 */
export function toParserArgs (opts = {}) {
  const flattened = flattenSchema();
  return _.map(flattened, (value, key) => subSchemaToArgDef(key, value, opts));
}

/**
 * Given an arg/dest name like `<extension>-<name>-<arg>` (provided by
 * {@link CLI_ARG_PARSER_REGEXP}) then return the parts.
 * @param {string} aliasOrDest - Alias to parse
 * @returns {{extensionType?: string, extensionName?: string, argName: string}}
 */
export function parseArgName (aliasOrDest) {
  const matches = aliasOrDest.match(
    CLI_ARG_PARSER_REGEXP
  );
  const groups = matches?.groups;
  return groups?.argName
    ? {
      argName: groups.argName,
      extensionName: groups.extensionName,
      extensionType: groups.extensionType,
    }
    : {argName: aliasOrDest};
}

/**
 * CLI-specific option subset for {@link ToParserArgsOptions}
 * @typedef {Object} ToParserArgsOptsCli
 * @property {import('../schema').ExtData} [extData] - Extension data (from YAML)
 * @property {'driver'|'plugin'} [type] - Extension type
 */

/**
 * Options for {@link toParserArgs}
 * @typedef {SubSchemaToArgDefOptions} ToParserArgsOptions
 */

/**
 * Options for {@link subSchemaToArgDef}.
 * @typedef {Object} SubSchemaToArgDefOptions
 * @property {string} [prefix] - The prefix to use for the flag, if any
 * @property {{[key: string]: import('argparse').ArgumentOptions}} [overrides] - An object of key/value pairs to override the default values
 */
