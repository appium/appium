import type {JSONSchema7} from 'json-schema';
import type {ReadonlyDeep} from 'type-fest';

/** A draft-07 schema for a complete, unprefixed capability object. */
export type CapabilitySchema = ReadonlyDeep<JSONSchema7>;

/**
 * Derives existing capability types from the top-level primitive properties of a schema.
 * References, arrays, and composed schemas remain unknown; runtime validation still applies.
 */
export type SchemaConstraints<S extends CapabilitySchema> = S extends {readonly properties: infer P}
  ? {[K in keyof P]: SchemaConstraint<P[K]>}
  : {};

type SchemaConstraint<S> = S extends {readonly type: 'string'}
  ? {isString: true} & (S extends {readonly enum: infer E extends readonly [string, ...string[]]} ? {inclusion: E} : {})
  : S extends {readonly type: 'number' | 'integer'}
    ? {isNumber: true}
    : S extends {readonly type: 'boolean'}
      ? {isBoolean: true}
      : S extends {readonly type: 'object'}
        ? {isObject: true}
        : {};
