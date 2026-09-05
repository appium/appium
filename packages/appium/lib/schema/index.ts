export type {ArgumentDefinitions} from './cli-args.js';
export {toParserArgs} from './cli-args.js';
export {
  isDriverCommandArgs,
  isExtensionCommandArgs,
  isPluginCommandArgs,
  isServerCommandArgs,
  isSetupCommandArgs,
} from './cli-args-guards.js';
export type {FormatConfigErrorsOptions, RawJson} from './format-errors.js';
export {formatErrors} from './format-errors.js';
export {
  ALLOWED_SCHEMA_EXTENSIONS,
  finalizeSchema,
  flattenSchema,
  getAllArgSpecs,
  getArgSpec,
  getDefaultsForExtension,
  getDefaultsForSchema,
  getSchema,
  hasArgSpec,
  isAllowedSchemaFileExtension,
  isFinalized,
  registerSchema,
  resetSchema,
  RoachHotelMap,
  SchemaFinalizationError,
  SchemaNameConflictError,
  SchemaUnknownSchemaError,
  SchemaUnsupportedSchemaError,
  validate,
} from './schema.js';
