// @ts-check

// This module concerns functions which convert schema definitions to `argparse`-compatible data structures,
// for deriving CLI arguments from a schema.

import _ from 'lodash';
import { flattenSchema, parseArgName} from '../schema';

/**
 * Options with alias lengths less than this will be considered "short" flags.
 */
const SHORT_ARG_CUTOFF = 3;

/**
 * Convert an alias (`foo`) to a flag (`--foo`) or a short flag (`-f`).
 * @param {string} alias - the alias to convert to a flag
 * @returns {string} the flag
 */
function aliasToFlag (alias) {
  const isShort = alias.length < SHORT_ARG_CUTOFF;
  return !isShort ? `--${_.kebabCase(alias)}` : `-${alias}`;
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
  if (extensionName && extensionType) {
    return `${extensionType}-${extensionName}-${_.camelCase(appiumCliDest ?? argName)}`;
  }
  return _.camelCase(appiumCliDest ?? argName);
}

/**
 * Given option `name`, a JSON schema `subSchema`, and options, return an argument definition
 * as understood by `argparse`.
 * @param {string} name - Option name
 * @param {import('ajv').SchemaObject} subSchema - JSON schema for the option
 * @param {SubSchemaToArgDefOptions} [opts] - Options
 * @returns {[string[], import('argparse').ArgumentOptions]} Tuple of flag and options
 */
function subSchemaToArgDef (name, subSchema, opts = {}) {
  const {overrides = {}} = opts;
  const aliases = [
    aliasToFlag(name),
    .../** @type {string[]} */(subSchema.appiumCliAliases ?? []).map((name) => aliasToFlag(name)),
  ];

  let argOpts = {
    required: false,
    dest: aliasToDest(name, {appiumCliDest: subSchema.appiumCliDest}),
    help: subSchema.description,
  };

  // handle special cases for various types
  if (!_.isArray(subSchema.type)) {
    switch (subSchema.type) {
      case 'boolean':
        argOpts.action = 'store_true';
        break;

      case 'integer':
        argOpts.type = 'int';
        break;
    }
  } else {
    // if we have a prop which can be of multiple types AND we do not override it with
    // a custom type via `overrides`, OR an extension does this, we should implement this
    // case.
  }

  // convert JSON schema `enum` to `choices`
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
 * @returns {[string[], import('argparse').ArgumentOptions][]} An array of tuples of aliases and `argparse` arguments; empty if no schema found
 */
export function toParserArgs (opts = {}) {
  const flattened = flattenSchema();
  return _.map(flattened, (value, key) => subSchemaToArgDef(key, value, opts));
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
