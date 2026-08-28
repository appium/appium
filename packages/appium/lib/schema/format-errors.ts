import type {NormalizedAppiumConfig} from '@appium/types';
import betterAjvErrorsImport, {type IOutputError} from '@sidvind/better-ajv-errors';
import type {ErrorObject} from 'ajv';

import {getSchema} from './schema.js';

// `@sidvind/better-ajv-errors` has no `"type"` field in its own package.json, so TS's
// nodenext resolution infers its extensionless `typings.d.ts` as CJS-format and types the
// default import as the whole module namespace rather than the actual default export.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type BetterAjvErrorsFn = (typeof import('@sidvind/better-ajv-errors'))['default'];
const betterAjvErrors = betterAjvErrorsImport as unknown as BetterAjvErrorsFn;

/**
 * The string should be a raw JSON string.
 */
export type RawJson = string;

/**
 * Options for {@link formatErrors}.
 */
export interface FormatConfigErrorsOptions {
  json?: RawJson;
  pretty?: boolean;
  schemaId?: string;
}

/**
 * Given an array of errors and the result of loading a config file, generate a
 * helpful string for the user.
 *
 * - If `opts` contains a `json` property, this should be the original JSON
 *   _string_ of the config file.  This is only applicable if the config file
 *   was in JSON format. If present, it will associate line numbers with errors.
 * - If `errors` happens to be empty, this will throw.
 *
 * @throws {TypeError} If `errors` is empty
 */
export function formatErrors(
  errors: ErrorObject[] = [],
  config: NormalizedAppiumConfig | Record<string, unknown> | string | undefined = {},
  opts: FormatConfigErrorsOptions = {},
): string | IOutputError[] {
  if (errors && !errors.length) {
    throw new TypeError('Array of errors must be non-empty');
  }
  return betterAjvErrors(getSchema(opts.schemaId), config, errors, {
    json: opts.json,
    format: opts.pretty === false ? 'js' : 'cli',
  });
}
