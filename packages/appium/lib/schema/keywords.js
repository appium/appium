// @ts-check

import { transformers } from './cli-transformers';

/**
 * Collection of keyword definitions to add to the singleton `Ajv` instance.
 * @type {Record<string,KeywordDefinition>}
 */
export const keywords = {
  /**
   * Keyword to provide a list of command alias names for the CLI.
   *
   * If defined, there must be at least one item in the array and it must be non-empty.
   * All items in the array must be unique.
   *
   * @todo Avoid alias collisions!
   * @type {KeywordDefinition}
   * @example
   * {appiumCliAliases: ['B', 'bobby', 'robert']}
   */
  appiumCliAliases: {
    keyword: 'appiumCliAliases',
    metaSchema: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1,
      },
      minItems: 1,
      uniqueItems: true,
      description: 'List of aliases for the argument. Aliases shorter than three (3) characters will be prefixed with a single dash; otherwise two (2).'
    },
  },
  /**
   * Keyword to provide the name of the property in the destination (parsed
   * args) object. By default, this value will be whatever the property name is,
   * but camel-cased. If a flag needs something _other_ than just camel-casing,
   * use this.
   * @type {KeywordDefinition}
   * @example
   * // for prop 'no-color'
   * {appiumCliDest: 'NOCOLOR'} // value will be stored as property `NOCOLOR` instead of `noColor`
   */
  appiumCliDest: {
    keyword: 'appiumCliDest',
    metaSchema: {
      type: 'string',
      minLength: 1,
      description: 'Name of the associated property in the parsed CLI arguments object'
    },
  },

  /**
   * CLI-specific description of the property.  Sometimes the allowed type can
   * be different enough on the CLI that providing a description written for a
   * config file context wouldn't make sense.
   * @type {KeywordDefinition}
   * @example
   * {appiumCliDescription: 'This is a comma-delimited string, but in the config file it is an array'}
   */
  appiumCliDescription: {
    keyword: 'appiumCliDescription',
    schemaType: 'string',
    metaSchema: {
      type: 'string',
      minLength: 1,
      description: 'Description to provide in the --help text of the CLI. Overrides `description`'
    },
  },

  /**
   * Transformers for CLI args. These usually take strings then do something with them, like
   * read a file or parse further.
   * @type {KeywordDefinition}
   */
  appiumCliTransformer: {
    keyword: 'appiumCliTransformer',
    metaSchema: {
      type: 'string',
      enum: Object.keys(transformers),
      description: 'The name of a custom transformer to run against the value as provided via the CLI.'
    },
  },

  /**
   * Flag to tell Appium to _not_ provide this property as a CLI argument.
   * @type {KeywordDefinition}
   */
  appiumCliIgnore: {
    keyword: 'appiumCliIgnore',
    metaSchema: {
      type: 'boolean',
      description: 'If `true`, Appium will not provide this property as a CLI argument. This is NOT the same as a "hidden" argument.',
      enum: [true]
    }
  },

  /**
   * Mark this property as deprecated.
   * @type {KeywordDefinition}
   */
  appiumDeprecated: {
    keyword: 'appiumDeprecated',
    metaSchema: {
      type: 'boolean',
      description: 'If `true`, this property will be displayed as "deprecated" to the user',
      enum: [true],
      $comment: 'JSON schema draft-2019-09 keyword `deprecated` serves the same purpose. This keyword should itself be deprecated if we move to draft-2019-09!'
    }
  }
};

/**
 * These are the valid values for the `appiumCliTransformer` keyword.
 * Unfortunately, TS cannot infer this in a JS context.  In TS, we'd use
 * `as const` when defining `argTransformers`, then get `keyof typeof argTransformers`. alas.
 * @typedef {'csv'|'json'} AppiumCliTransformerName
 */

/**
 * These are the custom keywords that Appium recognizes.
 *
 * @typedef {Object} AppiumJSONSchemaKeywords
 * @property {string} [appiumCliDest]
 * @property {string} [appiumCliDescription]
 * @property {string[]} [appiumCliAliases]
 * @property {boolean} [appiumCliIgnore]
 * @property {AppiumCliTransformerName} [appiumCliTransformer]
 * @property {boolean} [appiumDeprecated]
 */


/**
 * @typedef {import('ajv').KeywordDefinition} KeywordDefinition
 */
