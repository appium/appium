// @ts-check

import {ArgumentTypeError} from 'argparse';
import _ from 'lodash';
import {formatErrors as formatErrors} from '../config-file';
import {flattenSchema, validate} from './schema';
import {transformers} from './cli-transformers';

/**
 * This module concerns functions which convert schema definitions to
 * `argparse`-compatible data structures, for deriving CLI arguments from a
 * schema.
 */

/**
 * Lookup of possible values for the `type` field in a JSON schema.
 * @type {Readonly<Record<string, import('json-schema').JSONSchema7TypeName>>}
 */
const TYPENAMES = Object.freeze({
  ARRAY: 'array',
  OBJECT: 'object',
  BOOLEAN: 'boolean',
  INTEGER: 'integer',
  NUMBER: 'number',
  NULL: 'null',
  STRING: 'string',
});

/**
 * Options with alias lengths less than this will be considered "short" flags.
 */
const SHORT_ARG_CUTOFF = 3;

/**
 * Convert an alias (`foo`) to a flag (`--foo`) or a short flag (`-f`).
 * @param {ArgSpec} argSpec - the argument specification
 * @param {string} [alias] - the alias to convert to a flag
 * @returns {string} the flag
 */
function aliasToFlag (argSpec, alias) {
  const {extType, extName, name} = argSpec;
  const arg = alias ?? name;
  const isShort = arg.length < SHORT_ARG_CUTOFF;
  if (extType && extName) {
    return isShort
      ? `--${extType}-${_.kebabCase(extName)}-${arg}`
      : `--${extType}-${_.kebabCase(extName)}-${_.kebabCase(arg)}`;
  }
  return isShort ? `-${arg}` : `--${_.kebabCase(arg)}`;
}

/**
 * Converts a string to SCREAMING_SNAKE_CASE
 */
const screamingSnakeCase = _.flow(_.snakeCase, _.toUpper);

/**
 * Given unique property name `name`, return a function which validates a value
 * against a property within the schema.
 * @template Coerced
 * @param {ArgSpec} argSpec - Argument name
 * @param {(value: string) => Coerced} [coerce] - Function to coerce to a different
 * primitive
 * @todo See if we can remove `coerce` by allowing Ajv to coerce in its
 * constructor options
 * @returns
 */
function getSchemaValidator ({ref: schemaId}, coerce = _.identity) {
  /** @param {string} value */
  return (value) => {
    const coerced = coerce(value);
    const errors = validate(coerced, schemaId);
    if (_.isEmpty(errors)) {
      return coerced;
    }
    throw new ArgumentTypeError(
      '\n\n' + formatErrors(errors, value, {schemaId}),
    );
  };
}

/**
 * Determine the description for display on the CLI, given the schema.
 * @param {AppiumJSONSchema} schema
 * @returns {string}
 */
function makeDescription (schema) {
  const {appiumCliDescription, description = '', appiumDeprecated} = schema;
  let desc = appiumCliDescription ?? description;
  if (appiumDeprecated) {
    desc = `[DEPRECATED] ${desc}`;
  }
  return desc;
}

/**
 * Given arg `name`, a JSON schema `subSchema`, and options, return an argument definition
 * as understood by `argparse`.
 * @param {AppiumJSONSchema} subSchema - JSON schema for the option
 * @param {ArgSpec} argSpec - Argument spec tuple
 * @param {SubSchemaToArgDefOptions} [opts] - Options
 * @returns {[string[], import('argparse').ArgumentOptions]} Tuple of flag and options
 */
