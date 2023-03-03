/**
 * A custom error class. This exists so we can use `instanceof` to differentiate between "expected"
 * exceptions and unexpected ones.
 * @module
 */

export class DocutilsError extends Error {}
