import log from './logger';
import _validator from 'validate.js';
import B from 'bluebird';

export const validator =
  /** @type {import('validate.js').ValidateJS & {promise: typeof import('bluebird')}} */ (
    _validator
  );

validator.validators.isString = function isString(value) {
  if (typeof value === 'string') {
    return null;
  }

  if (typeof value === 'undefined') {
    return null;
  }

  return 'must be of type string';
};
validator.validators.isNumber = function isNumber(value) {
  if (typeof value === 'number') {
    return null;
  }

  if (typeof value === 'undefined') {
    return null;
  }

  // allow a string value
  if (typeof value === 'string' && !isNaN(Number(value))) {
    log.warn('Number capability passed in as string. Functionality may be compromised.');
    return null;
  }

  return 'must be of type number';
};
validator.validators.isBoolean = function isBoolean(value) {
  if (typeof value === 'boolean') {
    return null;
  }

  // allow a string value
  if (typeof value === 'string' && ['true', 'false', ''].includes(value)) {
    return null;
  }

  if (typeof value === 'undefined') {
    return null;
  }

  return 'must be of type boolean';
};
validator.validators.isObject = function isObject(value) {
  if (typeof value === 'object') {
    return null;
  }

  if (typeof value === 'undefined') {
    return null;
  }

  return 'must be of type object';
};
validator.validators.isArray = function isArray(value) {
  if (Array.isArray(value)) {
    return null;
  }

  if (typeof value === 'undefined') {
    return null;
  }

  return 'must be of type array';
};
validator.validators.deprecated = function deprecated(value, options, key) {
  // do not print caps that hasn't been provided.
  if (typeof value !== 'undefined' && options) {
    log.warn(
      `The '${key}' capability has been deprecated and must not be used anymore. ` +
      `Please check the driver documentation for possible alternatives.`
    );
  }
  return null;
};
validator.validators.inclusionCaseInsensitive = function inclusionCaseInsensitive(value, options) {
  if (typeof value === 'undefined') {
    return null;
  } else if (typeof value !== 'string') {
    return 'unrecognised';
  }
  for (let option of options) {
    if (option.toLowerCase() === value.toLowerCase()) {
      return null;
    }
  }
  return `${value} not part of ${options.toString()}`;
};

validator.promise = B;
validator.prettify = function prettify(val) {
  return val;
};