function subSchemaToArgDef (subSchema, argSpec, opts = {}) {
  const {overrides = {}} = opts;
  let {
    type,
    appiumCliAliases,
    appiumCliTransformer,
    enum: enumValues,
  } = subSchema;

  const {name, arg, dest} = argSpec;

  const aliases = [
    aliasToFlag(argSpec),
    .../** @type {string[]} */ (appiumCliAliases ?? []).map((alias) =>
      aliasToFlag(argSpec, alias),
    ),
  ];

  /** @type {import('argparse').ArgumentOptions} */
  let argOpts = {
    required: false,
    help: makeDescription(subSchema)
  };

  /**
   * Generally we will provide a `type` to `argparse` as a function which
   * validates using ajv (which is much more full-featured than what `argparse`
   * can offer). The exception is `boolean`-type options, which have no
   * `argType`.
   *
   * Not sure if this type is correct, but it's not doing what I want.  I want
   * to say "this is a function which returns something of type `T` where `T` is
   * never a `Promise`".  This function must be sync.
   * @type {((value: string) => unknown)|undefined}
   */
  let argTypeFunction;

  // handle special cases for various types
  switch (type) {
    // booleans do not have a type per `ArgumentOptions`, just an "action"
    case TYPENAMES.BOOLEAN: {
      argOpts.action = 'store_true';
      break;
    }

    case TYPENAMES.OBJECT: {
      argTypeFunction = transformers.json;
      break;
    }

    // arrays are treated as CSVs, because `argparse` doesn't handle array data.
    case TYPENAMES.ARRAY: {
      argTypeFunction = transformers.csv;
      break;
    }

    // "number" type is coerced to float. `argparse` does this for us if we use `float` type, but
    // we don't.
    case TYPENAMES.NUMBER: {
      argTypeFunction = getSchemaValidator(argSpec, parseFloat);
      break;
    }

    // "integer" is coerced to an .. integer.  again, `argparse` would do this for us if we used `int`.
    case TYPENAMES.INTEGER: {
      argTypeFunction = getSchemaValidator(argSpec, _.parseInt);
      break;
    }

    // strings (like number and integer) are subject to further validation
    // (e.g., must satisfy a mask or regex or even some custom validation
    // function)
    case TYPENAMES.STRING: {
      argTypeFunction = getSchemaValidator(argSpec);
      break;
    }

    // TODO: there may be some way to restrict this at the Ajv level --
    // that may involve patching the metaschema.
    case TYPENAMES.NULL:
    // falls through
    default: {
      throw new TypeError(
        `Schema property "${arg}": \`${type}\` type unknown or disallowed`,
      );
    }
  }

  // metavar is used in help text. `boolean` cannot have a metavar--it is not
  // displayed--and `argparse` throws if you give it one.
  if (type !== TYPENAMES.BOOLEAN) {
    argOpts.metavar = screamingSnakeCase(name);
  }

  // the validity of "appiumCliTransformer" should already have been determined
  // by ajv during schema validation in `finalizeSchema()`. the `array` &
  // `object` types have already added a formatter (see above, so we don't do it
  // twice).
  if (
    type !== TYPENAMES.ARRAY &&
    type !== TYPENAMES.OBJECT &&
    appiumCliTransformer
  ) {
    argTypeFunction = _.flow(
      argTypeFunction ?? _.identity,
      transformers[appiumCliTransformer],
    );
  }

  if (argTypeFunction) {
    argOpts.type = argTypeFunction;
  }

  // convert JSON schema `enum` to `choices`. `enum` can contain any JSON type, but `argparse`
  // is limited to a single type per arg (I think).  so let's make everything a string.
  // and might as well _require_ the `type: string` while we're at it.
  if (enumValues && !_.isEmpty(enumValues)) {
    if (type === TYPENAMES.STRING) {
      argOpts.choices = enumValues.map(String);
    } else {
      throw new TypeError(
        `Problem with schema for ${arg}; \`enum\` is only supported for \`type: 'string'\``,
      );
    }
  }

  // overrides override anything we computed here.  usually this involves "custom types",
  // which are really just transform functions.
  argOpts = _.merge(
    argOpts,
    /** should the override keys correspond to the prop name or the prop dest?
     * the prop dest is computed by {@link aliasToDest}.
     */
    overrides[dest] ?? {},
  );

  return [aliases, argOpts];
}

/**
 * Converts the finalized, flattened schema representation into
 * ArgumentDefinitions for handoff to `argparse`.
 *
 * @param {ToParserArgsOptions} opts - Options
 * @throws If schema has not been added to ajv (via `finalizeSchema()`)
 * @returns {import('../cli/args').ArgumentDefinitions} A map of arryas of
 * aliases to `argparse` arguments; empty if no schema found
 */
export function toParserArgs (opts = {}) {
  const flattened = flattenSchema().filter(({schema}) => !schema.appiumCliIgnore);
  return new Map(
    _.map(flattened, ({schema, argSpec}) =>
      subSchemaToArgDef(schema, argSpec, opts),
    ),
  );
}

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

/**
 * @template T
 * @typedef {import('ajv/dist/types').FormatValidator<T>} FormatValidator<T>
 */

/**
 * A JSON 7 schema with our custom keywords.
 * @typedef {import('./keywords').AppiumJSONSchemaKeywords & import('json-schema').JSONSchema7} AppiumJSONSchema
 */

/**
 * @typedef {import('./arg-spec').ArgSpec} ArgSpec
 */
