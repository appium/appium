import {util} from '@appium/support';
import type {Constraint} from '@appium/types';

import {log} from './logger';

export class Validator {
  private readonly _validators: Record<keyof Constraint, (value: any, options?: any, key?: string) => string | null> = {
    isString: (value: any, options?: any): string | null => {
      if (value === undefined || options == null) {
        return null;
      }

      if (typeof value === 'string') {
        return options ? null : 'must not be of type string';
      }

      return options ? 'must be of type string' : null;
    },
    isNumber: (value: any, options?: any): string | null => {
      if (value === undefined || options == null) {
        return null;
      }

      if (typeof value === 'number') {
        return options ? null : 'must not be of type number';
      }

      // allow a string value
      if (options && typeof value === 'string' && !isNaN(Number(value))) {
        log.warn('Number capability passed in as string. Functionality may be compromised.');
        return null;
      }

      return options ? 'must be of type number' : null;
    },
    isBoolean: (value: any, options?: any): string | null => {
      if (value === undefined || options == null) {
        return null;
      }

      if (typeof value === 'boolean') {
        return options ? null : 'must not be of type boolean';
      }

      // allow a string value
      if (options && typeof value === 'string' && ['true', 'false', ''].includes(value)) {
        return null;
      }

      return options ? 'must be of type boolean' : null;
    },
    isObject: (value: any, options?: any): string | null => {
      if (value === undefined || options == null) {
        return null;
      }

      if (util.isPlainObject(value)) {
        return options ? null : 'must not be a plain object';
      }

      return options ? 'must be a plain object' : null;
    },
    isArray: (value: any, options?: any): string | null => {
      if (value === undefined || options == null) {
        return null;
      }

      if (Array.isArray(value)) {
        return options ? null : 'must not be of type array';
      }

      return options ? 'must be of type array' : null;
    },
    deprecated: (value: any, options?: any, key?: string): string | null => {
      if (value !== undefined && options) {
        log.warn(
          `The '${key}' capability has been deprecated and must not be used anymore. ` +
            `Please check the driver documentation for possible alternatives.`,
        );
      }
      return null;
    },
    inclusion: (value: any, options?: any): string | null => {
      if (value === undefined || !options) {
        return null;
      }
      const optionsArr = Array.isArray(options) ? options : [options];
      if (optionsArr.some((opt) => opt === value)) {
        return null;
      }
      return `must be contained by ${JSON.stringify(optionsArr)}`;
    },
    inclusionCaseInsensitive: (value: any, options?: any): string | null => {
      if (value === undefined || !options) {
        return null;
      }
      const optionsArr = Array.isArray(options) ? options : [options];
      if (optionsArr.some((opt) => String(opt).toLowerCase() === String(value).toLowerCase())) {
        return null;
      }
      return `must be contained by ${JSON.stringify(optionsArr)}`;
    },
    presence: (value: any, options?: any): string | null => {
      if (value === undefined && options) {
        return 'is required to be present';
      }
      if (
        !options?.allowEmpty &&
        ((value !== undefined && util.isEmpty(value)) || (typeof value === 'string' && !value.trim()))
      ) {
        return 'must not be empty or blank';
      }
      return null;
    },
  };

  validate(values: Record<string, any>, constraints: Record<string, Constraint>): Record<string, string[]> | null {
    const result: Record<string, string[]> = {};
    for (const [key, constraint] of Object.entries(constraints)) {
      const value = values[key];
      for (const [validatorName, options] of Object.entries(constraint)) {
        if (!(validatorName in this._validators)) {
          continue;
        }

        const validationError = this._validators[validatorName as keyof Constraint](value, options, key);
        if (validationError == null) {
          continue;
        }

        if (key in result) {
          result[key].push(validationError);
        } else {
          result[key] = [validationError];
        }
      }
    }
    return util.isEmpty(result) ? null : result;
  }
}

export const validator = new Validator();
