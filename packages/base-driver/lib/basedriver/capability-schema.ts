import type {CapabilitySchema} from '@appium/types';
import Ajv, {type ErrorObject} from 'ajv';
import addFormats from 'ajv-formats';

import {errors} from '../protocol/errors';

type CapabilityValidator = (caps: Record<string, unknown>) => void;

const validators = new WeakMap<CapabilitySchema, CapabilityValidator>();

/**
 * Compiles and caches a driver's immutable draft-07 schema without modifying capability values.
 * Invalid schemas (including unresolved references) are driver errors, not invalid user input.
 */
export function getCapabilitySchemaValidator(schema: CapabilitySchema): CapabilityValidator {
  const cached = validators.get(schema);
  if (cached) {
    return cached;
  }

  // Isolate each schema's reference registry; drivers may reuse the same $id.
  const ajv = addFormats(
    new Ajv({
      allErrors: true,
      strict: true,
      strictTypes: false,
      strictRequired: false,
      coerceTypes: false,
      useDefaults: false,
      removeAdditional: false,
    }),
  );
  let validate;
  try {
    validate = ajv.compile(schema);
    if ('$async' in validate && validate.$async) {
      throw new TypeError('Asynchronous capability schemas are not supported');
    }
  } catch (err) {
    throw new TypeError(`Invalid capability schema: ${(err as Error).message}`, {cause: err});
  }
  const validator: CapabilityValidator = (caps) => {
    if (!validate(caps)) {
      throw new errors.InvalidArgumentError(validate.errors!.map(formatSchemaError).join('; '));
    }
  };
  validators.set(schema, validator);
  return validator;
}

function formatSchemaError(error: ErrorObject): string {
  const property = error.params.missingProperty ?? error.params.additionalProperty;
  const path = property === undefined ? error.instancePath : `${error.instancePath}/${property}`;
  return `Capability ${JSON.stringify(path || '/')} ${error.message}`;
}
