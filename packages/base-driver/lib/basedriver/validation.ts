import type { Constraint } from '@appium/types';
import log from './logger';
import _ from 'lodash';

export class Validator {
  private readonly _validators: Record<
    keyof Constraint,
    (value: any, options?: any, key?: string) => string | null
  > = {
    isString: (value: any, options?: any): string | null => {
      if (_.isUndefined(value) || _.isNil(options)) {
        return null;
      }

      if (_.isString(value)) {
        return options ? null : 'must not be of type string';
      }

      return options ? 'must be of type string' : null;
    },
    isNumber: (value: any, options?: any): string | null => {
      if (_.isUndefined(value) || _.isNil(options)) {
        return null;
      }

      if (_.isNumber(value)) {
        return options ? null : 'must not be of type number';
      }

      // allow a string value
      if (options && _.isString(value) && !isNaN(Number(value))) {
        log.warn('Number capability passed in as string. Functionality may be compromised.');
        return null;
      }

      return options ? 'must be of type number' : null;
    },
    isBoolean: (value: any, options?: any): string | null => {
      if (_.isUndefined(value) || _.isNil(options)) {
        return null;
      }

      if (_.isBoolean(value)) {
        return options ? null : 'must not be of type boolean';
      }

      // allow a string value
      if (options && _.isString(value) && ['true', 'false', ''].includes(value)) {
        return null;
      }

      return options ? 'must be of type boolean' : null;
    },
    isObject: (value: any, options?: any): string | null => {
      if (_.isUndefined(value) || _.isNil(options)) {
        return null;
      }

      if (_.isPlainObject(value)) {
        return options ? null : 'must not be a plain object';
      }

      return options ? 'must be a plain object' : null;
    },
    isArray: (value: any, options?: any): string | null => {
      if (_.isUndefined(value) || _.isNil(options)) {
        return null;
      }

      if (_.isArray(value)) {
        return options ? null : 'must not be of type array';
      }

      return options ? 'must be of type array' : null;
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
      const optionsArr = _.isArray(options) ? options : [options];
      if (optionsArr.some((opt) => opt === value)) {
        return null;
      }
      return `must be contained by ${JSON.stringify(optionsArr)}`;
    },
    inclusionCaseInsensitive: (value: any, options?: any): string | null => {
      if (_.isUndefined(value) || !options) {
        return null;
      }
      const optionsArr = _.isArray(options) ? options : [options];
      if (optionsArr.some((opt) => _.toLower(opt) === _.toLower(value))) {
        return null;
      }
      return `must be contained by ${JSON.stringify(optionsArr)}`;
    },
    presence: (value: any, options?: any): string | null => {
      if (_.isUndefined(value) && options) {
        return 'is required to be present';
      }
      if (
        !options?.allowEmpty &&
        ((!_.isUndefined(value) && _.isEmpty(value)) || (_.isString(value) && !_.trim(value)))
      ) {
        return 'must not be empty or blank';
      }
      return null;
    }
  };

  validate(values: Record<string, any>, constraints: Record<string, Constraint>): Record<string, string[]> | null {
    const result: Record<string, string[]> = {};
    for (const [key, constraint] of _.toPairs(constraints)) {
      const value = values[key];
      for (const [validatorName, options] of _.toPairs(constraint)) {
        if (!(validatorName in this._validators)) {
          continue;
        }

        const validationError = this._validators[validatorName](value, options, key);
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
