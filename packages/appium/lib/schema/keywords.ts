import type {KeywordDefinition} from 'ajv';
import {transformers} from './cli-transformers';

export type AppiumCliTransformerName = 'csv' | 'json';

export interface AppiumJSONSchemaKeywords {
  appiumCliDest?: string;
  appiumCliDescription?: string;
  appiumCliAliases?: string[];
  appiumCliIgnored?: boolean;
  appiumCliTransformer?: AppiumCliTransformerName;
  appiumDeprecated?: boolean;
}

/**
 * Collection of keyword definitions to add to the singleton `Ajv` instance.
 */
export const keywords: Record<string, KeywordDefinition> = {
  /**
   * List of alias names for a CLI arg.
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
      description:
        'List of aliases for the argument. Aliases shorter than three (3) characters will be prefixed with a single dash; otherwise two (2).',
    },
  },
  /**
   * Explicit destination key name in parsed args.
   */
  appiumCliDest: {
    keyword: 'appiumCliDest',
    metaSchema: {
      type: 'string',
      minLength: 1,
      description: 'Name of the associated property in the parsed CLI arguments object',
    },
  },
  /**
   * CLI-specific description (overrides generic schema description for help text).
   */
  appiumCliDescription: {
    keyword: 'appiumCliDescription',
    schemaType: 'string',
    metaSchema: {
      type: 'string',
      minLength: 1,
      description: 'Description to provide in the --help text of the CLI. Overrides `description`',
    },
  },
  /**
   * Named transformer to apply to CLI value before validation.
   */
  appiumCliTransformer: {
    keyword: 'appiumCliTransformer',
    metaSchema: {
      type: 'string',
      enum: Object.keys(transformers),
      description:
        'The name of a custom transformer to run against the value as provided via the CLI.',
    },
  },
  /**
   * If true, this property is not exposed as a CLI arg.
   */
  appiumCliIgnored: {
    keyword: 'appiumCliIgnored',
    metaSchema: {
      type: 'boolean',
      description:
        'If `true`, Appium will not provide this property as a CLI argument. This is NOT the same as a "hidden" argument.',
      enum: [true],
    },
  },
  /**
   * Marks property as deprecated for CLI docs/help output.
   */
  appiumDeprecated: {
    keyword: 'appiumDeprecated',
    metaSchema: {
      type: 'boolean',
      description: 'If `true`, this property will be displayed as "deprecated" to the user',
      enum: [true],
      $comment:
        'JSON schema draft-2019-09 keyword `deprecated` serves the same purpose. This keyword should itself be deprecated if we move to draft-2019-09!',
    },
  },
};
