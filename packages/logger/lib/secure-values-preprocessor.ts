import _ from 'lodash';
import type {
  SecureValuePreprocessingRule,
  LogFilterRegex,
  LogFiltersConfig,
  LogFilter,
} from './types';

const DEFAULT_REPLACER = '**SECURE**';

/**
 * Type guard for log filter type
 * @param {object} value
 * @returns {value is LogFilterRegex}
 */
function isLogFilterRegex(value: object): value is LogFilterRegex {
  return 'pattern' in value;
}

export class SecureValuesPreprocessor {
  _rules: SecureValuePreprocessingRule[];

  constructor() {
    this._rules = [];
  }

  /**
   * @returns {Array<SecureValuePreprocessingRule>} The list of successfully
   * parsed preprocessing rules
   */
  get rules(): Array<SecureValuePreprocessingRule> {
    return this._rules;
  }

  /**
   * Parses single rule from the given JSON file
   *
   * @param {string|LogFilter} rule The rule might
   * either be represented as a single string or a configuration object
   * @throws {Error} If there was an error while parsing the rule
   * @returns {SecureValuePreprocessingRule} The parsed rule
   */
  parseRule(rule: string | LogFilter): SecureValuePreprocessingRule {
    let pattern: string | undefined;
    let replacer = DEFAULT_REPLACER;
    let flags = ['g'];
    if (_.isString(rule)) {
      if (rule.length === 0) {
        throw new Error(`${JSON.stringify(rule)} -> The value must not be empty`);
      }
      pattern = `\\b${_.escapeRegExp(rule)}\\b`;
    } else if (_.isPlainObject(rule)) {
      if (isLogFilterRegex(rule)) {
        if (!_.isString(rule.pattern) || rule.pattern.length === 0) {
          throw new Error(
            `${JSON.stringify(rule)} -> The value of 'pattern' must be a valid non-empty string`
          );
        }
        pattern = rule.pattern;
      } else if (_.has(rule, 'text')) {
        if (!_.isString(rule.text) || rule.text.length === 0) {
          throw new Error(
            `${JSON.stringify(rule)} -> The value of 'text' must be a valid non-empty string`
          );
        }
        pattern = `\\b${_.escapeRegExp(rule.text)}\\b`;
      }
      if (!pattern) {
        throw new Error(
          `${JSON.stringify(rule)} -> Must either have a field named 'pattern' or 'text'`
        );
      }

      if (_.has(rule, 'flags')) {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Advanced_searching_with_flags_2
        for (const flag of ['i', 'g', 'm', 's', 'u', 'y']) {
          if (_.includes(rule.flags, flag)) {
            flags.push(flag);
          }
        }
        flags = _.uniq(flags);
      }

      if (_.isString(rule.replacer)) {
        replacer = rule.replacer;
      }
    } else {
      throw new Error(`${JSON.stringify(rule)} -> Must either be a string or an object`);
    }

    return {
      pattern: new RegExp(pattern, flags.join('')),
      replacer,
    };
  }

  /**
   * Loads rules from the given JSON file
   *
   * @param {string|string[]|LogFiltersConfig} filters
   * One or more log parsing rules
   * @throws {Error} If the format of the source file is invalid or
   * it does not exist
   * @returns {Promise<string[]>} The list of issues found while parsing each rule.
   * An empty list is returned if no rule parsing issues were found
   */
  async loadRules(filters: string | string[] | LogFiltersConfig): Promise<string[]> {
    const issues: string[] = [];
    const rawRules: (LogFilter | string)[] = [];
    for (const source of (_.isArray(filters) ? filters : [filters])) {
      if (_.isPlainObject(source)) {
        rawRules.push(source as LogFilter);
      } else if (_.isString(source)) {
        rawRules.push(String(source));
      } else {
        issues.push(`'${source}' must be a valid log filtering rule`);
      }
    }
    this._rules = [];
    for (const rawRule of rawRules) {
      try {
        this._rules.push(this.parseRule(rawRule));
      } catch (e) {
        issues.push((e as Error).message);
      }
    }
    return issues;
  }

  /**
   * Performs secure values replacement inside the given string
   * according to the previously loaded rules. No replacement is made
   * if there are no rules or the given value is not a string
   *
   * @param {string} str The string to make replacements in
   * @returns {string} The string with replacements made
   */
  preprocess(str: string): string {
    if (this._rules.length === 0 || !str || !_.isString(str)) {
      return str;
    }

    let result = str;
    for (const rule of this._rules) {
      result = result.replace(rule.pattern, rule.replacer ?? DEFAULT_REPLACER);
    }
    return result;
  }
}
