/**
 * JSON-related utility types (formerly sourced from `type-fest`).
 *
 * @module
 */

/**
 * Matches any valid JSON primitive value.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * Matches a JSON array.
 */
export type JsonArray = JsonValue[] | readonly JsonValue[];

/**
 * Matches a JSON object.
 */
export type JsonObject = {[Key in string]: JsonValue} & {[Key in string]?: JsonValue | undefined};

/**
 * Matches any valid JSON value.
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/**
 * Recursively transforms a plain-data type into one assignable to {@linkcode JsonValue}.
 *
 * Unlike `type-fest`'s `Jsonify`, this does not special-case `Date`/`Map`/`Set`/`.toJSON()`; it's
 * only meant for types that are already JSON-shaped (primitives, arrays, plain objects).
 */
export type Jsonify<T> = T extends JsonPrimitive
  ? T
  : T extends ReadonlyArray<infer Element>
    ? Array<Jsonify<Element>>
    : T extends object
      ? {[Key in keyof T]: Jsonify<T[Key]>}
      : never;
