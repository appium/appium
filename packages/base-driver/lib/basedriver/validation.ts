import type { Constraint } from '@appium/types';
import log from './logger';
import _ from 'lodash';

export class Validator {
  private readonly validators: Record<keyof Constraint, (value: any, options?: any, key?: string) => string | null> = {
    isString: (value: any, options?: any): string | null => {
      if (_.isString(value) || _.isUndefined(value) || !options) {
        return null;
      }

      return 'must be of type string';
    },
    isNumber: (value: any, options?: any): string | null => {
      if (_.isNumber(value) || _.isUndefined(value) || !options) {
        return null;
      }

      // allow a string value
      if (_.isString(value) && !isNaN(Number(value))) {
        log.warn('Number capability passed in as string. Functionality may be compromised.');
        return null;
      }

      return 'must be of type number';
    },
    isBoolean: (value: any, options?: any): string | null => {
      if (_.isBoolean(value) || _.isUndefined(value) || !options) {
        return null;
      }

      // allow a string value
      if (_.isString(value) && ['true', 'false', ''].includes(value)) {
        return null;
      }

      return 'must be of type boolean';
    },
    isObject: (value: any, options?: any): string | null => {
      if (_.isObject(value) || _.isUndefined(value) || !options) {
        return null;
      }

      return 'must be of type object';
    },
    isArray: (value: any, options?: any): string | null => {
      if (_.isArray(value) || _.isUndefined(value) || !options) {
        return null;
      }

      return 'must be of type array';
    },
    deprecated: (value: any, options?: any, key?: string): string | null => {
      if (!_.isUndefined(value) && options) {
        log.warn(
          `The '${key}' capability has been deprecated and must not be used anymore. ` +
          `Please check the driver documentation for possible alternatives.`
        );
      }
      return null;
    },
    inclusion: (value: any, options?: any): string | null => {
      if (_.isUndefined(value) || !options) {
        return null;
      }
      if (_.isArray(options) && options.some((opt) => opt === value)) {
        return null;
      }
      return `-> '${value}' not part of '${options ?? []}'`;
    },
    inclusionCaseInsensitive: (value: any, options?: any): string | null => {
      if (_.isUndefined(value) || !options) {
        return null;
      }
      if (_.isArray(options) && options.some((opt) => _.toLower(opt) === _.toLower(value))) {
        return null;
      }
      return `-> '${value}' not part of '${options ?? []}'`;
    },
    presence: (value: any, options?: any): string | null => {
      if (_.isUndefined(value) && options) {
        return `is required to be present`;
      }
      if (!_.isUndefined(value) && _.has(options, 'allowEmpty') && !options.allowEmpty && _.isEmpty(value)) {
        return `must not be empty`;
      }
      return null;
    }
  };

  validate(values: Record<string, any>, constraints: Record<string, Constraint>): Record<string, string[]> | null {
    const result: Record<string, string[]> = {};
    for (const [key, constraint] of _.toPairs(constraints)) {
      const value = values[key];
      for (const [validatorName, options] of _.toPairs(constraint)) {
        if (!(validatorName in this.validators)) {
          continue;
        }

        const validationError = this.validators[validatorName](value, options, key);
        if (_.isNil(validationError)) {
          continue;
        }

        if (key in result) {
          result[key].push(validationError);
        } else {
          result[key] = [validationError];
        }
      }
    }
    return _.isEmpty(result) ? null : result;
  }

}

export const validator = new Validator();
