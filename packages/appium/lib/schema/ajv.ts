import AjvImport from 'ajv';
import addFormatsImport from 'ajv-formats';

export type {ErrorObject, KeywordDefinition, SchemaObject, ValidateFunction} from 'ajv';

// `ajv`/`ajv-formats` are CJS with no ESM types; nodenext types their default imports as the
// whole module namespace, so re-derive the real constructor/function types via indexed access
// and cast the values to match.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type AjvCtor = (typeof import('ajv'))['default'];
export type AjvInstance = InstanceType<AjvCtor>;
export const Ajv = AjvImport as unknown as AjvCtor;

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type AddFormatsFn = (typeof import('ajv-formats'))['default'];
export const addFormats = addFormatsImport as unknown as AddFormatsFn;
